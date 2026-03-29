<?php

namespace App\Controller\Api\CRUD\POST\User\User;

use App\ApiResource\AppMessages;
use App\Controller\Api\CRUD\Abstract\AbstractApiHelperController;
use App\Dto\User\AccountConfirmInput;
use App\Entity\User\AccountConfirmationToken;
use DateTime;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpKernel\Attribute\MapRequestPayload;

class ApiPostConfirmAccountController extends AbstractApiHelperController
{
    public function __invoke(#[MapRequestPayload] AccountConfirmInput $dto): JsonResponse
    {
        $confirmationToken = $this->entityManager
            ->getRepository(AccountConfirmationToken::class)
            ->findOneBy(['token' => $dto->token]);

        if (!$confirmationToken || $confirmationToken->getExpiresAt() < new DateTime())
            return $this->errorJson(AppMessages::TOKEN_INVALID_OR_EXPIRED);

        $user = $confirmationToken->getUser();
        $user->setActive(true);
        $user->setApproved(true);

        $this->entityManager->remove($confirmationToken);
        $this->flush();

        return $this->buildResponse([
            'success' => true,
            'redirectUrl' => $_ENV['FRONTEND_URL']
        ]);
    }
}
