<?php

namespace App\DataFixture\Additional;

use App\Entity\Review\Review;
use App\Entity\Ticket\Ticket;
use Doctrine\Bundle\FixturesBundle\Fixture;
use Doctrine\Persistence\ObjectManager;

class TicketFixture extends Fixture
{
    public function load(ObjectManager $manager): void
    {
        $ticket = new Ticket();
        $service = new Ticket();

        $tickets = [
            $ticket,
            $service,
        ];

        $ticket->setTitle("Починить сместитель");
        $ticket->setActive(true);
        $ticket->setService(false);
        $ticket->setBudget(200);
        $ticket->setDescription("
        Салам, сломался,
        нужно будет починить сместитель
        ");

        $service->setTitle("Починка ноутбуков");
        $service->setActive(true);
        $service->setService(true);
        $service->setBudget(200);
        $service->setDescription("
        Доброго времени суток друзья,
        занимаемся починкой ноутбуков,
        качественно и быстро,
        звоните, рады будем помочь!
        ");

        $service->addReview($this->getReference('forMaster', Review::class));

        foreach ($tickets as $object) {
            $manager->persist($object);
        }

        $this->addReference('ticket', $ticket);
        $this->addReference('service', $service);

        $manager->flush();
    }

    public function getDependencies(): array
    {
        return [
            Review::class,
        ];
    }
}
