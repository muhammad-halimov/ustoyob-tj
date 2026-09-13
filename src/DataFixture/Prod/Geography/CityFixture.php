<?php

namespace App\DataFixture\Prod\Geography;

use App\Entity\Extra\Translation;
use App\Entity\Geography\City\City;
use Doctrine\Bundle\FixturesBundle\Fixture;
use Doctrine\Bundle\FixturesBundle\FixtureGroupInterface;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Persistence\ObjectManager;
use ReflectionClass;

class CityFixture extends Fixture implements FixtureGroupInterface
{
    public static function getGroups(): array
    {
        return ['prod'];
    }

    /**
     * БАГФИКС (13.09.2026, тот же класс проблемы, что и у Category/Occupation
     * — см. их докблоки): 'description' было ОДНОЙ русской строкой
     * ("Вахдат, ГРРП") независимо от локали. Теперь — per-locale перевод
     * через Translation, тем же способом, что и title.
     */
    public function load(ObjectManager $manager): void
    {
        $citiesData = [
            // ── ГРРП (CDRS) ──
            'Vahdat' => [
                'translations' => [
                    'tj'  => ['title' => 'Ваҳдат', 'description' => 'Ваҳдат, НТМ'],
                    'ru'  => ['title' => 'Вахдат', 'description' => 'Вахдат, ГРРП'],
                    'eng' => ['title' => 'Vahdat', 'description' => 'Vahdat, DRS'],
                ],
            ],
            'Rogun' => [
                'translations' => [
                    'tj'  => ['title' => 'Роғун', 'description' => 'Роғун, НТМ'],
                    'ru'  => ['title' => 'Рогун', 'description' => 'Рогун, ГРРП'],
                    'eng' => ['title' => 'Rogun', 'description' => 'Rogun, DRS'],
                ],
            ],
            'Faizobod' => [
                'translations' => [
                    'tj'  => ['title' => 'Файзобод', 'description' => 'Файзобод, НТМ'],
                    'ru'  => ['title' => 'Файзабад', 'description' => 'Файзабад, ГРРП'],
                    'eng' => ['title' => 'Faizobod', 'description' => 'Faizobod, DRS'],
                ],
            ],
            'Vakhsh' => [
                'translations' => [
                    'tj'  => ['title' => 'Вахш', 'description' => 'Вахш, Вилояти Хатлон'],
                    'ru'  => ['title' => 'Вахш', 'description' => 'Вахш, Хатлонская область'],
                    'eng' => ['title' => 'Vakhsh', 'description' => 'Vakhsh, Khatlon Province'],
                ],
            ],
            // ── Душанбе ──
            'Dushanbe' => [
                'translations' => [
                    'tj'  => ['title' => 'Душанбе', 'description' => 'Душанбе, пойтахти ҷумҳурӣ'],
                    'ru'  => ['title' => 'Душанбе', 'description' => 'Душанбе, республиканская столица'],
                    'eng' => ['title' => 'Dushanbe', 'description' => 'Dushanbe, the republican capital'],
                ],
            ],
            // ── Согдийская область ──
            'Hujand' => [
                'translations' => [
                    'tj'  => ['title' => 'Хуҷанд', 'description' => 'Хуҷанд, Вилояти Суғд'],
                    'ru'  => ['title' => 'Ходжент', 'description' => 'Ходжент, Согдийская область'],
                    'eng' => ['title' => 'Hujand', 'description' => 'Hujand, Sughd Province'],
                ],
            ],
            'Istaravshan' => [
                'translations' => [
                    'tj'  => ['title' => 'Истаравшан', 'description' => 'Истаравшан, Вилояти Суғд'],
                    'ru'  => ['title' => 'Истаравшан', 'description' => 'Истаравшан, Согдийская область'],
                    'eng' => ['title' => 'Istaravshan', 'description' => 'Istaravshan, Sughd Province'],
                ],
            ],
            'Konibodom' => [
                'translations' => [
                    'tj'  => ['title' => 'Конибодом', 'description' => 'Конибодом, Вилояти Суғд'],
                    'ru'  => ['title' => 'Канибадам', 'description' => 'Канибадам, Согдийская область'],
                    'eng' => ['title' => 'Konibodom', 'description' => 'Konibodom, Sughd Province'],
                ],
            ],
            'Panjakent' => [
                'translations' => [
                    'tj'  => ['title' => 'Панҷакент', 'description' => 'Панҷакент, Вилояти Суғд'],
                    'ru'  => ['title' => 'Пенджикент', 'description' => 'Пенджикент, Согдийская область'],
                    'eng' => ['title' => 'Panjakent', 'description' => 'Panjakent, Sughd Province'],
                ],
            ],
            'Buston' => [
                'translations' => [
                    'tj'  => ['title' => 'Бустон', 'description' => 'Бустон (Чкаловск), Вилояти Суғд'],
                    'ru'  => ['title' => 'Бустон', 'description' => 'Бустон (Чкаловск), Согдийская область'],
                    'eng' => ['title' => 'Buston', 'description' => 'Buston (Chkalovsk), Sughd Province'],
                ],
            ],
            // ── Хатлонская область ──
            'Bohtar' => [
                'translations' => [
                    'tj'  => ['title' => 'Бохтар', 'description' => 'Бохтар (Қӯрғонтеппа), Вилояти Хатлон'],
                    'ru'  => ['title' => 'Бохтар', 'description' => 'Бохтар (Курган-Тюбе), Хатлонская область'],
                    'eng' => ['title' => 'Bohtar', 'description' => 'Bohtar (Qurghonteppa), Khatlon Province'],
                ],
            ],
            'Kulob' => [
                'translations' => [
                    'tj'  => ['title' => 'Кӯлоб', 'description' => 'Кӯлоб, Вилояти Хатлон'],
                    'ru'  => ['title' => 'Куляб', 'description' => 'Куляб, Хатлонская область'],
                    'eng' => ['title' => 'Kulob', 'description' => 'Kulob, Khatlon Province'],
                ],
            ],
            'Qurghonteppa' => [
                'translations' => [
                    'tj'  => ['title' => 'Қӯрғонтеппа', 'description' => 'Қӯрғонтеппа (номи қаблӣ), Вилояти Хатлон'],
                    'ru'  => ['title' => 'Курган-Тюбе', 'description' => 'Курган-Тюбе (старое название), Хатлонская область'],
                    'eng' => ['title' => 'Qurghonteppa', 'description' => 'Qurghonteppa (former name), Khatlon Province'],
                ],
            ],
            'Vose' => [
                'translations' => [
                    'tj'  => ['title' => 'Восеъ', 'description' => 'Восеъ, Вилояти Хатлон'],
                    'ru'  => ['title' => 'Восеъ', 'description' => 'Восеъ, Хатлонская область'],
                    'eng' => ['title' => 'Vose', 'description' => 'Vose, Khatlon Province'],
                ],
            ],
            'Danghara' => [
                'translations' => [
                    'tj'  => ['title' => 'Дангара', 'description' => 'Данғара, Вилояти Хатлон'],
                    'ru'  => ['title' => 'Дангара', 'description' => 'Дангара, Хатлонская область'],
                    'eng' => ['title' => 'Danghara', 'description' => 'Danghara, Khatlon Province'],
                ],
            ],
            // ── ГБАО ──
            'Murghob' => [
                'translations' => [
                    'tj'  => ['title' => 'Мурғоб', 'description' => 'Мурғоб, ВМКБ'],
                    'ru'  => ['title' => 'Мургаб', 'description' => 'Мургаб, ГБАО'],
                    'eng' => ['title' => 'Murghob', 'description' => 'Murghob, GBAO'],
                ],
            ],
            'Khorog' => [
                'translations' => [
                    'tj'  => ['title' => 'Хоруғ', 'description' => 'Хоруғ, ВМКБ — маркази маъмурӣ'],
                    'ru'  => ['title' => 'Хорог', 'description' => 'Хорог, ГБАО — административный центр'],
                    'eng' => ['title' => 'Khorog', 'description' => 'Khorog, GBAO — administrative centre'],
                ],
            ],
            'Ishkoshim' => [
                'translations' => [
                    'tj'  => ['title' => 'Ишкошим', 'description' => 'Ишкошим, ВМКБ'],
                    'ru'  => ['title' => 'Ишкашим', 'description' => 'Ишкашим, ГБАО'],
                    'eng' => ['title' => 'Ishkoshim', 'description' => 'Ishkoshim, GBAO'],
                ],
            ],
            // ── ГРРП ──
            'Hisor' => [
                'translations' => [
                    'tj'  => ['title' => 'Ҳисор', 'description' => 'Ҳисор, НТМ'],
                    'ru'  => ['title' => 'Гиссар', 'description' => 'Гиссар, ГРРП'],
                    'eng' => ['title' => 'Hisor', 'description' => 'Hisor, DRS'],
                ],
            ],
            'Tursunzoda' => [
                'translations' => [
                    'tj'  => ['title' => 'Турсунзода', 'description' => 'Турсунзода, НТМ'],
                    'ru'  => ['title' => 'Турсунзаде', 'description' => 'Турсунзаде, ГРРП'],
                    'eng' => ['title' => 'Tursunzoda', 'description' => 'Tursunzoda, DRS'],
                ],
            ],
            'Norak' => [
                'translations' => [
                    'tj'  => ['title' => 'Норак', 'description' => 'Норак, Вилояти Хатлон'],
                    'ru'  => ['title' => 'Нурек', 'description' => 'Нурек, Хатлонская область'],
                    'eng' => ['title' => 'Norak', 'description' => 'Norak, Khatlon Province'],
                ],
            ],
            // ── Согдийская область ──
            'Isfara' => [
                'translations' => [
                    'tj'  => ['title' => 'Исфара', 'description' => 'Исфара, Вилояти Суғд'],
                    'ru'  => ['title' => 'Исфара', 'description' => 'Исфара, Согдийская область'],
                    'eng' => ['title' => 'Isfara', 'description' => 'Isfara, Sughd Province'],
                ],
            ],
            // ── Хатлонская область ──
            'Farkhor' => [
                'translations' => [
                    'tj'  => ['title' => 'Фарҳор', 'description' => 'Фарҳор, Вилояти Хатлон'],
                    'ru'  => ['title' => 'Фархор', 'description' => 'Фархор, Хатлонская область'],
                    'eng' => ['title' => 'Farkhor', 'description' => 'Farkhor, Khatlon Province'],
                ],
            ],
        ];

        foreach ($citiesData as $key => $data) {
            $city = new City();

            // Фолбэк на самой сущности — тот же паттерн, что у Category/
            // Legal/Occupation (см. их докблоки): реальное per-locale
            // значение резолвится на чтение через localizeEntityFull().
            $city->setDescription($data['translations']['ru']['description']);

            $reflection = new ReflectionClass($city);
            /** @noinspection PhpStatementHasEmptyBodyInspection */
            while (!$reflection->hasProperty('translations') && $reflection = $reflection->getParentClass());
            $property = $reflection->getProperty('translations');
            $property->setValue($city, new ArrayCollection());

            foreach ($data['translations'] as $locale => $trans) {
                $translation = (new Translation())
                    ->setTitle($trans['title'])
                    ->setDescription($trans['description'])
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
