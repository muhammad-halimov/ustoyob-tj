<?php

namespace App\Controller\Api\CRUD\POST\User\Phone;

use App\ApiResource\AppMessages;
use App\Controller\Api\CRUD\Abstract\AbstractApiHelperController;
use App\Dto\User\Phone\PhoneSendCodeInput;
use App\Entity\User;
use App\Service\Auth\PhoneCodeService;
use App\Service\Extra\PhoneNumberUtil;
use Psr\Cache\InvalidArgumentException;
use Random\RandomException;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpKernel\Attribute\MapRequestPayload;

/**
 * POST /phone/send-code {phone, purpose} — код по SMS.
 *
 *   login — вход по коду (POST /phone/login), им же подтверждается аккаунт,
 *           зарегистрированный по телефону. Без авторизации. Есть ли аккаунт с
 *           этим номером, ответ не выдаёт (всегда 200, как у send-otp по email) —
 *           SMS уходит, только если есть.
 *   link  — привязать номер к своему аккаунту (POST /users/me/phone). С
 *           авторизацией; номер, занятый другим аккаунтом, — PHONE_ALREADY_EXISTS.
 */
class ApiPostPhoneSendCodeController extends AbstractApiHelperController
{
    public function __construct(private readonly PhoneCodeService $phoneCodeService) {}

    /**
     * @throws RandomException
     * @throws InvalidArgumentException
     */
    public function __invoke(#[MapRequestPayload] PhoneSendCodeInput $dto): JsonResponse
    {
        $phone = PhoneNumberUtil::normalize($dto->phone);
        if ($phone === null) return $this->errorJson(AppMessages::PHONE_INVALID);

        $owner = $this->entityManager->getRepository(User::class)->findOneBy(['phone' => $phone]);

        if ($dto->purpose === PhoneCodeService::LINK) {
            $this->checkedUser(activeAndApproved: false);
            // Свой же номер привязывать заново незачем — тот же ответ
            if ($owner !== null) return $this->errorJson(AppMessages::PHONE_ALREADY_EXISTS);

            $this->phoneCodeService->send($phone, PhoneCodeService::LINK);

            return $this->buildResponse(['success' => true]);
        }

        if ($owner !== null) $this->phoneCodeService->send($phone, PhoneCodeService::LOGIN);
        else $this->phoneCodeService->throttle($phone);

        return $this->buildResponse(['success' => true]);
    }
}
