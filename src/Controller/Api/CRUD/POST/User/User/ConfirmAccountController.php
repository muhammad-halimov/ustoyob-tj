<?php

namespace App\Controller\Api\CRUD\POST\User\User;

use App\ApiResource\AppError;
use App\Controller\Api\CRUD\Abstract\AbstractApiController;
use App\Entity\User\AccountConfirmationToken;
use DateTime;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;

class ConfirmAccountController extends AbstractApiController
{
    public function __invoke(Request $request): JsonResponse
    {
        $data = json_decode($request->getContent(), true);

        /** @var AccountConfirmationToken $confirmationToken */
        $confirmationToken = $this
            ->entityManager
            ->getRepository(AccountConfirmationToken::class)
            ->findOneBy(['token' => $data['token']]);

        if (!$confirmationToken || $confirmationToken->getExpiresAt() < new DateTime())
            return $this->errorJson(AppError::TOKEN_INVALID_OR_EXPIRED);

        $user = $confirmationToken->getUser();

        // Активируем пользователя
        $user->setActive(true);
        $user->setApproved(true);

        // Удаляем использованный токен
        $this->entityManager->remove($confirmationToken);
        $this->entityManager->flush();

        return $this->json([
            'success' => true,
            'redirectUrl' => $_ENV['FRONTEND_URL']
        ]);
    }
}
