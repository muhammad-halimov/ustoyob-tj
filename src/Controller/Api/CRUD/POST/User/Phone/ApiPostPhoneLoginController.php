<?php

namespace App\Controller\Api\CRUD\POST\User\Phone;

use App\ApiResource\AppMessages;
use App\Controller\Api\CRUD\Abstract\AbstractApiHelperController;
use App\Dto\User\Phone\PhoneCodeInput;
use App\Entity\User;
use App\Service\Auth\PhoneCodeService;
use App\Service\Auth\RefreshTokenService;
use App\Service\Extra\PhoneNumberUtil;
use Lexik\Bundle\JWTAuthenticationBundle\Services\JWTTokenManagerInterface;
use Psr\Cache\InvalidArgumentException;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpKernel\Attribute\MapRequestPayload;

/**
 * POST /phone/login {phone, code} — вход по коду из SMS (POST /phone/send-code,
 * purpose login). Ответ — как у обычного входа по паролю: JWT в теле, refresh —
 * в HttpOnly-cookie (тот же механизм, что у OAuth-колбэков, см.
 * AbstractOAuthCallbackController).
 *
 * Им же подтверждается аккаунт, зарегистрированный по телефону: верный код —
 * доказательство, что номер его, ровно как переход по ссылке из письма для
 * email (ApiPostConfirmAccountController). Заблокированный (banned) не
 * активируется — setActive()/setApproved() этого и не позволят.
 */
class ApiPostPhoneLoginController extends AbstractApiHelperController
{
    public function __construct(
        private readonly PhoneCodeService         $phoneCodeService,
        private readonly JWTTokenManagerInterface $jwtManager,
        private readonly RefreshTokenService      $refreshTokenService,
    ) {}

    /** @throws InvalidArgumentException */
    public function __invoke(#[MapRequestPayload] PhoneCodeInput $dto): JsonResponse
    {
        $phone = PhoneNumberUtil::normalize($dto->phone);
        if ($phone === null) return $this->errorJson(AppMessages::PHONE_INVALID);

        $user = $this->entityManager->getRepository(User::class)->findOneBy(['phone' => $phone]);

        if ($user === null || !$this->phoneCodeService->verify($phone, PhoneCodeService::LOGIN, $dto->code))
            return $this->errorJson(AppMessages::OTP_INVALID_OR_EXPIRED);

        if (!$user->getBanned() && (!$user->getActive() || !$user->getApproved())) {
            $user->setActive(true);
            $user->setApproved(true);
            $this->flush();
        }

        $response = $this->json(['token' => $this->jwtManager->create($user)]);
        $response->headers->setCookie($this->refreshTokenService->createRefreshTokenCookie(
            $this->refreshTokenService->createRefreshToken($user)
        ));

        return $response;
    }
}
