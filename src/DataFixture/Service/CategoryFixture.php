<?php

namespace App\DataFixture\Service;

use App\Entity\Service\Category;
use App\Entity\Ticket\Ticket;
use Doctrine\Bundle\FixturesBundle\Fixture;
use Doctrine\Persistence\ObjectManager;

class CategoryFixture extends Fixture
{
    public function load(ObjectManager $manager): void
    {
        $santexnika = new Category();
        $it = new Category();
        $beauty = new Category();

        $categories = [
            $santexnika,
            $it,
            $beauty
        ];

        $santexnika->setTitle("Сантехника");
        $santexnika->setDescription("Сантехнические работы");
        $santexnika->addUserTicket($this->getReference('ticket', Ticket::class));

        $it->setTitle("IT");
        $it->setDescription("Программирование, кибербезопасность, devops");
        $it->addUserTicket($this->getReference('service', Ticket::class));

        $beauty->setTitle("Красота и здоровье");
        $beauty->setDescription("Красота и здоровье");

        foreach ($categories as $category) {
            $manager->persist($category);
        }

        $this->addReference('santexnika', $santexnika);
        $this->addReference('it', $it);
        $this->addReference('beauty', $beauty);

        $manager->flush();
    }

    public function getDependencies(): array
    {
        return [
            Ticket::class
        ];
    }
}
