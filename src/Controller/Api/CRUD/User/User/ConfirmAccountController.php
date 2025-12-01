<?php

namespace App\Controller\Api\CRUD\User\User;

use App\Entity\User\AccountConfirmationToken;
use DateTime;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;

class ConfirmAccountController extends AbstractController
{
    public function __construct(
        private readonly EntityManagerInterface $entityManager,
    ){}

    public function __invoke(Request $request): JsonResponse
    {
        $data = json_decode($request->getContent(), true);

        $confirmationToken = $this->entityManager->getRepository(AccountConfirmationToken::class)
            ->findOneBy(['token' => $data['token']]);

        if (!$confirmationToken || $confirmationToken->getExpiresAt() < new DateTime())
            return $this->json(['success' => false, 'message' => 'Token is invalid or expired'], 400);

        $user = $confirmationToken->getUser();

        // Активируем пользователя
        $user->setActive(true);
        $user->setApproved(true);

        // Удаляем использованный токен
        $this->entityManager->remove($confirmationToken);
        $this->entityManager->flush();

        return $this->json([
            'success' => true,
            'redirectUrl' => $_ENV['FRONTEND_URL']
        ]);
    }
}
