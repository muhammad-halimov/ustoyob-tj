<?php

namespace App\DataFixture\User;

use App\Entity\Review\Review;
use App\Entity\Ticket\Ticket;
use App\Entity\User;
use Doctrine\Bundle\FixturesBundle\Fixture;
use Doctrine\Persistence\ObjectManager;

class ClientFixture extends Fixture
{
    public function load(ObjectManager $manager): void
    {
        $rudaki = new User();
        $huroson = new User();

        $clients = [
            $rudaki,
            $huroson,
        ];

        $rudaki->setEmail("rudaki@mail.pr");
        $rudaki->setName("Абуабдуллоҳ");
        $rudaki->setSurname("Рӯдакӣ");
        $rudaki->setPassword('123456');
        $rudaki->setPhone1('+992 999 888-777');
        $rudaki->setRoles(["ROLE_CLIENT"]);
        $rudaki->setGender("gender_male");

        $rudaki->addClientReview($this->getReference('forMaster', Review::class));

        $huroson->setEmail("huroson@mail.pr");
        $huroson->setName("Рустам");
        $huroson->setSurname("Хуросон");
        $huroson->setPassword('123456');
        $huroson->setPhone1('+992 999 888-666');
        $huroson->setRoles(["ROLE_CLIENT"]);
        $huroson->setGender("gender_male");

        $huroson->addUserTicket($this->getReference('ticket', Ticket::class));
        $huroson->addClientReview($this->getReference('forClient', Review::class));

        foreach ($clients as $client) {
            $manager->persist($client);
        }

        $this->addReference('rudaki', $rudaki);
        $this->addReference('huroson', $huroson);

        $manager->flush();
    }

    public function getDependencies(): array
    {
        return [
            Ticket::class,
            Review::class,
        ];
    }
}
