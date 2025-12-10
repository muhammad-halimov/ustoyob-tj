<?php

namespace App\Controller\Api\CRUD\User\User;

use App\Entity\User;
use App\Service\AccountConfirmationService;
use Random\RandomException;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Symfony\Component\Mailer\Exception\TransportExceptionInterface;
use Symfony\Component\Security\Core\Exception\TokenNotFoundException;

class ConfirmAccountTokenlessController extends AbstractController
{
    public function __construct(
        private readonly AccountConfirmationService $accountConfirmationService,
        private readonly Security                   $security,
    ){}

    /**
     * Отправляем письмо подтверждения после сохранения пользователя
     * @throws RandomException
     * @throws TransportExceptionInterface
     */
    public function __invoke(Request $request): JsonResponse
    {
        /** @var User $bearerUser */
        $bearerUser = $this->security->getUser();

        if (!$bearerUser)
            throw new TokenNotFoundException('Authentication required');

        if ($bearerUser->getActive() && $bearerUser->getApproved())
            throw new AccessDeniedHttpException('User already activated and approved');

        return $this->json([
            'success' => true,
            'message' => $this->accountConfirmationService->sendConfirmationEmail($bearerUser)
        ]);
    }
}
