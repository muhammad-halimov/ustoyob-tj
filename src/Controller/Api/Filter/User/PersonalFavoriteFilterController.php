<?php

namespace App\Controller\Api\Filter\User;

use App\Entity\User;
use App\Entity\User\Favorite;
use App\Repository\User\FavoriteRepository;
use App\Service\Extra\AccessService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\JsonResponse;

class PersonalFavoriteFilterController extends AbstractController
{
    public function __construct(
        private readonly FavoriteRepository $favoriteRepository,
        private readonly AccessService      $accessService,
        private readonly Security           $security,
    ){}

    public function __invoke(): JsonResponse
    {
        /** @var User $bearerUser */
        $bearerUser = $this->security->getUser();

        $this->accessService->check($bearerUser);

        /** @var Favorite $favorite */
        $favorite = $this->favoriteRepository->findUserFavorites($bearerUser)[0] ?? null;

        return empty($favorite)
            ? $this->json(['message' => 'Resource not found'], 404)
            : $this->json($favorite, context: ['groups' => ['favorites:read']]);
    }
}
