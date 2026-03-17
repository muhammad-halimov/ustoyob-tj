<?php

namespace App\DataFixture\User;

use App\DataFixture\Additional\ReviewFIxture;
use App\DataFixture\Additional\TicketFixture;
use App\DataFixture\Geography\DistrictFixture;
use App\DataFixture\Service\OccupationFixture;
use App\Entity\Review\Review;
use App\Entity\Ticket\Ticket;
use App\Entity\User;
use App\Entity\User\Occupation;
use Doctrine\Bundle\FixturesBundle\Fixture;
use Doctrine\Common\DataFixtures\DependentFixtureInterface;
use Doctrine\Persistence\ObjectManager;

class MasterFixture extends Fixture implements DependentFixtureInterface
{
    public function load(ObjectManager $manager): void
    {
        // Master i: subject of review_{2i} and review_{2i+1} (type=master)
        //           author  of review_{30+2i} and review_{30+2i+1} (type=client)
        // Ticket ref is the master's own service ticket.
        $mastersData = [
            // [ref, email, name, surname, phone, gender, occupationRef, serviceTicketRef]
            ['hujandi',    'hujandi@mail.pr',    'Камоли',    'Хуҷандӣ',    '+992 900 100 000', 'gender_male',   'programmer',      'service'],
            ['firdawsi',   'firdawsi@mail.pr',   'Абулқосим', 'Фирдавси',   '+992 900 100 001', 'gender_male',   'santexnik',       'service_santex'],
            ['mavlono',    'mavlono@mail.pr',     'Мавлоно',   'Балхӣ',      '+992 900 100 002', 'gender_male',   'stroitel',        'service_stroitel'],
            ['kamoliddin', 'kamoliddin@mail.pr',  'Камолиддин','Бехзод',     '+992 900 100 003', 'gender_male',   'voditel',         'service_transport'],
            ['rustam_e',   'rustam_e@mail.pr',    'Рустам',    'Барқӣ',      '+992 900 100 004', 'gender_male',   'elektrik',        'service_elektrik'],
            ['latofat',    'latofat@mail.pr',     'Латофат',   'Рашидова',   '+992 900 100 005', 'gender_female', 'kliner',          'service_kliner'],
            ['shoira',     'shoira@mail.pr',      'Шоира',     'Масудова',   '+992 900 100 006', 'gender_female', 'masseur',         'service_masseur'],
            ['bahodir',    'bahodir@mail.pr',     'Баҳодир',   'Юсупов',     '+992 900 100 007', 'gender_male',   'yurist',          'service_yurist'],
            ['timur',      'timur@mail.pr',       'Тимур',     'Назаров',    '+992 900 100 008', 'gender_male',   'avtomehanik',     'service_avto'],
            ['gulnora',    'gulnora@mail.pr',      'Гулнора',   'Каримова',   '+992 900 100 009', 'gender_female', 'parikmakher',     'service_parikm'],
            ['alisher',    'alisher@mail.pr',     'Алишер',    'Ходжаев',    '+992 900 100 010', 'gender_male',   'fotograf',        'service_foto'],
            ['nodir',      'nodir@mail.pr',       'Нодир',     'Валиев',     '+992 900 100 011', 'gender_male',   'videograf',       'service_video'],
            ['firuza',     'firuza@mail.pr',      'Фируза',    'Рашидова',   '+992 900 100 012', 'gender_female', 'kosmetolog',      'service_kosm'],
            ['jahongir',   'jahongir@mail.pr',    'Жаҳонгир',  'Муминов',    '+992 900 100 013', 'gender_male',   'repetitor',       'service_rep'],
            ['saidakbar',  'saidakbar@mail.pr',   'Саидакбар', 'Назаров',    '+992 900 100 014', 'gender_male',   'grafik_dizayner', 'service_design'],
        ];

        foreach ($mastersData as $i => [$ref, $email, $name, $surname, $phone, $gender, $occRef, $ticketRef]) {
            $master = new User();
            $master->setEmail($email);
            $master->setName($name);
            $master->setSurname($surname);
            $master->setPassword('123456');
            $master->setPhone1($phone);
            $master->setRoles(['ROLE_MASTER']);
            $master->setGender($gender);
            $master->addOccupation($this->getReference($occRef, Occupation::class));
            $master->addTicket($this->getReference($ticketRef, Ticket::class));

            // Subject of master-type reviews (type=master, master=this user)
            $master->addMasterReview($this->getReference('review_' . (2 * $i),     Review::class));
            $master->addMasterReview($this->getReference('review_' . (2 * $i + 1), Review::class));
            // Author of client-type reviews (type=client, master=this user as author)
            $master->addMasterReview($this->getReference('review_' . (30 + 2 * $i),     Review::class));
            $master->addMasterReview($this->getReference('review_' . (30 + 2 * $i + 1), Review::class));

            $manager->persist($master);
            $this->addReference($ref, $master);
        }

        $manager->flush();
    }

    public function getDependencies(): array
    {
        return [
            OccupationFixture::class,
            DistrictFixture::class,
            TicketFixture::class,
            ReviewFIxture::class,
        ];
    }
}
