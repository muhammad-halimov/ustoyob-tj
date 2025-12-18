<?php

namespace App\DataFixture\Geography;

use App\Entity\Geography\District\District;
use App\Entity\Geography\Translation;
use Doctrine\Bundle\FixturesBundle\Fixture;
use Doctrine\Persistence\ObjectManager;
use Doctrine\Common\Collections\ArrayCollection;
use ReflectionClass;

class DistrictFixture extends Fixture
{
    public function load(ObjectManager $manager): void
    {
        $districtsData = [
            ['Rudaki', ['tj'=>'Рудаки','ru'=>'Рудаки','eng'=>'Rudaki'], 'Район Рудаки, Вахдат', 'vahdat'],
            ['Huroson', ['tj'=>'Хуросон','ru'=>'Хуросон','eng'=>'Huroson'], 'Район Хуросон, Вахдат', 'vahdat'],
            ['Sino', ['tj'=>'Сино','ru'=>'Сино','eng'=>'Sino'], 'Район Сино, Душанбе', 'dushanbe'],
            ['Schevchenko', ['tj'=>'Шевченко','ru'=>'Шевченко','eng'=>'Schevchenko'], 'Район Шевченко, Душанбе', 'dushanbe'],
        ];

        foreach ($districtsData as [$ref, $translations, $desc, $cityRef]) {
            $district = new District();
            $district->setDescription($desc);

            $reflection = new ReflectionClass($district);
            /** @noinspection PhpStatementHasEmptyBodyInspection */
            while (!$reflection->hasProperty('translations') && $reflection = $reflection->getParentClass());
            $property = $reflection->getProperty('translations');
            $property->setValue($district, new ArrayCollection());

            foreach ($translations as $locale => $title) {
                $translation = (new Translation())
                    ->setTitle($title)
                    ->setLocale($locale)
                    ->setAddress($district);

                $district->addTranslation($translation);
            }

            $manager->persist($district);
            $this->addReference(strtolower($ref), $district);
        }

        $manager->flush();
    }

    public function getDependencies(): array
    {
        return [CityFixture::class];
    }
}
