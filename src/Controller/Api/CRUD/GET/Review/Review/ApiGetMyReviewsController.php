<?php

namespace App\Controller\Api\CRUD\GET\Review\Review;

use App\Controller\Api\CRUD\Abstract\AbstractApiGetCollectionController;
use App\Entity\Review\Review;
use App\Entity\Trait\Readable\G;
use App\Entity\User;
use App\Repository\Review\ReviewRepository;
use App\Service\Extra\LocalizationService;
use Doctrine\ORM\QueryBuilder;

class ApiGetMyReviewsController extends AbstractApiGetCollectionController
{
    public function __construct(
        private readonly ReviewRepository $reviewRepository,
        private readonly LocalizationService $localizationService,
    ) {}

    protected function setSerializationGroups(): array { return G::OPS_REVIEWS; }

    protected function fetchQuery(User $user): ?QueryBuilder { return $this->reviewRepository->findUserReviews($user); }

    protected function afterFetch(array|object $entity, User $user): void
    {
        /** @var Review $review */
        foreach ($entity as $review) {
            if ($review->getMaster()) $this->localizationService->localizeUser($review->getMaster(), $this->getLocale());
            if ($review->getClient()) $this->localizationService->localizeUser($review->getClient(), $this->getLocale());
        }
    }
}
