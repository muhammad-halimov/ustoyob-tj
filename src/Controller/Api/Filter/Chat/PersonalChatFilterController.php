<?php

namespace App\Controller\Api\Filter\Chat;

use App\Entity\User;
use App\Repository\Chat\ChatRepository;
use App\Service\Extra\AccessService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\JsonResponse;

class PersonalChatFilterController extends AbstractController
{
    public function __construct(
        private readonly ChatRepository $chatRepository,
        private readonly AccessService  $accessService,
        private readonly Security       $security,
    ){}

    public function __invoke(): JsonResponse
    {
        /** @var User $bearerUser */
        $bearerUser = $this->security->getUser();

        $this->accessService->check($bearerUser);

        $data = $this->chatRepository->findUserChats($bearerUser);

        return empty($data)
            ? $this->json(['message' => 'Resource not found'], 404)
            : $this->json($data, context: ['groups' => ['chats:read']]);
    }
}
