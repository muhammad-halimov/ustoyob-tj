<?php

namespace App\DataFixture\Additional;

use App\DataFixture\User\ClientFixture;
use App\DataFixture\User\MasterFixture;
use App\Entity\Extra\BlackList;
use App\Entity\Extra\Favorite;
use App\Entity\Ticket\Ticket;
use App\Entity\User;
use Doctrine\Bundle\FixturesBundle\Fixture;
use Doctrine\Common\DataFixtures\DependentFixtureInterface;
use Doctrine\Persistence\ObjectManager;

/**
 * Fixtures for BlackList and Favorite entries.
 *
 * firdawsi (master):
 *   favorites  → clients rudaki, sitora, dilnoza; ticket ticket_remont
 *   blacklist  → clients bobur, jasur
 *
 * rudaki (client):
 *   favorites  → masters firdawsi, mavlono; ticket service_santex
 *   blacklist  → masters nodir, alisher
 */
class CollectionEntryFixture extends Fixture implements DependentFixtureInterface
{
    public function load(ObjectManager $manager): void
    {
        $firdawsi = $this->getReference('firdawsi', User::class);
        $rudaki   = $this->getReference('rudaki',   User::class);

        // ── firdawsi's favorites ──
        foreach (['rudaki', 'sitora', 'dilnoza'] as $clientRef) {
            $fav = new Favorite();
            $fav->setOwner($firdawsi)->setType('user');
            $fav->setUser($this->getReference($clientRef, User::class));
            $manager->persist($fav);
        }

        $fav = new Favorite();
        $fav->setOwner($firdawsi)->setType('ticket');
        $fav->setTicket($this->getReference('ticket_remont', Ticket::class));
        $manager->persist($fav);

        // ── firdawsi's blacklist ──
        foreach (['bobur', 'jasur'] as $clientRef) {
            $bl = new BlackList();
            $bl->setOwner($firdawsi)->setType('user');
            $bl->setUser($this->getReference($clientRef, User::class));
            $manager->persist($bl);
        }

        // ── rudaki's favorites ──
        foreach (['firdawsi', 'mavlono'] as $masterRef) {
            $fav = new Favorite();
            $fav->setOwner($rudaki)->setType('user');
            $fav->setUser($this->getReference($masterRef, User::class));
            $manager->persist($fav);
        }

        $fav = new Favorite();
        $fav->setOwner($rudaki)->setType('ticket');
        $fav->setTicket($this->getReference('service_santex', Ticket::class));
        $manager->persist($fav);

        // ── rudaki's blacklist ──
        foreach (['nodir', 'alisher'] as $masterRef) {
            $bl = new BlackList();
            $bl->setOwner($rudaki)->setType('user');
            $bl->setUser($this->getReference($masterRef, User::class));
            $manager->persist($bl);
        }

        $manager->flush();
    }

    public function getDependencies(): array
    {
        return [
            MasterFixture::class,
            ClientFixture::class,
            TicketFixture::class,
        ];
    }
}
