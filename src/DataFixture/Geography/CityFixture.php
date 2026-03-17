<?php

namespace App\DataFixture\Geography;

use App\Entity\Extra\Translation;
use App\Entity\Geography\City\City;
use Doctrine\Bundle\FixturesBundle\Fixture;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Persistence\ObjectManager;
use ReflectionClass;

class CityFixture extends Fixture
{
    public function load(ObjectManager $manager): void
    {
        $citiesData = [
            // ── ГРРП (CDRS) ──
            'Vahdat' => [
                'translations' => ['tj' => 'Ваҳдат', 'ru' => 'Вахдат', 'eng' => 'Vahdat'],
                'description'  => 'Вахдат, ГРРП',
            ],
            'Rogun' => [
                'translations' => ['tj' => 'Роғун', 'ru' => 'Рогун', 'eng' => 'Rogun'],
                'description'  => 'Рогун, ГРРП',
            ],
            'Faizobod' => [
                'translations' => ['tj' => 'Файзобод', 'ru' => 'Файзабад', 'eng' => 'Faizobod'],
                'description'  => 'Файзабад, ГРРП',
            ],
            'Vakhsh' => [
                'translations' => ['tj' => 'Вахш', 'ru' => 'Вахш', 'eng' => 'Vakhsh'],
                'description'  => 'Вахш, Хатлонская область',
            ],
            // ── Душанбе ──
            'Dushanbe' => [
                'translations' => ['tj' => 'Душанбе', 'ru' => 'Душанбе', 'eng' => 'Dushanbe'],
                'description'  => 'Душанбе, республиканская столица',
            ],
            // ── Согдийская область ──
            'Hujand' => [
                'translations' => ['tj' => 'Хуҷанд', 'ru' => 'Ходжент', 'eng' => 'Hujand'],
                'description'  => 'Ходжент, Согдийская область',
            ],
            'Istaravshan' => [
                'translations' => ['tj' => 'Истаравшан', 'ru' => 'Истаравшан', 'eng' => 'Istaravshan'],
                'description'  => 'Истаравшан, Согдийская область',
            ],
            'Konibodom' => [
                'translations' => ['tj' => 'Конибодом', 'ru' => 'Канибадам', 'eng' => 'Konibodom'],
                'description'  => 'Канибадам, Согдийская область',
            ],
            'Panjakent' => [
                'translations' => ['tj' => 'Панҷакент', 'ru' => 'Пенджикент', 'eng' => 'Panjakent'],
                'description'  => 'Пенджикент, Согдийская область',
            ],
            'Buston' => [
                'translations' => ['tj' => 'Бустон', 'ru' => 'Бустон', 'eng' => 'Buston'],
                'description'  => 'Бустон (Чкаловск), Согдийская область',
            ],
            // ── Хатлонская область ──
            'Bohtar' => [
                'translations' => ['tj' => 'Бохтар', 'ru' => 'Бохтар', 'eng' => 'Bohtar'],
                'description'  => 'Бохтар (Курган-Тюбе), Хатлонская область',
            ],
            'Kulob' => [
                'translations' => ['tj' => 'Кӯлоб', 'ru' => 'Куляб', 'eng' => 'Kulob'],
                'description'  => 'Куляб, Хатлонская область',
            ],
            'Qurghonteppa' => [
                'translations' => ['tj' => 'Қӯрғонтеппа', 'ru' => 'Курган-Тюбе', 'eng' => 'Qurghonteppa'],
                'description'  => 'Курган-Тюбе (старое название), Хатлонская область',
            ],
            'Vose' => [
                'translations' => ['tj' => 'Восеъ', 'ru' => 'Восеъ', 'eng' => 'Vose'],
                'description'  => 'Восеъ, Хатлонская область',
            ],
            'Danghara' => [
                'translations' => ['tj' => 'Дангара', 'ru' => 'Дангара', 'eng' => 'Danghara'],
                'description'  => 'Дангара, Хатлонская область',
            ],
            // ── ГБАО ──
            'Murghob' => [
                'translations' => ['tj' => 'Мурғоб', 'ru' => 'Мургаб', 'eng' => 'Murghob'],
                'description'  => 'Мургаб, ГБАО',
            ],
            'Khorog' => [
                'translations' => ['tj' => 'Хоруғ', 'ru' => 'Хорог', 'eng' => 'Khorog'],
                'description'  => 'Хорог, ГБАО — административный центр',
            ],
            'Ishkoshim' => [
                'translations' => ['tj' => 'Ишкошим', 'ru' => 'Ишкашим', 'eng' => 'Ishkoshim'],
                'description'  => 'Ишкашим, ГБАО',
            ],
        ];

        foreach ($citiesData as $key => $data) {
            $city = new City();
            $city->setDescription($data['description']);

            $reflection = new ReflectionClass($city);
            /** @noinspection PhpStatementHasEmptyBodyInspection */
            while (!$reflection->hasProperty('translations') && $reflection = $reflection->getParentClass());
            $property = $reflection->getProperty('translations');
            $property->setValue($city, new ArrayCollection());

            foreach ($data['translations'] as $locale => $title) {
                $translation = (new Translation())
                    ->setTitle($title)
                    ->setLocale($locale)
                    ->setAddress($city);

                $city->addTranslation($translation);
            }

            $manager->persist($city);
            $this->addReference(strtolower($key), $city);
        }

        $manager->flush();
    }

    public function getDependencies(): array
    {
        return [];
    }
}
