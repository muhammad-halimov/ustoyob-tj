<?php

namespace App\Controller\Api\Filter\User;

use App\Entity\User;
use App\Entity\User\Favorite;
use App\Repository\User\BlackListRepository;
use App\Service\AccessService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\JsonResponse;

class PersonalBlackListFilterController extends AbstractController
{
    public function __construct(
        private readonly BlackListRepository $blackListRepository,
        private readonly AccessService       $accessService,
        private readonly Security            $security,
    ){}

    public function __invoke(): JsonResponse
    {
        /** @var User $bearerUser */
        $bearerUser = $this->security->getUser();

        $this->accessService->check($bearerUser);

        /** @var Favorite $favorite */
        $favorite = $this->blackListRepository->findBlackLists($bearerUser)[0] ?? null;

        return empty($favorite)
            ? $this->json(['message' => 'Resource not found'], 404)
            : $this->json($favorite, context: ['groups' => ['blackLists:read']]);
    }
}
