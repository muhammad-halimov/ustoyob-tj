<?php

namespace App\Service\OAuth\Telegram;

use App\Dto\OAuth\TelegramCallbackInput;
use App\Entity\Extra\OAuthType;
use App\Entity\User;
use App\Repository\UserRepository;
use Doctrine\ORM\EntityManagerInterface;
use Exception;
use Lexik\Bundle\JWTAuthenticationBundle\Services\JWTTokenManagerInterface;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

readonly class TelegramOAuthService
{
    public function __construct(
        private UserRepository           $userRepository,
        private EntityManagerInterface   $entityManager,
        private JWTTokenManagerInterface $jwtManager,
    ){}

    public function handleCallback(int $id, ?string $username, ?string $firstName, ?string $lastName, ?string $photoUrl, ?string $role): array
    {
        if (!$this->checkTelegramUserExists($id)) {
            throw new NotFoundHttpException('Telegram user not found');
        }

        $userOutput = new TelegramCallbackInput();

        $userOutput->id = $id;
        $userOutput->username = $username;
        $userOutput->firstName = $firstName;
        $userOutput->lastName = $lastName;
        $userOutput->photoUrl = $photoUrl;

        $user = $this->findOrCreateUser($userOutput, $role);

        return ['user' => $user, 'token' => $this->jwtManager->create($user)];
    }

    private function findOrCreateUser(TelegramCallbackInput $telegramData, string $role): User
    {
        $telegramId = $telegramData->id; // Уникальный ID пользователя в Telegram

        // 1. Поиск по Telegram ID - пользователь уже заходил через Telegram
        if ($user = $this->userRepository->findByTelegramId($telegramId)) {
            $this->updateUserFromTelegramData($user, $telegramData);
            $this->entityManager->flush();
            return $user;
        }

        $domain = preg_replace('/^https?:\/\//', '', $_ENV['FRONTEND_URL']);

        // 2. Создание нового пользователя - первый вход через Telegram
        $oauth = new OAuthType();
        $oauth->setTelegramId($telegramId);

        $user = (new User())
            ->setOauthType($oauth)
            ->setLogin($telegramData->username ?? "telegram_user_$telegramId")
            ->setName($telegramData->firstName)
            ->setSurname($telegramData->lastName)
            ->setImageExternalUrl($telegramData->photoUrl)
            ->setEmail("telegram.$telegramId@$domain")
            ->setPassword('') // OAuth пользователи не имеют пароля
            ->setActive(true)
            ->setApproved(true)
            ->setGender('gender_neutral')
            ->setRoles(match($role) {
                'master' => ['ROLE_MASTER'],
                'client' => ['ROLE_CLIENT'],
                default => ['ROLE_USER'],
            });

        $this->entityManager->persist($oauth);
        $this->entityManager->persist($user);
        $this->entityManager->flush();

        return $user;
    }

    private function updateUserFromTelegramData(User $user, TelegramCallbackInput $telegramData): void
    {
        if ($telegramData->username !== null) {
            $user->setLogin($telegramData->username);
        }

        $user
            ->setName($telegramData->firstName)
            ->setSurname($telegramData->lastName)
            ->setImageExternalUrl($telegramData->photoUrl);
    }

    private function checkTelegramUserExists(int $userId): bool
    {
        try {
            $url = "https://api.telegram.org/bot{$_ENV['TELEGRAM_BOT_TOKEN']}/getChat?chat_id=$userId";
            $response = file_get_contents($url);
            $data = json_decode($response, true);

            return isset($data['ok']) && $data['ok'] === true;
        } catch (Exception) {
            return false;
        }
    }
}
