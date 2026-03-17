<?php

namespace App\DataFixture\Geography;

use App\Entity\Extra\Translation;
use App\Entity\Geography\District\District;
use App\Entity\Geography\District\Settlement;
use App\Entity\Geography\District\Village;
use Doctrine\Bundle\FixturesBundle\Fixture;
use Doctrine\Common\DataFixtures\DependentFixtureInterface;
use Doctrine\Persistence\ObjectManager;

/**
 * Settlements (посёлки/пгт) within districts, each containing villages.
 */
class SettlementFixture extends Fixture implements DependentFixtureInterface
{
    public function load(ObjectManager $manager): void
    {
        // [$settlementRef, $districtRef, $settlementTranslations, $settlementDesc, $villages]
        // $villages: [[$ref, $translations, $desc], ...]
        $settlementsData = [
            // ── ГРРП — Рудаки ──
            [
                'settlement_khushyor', 'rudaki',
                ['tj' => 'Хушёр', 'ru' => 'Хушьёр', 'eng' => 'Khushyor'],
                'Посёлок Хушьёр, район Рудаки, ГРРП',
                [
                    ['village_khushyor_poyon', ['tj' => 'Хушёри Поён', 'ru' => 'Хушьёр Нижний', 'eng' => 'Lower Khushyor'], 'Нижний Хушьёр'],
                    ['village_khushyor_boло', ['tj' => 'Хушёри Боло',  'ru' => 'Хушьёр Верхний', 'eng' => 'Upper Khushyor'], 'Верхний Хушьёр'],
                ],
            ],
            [
                'settlement_navobod', 'rudaki',
                ['tj' => 'Навобод', 'ru' => 'Навобод', 'eng' => 'Navobod'],
                'Посёлок Навобод, район Рудаки, ГРРП',
                [
                    ['village_navobod_1', ['tj' => 'Навободи Боло', 'ru' => 'Навобод Верхний', 'eng' => 'Upper Navobod'], 'Навобод Верхний'],
                ],
            ],
            // ── Согдийская — Спитамен ──
            [
                'settlement_jumba', 'spitamen',
                ['tj' => 'Ҷумба', 'ru' => 'Джумба', 'eng' => 'Jumba'],
                'Посёлок Джумба, район Спитамен',
                [
                    ['village_chashma', ['tj' => 'Чашма', 'ru' => 'Чашма', 'eng' => 'Chashma'], '村/Джамоат Чашма'],
                ],
            ],
            // ── Хатлон — Вахш ──
            [
                'settlement_guliston', 'vakhsh_d',
                ['tj' => 'Гулистон', 'ru' => 'Гулистон', 'eng' => 'Guliston'],
                'ПГТ Гулистон, район Вахш, Хатлон',
                [
                    ['village_guliston_boло', ['tj' => 'Гулистони Боло', 'ru' => 'Гулистон Верхний', 'eng' => 'Upper Guliston'], 'Гулистон Верхний'],
                    ['village_guliston_payon', ['tj' => 'Гулистони Поён', 'ru' => 'Гулистон Нижний', 'eng' => 'Lower Guliston'], 'Гулистон Нижний'],
                ],
            ],
            // ── Душанбе — Сино ──
            [
                'settlement_yovon', 'sino',
                ['tj' => 'Ёвон', 'ru' => 'Явон', 'eng' => 'Yovon'],
                'Посёлок Явон, район Сино, Душанбе',
                [
                    ['village_yovon_markaz', ['tj' => 'Марказ (Ёвон)', 'ru' => 'Центр (Явон)', 'eng' => 'Center (Yovon)'], 'Центр пос. Явон'],
                ],
            ],
            // ── ГБАО — Шугнан ──
            [
                'settlement_baroj', 'shugnan',
                ['tj' => 'Бароҷ', 'ru' => 'Барадж', 'eng' => 'Baroj'],
                'Посёлок Барадж, район Шугнан, ГБАО',
                [
                    ['village_baroj_1', ['tj' => 'Бароҷи Поён', 'ru' => 'Барадж Нижний', 'eng' => 'Lower Baroj'], 'Нижний Барадж'],
                ],
            ],
        ];

        foreach ($settlementsData as [$settlRef, $distRef, $settlTrans, $settlDesc, $villages]) {
            $settlement = new Settlement();
            $settlement->setDescription($settlDesc);

            foreach ($settlTrans as $locale => $title) {
                $settlement->addTranslation(
                    (new Translation())->setTitle($title)->setLocale($locale)->setAddress($settlement)
                );
            }

            /** @var District $district */
            $district = $this->getReference($distRef, District::class);
            $district->addSettlement($settlement);

            foreach ($villages as [$villRef, $villTrans, $villDesc]) {
                $village = new Village();
                $village->setDescription($villDesc);

                foreach ($villTrans as $locale => $title) {
                    $village->addTranslation(
                        (new Translation())->setTitle($title)->setLocale($locale)->setAddress($village)
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
