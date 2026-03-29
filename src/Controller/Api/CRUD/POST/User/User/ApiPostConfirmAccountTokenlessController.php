<?php

namespace App\Controller\Api\CRUD\POST\User\User;

use App\ApiResource\AppMessages;
use App\Controller\Api\CRUD\Abstract\AbstractApiHelperController;
use App\Service\Auth\AccountConfirmationService;
use Random\RandomException;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Mailer\Exception\TransportExceptionInterface;

class ApiPostConfirmAccountTokenlessController extends AbstractApiHelperController
{
    public function __construct(private readonly AccountConfirmationService $accountConfirmationService) {}

    /**
     * @throws RandomException
     * @throws TransportExceptionInterface
     */
    public function __invoke(): JsonResponse
    {
        $bearer = $this->checkedUser(activeAndApproved: false);

        if ($bearer->getActive() && $bearer->getApproved())
            return $this->errorJson(AppMessages::USER_ALREADY_ACTIVATED);

        return $this->buildResponse([
            'success' => true,
            'message' => $this->accountConfirmationService->sendConfirmationEmail($bearer),
        ]);
    }
}
