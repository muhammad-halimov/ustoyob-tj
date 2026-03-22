<?php

namespace App\DataFixture\Appeal;

use App\DataFixture\Additional\ReviewFIxture;
use App\DataFixture\Ticket\TicketFixture;
use App\DataFixture\User\ClientFixture;
use App\DataFixture\User\MasterFixture;
use App\Entity\Appeal\AppealReason;
use App\Entity\Appeal\AppealTypes\AppealReview;
use App\Entity\Appeal\AppealTypes\AppealTicket;
use App\Entity\Appeal\AppealTypes\AppealUser;
use App\Entity\Review\Review;
use App\Entity\Ticket\Ticket;
use App\Entity\User;
use Doctrine\Bundle\FixturesBundle\Fixture;
use Doctrine\Bundle\FixturesBundle\FixtureGroupInterface;
use Doctrine\Common\DataFixtures\DependentFixtureInterface;
use Doctrine\ORM\EntityManagerInterface;
use Doctrine\Persistence\ObjectManager;

class AppealFixture extends Fixture implements DependentFixtureInterface, FixtureGroupInterface
{
    public function __construct(private readonly EntityManagerInterface $em) {}

    public function load(ObjectManager $manager): void
    {
        $userRepo   = $this->em->getRepository(User::class);
        $ticketRepo = $this->em->getRepository(Ticket::class);
        $reviewRepo = $this->em->getRepository(Review::class);
        $reasonRepo = $this->em->getRepository(AppealReason::class);

        $huroson  = $userRepo->findOneBy(['email' => 'huroson@mail.pr']);
        $firdawsi = $userRepo->findOneBy(['email' => 'firdawsi@mail.pr']);
        $hujandi  = $userRepo->findOneBy(['email' => 'hujandi@mail.pr']);

        $ticket  = $ticketRepo->findOneBy(['service' => false]);
        $service = $ticketRepo->findOneBy(['service' => true]);

        $forMaster = $reviewRepo->findOneBy(['type' => 'master']);
        $forClient = $reviewRepo->findOneBy(['type' => 'client']);

        $badQuality   = $reasonRepo->findOneBy(['code' => 'bad_quality']);
        $fraud        = $reasonRepo->findOneBy(['code' => 'fraud']);
        $fakeReview   = $reasonRepo->findOneBy(['code' => 'fake_review']);
        $unfairRating = $reasonRepo->findOneBy(['code' => 'unfair_rating']);
        $racism       = $reasonRepo->findOneBy(['code' => 'racism_nazism_xenophobia']);

        // Жалоба на услугу (автор: клиент huroson, ответчик: мастер firdawsi)
        if ($huroson && $firdawsi && $service && $badQuality) {
            $appealTicket = (new AppealTicket())
                ->setTitle('Мастер опоздал на 2 часа')
                ->setDescription('Договорились на 10:00, мастер пришёл только в 12:00 без предупреждения')
                ->setReason($badQuality)
                ->setAuthor($huroson)
                ->setRespondent($firdawsi)
                ->setTicket($service);
            $manager->persist($appealTicket);
        }

        // Жалоба на объявление (анонимная — автор null)
        if ($firdawsi && $ticket && $fraud) {
            $appealTicketAnon = (new AppealTicket())
                ->setTitle('Подозрительное объявление')
                ->setDescription('Цены явно завышены, возможно мошенничество')
                ->setReason($fraud)
                ->setAuthor(null)
                ->setRespondent($firdawsi)
                ->setTicket($ticket);
            $manager->persist($appealTicketAnon);
        }

        // Жалоба на отзыв (автор: мастер firdawsi, ответчик: клиент huroson)
        if ($firdawsi && $huroson && $forMaster && $unfairRating) {
            $appealReview = (new AppealReview())
                ->setTitle('Несправедливый отзыв')
                ->setDescription('Клиент оставил отзыв не соответствующий действительности')
                ->setReason($unfairRating)
                ->setAuthor($firdawsi)
                ->setRespondent($huroson)
                ->setReview($forMaster);
            $manager->persist($appealReview);
        }

        // Жалоба на отзыв (анонимная — автор null)
        if ($hujandi && $forClient && $fakeReview) {
            $appealReviewAnon = (new AppealReview())
                ->setTitle('Фейковый отзыв')
                ->setDescription('Этот отзыв явно написан не реальным клиентом')
                ->setReason($fakeReview)
                ->setAuthor(null)
                ->setRespondent($hujandi)
                ->setReview($forClient);
            $manager->persist($appealReviewAnon);
        }

        // Жалоба на пользователя (автор: huroson, ответчик: hujandi)
        if ($huroson && $hujandi && $fraud) {
            $appealUser = (new AppealUser())
                ->setTitle('Мошеннические действия пользователя')
                ->setDescription('Пользователь ввёл в заблуждение и скрылся после оплаты')
                ->setReason($fraud)
                ->setAuthor($huroson)
                ->setRespondent($hujandi);
            $manager->persist($appealUser);
        }

        // Жалоба на пользователя (автор: firdawsi, ответчик: huroson)
        if ($firdawsi && $huroson && $racism) {
            $appealUserRacism = (new AppealUser())
                ->setTitle('Оскорбительное поведение')
                ->setDescription('Пользователь систематически допускает оскорбительные высказывания в адрес других')
                ->setReason($racism)
                ->setAuthor($firdawsi)
                ->setRespondent($huroson);
            $manager->persist($appealUserRacism);
        }

        $manager->flush();
    }

    public function getDependencies(): array
    {
        return [
            AppealReasonFixture::class,
            TicketFixture::class,
            ReviewFIxture::class,
            ClientFixture::class,
            MasterFixture::class,
        ];
    }

    public static function getGroups(): array
    {
        return ['AppealFixture'];
    }
}

