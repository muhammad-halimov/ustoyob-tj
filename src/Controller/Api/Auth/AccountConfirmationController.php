<?php

namespace App\Controller\Api\Auth;

use App\Entity\User\AccountConfirmationToken;
use DateTime;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

class AccountConfirmationController extends AbstractController
{
    #[Route(path: '/confirm-account/{token}', name: 'app_confirm_account')]
    public function confirmAccount(string $token, EntityManagerInterface $entityManager): Response
    {
        // Находим токен в базе
        $confirmationToken = $entityManager->getRepository(AccountConfirmationToken::class)
            ->findOneBy(['token' => $token]);

        if (!$confirmationToken || $confirmationToken->getExpiresAt() < new DateTime()) {
            return $this->render('account_confirmation/confirm_account.html.twig', [
                'token' => null,
                'expired' => true,
            ]);
        }

        return $this->render('account_confirmation/confirm_account.html.twig', [
            'token' => $token,
            'expired' => false
        ]);
    }
}
