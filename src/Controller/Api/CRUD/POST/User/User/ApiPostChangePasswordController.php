<?php

namespace App\Controller\Api\CRUD\POST\User\User;

use App\ApiResource\AppMessages;
use App\Controller\Api\CRUD\Abstract\AbstractApiHelperController;
use App\Dto\User\ChangePasswordInput;
use App\Entity\User;
use App\Service\Auth\AccountChangePasswordService;
use App\Service\Auth\PhoneCodeService;
use App\Service\Extra\PhoneNumberUtil;
use Psr\Cache\InvalidArgumentException;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpKernel\Attribute\MapRequestPayload;

/**
 * Новый пароль по коду: {email, code} — код из письма, {phone, code} — из SMS
 * (см. ApiPostChangePasswordSendOtpController).
 */
class ApiPostChangePasswordController extends AbstractApiHelperController
{
    public function __construct(
        private readonly AccountChangePasswordService $changePasswordService,
        private readonly PhoneCodeService             $phoneCodeService,
    ) {}

    /**
     * @throws InvalidArgumentException
     */
    public function __invoke(#[MapRequestPayload] ChangePasswordInput $dto): JsonResponse
    {
        $repository = $this->entityManager->getRepository(User::class);

        if ($dto->phone !== null && trim($dto->phone) !== '') {
            $phone = PhoneNumberUtil::normalize($dto->phone);
            $user  = $phone !== null ? $repository->findOneBy(['phone' => $phone]) : null;

            if ($user === null || !$this->phoneCodeService->verify($phone, PhoneCodeService::RESET, $dto->code))
                return $this->errorJson(AppMessages::OTP_INVALID_OR_EXPIRED);
        } else {
            $user = $dto->email !== null ? $repository->findOneBy(['email' => $dto->email]) : null;

            if ($user === null || !$this->changePasswordService->verifyOtp($user, $dto->code))
                return $this->errorJson(AppMessages::OTP_INVALID_OR_EXPIRED);
        }

        $user->setPassword($dto->newPassword);
        $this->flush();

        return $this->errorJson(AppMessages::PASSWORD_CHANGED);
    }
}
