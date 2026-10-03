<?php

namespace App\Controller\Api\CRUD\POST\User\Phone;

use App\ApiResource\AppMessages;
use App\Controller\Api\CRUD\Abstract\AbstractApiHelperController;
use App\Dto\User\Phone\PhoneCodeInput;
use App\Entity\User;
use App\Service\Auth\PhoneCodeService;
use App\Service\Auth\RefreshTokenService;
use App\Service\Extra\PhoneNumberUtil;
use App\Service\Extra\UuidUtil;
use Lexik\Bundle\JWTAuthenticationBundle\Services\JWTTokenManagerInterface;
use Psr\Cache\InvalidArgumentException;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpKernel\Attribute\MapRequestPayload;

/**
 * POST /users/me/phone {phone, code} — привязать (или сменить) телефон для
 * входа у своего аккаунта, с кодом из SMS (POST /phone/send-code, purpose
 * link). После этого входить можно и по номеру. Без кода номер не меняется
 * никак — см. User::$phone.
 *
 * В ответе — новый JWT (+ refresh-cookie): у аккаунта без email номер и есть
 * то, по чему его узнаёт токен (User::getUserIdentifier()), — со сменой
 * номера старый токен перестал бы находить пользователя.
 */
class ApiPostPhoneLinkController extends AbstractApiHelperController
{
    public function __construct(
        private readonly PhoneCodeService         $phoneCodeService,
        private readonly JWTTokenManagerInterface $jwtManager,
        private readonly RefreshTokenService      $refreshTokenService,
    ) {}

    /** @throws InvalidArgumentException */
    public function __invoke(#[MapRequestPayload] PhoneCodeInput $dto): JsonResponse
    {
        $user = $this->checkedUser(activeAndApproved: false);

        $phone = PhoneNumberUtil::normalize($dto->phone);
        if ($phone === null) return $this->errorJson(AppMessages::PHONE_INVALID);

        $owner = $this->entityManager->getRepository(User::class)->findOneBy(['phone' => $phone]);
        if ($owner !== null && !UuidUtil::same($owner->getId(), $user->getId()))
            return $this->errorJson(AppMessages::PHONE_ALREADY_EXISTS);

        if (!$this->phoneCodeService->verify($phone, PhoneCodeService::LINK, $dto->code))
            return $this->errorJson(AppMessages::OTP_INVALID_OR_EXPIRED);

        $user->setPhone($phone);
        $this->flush();

        $response = $this->json(['success' => true, 'phone' => $phone, 'token' => $this->jwtManager->create($user)]);
        $response->headers->setCookie($this->refreshTokenService->createRefreshTokenCookie(
            $this->refreshTokenService->createRefreshToken($user)
        ));

        return $response;
    }
}
