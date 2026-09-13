<?php

namespace App\DataFixture\Prod\Geography;

use App\Entity\Extra\Translation;
use App\Entity\Geography\District\District;
use App\Entity\Geography\District\Settlement;
use App\Entity\Geography\District\Village;
use Doctrine\Bundle\FixturesBundle\Fixture;
use Doctrine\Bundle\FixturesBundle\FixtureGroupInterface;
use Doctrine\Common\DataFixtures\DependentFixtureInterface;
use Doctrine\Persistence\ObjectManager;

/**
 * Settlements (посёлки/пгт) within districts, each containing villages.
 */
class SettlementFixture extends Fixture implements DependentFixtureInterface, FixtureGroupInterface
{
    public static function getGroups(): array
    {
        return ['prod'];
    }

    /**
     * БАГФИКС (13.09.2026, тот же класс проблемы, что и у City/Province/
     * District/Suburb/Community — см. их докблоки): $settlDesc/$villDesc
     * были одной русской строкой независимо от локали. Теперь per-locale,
     * через Translation, тем же способом, что и title.
     */
    public function load(ObjectManager $manager): void
    {
        // [$settlementRef, $districtRef, $settlementTranslations (title+description), $villages]
        // $villages: [[$ref, $translations (title+description)], ...]
        $settlementsData = [
            // ── ГРРП — Рудаки ──
            [
                'settlement_khushyor', 'rudaki',
                [
                    'tj'  => ['title' => 'Хушёр', 'description' => 'Шаҳраки Хушёр, ноҳияи Рӯдакӣ, НТМ'],
                    'ru'  => ['title' => 'Хушьёр', 'description' => 'Посёлок Хушьёр, район Рудаки, ГРРП'],
                    'eng' => ['title' => 'Khushyor', 'description' => 'Khushyor settlement, Rudaki District, DRS'],
                ],
                [
                    ['village_khushyor_poyon', [
                        'tj'  => ['title' => 'Хушёри Поён', 'description' => 'Хушёри Поён'],
                        'ru'  => ['title' => 'Хушьёр Нижний', 'description' => 'Нижний Хушьёр'],
                        'eng' => ['title' => 'Lower Khushyor', 'description' => 'Lower Khushyor'],
                    ]],
                    ['village_khushyor_bolo', [
                        'tj'  => ['title' => 'Хушёри Боло', 'description' => 'Хушёри Боло'],
                        'ru'  => ['title' => 'Хушьёр Верхний', 'description' => 'Верхний Хушьёр'],
                        'eng' => ['title' => 'Upper Khushyor', 'description' => 'Upper Khushyor'],
                    ]],
                ],
            ],
            [
                'settlement_navobod', 'rudaki',
                [
                    'tj'  => ['title' => 'Навобод', 'description' => 'Шаҳраки Навобод, ноҳияи Рӯдакӣ, НТМ'],
                    'ru'  => ['title' => 'Навобод', 'description' => 'Посёлок Навобод, район Рудаки, ГРРП'],
                    'eng' => ['title' => 'Navobod', 'description' => 'Navobod settlement, Rudaki District, DRS'],
                ],
                [
                    ['village_navobod_1', [
                        'tj'  => ['title' => 'Навободи Боло', 'description' => 'Навободи Боло'],
                        'ru'  => ['title' => 'Навобод Верхний', 'description' => 'Навобод Верхний'],
                        'eng' => ['title' => 'Upper Navobod', 'description' => 'Upper Navobod'],
                    ]],
                ],
            ],
            // ── Согдийская — Спитамен ──
            [
                'settlement_jumba', 'spitamen',
                [
                    'tj'  => ['title' => 'Ҷумба', 'description' => 'Шаҳраки Ҷумба, ноҳияи Спитамен'],
                    'ru'  => ['title' => 'Джумба', 'description' => 'Посёлок Джумба, район Спитамен'],
                    'eng' => ['title' => 'Jumba', 'description' => 'Jumba settlement, Spitamen District'],
                ],
                [
                    ['village_chashma', [
                        'tj'  => ['title' => 'Чашма', 'description' => 'Деҳаи Чашма, ҷамоати Ширин'],
                        'ru'  => ['title' => 'Чашма', 'description' => 'Деха Чашма, джамоат Ширин'],
                        'eng' => ['title' => 'Chashma', 'description' => 'Chashma village, Shirin Jamoat'],
                    ]],
                ],
            ],
            // ── Хатлон — Вахш ──
            [
                'settlement_guliston', 'vakhsh_d',
                [
                    'tj'  => ['title' => 'Гулистон', 'description' => 'Шаҳраки Гулистон, ноҳияи Вахш, Вилояти Хатлон'],
                    'ru'  => ['title' => 'Гулистон', 'description' => 'ПГТ Гулистон, район Вахш, Хатлон'],
                    'eng' => ['title' => 'Guliston', 'description' => 'Guliston urban settlement, Vakhsh District, Khatlon'],
                ],
                [
                    ['village_guliston_bolo', [
                        'tj'  => ['title' => 'Гулистони Боло', 'description' => 'Гулистони Боло'],
                        'ru'  => ['title' => 'Гулистон Верхний', 'description' => 'Гулистон Верхний'],
                        'eng' => ['title' => 'Upper Guliston', 'description' => 'Upper Guliston'],
                    ]],
                    ['village_guliston_payon', [
                        'tj'  => ['title' => 'Гулистони Поён', 'description' => 'Гулистони Поён'],
                        'ru'  => ['title' => 'Гулистон Нижний', 'description' => 'Гулистон Нижний'],
                        'eng' => ['title' => 'Lower Guliston', 'description' => 'Lower Guliston'],
                    ]],
                ],
            ],
            // ── Душанбе — Сино ──
            [
                'settlement_yovon', 'sino',
                [
                    'tj'  => ['title' => 'Ёвон', 'description' => 'Шаҳраки Ёвон, ноҳияи Сино, Душанбе'],
                    'ru'  => ['title' => 'Явон', 'description' => 'Посёлок Явон, район Сино, Душанбе'],
                    'eng' => ['title' => 'Yovon', 'description' => 'Yovon settlement, Sino District, Dushanbe'],
                ],
                [
                    ['village_yovon_markaz', [
                        'tj'  => ['title' => 'Марказ (Ёвон)', 'description' => 'Маркази Ёвон'],
                        'ru'  => ['title' => 'Центр (Явон)', 'description' => 'Центр (Явон)'],
                        'eng' => ['title' => 'Center (Yovon)', 'description' => 'Center (Yovon)'],
                    ]],
                ],
            ],
            // ── ГБАО — Шугнан ──
            [
                'settlement_baroj', 'shugnan',
                [
                    'tj'  => ['title' => 'Бароҷ', 'description' => 'Шаҳраки Бароҷ, ноҳияи Шуғнон, ВМКБ'],
                    'ru'  => ['title' => 'Барадж', 'description' => 'Посёлок Барадж, район Шугнан, ГБАО'],
                    'eng' => ['title' => 'Baroj', 'description' => 'Baroj settlement, Shugnan District, GBAO'],
                ],
                [
                    ['village_baroj_1', [
                        'tj'  => ['title' => 'Бароҷи Поён', 'description' => 'Бароҷи Поён'],
                        'ru'  => ['title' => 'Барадж Нижний', 'description' => 'Барадж Нижний'],
                        'eng' => ['title' => 'Lower Baroj', 'description' => 'Lower Baroj'],
                    ]],
                ],
            ],
            // ── ГРРП — Гиссар ──
            [
                'settlement_kandak', 'hisor_d',
                [
                    'tj'  => ['title' => 'Кандак', 'description' => 'Шаҳраки Кандак, ноҳияи Ҳисор, НТМ'],
                    'ru'  => ['title' => 'Кандак', 'description' => 'Посёлок Кандак, район Гиссар, ГРРП'],
                    'eng' => ['title' => 'Kandak', 'description' => 'Kandak settlement, Hisor District, DRS'],
                ],
                [
                    ['village_kandak_1', [
                        'tj'  => ['title' => 'Кандаки Боло', 'description' => 'Кандаки Боло'],
                        'ru'  => ['title' => 'Кандак Верхний', 'description' => 'Кандак Верхний'],
                        'eng' => ['title' => 'Upper Kandak', 'description' => 'Upper Kandak'],
                    ]],
                ],
            ],
            // ── Согдийская — Исфара ──
            [
                'settlement_surh', 'isfara_d',
                [
                    'tj'  => ['title' => 'Сурх', 'description' => 'Шаҳраки Сурх, ноҳияи Исфара, Вилояти Суғд'],
                    'ru'  => ['title' => 'Сурх', 'description' => 'Посёлок Сурх, район Исфара, Согдийская обл.'],
                    'eng' => ['title' => 'Surkh', 'description' => 'Surkh settlement, Isfara District, Sughd Province'],
                ],
                [
                    ['village_surh_1', [
                        'tj'  => ['title' => 'Сурхи Поён', 'description' => 'Сурхи Поён'],
                        'ru'  => ['title' => 'Сурх Нижний', 'description' => 'Нижний Сурх'],
                        'eng' => ['title' => 'Lower Surkh', 'description' => 'Lower Surkh'],
                    ]],
                ],
            ],
            // ── Хатлон — Фархор ──
            [
                'settlement_pushing', 'farkhor_d',
                [
                    'tj'  => ['title' => 'Пушинг', 'description' => 'Шаҳраки Пушинг, ноҳияи Фарҳор, Вилояти Хатлон'],
                    'ru'  => ['title' => 'Пушинг', 'description' => 'Посёлок Пушинг, район Фархор, Хатлон'],
                    'eng' => ['title' => 'Pushing', 'description' => 'Pushing settlement, Farkhor District, Khatlon'],
                ],
                [
                    ['village_pushing_1', [
                        'tj'  => ['title' => 'Пушинги Марказӣ', 'description' => 'Пушинги Марказӣ'],
                        'ru'  => ['title' => 'Пушинг Центральный', 'description' => 'Центральный Пушинг'],
                        'eng' => ['title' => 'Central Pushing', 'description' => 'Central Pushing'],
                    ]],
                ],
            ],
        ];

        foreach ($settlementsData as [$settlRef, $distRef, $settlTrans, $villages]) {
            $settlement = new Settlement();

            // Фолбэк на самой сущности — тот же паттерн, что у City/Province/
            // District/Suburb/Community.
            $settlement->setDescription($settlTrans['ru']['description']);

            foreach ($settlTrans as $locale => $trans) {
                $settlement->addTranslation(
                    (new Translation())
                        ->setTitle($trans['title'])
                        ->setDescription($trans['description'])
                        ->setLocale($locale)
                        ->setAddress($settlement)
                );
            }

            /** @var District $district */
            $district = $this->getReference($distRef, District::class);
            $district->addSettlement($settlement);

            foreach ($villages as [$villRef, $villTrans]) {
                $village = new Village();
                $village->setDescription($villTrans['ru']['description']);

                foreach ($villTrans as $locale => $trans) {
                    $village->addTranslation(
                        (new Translation())
                            ->setTitle($trans['title'])
                            ->setDescription($trans['description'])
                            ->setLocale($locale)
                            ->setAddress($village)
                    );
                }

                $settlement->addVillage($village);
                $manager->persist($village);
                $this->addReference($villRef, $village);
            }

            $manager->persist($settlement);
            $this->addReference($settlRef, $settlement);
        }

        $manager->flush();
    }

    public function getDependencies(): array
    {
        return [DistrictFixture::class];
    }
}
