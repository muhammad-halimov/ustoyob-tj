<?php

namespace App\Controller\Api\CRUD\POST\User\User;

use App\Controller\Api\CRUD\Abstract\AbstractApiHelperController;
use App\Dto\User\ChangePasswordSendOtpInput;
use App\Entity\User;
use App\Service\Auth\AccountChangePasswordService;
use Psr\Cache\InvalidArgumentException;
use Random\RandomException;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpKernel\Attribute\MapRequestPayload;
use Symfony\Component\Mailer\Exception\TransportExceptionInterface;

class ApiPostChangePasswordSendOtpController extends AbstractApiHelperController
{
    public function __construct(private readonly AccountChangePasswordService $changePasswordService) {}

    /**
     * @throws RandomException
     * @throws TransportExceptionInterface
     * @throws InvalidArgumentException
     */
    public function __invoke(#[MapRequestPayload] ChangePasswordSendOtpInput $dto): JsonResponse
    {
        $user = $this->entityManager->getRepository(User::class)->findOneBy(['email' => $dto->email]);

        // Намеренно не раскрываем существование email — всегда 200
        if ($user !== null) {
            $this->changePasswordService->sendOtp($user);
        }

        return $this->buildResponse(['success' => true]);
    }
}
