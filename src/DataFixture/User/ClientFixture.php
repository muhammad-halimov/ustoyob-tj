<?php

namespace App\DataFixture\User;

use App\DataFixture\Additional\ReviewFIxture;
use App\DataFixture\Additional\TicketFixture;
use App\Entity\Review\Review;
use App\Entity\Ticket\Ticket;
use App\Entity\User;
use Doctrine\Bundle\FixturesBundle\Fixture;
use Doctrine\Common\DataFixtures\DependentFixtureInterface;
use Doctrine\Persistence\ObjectManager;

class ClientFixture extends Fixture implements DependentFixtureInterface
{
    public function load(ObjectManager $manager): void
    {
        // Client j: author  of review_{2j}            (type=master, client is author)
        //           author  of review_{2*((j+8)%15)+1} (type=master, different master, client is author)
        //           subject of review_{30+2j}          (type=client, client is reviewed)
        //           subject of review_{30+2j+1}        (type=client)
        // First ticket is also the one linked to the client reviews (review_30+2j, 30+2j+1).

        $clientsData = [
            // [ref, email, name, surname, phone, gender, ticketRefs]
            ['rudaki',    'rudaki@mail.pr',    'Абуабдуллоҳ', 'Рӯдакӣ',    '+992 900 200 000', 'gender_male',   ['ticket', 'ticket_remont']],                       // j=0  2 tickets
            ['huroson',   'huroson@mail.pr',   'Рустам',      'Хуросон',   '+992 900 200 001', 'gender_male',   ['ticket_uborka', 't_2', 't_3']],                   // j=1  3 tickets
            ['navruz',    'navruz@mail.pr',    'Навруз',      'Алиев',     '+992 900 200 002', 'gender_male',   ['ticket_it', 't_14']],                             // j=2  2 tickets
            ['sitora',    'sitora@mail.pr',    'Ситора',      'Назарова',  '+992 900 200 003', 'gender_female', ['ticket_foto', 't_20']],                           // j=3  2 tickets
            ['zafar',     'zafar@mail.pr',     'Зафар',       'Муродов',   '+992 900 200 004', 'gender_male',   ['ticket_pereezd', 't_21']],                        // j=4  2 tickets
            ['dilnoza',   'dilnoza@mail.pr',   'Дилноза',     'Каримова',  '+992 900 200 005', 'gender_female', ['ticket_manikur', 'ticket_matem']],                // j=5  2 tickets
            ['bobur',     'bobur@mail.pr',     'Бобур',       'Ахмадов',   '+992 900 200 006', 'gender_male',   ['ticket_unitaz', 'ticket_plitka']],                // j=6  2 tickets
            ['kamola',    'kamola@mail.pr',    'Камола',      'Юсупова',   '+992 900 200 007', 'gender_female', ['ticket_lyustra', 't_5', 't_16']],                 // j=7  3 tickets
            ['sardor',    'sardor@mail.pr',    'Сардор',      'Рустамов',  '+992 900 200 008', 'gender_male',   ['ticket_1c', 't_12', 't_13']],                     // j=8  3 tickets
            ['malika',    'malika@mail.pr',    'Малика',      'Хасанова',  '+992 900 200 009', 'gender_female', ['ticket_svadba', 't_27']],                         // j=9  2 tickets
            ['jasur',     'jasur@mail.pr',     'Жасур',       'Маматов',   '+992 900 200 010', 'gender_male',   ['ticket_maslo', 't_24']],                          // j=10 2 tickets
            ['munira',    'munira@mail.pr',    'Мунира',      'Тошматова', '+992 900 200 011', 'gender_female', ['ticket_dogovor', 't_28']],                        // j=11 2 tickets
            ['parviz',    'parviz@mail.pr',    'Парвиз',      'Ходжаев',   '+992 900 200 012', 'gender_male',   ['ticket_kuzov', 't_25']],                          // j=12 2 tickets
            ['shahlo',    'shahlo@mail.pr',    'Шахло',       'Раҳимова',  '+992 900 200 013', 'gender_female', ['ticket_logo', 't_34']],                           // j=13 2 tickets
            ['suhrab',    'suhrab@mail.pr',    'Сухроб',      'Давлатов',  '+992 900 200 014', 'gender_male',   ['ticket_transfer', 'ticket_provodka']],             // j=14 2 tickets
        ];

        foreach ($clientsData as $j => [$ref, $email, $name, $surname, $phone, $gender, $ticketRefs]) {
            $client = new User();
            $client->setEmail($email);
            $client->setName($name);
            $client->setSurname($surname);
            $client->setPassword('123456');
            $client->setPhone1($phone);
            $client->setRoles(['ROLE_CLIENT']);
            $client->setGender($gender);

            foreach ($ticketRefs as $ticketRef) {
                $client->addUserTicket($this->getReference($ticketRef, Ticket::class));
            }

            // Author of master-type reviews (client wrote these reviews about masters)
            $client->addClientReview($this->getReference('review_' . (2 * $j),               Review::class));
            $client->addClientReview($this->getReference('review_' . (2 * ((($j + 8) % 15)) + 1), Review::class));
            // Subject of client-type reviews (this client gets reviewed)
            $client->addClientReview($this->getReference('review_' . (30 + 2 * $j),     Review::class));
            $client->addClientReview($this->getReference('review_' . (30 + 2 * $j + 1), Review::class));

            $manager->persist($client);
            $this->addReference($ref, $client);
        }

        $manager->flush();
    }

    public function getDependencies(): array
    {
        return [
            TicketFixture::class,
            ReviewFIxture::class,
            MasterFixture::class,
        ];
    }
}
