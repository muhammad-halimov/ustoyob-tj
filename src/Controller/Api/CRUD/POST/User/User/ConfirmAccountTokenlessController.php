<?php

namespace App\Controller\Api\CRUD\POST\User\User;

use App\ApiResource\AppError;
use App\Controller\Api\CRUD\Abstract\AbstractApiController;
use App\Entity\User;
use App\Service\Auth\AccountConfirmationService;
use Random\RandomException;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Mailer\Exception\TransportExceptionInterface;

class ConfirmAccountTokenlessController extends AbstractApiController
{
    public function __construct(
        private readonly AccountConfirmationService $accountConfirmationService,
    ){}

    /**
     * Отправляем письмо подтверждения после сохранения пользователя
     * @throws RandomException
     * @throws TransportExceptionInterface
     */
    public function __invoke(Request $request): JsonResponse
    {
        /** @var User $bearerUser */
        $bearerUser = $this->currentUser();

        if ($bearerUser->getActive() && $bearerUser->getApproved())
            return $this->errorJson(AppError::USER_ALREADY_ACTIVATED);

        return $this->json([
            'success' => true,
            'message' => $this->accountConfirmationService->sendConfirmationEmail($bearerUser)
        ]);
    }
}
