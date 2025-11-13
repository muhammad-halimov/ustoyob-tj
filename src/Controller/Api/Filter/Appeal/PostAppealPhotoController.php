<?php

namespace App\Controller\Api\Filter\Appeal;

use App\Entity\Appeal\AppealImage;
use App\Repository\User\AppealRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;

class PostAppealPhotoController extends AbstractController
{
    public function __construct(
        private readonly EntityManagerInterface $entityManager,
        private readonly AppealRepository       $appealRepository,
    ) {}

    public function __invoke(int $id, Request $request): JsonResponse
    {
        $this->denyAccessUnlessGranted('IS_AUTHENTICATED_FULLY');

        $userRoles = $this->getUser()?->getRoles() ?? [];
        $allowedRoles = ["ROLE_ADMIN", "ROLE_CLIENT", "ROLE_MASTER"];

        if (!array_intersect($allowedRoles, $userRoles))
            return $this->json(['message' => 'Access denied'], 403);

        $appeal = $this->appealRepository->find($id);
        if (!$appeal) return $this->json(['message' => 'Appeal not found'], 404);

        $imageFiles = $request->files->get('imageFile');
        if (!$imageFiles) return $this->json(['message' => 'No files provided'], 400);

        $imageFiles = is_array($imageFiles) ?
            $imageFiles :
            [$imageFiles];

        foreach ($imageFiles as $imageFile) {
            if ($imageFile->isValid()) {
                $appealImage = (new AppealImage())->setImageFile($imageFile);
                $appeal->addAppealImage($appealImage);
                $this->entityManager->persist($appealImage);
            }
        }

        $this->entityManager->flush();

        return new JsonResponse([
            'message' => 'Photos uploaded successfully',
            'count' => count($imageFiles)
        ]);
    }
}
