<?php

namespace App\Service\OAuth;

use App\Entity\User;
use App\Entity\User\AccountConfirmationToken;
use DateTime;
use Doctrine\ORM\EntityManagerInterface;
use Random\RandomException;
use Symfony\Component\Mailer\Exception\TransportExceptionInterface;
use Symfony\Component\Mailer\Mailer;
use Symfony\Component\Mailer\Transport;
use Symfony\Component\Mime\Email;
use Symfony\Component\Routing\Generator\UrlGeneratorInterface;

readonly class AccountConfirmationService
{
    public function __construct(
        private EntityManagerInterface $entityManager,
        private UrlGeneratorInterface  $urlGenerator
    ) {
    }

    /**
     * @throws RandomException
     * @throws TransportExceptionInterface
     */
    public function sendConfirmationEmail(User $user): string
    {
        $transport = Transport::fromDsn($_ENV['MAILER_DSN']);
        $mailer = new Mailer($transport);

        // Удаляем старые токены для этого пользователя
        $oldTokens = $this->entityManager->getRepository(AccountConfirmationToken::class)->findBy(['user' => $user]);

        foreach ($oldTokens as $token) $this->entityManager->remove($token);

        // Создаем новый токен
        $token = new AccountConfirmationToken();
        $token->setUser($user);
        $token->setToken(bin2hex(random_bytes(32)));
        $token->setExpiresAt(new DateTime('+24 hours'));

        $this->entityManager->persist($token);
        $this->entityManager->flush();

        // Генерируем ссылку для подтверждения
        $confirmationUrl = $this->urlGenerator->generate(
            'app_confirm_account',
            ['token' => $token->getToken()],
            UrlGeneratorInterface::ABSOLUTE_URL
        );

        // Отправляем письмо
        $email = (new Email())
            ->from($_ENV['MAILER_SENDER'])
            ->to($user->getEmail())
            ->subject("Подтверждение аккаунта на {$_ENV["FRONTEND_URL"]}")
            ->html("
                <div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;'>
                    <h1 style='color: #667eea;'>Подтверждение аккаунта</h1>
                    <p>Здравствуйте!</p>
                    <p>Для активации вашего аккаунта на <strong>{$_ENV['FRONTEND_URL']}</strong> перейдите по ссылке ниже:</p>
                    <p style='margin: 30px 0;'>
                        <a href='$confirmationUrl'
                           style='background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                                  color: white;
                                  padding: 15px 30px;
                                  text-decoration: none;
                                  border-radius: 50px;
                                  display: inline-block;
                                  font-weight: 600;'>
                            Подтвердить аккаунт
                        </a>
                    </p>
                    <p style='color: #666; font-size: 14px;'>Ссылка действительна в течение 24 часов.</p>
                    <hr style='margin: 30px 0; border: none; border-top: 1px solid #eee;'>
                    <p style='color: #999; font-size: 12px;'>
                        Если вы не регистрировались на {$_ENV['FRONTEND_URL']}, просто проигнорируйте это письмо.
                    </p>
                </div>
            ");

        $mailer->send($email);

        return "Письмо отправлено пользователю {$user->getEmail()}";
    }
}
