<?php

namespace App\Controller\Api\CRUD\GET\Chat;

use App\ApiResource\AppError;
use App\Controller\Api\CRUD\Abstract\AbstractApiController;
use App\Repository\Chat\ChatRepository;
use Symfony\Component\HttpFoundation\JsonResponse;

class PersonalChatFilterController extends AbstractApiController
{
    public function __construct(
        private readonly ChatRepository $chatRepository,
    ){}

    public function __invoke(): JsonResponse
    {
        $data = $this->chatRepository->findUserChats($this->checkedUser());

        return empty($data)
            ? $this->errorJson(AppError::RESOURCE_NOT_FOUND)
            : $this->json($data, context: ['groups' => ['chats:read']]);
    }
}
