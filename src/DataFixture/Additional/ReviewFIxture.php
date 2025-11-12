<?php

namespace App\DataFixture\Additional;

use App\Entity\Review\Review;
use Doctrine\Bundle\FixturesBundle\Fixture;
use Doctrine\Persistence\ObjectManager;

class ReviewFIxture extends Fixture
{
    public function load(ObjectManager $manager): void
    {
        $forClient = new Review();
        $forMaster = new Review();

        $reviews = [
            $forClient,
            $forMaster,
        ];

        $forClient->setForReviewer(true);
        $forClient->setRating(5);
        $forClient->setDescription("Хороший клиент, даже помог с установкой😁");

        $forMaster->setForReviewer(false);
        $forMaster->setRating(3.5);
        $forMaster->setDescription("Мастер неплохой, но работу выолнил так себе, честно");

        foreach ($reviews as $object) {
            $manager->persist($object);
        }

        $this->addReference('forClient', $forClient);
        $this->addReference('forMaster', $forMaster);

        $manager->flush();
    }

    public function getDependencies(): array
    {
        return [];
    }
}
