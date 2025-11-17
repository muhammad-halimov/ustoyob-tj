<?php

namespace App\Controller\Api\Filter\User\Favorite;

use App\Entity\User;
use App\Entity\User\Favorite;
use App\Repository\User\FavoriteRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\JsonResponse;

class DeleteFavoriteController extends AbstractController
{
    public function __construct(
        private readonly EntityManagerInterface $entityManager,
        private readonly FavoriteRepository     $favoriteRepository,
        private readonly Security               $security,
    ){}

    public function __invoke(int $id): JsonResponse
    {
        $this->denyAccessUnlessGranted('IS_AUTHENTICATED_FULLY');
        $allowedRoles = ["ROLE_ADMIN", "ROLE_CLIENT", "ROLE_MASTER"];

        /** @var User $bearerUser */
        $bearerUser = $this->security->getUser();
        /** @var Favorite $favorite */
        $favorite = $this->favoriteRepository->find($id);

        if (!array_intersect($allowedRoles, $bearerUser->getRoles()))
            return $this->json(['message' => 'Access denied'], 403);

        if (!$favorite)
            return $this->json(['message' => "Resource not found"], 404);

        if ($favorite->getUser() !== $bearerUser)
            return $this->json(['message' => "Ownership doesn't match"], 400);

        $this->entityManager->remove($favorite);
        $this->entityManager->flush();

        return $this->json(['message' => 'Resource successfully removed'], 204);
    }
}
