<?php

namespace App\Controller\Api\CRUD\POST\User\User;

use App\ApiResource\AppMessages;
use App\Controller\Api\CRUD\Abstract\AbstractApiHelperController;
use App\Dto\User\ChangePasswordInput;
use App\Entity\User;
use App\Service\Auth\AccountChangePasswordService;
use Psr\Cache\InvalidArgumentException;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpKernel\Attribute\MapRequestPayload;

class ApiPostChangePasswordController extends AbstractApiHelperController
{
    public function __construct(private readonly AccountChangePasswordService $changePasswordService) {}

    /**
     * @throws InvalidArgumentException
     */
    public function __invoke(#[MapRequestPayload] ChangePasswordInput $dto): JsonResponse
    {
        $user = $this->entityManager->getRepository(User::class)->findOneBy(['email' => $dto->email]);

        if ($user === null) return $this->errorJson(AppMessages::OTP_INVALID_OR_EXPIRED);

        if (!$this->changePasswordService->verifyOtp($user, $dto->code))
            return $this->errorJson(AppMessages::OTP_INVALID_OR_EXPIRED);

        $user->setPassword($dto->newPassword);
        $this->flush();

        return $this->errorJson(AppMessages::PASSWORD_CHANGED);
    }
}
