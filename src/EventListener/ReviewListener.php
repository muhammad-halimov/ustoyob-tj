<?php

namespace App\EventListener;

use App\Entity\Review\Review;
use App\Repository\Review\ReviewRepository;
use Doctrine\Bundle\DoctrineBundle\Attribute\AsEntityListener;
use Doctrine\ORM\EntityManagerInterface;
use Doctrine\ORM\Events;

/**
 * Пересчитывает средний рейтинг пользователя при любом изменении его отзывов.
 *
 * Почему нужен preRemove + postRemove, а не просто postRemove?
 *   После того как Doctrine удалит запись из БД, entity-объект теряет
 *   свои связи (getClient()/getMaster() начинают возвращать null).
 *   В preRemove мы клонируем объект, пока связи ещё живы, и используем
 *   клон в postRemove для пересчёта рейтинга.
 *
 * Почему рейтинг не считается в ApiPostReviewController с помощью AppError?
 *   Логика рейтинга — это побочный эффект изменения данных, а не условие
 *   HTTP-запроса. Если вынести её в контроллер, она потеряется при удалении
 *   через EasyAdmin или другие точки входа. Listener гарантирует пересчёт
 *   независимо от того, откуда пришло изменение.
 */
#[AsEntityListener(event: Events::postPersist, entity: Review::class)]
#[AsEntityListener(event: Events::postUpdate, entity: Review::class)]
#[AsEntityListener(event: Events::preRemove, entity: Review::class)]
#[AsEntityListener(event: Events::postRemove, entity: Review::class)]
class ReviewListener
{
    // Хранит клон отзыва между preRemove и postRemove (см. объяснение выше)
    private ?Review $removedReview = null;

    public function __construct(
        private readonly ReviewRepository       $reviewRepository,
        private readonly EntityManagerInterface $entityManager
    ){}

    /**
     * После создания отзыва пересчитываем рейтинг
     */
    public function postPersist(Review $review): void
    {
        $this->recalculateUserRating($review);
    }

    /**
     * После обновления отзыва пересчитываем рейтинг
     */
    public function postUpdate(Review $review): void
    {
        $this->recalculateUserRating($review);
    }

    /**
     * Перед удалением сохраняем данные отзыва
     */
    public function preRemove(Review $review): void
    {
        // Сохраняем копию отзыва для использования в postRemove
        $this->removedReview = clone $review;
    }

    /**
     * После удаления отзыва пересчитываем рейтинг
     */
    public function postRemove(): void
    {
        if ($this->removedReview) {
            $this->recalculateUserRating($this->removedReview);
            $this->removedReview = null;
        }
    }

    /**
     * Пересчет среднего рейтинга пользователя
     */
    private function recalculateUserRating(Review $review): void
    {
        // Review::TYPES: 'client' → отзыв клиенту (автор — мастер, целевой — клиент)
        //                'master' → отзыв мастеру (автор — клиент, целевой — мастер)
        // Нам нужен пользователь, чей рейтинг пересчитываем (получатель отзыва)
        if ($review->getType() === 'client')
            $targetUser = $review->getClient();
        elseif ($review->getType() === 'master')
            $targetUser = $review->getMaster();
        else return; // Неизвестный тип — ничего не делаем (см. Review::TYPES)

        if ($targetUser === null) return; // Пользователь мог быть удалён (onDelete=SET NULL)

        // Выбираем ВСЕ отзывы того же типа для данного пользователя.
        // Используем тот же тип, что и у переданного review: рейтинг «мастера»
        // и рейтинг «клиента» считаются отдельно и хранятся в одном поле User::$rating
        $qb = $this
            ->reviewRepository
            ->createQueryBuilder('r')
            ->where('r.type = :type')
            ->andWhere('r.rating IS NOT NULL') // Пропускаем отзывы без оценки
            ->setParameter('type', $review->getType());

        // Поле связи различается в зависимости от типа: Review::$client vs Review::$master
        if ($review->getType() === 'client')
            $qb->andWhere('r.client = :user');
        elseif ($review->getType() === 'master')
            $qb->andWhere('r.master = :user');

        $qb->setParameter('user', $targetUser);

        $reviews = $qb->getQuery()->getResult();

        if (count($reviews) > 0) {
            $totalRating = array_reduce($reviews, function ($sum, Review $r) {
                return $sum + ($r->getRating() ?? 0);
            }, 0);

            $averageRating = $totalRating / count($reviews);

            // Округляем до 2 знаков; min(…, 5.0) — защита от плавающей точки
            // (сумма 5+5+5 / 3 теоретически может дать 5.000…01)
            $averageRating = min(round($averageRating, 2), 5.0);
        } else {
            // Отзывов больше нет — обнуляем рейтинг
            $averageRating = null;
        }

        if (!$averageRating) return;

        $targetUser->setRating($averageRating);

        // persist() нужен, потому что $targetUser может быть detached-объектом
        // (особенно в случае postRemove, где UoW уже мог его отцепить)
        $this->entityManager->persist($targetUser);
        $this->entityManager->flush();
    }
}
