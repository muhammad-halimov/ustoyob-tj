<?php

namespace App\Controller\Api\Filter\User\Personal;

use App\Repository\UserRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;

class UpdateUserPhotoController extends AbstractController
{
    public function __construct(
        private readonly EntityManagerInterface $entityManager,
        private readonly UserRepository         $userRepository,
        private readonly Security               $security,
    ) {}

    public function __invoke(int $id, Request $request): JsonResponse
    {
        $this->denyAccessUnlessGranted('IS_AUTHENTICATED_FULLY');
        $allowedRoles = ["ROLE_ADMIN", "ROLE_CLIENT", "ROLE_MASTER"];
        $bearerUser = $this->security->getUser();
        $imageFile = $request->files->get('imageFile');
        $user = $this->userRepository->find($id);

        if (!array_intersect($allowedRoles, $bearerUser->getRoles()))
            return $this->json(['message' => 'Access denied'], 403);

        if (!$user || $user !== $bearerUser)
            return $this->json(["message' => 'User not found OR Ownership doesn't match"], 404);

        $user->setImageFile($imageFile);

        $this->entityManager->persist($user);
        $this->entityManager->flush();

        return new JsonResponse([
            'id' => $user->getId(),
            'image' => $user->getImage(),
            'message' => 'Photo updated successfully'
        ]);
    }
}
