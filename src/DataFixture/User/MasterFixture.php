<?php

namespace App\DataFixture\User;

use App\Entity\Geography\District;
use App\Entity\Review\Review;
use App\Entity\Ticket\Ticket;
use App\Entity\User;
use App\Entity\User\Occupation;
use Doctrine\Bundle\FixturesBundle\Fixture;
use Doctrine\Persistence\ObjectManager;

class MasterFixture extends Fixture
{
    public function load(ObjectManager $manager): void
    {
        $firdawsi = new User();
        $hujandi = new User();

        $masters = [
            $firdawsi,
            $hujandi,
        ];

        $firdawsi->setEmail("firdawsi@mail.pr");
        $firdawsi->setName("Абулқосим");
        $firdawsi->setSurname("Фирдавси");
        $firdawsi->setPassword('123456');
        $firdawsi->setPhone1('+992 999 888-333');
        $firdawsi->setRoles(["ROLE_MASTER"]);
        $firdawsi->addOccupation($this->getReference('santexnik', Occupation::class));
        $firdawsi->addDistrict($this->getReference('huroson', District::class));
        $firdawsi->setGender("gender_male");

        $firdawsi->addTicket($this->getReference('service', Ticket::class));
        $firdawsi->addUserServiceReview($this->getReference('forMaster', Review::class));

        $hujandi->setEmail("hujandi@mail.pr");
        $hujandi->setName("Камоли");
        $hujandi->setSurname("Хуҷандӣ");
        $hujandi->setPassword('123456');
        $hujandi->setPhone1('+992 999 888-222');
        $hujandi->setRoles(["ROLE_MASTER"]);
        $hujandi->addOccupation($this->getReference('programmer', Occupation::class));
        $hujandi->addDistrict($this->getReference('rudaki', District::class));
        $hujandi->setGender("gender_male");

        $hujandi->addUserServiceReview($this->getReference('forClient', Review::class));

        foreach ($masters as $master) {
            $manager->persist($master);
        }

        $this->addReference('firdawsi', $firdawsi);
        $this->addReference('hujandi', $hujandi);

        $manager->flush();
    }

    public function getDependencies(): array
    {
        return [
            Occupation::class,
            District::class,
            Ticket::class,
            Review::class,
        ];
    }
}
