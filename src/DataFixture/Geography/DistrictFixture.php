<?php

namespace App\DataFixture\Geography;

use App\Entity\Geography\City\City;
use App\Entity\Geography\District\District;
use App\Entity\Ticket\Ticket;
use Doctrine\Bundle\FixturesBundle\Fixture;
use Doctrine\Persistence\ObjectManager;

class DistrictFixture extends Fixture
{
    public function load(ObjectManager $manager): void
    {
        $rudaki = new District();
        $huroson = new District();
        $sino = new District();
        $schevchenko = new District();

        $districts = [
            $rudaki,
            $huroson,
            $sino,
            $schevchenko,
        ];

        $rudaki->setTitle("Рудаки");
        $rudaki->setDescription("Район Рудаки, Вахдат");

        $huroson->setTitle("Хуросон");
        $huroson->setDescription("Район Хуросон, Вахдат");

        $sino->setTitle("Сино");
        $sino->setDescription("Район Сино, Душанбе");

        $schevchenko->setTitle("Шевченко");
        $schevchenko->setDescription("Район Шевченко, Душанбе");

        foreach ($districts as $district) {
            $manager->persist($district);
        }

        $this->addReference('rudaki', $rudaki);
        $this->addReference('huroson', $huroson);
        $this->addReference('sino', $sino);
        $this->addReference('schevchenko', $schevchenko);

        $manager->flush();
    }

    public function getDependencies(): array
    {
        return [
            City::class,
            Ticket::class,
        ];
    }
}
