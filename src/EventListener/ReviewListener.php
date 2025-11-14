<?php

namespace App\EventListener;

use App\Entity\Review\Review;
use App\Repository\ReviewRepository;
use Doctrine\Bundle\DoctrineBundle\Attribute\AsEntityListener;
use Doctrine\ORM\EntityManagerInterface;
use Doctrine\ORM\Events;
use Doctrine\Persistence\Event\LifecycleEventArgs;

#[AsEntityListener(event: Events::postPersist, entity: Review::class)]
#[AsEntityListener(event: Events::postUpdate, entity: Review::class)]
#[AsEntityListener(event: Events::preRemove, entity: Review::class)]
#[AsEntityListener(event: Events::postRemove, entity: Review::class)]
class ReviewListener
{
    private ?Review $removedReview = null;

    public function __construct(
        private readonly ReviewRepository       $reviewRepository,
        private readonly EntityManagerInterface $entityManager
    ){}

    /**
     * После создания отзыва пересчитываем рейтинг
     */
    public function postPersist(Review $review, LifecycleEventArgs $args): void
    {
        $this->recalculateUserRating($review);
    }

    /**
     * После обновления отзыва пересчитываем рейтинг
     */
    public function postUpdate(Review $review, LifecycleEventArgs $args): void
    {
        $this->recalculateUserRating($review);
    }

    /**
     * Перед удалением сохраняем данные отзыва
     */
    public function preRemove(Review $review, LifecycleEventArgs $args): void
    {
        // Сохраняем копию отзыва для использования в postRemove
        $this->removedReview = clone $review;
    }

    /**
     * После удаления отзыва пересчитываем рейтинг
     */
    public function postRemove(Review $review, LifecycleEventArgs $args): void
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
        // Определяем для кого отзыв: для рецензента (клиента) или для мастера
        $targetUser = $review->getForReviewer() ? $review->getReviewer() : $review->getMaster();

        if (!$targetUser) return;

        // Получаем все отзывы для данного пользователя
        $qb = $this
            ->reviewRepository
            ->createQueryBuilder('r')
            ->where('r.forReviewer = :forReviewer')
            ->andWhere('r.rating IS NOT NULL')
            ->setParameter('forReviewer', $review->getForReviewer());

        // В зависимости от типа отзыва фильтруем по разным полям
        if ($review->getForReviewer())
            $qb->andWhere('r.reviewer = :user');
        else
            $qb->andWhere('r.user = :user');

        $qb->setParameter('user', $targetUser);

        $reviews = $qb->getQuery()->getResult();

        // Вычисляем средний рейтинг
        if (count($reviews) > 0) {
            $totalRating = array_reduce($reviews, function ($sum, Review $r) {
                return $sum + ($r->getRating() ?? 0);
            }, 0);

            $averageRating = $totalRating / count($reviews);

            // Округляем до 2 знаков после запятой и ограничиваем максимум 5
            $averageRating = min(round($averageRating, 2), 5.0);
        } else $averageRating = null;

        // Обновляем рейтинг пользователя
        $targetUser->setRating($averageRating);

        // Сохраняем изменения
        $this->entityManager->persist($targetUser);
        $this->entityManager->flush();
    }
}
