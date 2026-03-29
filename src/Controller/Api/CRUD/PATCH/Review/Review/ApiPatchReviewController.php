<?php

namespace App\Controller\Api\CRUD\PATCH\Review\Review;

use App\ApiResource\AppMessages;
use App\Controller\Api\CRUD\Abstract\AbstractApiPatchController;
use App\Dto\Review\ReviewPatchInput;
use App\Entity\Extra\MultipleImage;
use App\Entity\Review\Review;
use App\Entity\Trait\Readable\G;
use App\Entity\User;
use App\Service\Extra\LocalizationService;
use Symfony\Component\HttpFoundation\JsonResponse;

class ApiPatchReviewController extends AbstractApiPatchController
{
    public function __construct(private readonly LocalizationService $localizationService) {}

    protected function getEntityClass(): string { return Review::class; }

    protected function getInputClass(): string { return ReviewPatchInput::class; }

    protected function getNotFoundError(): string { return AppMessages::REVIEW_NOT_FOUND; }

    protected function checkOwnership(object $entity, User $bearer): ?JsonResponse
    {
        /** @var Review $entity */
        if ($bearer !== $entity->getClient() && $bearer !== $entity->getMaster())
            return $this->errorJson(AppMessages::OWNERSHIP_MISMATCH);

        return null;
    }

    protected function applyChanges(object $entity, User $bearer, object $dto): ?JsonResponse
    {
        /** @var Review $entity */
        /** @var ReviewPatchInput $dto */
        if ($dto->rating < 1 || $dto->rating > 5) return $this->errorJson(AppMessages::INVALID_RATING);

        foreach ($entity->getImages() as $img) {
            $entity->removeImage($img);
            $this->entityManager->remove($img);
        }

        $entity->setDescription($dto->description)->setRating($dto->rating);

        foreach ($dto->images as $image) {
            if (!empty($image['image']) && $image['image'] !== 'string')
                $entity->addImage((new MultipleImage())->setImage($image['image']));
        }

        return null;
    }

    protected function setSerializationGroups(): array
    {
        return G::OPS_REVIEWS;
    }

    protected function afterFetch(object|array $entity, User $user): void
    {
        /** @var Review $entity */
        if ($entity->getMaster()) $this->localizationService->localizeUser($entity->getMaster(), $this->getLocale());
        if ($entity->getClient()) $this->localizationService->localizeUser($entity->getClient(), $this->getLocale());
        if ($entity->getTicket()) $this->localizationService->localizeTicket($entity->getTicket(), $this->getLocale());
    }
}
