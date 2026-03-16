<?php

namespace App\Service\OAuth\Telegram;

use App\Dto\OAuth\TelegramCallbackInput;
use App\Entity\User;
use App\Entity\UserOAuthProvider;
use App\Repository\UserRepository;
use Doctrine\ORM\EntityManagerInterface;
use Exception;
use Lexik\Bundle\JWTAuthenticationBundle\Services\JWTTokenManagerInterface;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Contracts\Cache\CacheInterface;
use Symfony\Contracts\Cache\ItemInterface;
use Symfony\Contracts\HttpClient\HttpClientInterface;

readonly class TelegramOAuthService
{
    public function __construct(
        private UserRepository           $userRepository,
        private EntityManagerInterface   $entityManager,
        private JWTTokenManagerInterface $jwtManager,
        private HttpClientInterface      $httpClient,
        private CacheInterface           $cache,
    ){}

    public function handleCallback(int $id, ?string $username, ?string $firstName, ?string $lastName, ?string $photoUrl, ?string $role): array
    {
        if (!$this->checkTelegramUserExists($id)) {
            throw new NotFoundHttpException('Telegram user not found');
        }

        $input            = new TelegramCallbackInput();
        $input->id        = $id;
        $input->username  = $username;
        $input->firstName = $firstName;
        $input->lastName  = $lastName;
        $input->photoUrl  = $photoUrl;

        return $this->findOrCreateUser($input, $role ?? 'user');
    }

    private function findOrCreateUser(TelegramCallbackInput $telegramData, string $role): array
    {
        $telegramId = (string) $telegramData->id;

        // 1. Already linked — log in directly
        if ($user = $this->userRepository->findByOAuthProvider('telegram', $telegramId)) {
            $this->updateUserFromTelegramData($user, $telegramData);
            $this->entityManager->flush();
            return ['user' => $user, 'token' => $this->jwtManager->create($user)];
        }

        // 2. No existing link — store data temporarily and request an email
        $tempToken = bin2hex(random_bytes(16));
        $this->cache->get('telegram_pending_' . $tempToken, function (ItemInterface $item) use ($telegramData, $role, $telegramId): string {
            $item->expiresAfter(600);
            return json_encode([
                'telegramId' => $telegramId,
                'username'   => $telegramData->username,
                'firstName'  => $telegramData->firstName,
                'lastName'   => $telegramData->lastName,
                'photoUrl'   => $telegramData->photoUrl,
                'role'       => $role,
            ]);
        });

        return ['status' => 'email_required', 'temp_token' => $tempToken];
    }

    private function updateUserFromTelegramData(User $user, TelegramCallbackInput $telegramData): void
    {
        if ($telegramData->username !== null && empty($user->getLogin())) {
            $user->setLogin($telegramData->username);
        }
        if ($telegramData->firstName !== null && empty($user->getName())) {
            $user->setName($telegramData->firstName);
        }
        if ($telegramData->lastName !== null && empty($user->getSurname())) {
            $user->setSurname($telegramData->lastName);
        }
        if ($telegramData->photoUrl !== null && empty($user->getImageExternalUrl())) {
            $user->setImageExternalUrl($telegramData->photoUrl);
        }
    }

    private function checkTelegramUserExists(int $userId): bool
    {
        try {
            $data = $this->httpClient->request(
                'GET',
                "https://api.telegram.org/bot{$_ENV['TELEGRAM_BOT_TOKEN']}/getChat",
                ['query' => ['chat_id' => $userId]]
            )->toArray(false);

            return $data['ok'] ?? false;
        } catch (Exception) {
            return false;
        }
    }
}
