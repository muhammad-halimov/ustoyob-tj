<?php

namespace App\Controller\Api\CRUD\GET\User;

use App\Controller\Api\CRUD\Abstract\AbstractApiController;
use App\Service\Extra\LocalizationService;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;

class PersonalUserFilterController extends AbstractApiController
{
    public function __construct(
        private readonly LocalizationService $localizationService,
    ){}

    public function __invoke(Request $request): JsonResponse
    {
        $bearerUser = $this->checkedUser(activeAndApproved: false);

        $locale = $this->getLocale();

        $this->localizationService->localizeGeography($bearerUser, $locale);

        foreach ($bearerUser->getOccupation() as $occupation) {
            $this->localizationService->localizeEntity($occupation, $locale);
        }

        foreach ($bearerUser->getEducation() as $education) {
            $occupation = $education->getOccupation();
            if ($occupation !== null) $this->localizationService->localizeEntity($occupation, $locale);
        }

        return $this->json($bearerUser, context: ['groups' => ['masters:read', 'clients:read', 'users:me:read']]);
    }
}
