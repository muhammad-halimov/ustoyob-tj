<?php

namespace App\Controller\Api\CRUD\POST\User\User;

use App\ApiResource\AppMessages;
use App\Controller\Api\CRUD\Abstract\AbstractApiHelperController;
use App\Dto\User\ChangePasswordSendOtpInput;
use App\Entity\User;
use App\Service\Auth\AccountChangePasswordService;
use App\Service\Auth\PhoneCodeService;
use App\Service\Extra\PhoneNumberUtil;
use Psr\Cache\InvalidArgumentException;
use Random\RandomException;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpKernel\Attribute\MapRequestPayload;
use Symfony\Component\Mailer\Exception\TransportExceptionInterface;

/**
 * Код для смены пароля: {email} — письмом, {phone} — по SMS.
 */
class ApiPostChangePasswordSendOtpController extends AbstractApiHelperController
{
    public function __construct(
        private readonly AccountChangePasswordService $changePasswordService,
        private readonly PhoneCodeService             $phoneCodeService,
    ) {}

    /**
     * @throws RandomException
     * @throws TransportExceptionInterface
     * @throws InvalidArgumentException
     */
    public function __invoke(#[MapRequestPayload] ChangePasswordSendOtpInput $dto): JsonResponse
    {
        $repository = $this->entityManager->getRepository(User::class);

        // Намеренно не раскрываем, есть ли такой email/номер — всегда 200
        if ($dto->phone !== null && trim($dto->phone) !== '') {
            $phone = PhoneNumberUtil::normalize($dto->phone);
            if ($phone === null) return $this->errorJson(AppMessages::PHONE_INVALID);

            if ($repository->findOneBy(['phone' => $phone]) !== null) $this->phoneCodeService->send($phone, PhoneCodeService::RESET);
            else $this->phoneCodeService->throttle($phone);

            return $this->buildResponse(['success' => true]);
        }

        if ($dto->email === null || trim($dto->email) === '') return $this->errorJson(AppMessages::EMAIL_OR_PHONE_REQUIRED);

        $user = $repository->findOneBy(['email' => $dto->email]);
        if ($user !== null) {
            $this->changePasswordService->sendOtp($user);
        }

        return $this->buildResponse(['success' => true]);
    }
}
