<?php

namespace App\Command;

use App\Entity\Extra\MultipleImage;
use App\Entity\Geography\Abstract\AddressComponent;
use App\Entity\Ticket\Category;
use App\Entity\User;
use App\Entity\User\Occupation;
use App\Service\Extra\ImageUrl;
use App\Service\Image\BlurhashGenerator;
use Doctrine\ORM\EntityManagerInterface;
use Liip\ImagineBundle\Service\FilterService;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;
use Throwable;

/**
 * Досчитывает BlurHash для картинок, загруженных ДО появления заглушек
 * (imageBlurhash IS NULL при непустом image), и по желанию заранее строит для
 * них превью.
 *
 * Новые загрузки считают хеш сами (ImageBlurhashListener) — команда нужна один
 * раз после релиза и потом при желании "подчистить". Повторный запуск безопасен:
 * трогает только записи без хеша.
 *
 * Превью/WebP для старых фото доп. действий НЕ требуют — Liip строит их по
 * первому запросу. --warm нужен, только чтобы первый показ не ждал генерации.
 *
 * Запуск:
 *   php bin/console app:images:backfill-blurhash
 *   php bin/console app:images:backfill-blurhash --dry-run
 *   php bin/console app:images:backfill-blurhash --warm             # + превью thumb_480
 *   php bin/console app:images:backfill-blurhash --limit=500
 */
#[AsCommand(
    name: 'app:images:backfill-blurhash',
    description: 'Считает BlurHash (и по --warm превью) для уже загруженных картинок без заглушки',
)]
class BackfillImageBlurhashCommand extends Command
{
    /** Классы с SingleImageTrait. AddressComponent абстрактный — DQL подтянет всех наследников. */
    private const array ENTITIES = [
        MultipleImage::class,
        User::class,
        Category::class,
        Occupation::class,
        AddressComponent::class,
    ];

    private const int BATCH = 50;

    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly BlurhashGenerator      $generator,
        private readonly FilterService          $filterService,
        private readonly string                 $projectDir,
    ) {
        parent::__construct();
    }

    protected function configure(): void
    {
        $this
            ->addOption('dry-run', null, InputOption::VALUE_NONE, 'Показать, сколько записей будет обработано, без изменений')
            ->addOption('warm', null, InputOption::VALUE_NONE, 'Заодно заранее построить превью thumb_480')
            ->addOption('limit', 'l', InputOption::VALUE_REQUIRED, 'Максимум записей за запуск (0 — без ограничения)', '0');
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io     = new SymfonyStyle($input, $output);
        $dryRun = (bool) $input->getOption('dry-run');
        $warm   = (bool) $input->getOption('warm');
        $limit  = max(0, (int) $input->getOption('limit'));

        $done = $skipped = 0;

        foreach (self::ENTITIES as $class) {
            $query = $this->em->createQuery(
                "SELECT e FROM {$class} e WHERE e.image IS NOT NULL AND e.imageBlurhash IS NULL"
            );

            $shortName = (new \ReflectionClass($class))->getShortName();
            $io->section($shortName . ($dryRun ? ' (dry-run)' : ''));

            $count = 0;
            foreach ($query->toIterable() as $entity) {
                if ($limit > 0 && ($done + $skipped) >= $limit) break 2;

                $relative = ImageUrl::relativePath($entity, $entity->getImage());
                $path     = $this->projectDir . '/public/' . $relative;

                if ($dryRun) {
                    $io->writeln("  would process: {$relative}");
                    $done++;
                    continue;
                }

                $hash = $this->generator->fromFile($path);

                if ($hash === null) {
                    // Файла нет на диске / повреждён — оставляем null, при следующем
                    // запуске попробуем снова (вдруг файл появится).
                    $io->writeln("  <comment>skip</comment> {$relative} (файл недоступен)");
                    $skipped++;
                    continue;
                }

                $entity->setImageBlurhash($hash);

                if ($warm) {
                    try {
                        $this->filterService->warmUpCache($relative, ImageUrl::THUMBNAIL);
                    } catch (Throwable $e) {
                        $io->writeln("  <comment>warm failed</comment> {$relative}: " . $e->getMessage());
                    }
                }

                $done++;
                $count++;

                if ($count % self::BATCH === 0) {
                    $this->em->flush();
                    $this->em->clear();
                }
            }

            if (!$dryRun) {
                $this->em->flush();
                $this->em->clear();
            }
        }

        $io->success(sprintf(
            '%s: %d, пропущено (нет файла): %d.',
            $dryRun ? 'Будет обработано' : 'Обработано',
            $done,
            $skipped,
        ));

        return Command::SUCCESS;
    }
}
