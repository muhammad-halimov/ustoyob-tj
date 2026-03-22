<?php

namespace App\Controller\Api\CRUD\GET\Appeal;

use App\ApiResource\AppError;
use App\Controller\Api\CRUD\Abstract\AbstractApiController;
use App\Repository\User\AppealRepository;
use Symfony\Component\HttpFoundation\JsonResponse;

class PersonalAppealsFilterController extends AbstractApiController
{
    public function __construct(
        private readonly AppealRepository $appealRepository,
    ){}

    public function __invoke(): JsonResponse
    {
        $data = $this->appealRepository->findByAuthor($this->checkedUser());

        return empty($data)
            ? $this->errorJson(AppError::RESOURCE_NOT_FOUND)
            : $this->json($data, context: ['groups' => [
                'appeal:read',
                'appeal:ticket:read',
                'appeal:chat:read',
                'appeal:review:read',
                'appeal:user:read'
            ]]);
    }
}
