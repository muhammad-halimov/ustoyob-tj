<?php

namespace App\Controller\Api\Filter\Gallery;

use App\Entity\Gallery\GalleryImage;
use App\Repository\GalleryRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;

class PostGalleryPhotoController extends AbstractController
{
    public function __construct(
        private readonly EntityManagerInterface $entityManager,
        private readonly GalleryRepository      $galleryRepository,
    ) {}

    public function __invoke(int $id, Request $request): JsonResponse
    {
        $this->denyAccessUnlessGranted('IS_AUTHENTICATED_FULLY');

        $userRoles = $this->getUser()?->getRoles() ?? [];
        $allowedRoles = ["ROLE_ADMIN", "ROLE_MASTER"];

        if (!array_intersect($allowedRoles, $userRoles))
            return $this->json(['message' => 'Access denied'], 403);

        $gallery = $this->galleryRepository->find($id);
        if (!$gallery) return $this->json(['message' => 'Gallery not found'], 404);

        $imageFiles = $request->files->get('imageFile');
        if (!$imageFiles) return $this->json(['message' => 'No files provided'], 400);

        $imageFiles = is_array($imageFiles) ?
            $imageFiles :
            [$imageFiles];

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
