<?php

namespace App\Service\OAuth\Telegram;

use App\ApiResource\AppMessages;
use App\Dto\OAuth\TelegramCallbackInput;
use App\Entity\Extra\OAuthProvider;
use App\Entity\User;
use App\Repository\User\UserRepository;
use Doctrine\ORM\EntityManagerInterface;
use Exception;
use Lexik\Bundle\JWTAuthenticationBundle\Services\JWTTokenManagerInterface;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Contracts\HttpClient\Exception\ClientExceptionInterface;
use Symfony\Contracts\HttpClient\Exception\DecodingExceptionInterface;
use Symfony\Contracts\HttpClient\Exception\RedirectionExceptionInterface;
use Symfony\Contracts\HttpClient\Exception\ServerExceptionInterface;
use Symfony\Contracts\HttpClient\Exception\TransportExceptionInterface;
use Symfony\Contracts\HttpClient\HttpClientInterface;

readonly class TelegramOAuthService
{
    public function __construct(
        private UserRepository           $userRepository,
        private EntityManagerInterface   $entityManager,
        private JWTTokenManagerInterface $jwtManager,
        private HttpClientInterface      $httpClient,
    ){}

    /**
     * @throws TransportExceptionInterface
     * @throws ServerExceptionInterface
     * @throws RedirectionExceptionInterface
     * @throws DecodingExceptionInterface
     * @throws ClientExceptionInterface
     */
    public function handleCallback(int $id, ?string $username, ?string $firstName, ?string $lastName, ?string $photoUrl, ?string $role): array
    {
        if (!$this->checkTelegramUserExists($id)) {
            throw new NotFoundHttpException(AppMessages::get(AppMessages::USER_NOT_FOUND)->message);
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

        // 2. New user — create immediately with a local placeholder email
        $user = (new User())
            ->setEmail("oauth+telegram_{$telegramId}@internal.local")
            ->setName($telegramData->firstName ?? '')
            ->setSurname($telegramData->lastName ?? '')
            ->setLogin($telegramData->username ?? null)
            ->setImageExternalUrl($telegramData->photoUrl ?? '')
            ->setPassword('')
            ->setActive(true)
            ->setApproved(true)
            ->setGender('gender_neutral')
            ->setRoles(match($role) {
                'master' => ['ROLE_MASTER'],
                'client' => ['ROLE_CLIENT'],
                default  => ['ROLE_USER'],
            });

        $op = (new OAuthProvider())
            ->setProvider('telegram')
            ->setProviderId($telegramId)
            ->setUser($user);

        $this->entityManager->persist($user);
        $this->entityManager->persist($op);
        $this->entityManager->flush();

        return ['user' => $user, 'token' => $this->jwtManager->create($user)];
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

    /**
     * @throws TransportExceptionInterface
     * @throws ServerExceptionInterface
     * @throws RedirectionExceptionInterface
     * @throws DecodingExceptionInterface
     * @throws ClientExceptionInterface
     */
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
