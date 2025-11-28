<?php

namespace App\DataFixture\Geography;

use App\Entity\Geography\City\City;
use Doctrine\Bundle\FixturesBundle\Fixture;
use Doctrine\Persistence\ObjectManager;

class CityFixture extends Fixture
{
    public function load(ObjectManager $manager): void
    {
        $vahdat = new City();
        $dushanbe = new City();
        $hujand = new City();
        $bohtar = new City();
        $murghob = new City();

        $cities = [
            $vahdat,
            $dushanbe,
            $hujand,
            $bohtar,
            $murghob,
        ];

        $vahdat->setTitle("Вахдат");
        $vahdat->setDescription("Вахдат, ГРРП");

        $dushanbe->setTitle("Душанбе");
        $dushanbe->setDescription("Душанбе, республиканская столица");

        $hujand->setTitle("Ходжент");
        $hujand->setDescription("Ходжент, Согдийская область");

        $bohtar->setTitle("Бохтар");
        $bohtar->setDescription("Бохтар, Хатлонская область");

        $murghob->setTitle("Мургаб");
        $murghob->setDescription("Мургаб, ГБАО");

        foreach ($cities as $city) {
            $manager->persist($city);
        }

        $this->addReference('vahdat', $vahdat);
        $this->addReference('dushanbe', $dushanbe);
        $this->addReference('hujand', $hujand);
        $this->addReference('bohtar', $bohtar);
        $this->addReference('murghob', $murghob);

        $manager->flush();
    }

    public function getDependencies(): array
    {
        return [];
    }
}
