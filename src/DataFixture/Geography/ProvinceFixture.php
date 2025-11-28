<?php

namespace App\DataFixture\Geography;

use App\Entity\Geography\City\City;
use App\Entity\Geography\Province;
use Doctrine\Bundle\FixturesBundle\Fixture;
use Doctrine\Persistence\ObjectManager;

class ProvinceFixture extends Fixture
{
    public function load(ObjectManager $manager): void
    {
        $cdrs = new Province();
        $sughd = new Province();
        $hatlon = new Province();
        $apmb = new Province();

        $provinces = [
            $cdrs,
            $sughd,
            $hatlon,
            $apmb,
        ];

        $cdrs->setProvince("ГРРП");
        $cdrs->setDescription("
        ГРРП,
        Города и районы республиканского подчинения,
        западный Таджикистан
        ");
        $cdrs->addCity($this->getReference('vahdat', City::class));
        $cdrs->addCity($this->getReference('dushanbe', City::class));

        $sughd->setProvince("Согдийская область");
        $sughd->setDescription("Согдийская область, северный Таджикистан");
        $sughd->addCity($this->getReference('hujand', City::class));

        $hatlon->setProvince("Хатлонская область");
        $hatlon->setDescription("Хатлонская область, южный Таджикистан");
        $hatlon->addCity($this->getReference('bohtar', City::class));

        $apmb->setProvince("ГБАО");
        $apmb->setDescription("
        ГБАО,
        Горно-Бадахшанская Автономная область,
        восточный Таджикистан
        ");
        $apmb->addCity($this->getReference('murghob', City::class));

        foreach ($provinces as $province) {
            $manager->persist($province);
        }

        $this->addReference('cdrs', $cdrs);
        $this->addReference('sughd', $sughd);
        $this->addReference('hatlon', $hatlon);
        $this->addReference('apmb', $apmb);

        $manager->flush();
    }

    public function getDependencies(): array
    {
        return [
            City::class,
        ];
    }
}
