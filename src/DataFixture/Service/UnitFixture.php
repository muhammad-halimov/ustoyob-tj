<?php

namespace App\DataFixture\Service;

use App\Entity\Ticket\Ticket;
use App\Entity\Ticket\Unit;
use Doctrine\Bundle\FixturesBundle\Fixture;
use Doctrine\Persistence\ObjectManager;

class UnitFixture extends Fixture
{
    public function load(ObjectManager $manager): void
    {
        $cubemeter = new Unit();
        $squaremeter = new Unit();
        $pieces = new Unit();
        $pieceless = new Unit();

        $units = [
            $cubemeter,
            $squaremeter,
            $pieces
        ];

        $cubemeter->setTitle("м³");
        $cubemeter->setDescription("Кубический метр");

        $squaremeter->setTitle("м²");
        $squaremeter->setDescription("Квадратный метр");

        $pieces->setTitle("шт");
        $pieces->setDescription("Поштучно");

        $pieceless->setTitle("н/у");
        $pieceless->setDescription("Без единицы");
        $pieceless->addUserTicket($this->getReference("ticket", Ticket::class));
        $pieceless->addUserTicket($this->getReference("service", Ticket::class));

        foreach ($units as $unit) {
            $manager->persist($unit);
        }

        $this->addReference('cubemeter', $cubemeter);
        $this->addReference('squaremeter', $squaremeter);
        $this->addReference('pieces', $pieces);
        $this->addReference('pieceless', $pieceless);

        $manager->flush();
    }

    public function getDependencies(): array
    {
        return [
            Ticket::class,
        ];
    }
}
