<?php

namespace App\DataFixture\Prod\Geography;

use App\Entity\Extra\Translation;
use App\Entity\Geography\City\City;
use App\Entity\Geography\Province\Province;
use Doctrine\Bundle\FixturesBundle\Fixture;
use Doctrine\Bundle\FixturesBundle\FixtureGroupInterface;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\DataFixtures\DependentFixtureInterface;
use Doctrine\Persistence\ObjectManager;
use ReflectionClass;

class ProvinceFixture extends Fixture implements DependentFixtureInterface, FixtureGroupInterface
{
    public static function getGroups(): array
    {
        return ['prod'];
    }

    /**
     * БАГФИКС (13.09.2026, тот же класс проблемы, что и у Category/
     * Occupation/City — см. их докблоки): $desc было одной русской строкой
     * независимо от локали. Теперь per-locale, через Translation.
     */
    public function load(ObjectManager $manager): void
    {
        // [$ref, $translations (title+description по локали), $citiesRefs]
        $provincesData = [
            [
                'drs',
                [
                    'tj'  => ['title' => 'НТМ',              'description' => 'НТМ, Ноҳияҳои тобеи ҷумҳурӣ, ғарби Тоҷикистон'],
                    'ru'  => ['title' => 'РРП',               'description' => 'РРП, Районы республиканского подчинения, западный Таджикистан'],
                    'eng' => ['title' => 'DRS',                'description' => 'DRS, Districts of Republican Subordination, western Tajikistan'],
                ],
                ['vahdat', 'rogun', 'faizobod'],
            ],
            [
                'sughd',
                [
                    'tj'  => ['title' => 'Вилояти Суғд',      'description' => 'Вилояти Суғд, шимоли Тоҷикистон'],
                    'ru'  => ['title' => 'Согдийская область', 'description' => 'Согдийская область, северный Таджикистан'],
                    'eng' => ['title' => 'Sughd Province',     'description' => 'Sughd Province, northern Tajikistan'],
                ],
                ['hujand', 'istaravshan', 'konibodom', 'panjakent', 'buston'],
            ],
            [
                'hatlon',
                [
                    'tj'  => ['title' => 'Вилояти Хатлон',    'description' => 'Вилояти Хатлон, ҷануби Тоҷикистон'],
                    'ru'  => ['title' => 'Хатлонская область', 'description' => 'Хатлонская область, южный Таджикистан'],
                    'eng' => ['title' => 'Hatlon Province',    'description' => 'Khatlon Province, southern Tajikistan'],
                ],
                ['bohtar', 'kulob', 'qurghonteppa', 'vose', 'danghara', 'vakhsh'],
            ],
            [
                'bmap',
                [
                    'tj'  => ['title' => 'ВМКБ', 'description' => 'ВМКБ, Вилояти Мухтори Кӯҳистони Бадахшон, шарқи Тоҷикистон'],
                    'ru'  => ['title' => 'ГБАО', 'description' => 'ГБАО, Горно-Бадахшанская Автономная область, восточный Таджикистан'],
                    'eng' => ['title' => 'BMAP', 'description' => 'GBAO, Gorno-Badakhshan Autonomous Province, eastern Tajikistan'],
                ],
                ['murghob', 'khorog', 'ishkoshim'],
            ],
            [
                'dushanbe',
                [
                    'tj'  => ['title' => 'Душанбе', 'description' => 'Душанбе, пойтахти ҷумҳурӣ, ғарби Тоҷикистон'],
                    'ru'  => ['title' => 'Душанбе', 'description' => 'Душанбе, республиканская столица, западный Таджикистан'],
                    'eng' => ['title' => 'Dushanbe', 'description' => 'Dushanbe, the republican capital, western Tajikistan'],
                ],
                ['dushanbe'],
            ],
        ];

        foreach ($provincesData as [$ref, $translations, $citiesRefs]) {
            $province = new Province();

            // Фолбэк на самой сущности — тот же паттерн, что у Category/
            // Legal/Occupation/City (см. их докблоки).
            $province->setDescription($translations['ru']['description']);

            $reflection = new ReflectionClass($province);
            /** @noinspection PhpStatementHasEmptyBodyInspection */
            while (!$reflection->hasProperty('translations') && $reflection = $reflection->getParentClass());
            $property = $reflection->getProperty('translations');
            $property->setValue($province, new ArrayCollection());

            foreach ($translations as $locale => $trans) {
                $translation = (new Translation())
                    ->setTitle($trans['title'])
                    ->setDescription($trans['description'])
                    ->setLocale($locale)
                    ->setAddress($province);

                $province->addTranslation($translation);
            }

            foreach ($citiesRefs as $cityRef) {
                $province->addCity($this->getReference($cityRef, City::class));
            }

            $manager->persist($province);
            $this->addReference($ref, $province);
        }

        $manager->flush();
    }

    public function getDependencies(): array
    {
        return [CityFixture::class];
    }
}
