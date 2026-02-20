<?php

namespace App\Controller\Api\Filter\User;

use App\Entity\Extra\Favorite;
use App\Entity\User;
use App\Repository\User\FavoriteRepository;
use App\Service\Extra\AccessService;
use App\Service\Extra\LocalizationService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;

class PersonalFavoriteFilterController extends AbstractController
{
    public function __construct(
        private readonly FavoriteRepository  $favoriteRepository,
        private readonly LocalizationService $localizationService,
        private readonly AccessService       $accessService,
        private readonly Security            $security,
    ){}

    public function __invoke(Request $request): JsonResponse
    {
        /** @var User $bearerUser */
        $bearerUser = $this->security->getUser();

        $this->accessService->check($bearerUser);

        /** @var Favorite $favorite */
        $favorite = $this->favoriteRepository->findUserFavorites($bearerUser)[0] ?? null;

        $locale = $request->query->get('locale', 'tj');

        foreach ($favorite->getTickets() as $ticket) {
            $this->localizationService->localizeGeography($ticket, $locale);

            if ($ticket->getCategory())
                $this->localizationService->localizeEntity($ticket->getCategory(), $locale);

            if ($ticket->getUnit())
                $this->localizationService->localizeEntity($ticket->getUnit(), $locale);

            if ($ticket->getSubcategory())
                $this->localizationService->localizeEntity($ticket->getSubcategory(), $locale);
        }

        return empty($favorite)
            ? $this->json(['message' => 'Resource not found'], 404)
            : $this->json($favorite, context: ['groups' => ['favorites:read']]);
    }
}
