<?php

namespace App\DataFixture\Geography;

use App\Entity\Geography\City\City;
use App\Entity\Geography\Translation;
use Doctrine\Bundle\FixturesBundle\Fixture;
use Doctrine\Persistence\ObjectManager;
use Doctrine\Common\Collections\ArrayCollection;
use ReflectionClass;

class CityFixture extends Fixture
{
    public function load(ObjectManager $manager): void
    {
        $citiesData = [
            'Vahdat' => [
                'translations' => [
                    'tj' => 'Ваҳдат',
                    'ru' => 'Вахдат',
                    'eng' => 'Vahdat',
                ],
                'description' => 'Вахдат, ГРРП',
            ],
            'Dushanbe' => [
                'translations' => [
                    'tj' => 'Душанбе',
                    'ru' => 'Душанбе',
                    'eng' => 'Dushanbe',
                ],
                'description' => 'Душанбе, республиканская столица',
            ],
            'Hujand' => [
                'translations' => [
                    'tj' => 'Хуҷанд',
                    'ru' => 'Ходжент',
                    'eng' => 'Hujand',
                ],
                'description' => 'Ходжент, Согдийская область',
            ],
            'Bohtar' => [
                'translations' => [
                    'tj' => 'Бохтар',
                    'ru' => 'Бохтар',
                    'eng' => 'Bohtar',
                ],
                'description' => 'Бохтар, Хатлонская область',
            ],
            'Murghob' => [
                'translations' => [
                    'tj' => 'Мурғоб',
                    'ru' => 'Мургаб',
                    'eng' => 'Murghob',
                ],
                'description' => 'Мургаб, ГБАО',
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
