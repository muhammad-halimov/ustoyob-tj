<?php

namespace App\DataFixture\Prod\Geography;

use App\Entity\Extra\Translation;
use App\Entity\Geography\City\City;
use App\Entity\Geography\City\Suburb;
use Doctrine\Bundle\FixturesBundle\Fixture;
use Doctrine\Bundle\FixturesBundle\FixtureGroupInterface;
use Doctrine\Common\DataFixtures\DependentFixtureInterface;
use Doctrine\Persistence\ObjectManager;

/**
 * Suburbs (ПГТ — посёлки городского типа / кварталы городских районов).
 */
class SuburbFixture extends Fixture implements DependentFixtureInterface, FixtureGroupInterface
{
    public static function getGroups(): array
    {
        return ['prod'];
    }

    /**
     * БАГФИКС (13.09.2026, тот же класс проблемы, что и у City/Province/
     * District — см. их докблоки): $desc было одной русской строкой
     * независимо от локали. Теперь per-locale, через Translation.
     */
    public function load(ObjectManager $manager): void
    {
        // [$ref, $cityRef, $translations (title+description по локали)]
        $suburbsData = [
            // ── Душанбе ──
            ['dshanbe_shohmansur', 'dushanbe', [
                'tj'  => ['title' => 'Шоҳмансур', 'description' => 'Шаҳраки Шоҳмансур, Душанбе'],
                'ru'  => ['title' => 'Шохмансур', 'description' => 'ПГТ Шохмансур, Душанбе'],
                'eng' => ['title' => 'Shohmansur', 'description' => 'Shohmansur urban settlement, Dushanbe'],
            ]],
            ['dshanbe_zarnisor', 'dushanbe', [
                'tj'  => ['title' => 'Зарнисор', 'description' => 'Шаҳраки Зарнисор, Душанбе'],
                'ru'  => ['title' => 'Зарнисор', 'description' => 'ПГТ Зарнисор, Душанбе'],
                'eng' => ['title' => 'Zarnisor', 'description' => 'Zarnisor urban settlement, Dushanbe'],
            ]],
            ['dshanbe_ismoil', 'dushanbe', [
                'tj'  => ['title' => 'Исмоили Сомонӣ', 'description' => 'Маҳаллаи Исмоили Сомонӣ, Душанбе'],
                'ru'  => ['title' => 'Исмоил Сомони', 'description' => 'Квартал Исмоил Сомони, Душанбе'],
                'eng' => ['title' => 'Ismoil Somoni', 'description' => 'Ismoil Somoni neighbourhood, Dushanbe'],
            ]],
            ['dshanbe_sino', 'dushanbe', [
                'tj'  => ['title' => 'Микрорайони Сино', 'description' => 'Микрорайони Сино, Душанбе'],
                'ru'  => ['title' => 'Микрорайон Сино', 'description' => 'Микрорайон Сино, Душанбе'],
                'eng' => ['title' => 'Sino Microdistrict', 'description' => 'Sino microdistrict, Dushanbe'],
            ]],
            ['dshanbe_behzod', 'dushanbe', [
                'tj'  => ['title' => 'Беҳзод', 'description' => 'Маҳаллаи Беҳзод, Душанбе'],
                'ru'  => ['title' => 'Бехзод', 'description' => 'Квартал Бехзод, Душанбе'],
                'eng' => ['title' => 'Behzod', 'description' => 'Behzod neighbourhood, Dushanbe'],
            ]],
            ['dshanbe_shah', 'dushanbe', [
                'tj'  => ['title' => 'Шаҳринав', 'description' => 'Шаҳраки Шаҳринав, Душанбе'],
                'ru'  => ['title' => 'Шахринав', 'description' => 'ПГТ Шахринав, Душанбе'],
                'eng' => ['title' => 'Shahrinav', 'description' => 'Shahrinav urban settlement, Dushanbe'],
            ]],
            // ── Ходжент ──
            ['hujand_khoja', 'hujand', [
                'tj'  => ['title' => 'Хоҷа Аъло', 'description' => 'Маҳаллаи Хоҷа Аъло, Хуҷанд'],
                'ru'  => ['title' => 'Ходжа Ало', 'description' => 'Квартал Ходжа Ало, Ходжент'],
                'eng' => ['title' => 'Khoja Alo', 'description' => 'Khoja Alo neighbourhood, Hujand'],
            ]],
            ['hujand_bogh', 'hujand', [
                'tj'  => ['title' => 'Боғи Ширин', 'description' => 'Маҳаллаи Боғи Ширин, Хуҷанд'],
                'ru'  => ['title' => 'Баги Ширин', 'description' => 'Квартал Баги Ширин, Ходжент'],
                'eng' => ['title' => 'Bogi Shirin', 'description' => 'Bogi Shirin neighbourhood, Hujand'],
            ]],
            ['hujand_kkh', 'hujand', [
                'tj'  => ['title' => 'Кӯчаи Хушёр', 'description' => 'Маҳаллаи Кӯчаи Хушёр, Хуҷанд'],
                'ru'  => ['title' => 'Улица Хушьёр', 'description' => 'Квартал Хушьёр, Ходжент'],
                'eng' => ['title' => 'Khushyor St. Area', 'description' => 'Khushyor Street area, Hujand'],
            ]],
            // ── Бохтар ──
            ['bohtar_markaz', 'bohtar', [
                'tj'  => ['title' => 'Марказ', 'description' => 'Маҳаллаи марказӣ, Бохтар'],
                'ru'  => ['title' => 'Центральный', 'description' => 'Центральный квартал, Бохтар'],
                'eng' => ['title' => 'Center', 'description' => 'Central neighbourhood, Bohtar'],
            ]],
            ['bohtar_nav', 'bohtar', [
                'tj'  => ['title' => 'Нав', 'description' => 'Маҳаллаи нав, Бохтар'],
                'ru'  => ['title' => 'Новый', 'description' => 'Новый квартал, Бохтар'],
                'eng' => ['title' => 'New District', 'description' => 'New neighbourhood, Bohtar'],
            ]],
            // ── Хорог ──
            ['khorog_markaz', 'khorog', [
                'tj'  => ['title' => 'Марказ', 'description' => 'Маркази шаҳр, Хоруғ'],
                'ru'  => ['title' => 'Центр', 'description' => 'Центр города, Хорог'],
                'eng' => ['title' => 'Center', 'description' => 'City centre, Khorog'],
            ]],
            ['khorog_porshev', 'khorog', [
                'tj'  => ['title' => 'Поршнев', 'description' => 'Маҳаллаи Поршнев, Хоруғ'],
                'ru'  => ['title' => 'Поршнев', 'description' => 'Квартал Поршнев, Хорог'],
                'eng' => ['title' => 'Porshnev', 'description' => 'Porshnev neighbourhood, Khorog'],
            ]],
            // ── Исфара ──
            ['isfara_markaz', 'isfara', [
                'tj'  => ['title' => 'Марказ', 'description' => 'Маҳаллаи марказӣ, Исфара'],
                'ru'  => ['title' => 'Центральный', 'description' => 'Центральный квартал, Исфара'],
                'eng' => ['title' => 'Center', 'description' => 'Central neighbourhood, Isfara'],
            ]],
            ['isfara_chorku_q', 'isfara', [
                'tj'  => ['title' => 'Чоркӯҳӣ', 'description' => 'Маҳаллаи Чоркӯҳӣ, Исфара'],
                'ru'  => ['title' => 'Чоркухский', 'description' => 'Квартал Чоркухский, Исфара'],
                'eng' => ['title' => 'Chorku Area', 'description' => 'Chorku neighbourhood, Isfara'],
            ]],
            // ── Гиссар ──
            ['hisor_markaz', 'hisor', [
                'tj'  => ['title' => 'Марказ', 'description' => 'Маркази шаҳр, Ҳисор'],
                'ru'  => ['title' => 'Центр', 'description' => 'Центр города, Гиссар'],
                'eng' => ['title' => 'Center', 'description' => 'City centre, Hisor'],
            ]],
            // ── Турсунзаде ──
            ['tursunzoda_markaz', 'tursunzoda', [
                'tj'  => ['title' => 'Марказ', 'description' => 'Маркази шаҳр, Турсунзода'],
                'ru'  => ['title' => 'Центр', 'description' => 'Центр города, Турсунзаде'],
                'eng' => ['title' => 'Center', 'description' => 'City centre, Tursunzoda'],
            ]],
            // ── Нурек ──
            ['norak_markaz', 'norak', [
                'tj'  => ['title' => 'Марказ', 'description' => 'Маркази шаҳр, Норак'],
                'ru'  => ['title' => 'Центр', 'description' => 'Центр города, Нурек'],
                'eng' => ['title' => 'Center', 'description' => 'City centre, Norak'],
            ]],
        ];

        foreach ($suburbsData as [$ref, $cityRef, $translations]) {
            $suburb = new Suburb();

            // Фолбэк на самой сущности — тот же паттерн, что у City/Province/District.
            $suburb->setDescription($translations['ru']['description']);

            foreach ($translations as $locale => $trans) {
                $suburb->addTranslation(
                    (new Translation())
                        ->setTitle($trans['title'])
                        ->setDescription($trans['description'])
                        ->setLocale($locale)
                        ->setAddress($suburb)
                );
            }

            /** @var City $city */
            $city = $this->getReference($cityRef, City::class);
            $city->addSuburb($suburb);

            $manager->persist($suburb);
            $this->addReference($ref, $suburb);
        }

        $manager->flush();
    }

    public function getDependencies(): array
    {
        return [CityFixture::class];
    }
}
