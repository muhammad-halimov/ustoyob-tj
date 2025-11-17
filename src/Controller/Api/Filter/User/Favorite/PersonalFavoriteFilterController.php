<?php

namespace App\Controller\Api\Filter\User\Favorite;

use App\Entity\User;
use App\Repository\User\FavoriteRepository;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\JsonResponse;

class PersonalFavoriteFilterController extends AbstractController
{
    public function __construct(
        private readonly FavoriteRepository $favoriteRepository,
        private readonly Security           $security,
    ){}

    public function __invoke(): JsonResponse
    {
        $this->denyAccessUnlessGranted('IS_AUTHENTICATED_FULLY');
        $allowedRoles = ["ROLE_ADMIN", "ROLE_CLIENT", "ROLE_MASTER"];

        /** @var User $user */
        $user = $this->security->getUser();

        if (!array_intersect($allowedRoles, $user->getRoles()))
            return $this->json(['message' => 'Access denied'], 403);

        $data = $this->favoriteRepository->findUserFavoriteMasters($user);

        return empty($data)
            ? $this->json(['message' => 'Resource not found'], 404)
            : $this->json($data, context: ['groups' => ['favorites:read']]);
    }
}
