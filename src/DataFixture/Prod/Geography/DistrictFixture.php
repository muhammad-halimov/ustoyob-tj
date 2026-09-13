<?php

namespace App\DataFixture\Prod\Geography;

use App\Entity\Extra\Translation;
use App\Entity\Geography\District\District;
use App\Entity\Geography\Province\Province;
use Doctrine\Bundle\FixturesBundle\Fixture;
use Doctrine\Bundle\FixturesBundle\FixtureGroupInterface;
use Doctrine\Common\DataFixtures\DependentFixtureInterface;
use Doctrine\Persistence\ObjectManager;

class DistrictFixture extends Fixture implements DependentFixtureInterface, FixtureGroupInterface
{
    public static function getGroups(): array
    {
        return ['prod'];
    }

    /**
     * БАГФИКС (13.09.2026, тот же класс проблемы, что и у City/Province —
     * см. их докблоки): $desc было одной русской строкой независимо от
     * локали. Теперь per-locale, через Translation.
     */
    public function load(ObjectManager $manager): void
    {
        // [$ref, $translations (title+description по локали), $provinceRef]
        $districtsData = [
            // ── Душанбе ──
            ['sino', [
                'tj'  => ['title' => 'Сино', 'description' => 'Ноҳияи Сино, Душанбе'],
                'ru'  => ['title' => 'Сино', 'description' => 'Район Сино, Душанбе'],
                'eng' => ['title' => 'Sino', 'description' => 'Sino District, Dushanbe'],
            ], 'dushanbe'],
            ['schevchenko', [
                'tj'  => ['title' => 'Шевченко', 'description' => 'Ноҳияи Шевченко, Душанбе'],
                'ru'  => ['title' => 'Шевченко', 'description' => 'Район Шевченко, Душанбе'],
                'eng' => ['title' => 'Shevchenko', 'description' => 'Shevchenko District, Dushanbe'],
            ], 'dushanbe'],
            ['ismoil', [
                'tj'  => ['title' => 'Исмоил', 'description' => 'Ноҳияи Исмоили Сомонӣ, Душанбе'],
                'ru'  => ['title' => 'Исмоил Сомони', 'description' => 'Район Исмоил Сомони, Душанбе'],
                'eng' => ['title' => 'Ismoil Somoni', 'description' => 'Ismoil Somoni District, Dushanbe'],
            ], 'dushanbe'],
            ['firdavsi_d', [
                'tj'  => ['title' => 'Фирдавсӣ', 'description' => 'Ноҳияи Фирдавсӣ, Душанбе'],
                'ru'  => ['title' => 'Фирдавси', 'description' => 'Район Фирдавси, Душанбе'],
                'eng' => ['title' => 'Firdavsi', 'description' => 'Firdavsi District, Dushanbe'],
            ], 'dushanbe'],
            // ── ГРРП ──
            ['rudaki', [
                'tj'  => ['title' => 'Рудаки', 'description' => 'Ноҳияи Рӯдакӣ, НТМ'],
                'ru'  => ['title' => 'Рудаки', 'description' => 'Район Рудаки, ГРРП'],
                'eng' => ['title' => 'Rudaki', 'description' => 'Rudaki District, DRS'],
            ], 'drs'],
            ['huroson', [
                'tj'  => ['title' => 'Хуросон', 'description' => 'Ноҳияи Хуросон, НТМ'],
                'ru'  => ['title' => 'Хуросон', 'description' => 'Район Хуросон, ГРРП'],
                'eng' => ['title' => 'Huroson', 'description' => 'Huroson District, DRS'],
            ], 'drs'],
            ['roshtqala', [
                'tj'  => ['title' => 'Роштқалъа', 'description' => 'Ноҳияи Роштқалъа, НТМ'],
                'ru'  => ['title' => 'Роштала', 'description' => 'Район Роштала, ГРРП'],
                'eng' => ['title' => 'Roshtqala', 'description' => 'Roshtqala District, DRS'],
            ], 'drs'],
            ['vahdat_d', [
                'tj'  => ['title' => 'Ваҳдат', 'description' => 'Ноҳияи Ваҳдат, НТМ'],
                'ru'  => ['title' => 'Вахдат', 'description' => 'Район Вахдат, ГРРП'],
                'eng' => ['title' => 'Vahdat', 'description' => 'Vahdat District, DRS'],
            ], 'drs'],
            ['hisor_d', [
                'tj'  => ['title' => 'Ҳисор', 'description' => 'Ноҳияи Ҳисор, НТМ'],
                'ru'  => ['title' => 'Гиссар', 'description' => 'Район Гиссар, ГРРП'],
                'eng' => ['title' => 'Hisor', 'description' => 'Hisor District, DRS'],
            ], 'drs'],
            ['tursunzoda_d', [
                'tj'  => ['title' => 'Турсунзода', 'description' => 'Ноҳияи Турсунзода, НТМ'],
                'ru'  => ['title' => 'Турсунзаде', 'description' => 'Район Турсунзаде, ГРРП'],
                'eng' => ['title' => 'Tursunzoda', 'description' => 'Tursunzoda District, DRS'],
            ], 'drs'],
            ['nurobod', [
                'tj'  => ['title' => 'Нуробод', 'description' => 'Ноҳияи Нуробод, НТМ'],
                'ru'  => ['title' => 'Нурабад', 'description' => 'Район Нурабад, ГРРП'],
                'eng' => ['title' => 'Nurobod', 'description' => 'Nurobod District, DRS'],
            ], 'drs'],
            ['varzob', [
                'tj'  => ['title' => 'Варзоб', 'description' => 'Ноҳияи Варзоб, НТМ'],
                'ru'  => ['title' => 'Варзоб', 'description' => 'Район Варзоб, ГРРП'],
                'eng' => ['title' => 'Varzob', 'description' => 'Varzob District, DRS'],
            ], 'drs'],
            // ── Согдийская область ──
            ['spitamen', [
                'tj'  => ['title' => 'Спитамен', 'description' => 'Ноҳияи Спитамен, Вилояти Суғд'],
                'ru'  => ['title' => 'Спитамен', 'description' => 'Район Спитамен, Согдийская обл.'],
                'eng' => ['title' => 'Spitamen', 'description' => 'Spitamen District, Sughd Province'],
            ], 'sughd'],
            ['mastchoh', [
                'tj'  => ['title' => 'Мастчоҳ', 'description' => 'Ноҳияи Мастчоҳ, Вилояти Суғд'],
                'ru'  => ['title' => 'Мастчох', 'description' => 'Район Мастчох, Согдийская обл.'],
                'eng' => ['title' => 'Mastchoh', 'description' => 'Mastchoh District, Sughd Province'],
            ], 'sughd'],
            ['asht', [
                'tj'  => ['title' => 'Ашт', 'description' => 'Ноҳияи Ашт, Вилояти Суғд'],
                'ru'  => ['title' => 'Ашт', 'description' => 'Район Ашт, Согдийская обл.'],
                'eng' => ['title' => 'Asht', 'description' => 'Asht District, Sughd Province'],
            ], 'sughd'],
            ['isfara_d', [
                'tj'  => ['title' => 'Исфара', 'description' => 'Ноҳияи Исфара, Вилояти Суғд'],
                'ru'  => ['title' => 'Исфара', 'description' => 'Район Исфара, Согдийская обл.'],
                'eng' => ['title' => 'Isfara', 'description' => 'Isfara District, Sughd Province'],
            ], 'sughd'],
            ['ghafurov', [
                'tj'  => ['title' => 'Бобоҷон Ғафуров', 'description' => 'Ноҳияи Бобоҷон Ғафуров, Вилояти Суғд'],
                'ru'  => ['title' => 'Бободжон Гафуров', 'description' => 'Район Бободжон Гафуров, Согдийская обл.'],
                'eng' => ['title' => 'Bobojon Ghafurov', 'description' => 'Bobojon Ghafurov District, Sughd Province'],
            ], 'sughd'],
            ['zafarobod', [
                'tj'  => ['title' => 'Зафаробод', 'description' => 'Ноҳияи Зафаробод, Вилояти Суғд'],
                'ru'  => ['title' => 'Зафарабад', 'description' => 'Район Зафарабад, Согдийская обл.'],
                'eng' => ['title' => 'Zafarobod', 'description' => 'Zafarobod District, Sughd Province'],
            ], 'sughd'],
            // ── Хатлонская область ──
            ['vakhsh_d', [
                'tj'  => ['title' => 'Вахш', 'description' => 'Ноҳияи Вахш, Вилояти Хатлон'],
                'ru'  => ['title' => 'Вахш', 'description' => 'Район Вахш, Хатлон'],
                'eng' => ['title' => 'Vakhsh', 'description' => 'Vakhsh District, Khatlon'],
            ], 'hatlon'],
            ['kulob_d', [
                'tj'  => ['title' => 'Кӯлоб', 'description' => 'Ноҳияи Кӯлоб, Вилояти Хатлон'],
                'ru'  => ['title' => 'Куляб', 'description' => 'Куляб, Хатлонская обл.'],
                'eng' => ['title' => 'Kulob', 'description' => 'Kulob District, Khatlon'],
            ], 'hatlon'],
            ['hamadoni', [
                'tj'  => ['title' => 'Ҳамадони', 'description' => 'Ноҳияи Ҳамадонӣ, Вилояти Хатлон'],
                'ru'  => ['title' => 'Хамадони', 'description' => 'Район Хамадони, Хатлон'],
                'eng' => ['title' => 'Hamadoni', 'description' => 'Hamadoni District, Khatlon'],
            ], 'hatlon'],
            ['farkhor_d', [
                'tj'  => ['title' => 'Фарҳор', 'description' => 'Ноҳияи Фарҳор, Вилояти Хатлон'],
                'ru'  => ['title' => 'Фархор', 'description' => 'Район Фархор, Хатлон'],
                'eng' => ['title' => 'Farkhor', 'description' => 'Farkhor District, Khatlon'],
            ], 'hatlon'],
            ['panj', [
                'tj'  => ['title' => 'Панҷ', 'description' => 'Ноҳияи Панҷ, Вилояти Хатлон'],
                'ru'  => ['title' => 'Пяндж', 'description' => 'Район Пяндж, Хатлон'],
                'eng' => ['title' => 'Panj', 'description' => 'Panj District, Khatlon'],
            ], 'hatlon'],
            ['norak_d', [
                'tj'  => ['title' => 'Норак', 'description' => 'Норак (шаҳри тобеи ҷумҳурии вилояти Хатлон)'],
                'ru'  => ['title' => 'Нурек', 'description' => 'Нурек (город респ. подчинения Хатлона)'],
                'eng' => ['title' => 'Norak', 'description' => 'Norak (city under Khatlon republican subordination)'],
            ], 'hatlon'],
            ['muminobod', [
                'tj'  => ['title' => 'Муъминобод', 'description' => 'Ноҳияи Муъминобод, Вилояти Хатлон'],
                'ru'  => ['title' => 'Муминабад', 'description' => 'Район Муминабад, Хатлон'],
                'eng' => ['title' => 'Muminobod', 'description' => 'Muminobod District, Khatlon'],
            ], 'hatlon'],
            // ── ГБАО ──
            ['shugnan', [
                'tj'  => ['title' => 'Шуғнон', 'description' => 'Ноҳияи Шуғнон, ВМКБ'],
                'ru'  => ['title' => 'Шугнан', 'description' => 'Район Шугнан, ГБАО'],
                'eng' => ['title' => 'Shugnan', 'description' => 'Shugnan District, GBAO'],
            ], 'bmap'],
            ['rushan', [
                'tj'  => ['title' => 'Рӯшон', 'description' => 'Ноҳияи Рӯшон, ВМКБ'],
                'ru'  => ['title' => 'Рушан', 'description' => 'Район Рушан, ГБАО'],
                'eng' => ['title' => 'Rushan', 'description' => 'Rushan District, GBAO'],
            ], 'bmap'],
            ['ishkoshim_d', [
                'tj'  => ['title' => 'Ишкошим', 'description' => 'Ноҳияи Ишкошим, ВМКБ'],
                'ru'  => ['title' => 'Ишкашим', 'description' => 'Район Ишкашим, ГБАО'],
                'eng' => ['title' => 'Ishkoshim', 'description' => 'Ishkoshim District, GBAO'],
            ], 'bmap'],
            ['vanj', [
                'tj'  => ['title' => 'Ванҷ', 'description' => 'Ноҳияи Ванҷ, ВМКБ'],
                'ru'  => ['title' => 'Ванч', 'description' => 'Район Ванч, ГБАО'],
                'eng' => ['title' => 'Vanj', 'description' => 'Vanj District, GBAO'],
            ], 'bmap'],
            ['darvoz', [
                'tj'  => ['title' => 'Дарвоз', 'description' => 'Ноҳияи Дарвоз, ВМКБ'],
                'ru'  => ['title' => 'Дарваз', 'description' => 'Район Дарваз, ГБАО'],
                'eng' => ['title' => 'Darvoz', 'description' => 'Darvoz District, GBAO'],
            ], 'bmap'],
        ];

        foreach ($districtsData as [$ref, $translations, $provinceRef]) {
            $district = new District();

            // Фолбэк на самой сущности — тот же паттерн, что у City/Province.
            $district->setDescription($translations['ru']['description']);

            foreach ($translations as $locale => $trans) {
                $district->addTranslation(
                    (new Translation())
                        ->setTitle($trans['title'])
                        ->setDescription($trans['description'])
                        ->setLocale($locale)
                        ->setAddress($district)
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

