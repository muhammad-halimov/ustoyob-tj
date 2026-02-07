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

class PatchGalleryController extends AbstractController
{
    public function __construct(
        private readonly EntityManagerInterface $entityManager,
        private readonly Security               $security,
        private readonly AccessService          $accessService,
        private readonly GalleryRepository      $galleryRepository,
    ) {}

    public function __invoke(int $id, Request $request): JsonResponse
    {
        /** @var User $bearerUser */
        $bearerUser = $this->security->getUser();

        $this->accessService->check($bearerUser, 'double');

        /** @var Gallery $galleryEntity */
        $galleryEntity = $this->galleryRepository->findUserGallery($bearerUser);

        if (!$galleryEntity) return $this->json(['message' => 'Gallery not found'], 404);

        $data = json_decode($request->getContent(), true);

        $imagesParam = $data['images'];

        if (!$imagesParam['images']) {
            return $this->json(['message' => 'Invalid JSON data'], 400);
        } elseif ($imagesParam['images'] === []){
            $galleryEntity->getUserServiceGalleryItems()->clear();
            return $this->json(['message' => 'Gallery emptied successfully']);
        } else {
            $galleryEntity->getUserServiceGalleryItems()->clear();

            foreach ($imagesParam['image'] as $image) {
                $galleryImage = new GalleryImage()->setImage($image);
                $galleryEntity->addUserServiceGalleryItem($galleryImage);
                $this->entityManager->persist($galleryImage);
            }

            $this->entityManager->flush();
        }

        return $this->json($galleryEntity, context: ['groups' => ['galleries:read']]);
    }
}
