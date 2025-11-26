<?php

namespace App\Controller\Api\CRUD\TechSupport\TechSupport;

use App\Entity\TechSupport\TechSupport;
use App\Entity\TechSupport\TechSupportImage;
use App\Entity\User;
use App\Repository\GalleryRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;

class PostTechSupportPhotoController extends AbstractController
{
    public function __construct(
        private readonly EntityManagerInterface $entityManager,
        private readonly GalleryRepository      $galleryRepository,
        private readonly Security               $security,
    ) {}

    public function __invoke(int $id, Request $request): JsonResponse
    {
        $this->denyAccessUnlessGranted('IS_AUTHENTICATED_FULLY');
        $allowedRoles = ["ROLE_ADMIN", "ROLE_MASTER"];

        /** @var User $bearerUser */
        $bearerUser = $this->security->getUser();
        /** @var TechSupport $techSupport */
        $techSupport = $this->galleryRepository->find($id);

        $imageFiles = $request->files->get('imageFile');

        if (!array_intersect($allowedRoles, $bearerUser->getRoles()))
            return $this->json(['message' => 'Access denied'], 403);

        if (!$techSupport)
            return $this->json(['message' => 'Tech support not found'], 404);

        if (!$imageFiles)
            return $this->json(['message' => 'No files provided'], 400);

        if ($techSupport->getAuthor() !== $bearerUser || $techSupport->getAdministrant() !== $bearerUser)
            return $this->json(['message' => "Ownership doesn't match"], 400);

        $imageFiles = is_array($imageFiles) ? $imageFiles : [$imageFiles];

        foreach ($imageFiles as $imageFile) {
            if ($imageFile->isValid()) {
                $techSupportImage = (new TechSupportImage())->setImageFile($imageFile);
                $techSupport->addTechSupportImage($techSupportImage);
                $this->entityManager->persist($techSupportImage);
            }
        }

        $this->entityManager->flush();

        return new JsonResponse([
            'message' => 'Photos uploaded successfully',
            'count' => count($imageFiles)
        ]);
    }
}
