<?php

namespace App\Controller\Api\Filter\User;

use App\Entity\User;
use App\Repository\User\FavoriteRepository;
use Exception;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\JsonResponse;

class PersonalFavoriteFilterController extends AbstractController
{
    private readonly Security $security;
    private readonly FavoriteRepository $favoriteRepository;

    public function __construct(
        Security           $security,
        FavoriteRepository $favoriteRepository
    )
    {
        $this->security = $security;
        $this->favoriteRepository = $favoriteRepository;
    }

    public function __invoke(): JsonResponse
    {
        $this->denyAccessUnlessGranted('IS_AUTHENTICATED_FULLY');

        try {
            /** @var User $user */
            $user = $this->security->getUser();
            $data = $this->favoriteRepository->findUserFavoriteMastersById($user);

            return empty($data)
                ? $this->json([], 404)
                : $this->json($data, 200, [],
                    [
                        'groups' => ['favorites:read'],
                        'skip_null_values' => false,
                    ]
                );
        } catch (Exception $e) {
            return $this->json([
                'error' => $e->getMessage(),
                'trace' => $e->getTrace()
            ], 500);
        }
    }
}
