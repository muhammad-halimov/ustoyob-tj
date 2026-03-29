<?php

namespace App\Controller\Api\CRUD\POST\Gallery\Gallery;

use App\ApiResource\AppMessages;
use App\Controller\Api\CRUD\Abstract\AbstractApiPostController;
use App\Entity\Gallery\Gallery;
use App\Entity\Trait\Readable\G;
use App\Entity\User;
use App\Repository\Gallery\GalleryRepository;
use App\Service\Extra\LocalizationService;

class ApiPostGalleryController extends AbstractApiPostController
{
    public function __construct(
        private readonly GalleryRepository   $galleryRepository,
        private readonly LocalizationService $localizationService,
    ) {}

    protected function getUserGrade(): string { return 'double'; }

    protected function setSerializationGroups(): array { return G::OPS_GALLERIES; }

    protected function afterFetch(object|array $entity, User $user): void
    {
        /** @var Gallery $entity */
        if ($entity->getUser()) $this->localizationService->localizeUser($entity->getUser(), $this->getLocale());
    }

    protected function handle(User $bearer, object $dto): object
    {
        if ($this->galleryRepository->findUserGallery($bearer))
            return $this->errorJson(AppMessages::GALLERY_EXISTS_PATCH_INSTEAD);

        return (new Gallery())->setUser($bearer);
    }
}
