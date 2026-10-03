<?php

namespace App\Controller\Api\CRUD\POST\User\User;

use App\ApiResource\AppMessages;
use App\Controller\Api\CRUD\Abstract\AbstractApiHelperController;
use App\Service\Auth\AccountConfirmationService;
use App\Service\Auth\PhoneCodeService;
use Psr\Cache\InvalidArgumentException;
use Random\RandomException;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Mailer\Exception\TransportExceptionInterface;

/**
 * Повторно отправить подтверждение аккаунта: письмо со ссылкой, а
 * зарегистрированному по телефону (без email) — код по SMS, которым он
 * подтверждает аккаунт через POST /phone/login. channel в ответе — куда ушло.
 */
class ApiPostConfirmAccountTokenlessController extends AbstractApiHelperController
{
    public function __construct(
        private readonly AccountConfirmationService $accountConfirmationService,
        private readonly PhoneCodeService           $phoneCodeService,
    ) {}

    /**
     * @throws RandomException
     * @throws TransportExceptionInterface
     * @throws InvalidArgumentException
     */
    public function __invoke(): JsonResponse
    {
        $bearer = $this->checkedUser(activeAndApproved: false);

        if ($bearer->getActive() && $bearer->getApproved())
            return $this->errorJson(AppMessages::USER_ALREADY_ACTIVATED);

        if ($bearer->getEmail() === null && $bearer->getPhone() !== null) {
            $this->phoneCodeService->send($bearer->getPhone(), PhoneCodeService::LOGIN);

            return $this->buildResponse(['success' => true, 'channel' => 'sms']);
        }

        return $this->buildResponse([
            'success' => true,
            'channel' => 'email',
            'message' => $this->accountConfirmationService->sendConfirmationEmail($bearer),
        ]);
    }
}
