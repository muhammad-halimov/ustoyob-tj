<?php

namespace App\Controller\Api\CRUD\User\User;

use App\Entity\User;
use App\Repository\UserRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;

class PostUserPhotoController extends AbstractController
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
        /** @var User $bearerUser */
        $bearerUser = $this->security->getUser();
        $imageFile = $request->files->get('imageFile');
        /** @var User $user */
        $user = $this->userRepository->find($id);

        if (!array_intersect($allowedRoles, $bearerUser->getRoles()))
            return $this->json(['message' => 'Access denied'], 403);

        if (!$user)
            return $this->json(["message' => 'User not found"], 404);

        if($user !== $bearerUser)
            return $this->json(["message" => "Ownership doesn't match"], 404);

        $user->setImageFile($imageFile);

        $this->entityManager->persist($user);
        $this->entityManager->flush();

        return $this->json([
            'id' => $user->getId(),
            'image' => $user->getImage(),
            'message' => 'Photo updated successfully'
        ]);
    }
}
