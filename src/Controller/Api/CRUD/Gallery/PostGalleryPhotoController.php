<?php

namespace App\Controller\Api\CRUD\Gallery;

use App\Entity\Gallery\Gallery;
use App\Entity\Gallery\GalleryImage;
use App\Entity\User;
use App\Repository\GalleryRepository;
use App\Service\Extra\AccessService;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;

class PostGalleryPhotoController extends AbstractController
{
    public function __construct(
        private readonly EntityManagerInterface $entityManager,
        private readonly GalleryRepository      $galleryRepository,
        private readonly AccessService          $accessService,
        private readonly Security               $security,
    ) {}

    public function __invoke(int $id, Request $request): JsonResponse
    {
        /** @var User $bearerUser */
        $bearerUser = $this->security->getUser();

        $this->accessService->check($bearerUser, 'double');

        /** @var Gallery $gallery */
        $gallery = $this->galleryRepository->find($id);

        $imageFiles = $request->files->get('imageFile');

        if (!$gallery)
            return $this->json(['message' => 'Gallery not found'], 404);

        if (!$imageFiles)
            return $this->json(['message' => 'No files provided'], 400);

        if ($gallery->getUser() !== $bearerUser)
            return $this->json(['message' => "Ownership doesn't match"], 400);

        $imageFiles = is_array($imageFiles) ? $imageFiles : [$imageFiles];

        foreach ($imageFiles as $imageFile) {
            if ($imageFile->isValid()) {
                $galleryItem = (new GalleryImage())->setImageFile($imageFile);
                $gallery->addUserServiceGalleryItem($galleryItem);
                $this->entityManager->persist($galleryItem);
            }
        }

        $this->entityManager->flush();

        return new JsonResponse([
            'message' => 'Photos uploaded successfully',
            'count' => count($imageFiles)
        ]);
    }
}
