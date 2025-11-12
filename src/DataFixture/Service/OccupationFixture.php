<?php

namespace App\DataFixture\Service;

use App\Entity\User\Occupation;
use Doctrine\Bundle\FixturesBundle\Fixture;
use Doctrine\Persistence\ObjectManager;

class OccupationFixture extends Fixture
{
    public function load(ObjectManager $manager): void
    {
        $santexnik = new Occupation();
        $programmer = new Occupation();
        $metalist = new Occupation();

        $occupations = [
            $santexnik,
            $programmer,
            $metalist
        ];

        $santexnik->setTitle("Сантехник");
        $santexnik->setDescription("Сантехнические работы");

        $programmer->setTitle("Программист");
        $programmer->setDescription("Программирование, кибербезопасность, devops");

        $metalist->setTitle("Слесарь");
        $metalist->setDescription("Работы с металлом и механизмами");

        foreach ($occupations as $occupation) {
            $manager->persist($occupation);
        }

        $this->addReference('santexnik', $santexnik);
        $this->addReference('programmer', $programmer);
        $this->addReference('metalist', $metalist);

        $manager->flush();
    }

    public function getDependencies(): array
    {
        return [];
    }
}
