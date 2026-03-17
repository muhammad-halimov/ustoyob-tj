<?php

namespace App\DataFixture\Geography;

use App\Entity\Extra\Translation;
use App\Entity\Geography\District\District;
use App\Entity\Geography\Province;
use Doctrine\Bundle\FixturesBundle\Fixture;
use Doctrine\Common\DataFixtures\DependentFixtureInterface;
use Doctrine\Persistence\ObjectManager;

class DistrictFixture extends Fixture implements DependentFixtureInterface
{
    public function load(ObjectManager $manager): void
    {
        // [$ref, $translations, $desc, $provinceRef]
        $districtsData = [
            // ── Душанбе ──
            ['sino',       ['tj' => 'Сино',       'ru' => 'Сино',          'eng' => 'Sino'],          'Район Сино, Душанбе',          'dushanbe'],
            ['schevchenko',['tj' => 'Шевченко',   'ru' => 'Шевченко',      'eng' => 'Shevchenko'],    'Район Шевченко, Душанбе',      'dushanbe'],
            ['ismoil',     ['tj' => 'Исмоил',     'ru' => 'Исмоил Сомони', 'eng' => 'Ismoil Somoni'], 'Район Исмоил Сомони, Душанбе', 'dushanbe'],
            ['firdavsi_d', ['tj' => 'Фирдавсӣ',  'ru' => 'Фирдавси',      'eng' => 'Firdavsi'],      'Район Фирдавси, Душанбе',      'dushanbe'],
            // ── ГРРП ──
            ['rudaki',     ['tj' => 'Рудаки',     'ru' => 'Рудаки',        'eng' => 'Rudaki'],        'Район Рудаки, ГРРП',           'cdrs'],
            ['huroson',    ['tj' => 'Хуросон',    'ru' => 'Хуросон',       'eng' => 'Huroson'],       'Район Хуросон, ГРРП',          'cdrs'],
            ['roshtqala',  ['tj' => 'Роштқалъа',  'ru' => 'Роштала',       'eng' => 'Roshtqala'],     'Район Роштала, ГРРП',          'cdrs'],
            // ── Согдийская область ──
            ['spitamen',   ['tj' => 'Спитамен',   'ru' => 'Спитамен',      'eng' => 'Spitamen'],      'Район Спитамен, Согдийская обл.', 'sughd'],
            ['mastchoh',   ['tj' => 'Мастчоҳ',    'ru' => 'Мастчох',       'eng' => 'Mastchoh'],      'Район Мастчох, Согдийская обл.', 'sughd'],
            ['asht',       ['tj' => 'Ашт',        'ru' => 'Ашт',           'eng' => 'Asht'],          'Район Ашт, Согдийская обл.',   'sughd'],
            // ── Хатлонская область ──
            ['vakhsh_d',   ['tj' => 'Вахш',       'ru' => 'Вахш',          'eng' => 'Vakhsh'],        'Район Вахш, Хатлон',           'hatlon'],
            ['kulob_d',    ['tj' => 'Кӯлоб',      'ru' => 'Куляб',         'eng' => 'Kulob'],         'Куляб, Хатлонская обл.',       'hatlon'],
            ['hamadoni',   ['tj' => 'Ҳамадони',   'ru' => 'Хамадони',      'eng' => 'Hamadoni'],      'Район Хамадони, Хатлон',       'hatlon'],
            // ── ГБАО ──
            ['shugnan',    ['tj' => 'Шуғнон',     'ru' => 'Шугнан',        'eng' => 'Shugnan'],       'Район Шугнан, ГБАО',           'apmb'],
            ['rushan',     ['tj' => 'Рӯшон',      'ru' => 'Рушан',         'eng' => 'Rushan'],        'Район Рушан, ГБАО',            'apmb'],
        ];

        foreach ($districtsData as [$ref, $translations, $desc, $provinceRef]) {
            $district = new District();
            $district->setDescription($desc);

            foreach ($translations as $locale => $title) {
                $district->addTranslation(
                    (new Translation())->setTitle($title)->setLocale($locale)->setAddress($district)
                );
            }

            /** @var Province $province */
            $province = $this->getReference($provinceRef, Province::class);
            $province->addDistrict($district);

            $manager->persist($district);
            $this->addReference($ref, $district);
        }

        $manager->flush();
    }

    public function getDependencies(): array
    {
        return [ProvinceFixture::class];
    }
}

