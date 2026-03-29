<?php

namespace App\Controller\Api\CRUD\GET\Gallery\Gallery;

use App\Controller\Api\CRUD\Abstract\AbstractApiGetSelfController;
use App\Entity\Gallery\Gallery;
use App\Entity\Trait\Readable\G;
use App\Entity\User;
use App\Repository\Gallery\GalleryRepository;
use App\Service\Extra\LocalizationService;

class ApiGetMyGalleriesController extends AbstractApiGetSelfController
{
    public function __construct(
        private readonly GalleryRepository   $galleryRepository,
        private readonly LocalizationService $localizationService,
    ) {}

    protected function getUserGrade(): string { return 'double'; }

    protected function setSerializationGroups(): array { return G::OPS_GALLERIES; }

    protected function fetchSelf(User $user): object|array|null
    { return $this->galleryRepository->findUserGallery($user); }

    protected function afterFetch(object|array $entity, User $user): void
    {
        if ($entity instanceof Gallery && $entity->getUser()) {
            $this->localizationService->localizeUser($entity->getUser(), $this->getLocale());
        }
    }
}
