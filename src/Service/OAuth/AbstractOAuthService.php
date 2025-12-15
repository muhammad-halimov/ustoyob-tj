<?php

namespace App\Service\OAuth;

use App\Entity\User;
use App\Repository\UserRepository;
use App\Service\OAuth\Interface\OAuthServiceInterface;
use App\Service\OAuth\Interface\TokenExchangeInterface;
use App\Service\OAuth\Interface\UserDataFetcherInterface;
use App\Service\OAuth\Interface\UserManagementInterface;
use Doctrine\ORM\EntityManagerInterface;
use Lexik\Bundle\JWTAuthenticationBundle\Services\JWTTokenManagerInterface;
use Psr\Cache\InvalidArgumentException;
use Random\RandomException;
use Symfony\Component\HttpKernel\Exception\BadRequestHttpException;
use Symfony\Contracts\HttpClient\HttpClientInterface;

/**
 * Базовый класс для всех OAuth сервисов
 */
abstract class AbstractOAuthService implements
    OAuthServiceInterface,
    TokenExchangeInterface,
    UserDataFetcherInterface,
    UserManagementInterface
{
    public function __construct(
        protected readonly HttpClientInterface      $httpClient,
        protected readonly StateStorage             $stateStorage,
        protected readonly UserRepository           $userRepository,
        protected readonly EntityManagerInterface   $entityManager,
        protected readonly JWTTokenManagerInterface $jwtManager,
    ) {}

    /**
     * @throws RandomException
     * @throws InvalidArgumentException
     */
    public function generateOAuthRedirectUri(): string
    {
        $randomState = bin2hex(random_bytes(16));
        $this->stateStorage->add($randomState);

        $queryParams = array_merge($this->getAuthParams(), ['state' => $randomState]);

        return $this->getAuthUri() . '?' . http_build_query($queryParams, '', '&', PHP_QUERY_RFC3986);
    }

    /**
     * @param string $code
     * @param string $state
     * @param string|null $role
     * @return array
     * @throws InvalidArgumentException
     */
    public function handleCode(string $code, string $state, ?string $role): array
    {
        if (!$this->stateStorage->has($state)) {
            throw new BadRequestHttpException('Invalid state');
        }

        $this->stateStorage->remove($state);

        $tokens = $this->exchangeCodeForTokens($code);
        $userData = $this->fetchUserData($tokens);
        $user = $this->findOrCreateUser($userData, $role);

        return ['user' => $user, 'token' => $this->jwtManager->create($user)];
    }

    /**
     * Возвращает URI для авторизации
     */
    abstract protected function getAuthUri(): string;

    /**
     * Возвращает параметры для URL авторизации
     */
    abstract protected function getAuthParams(): array;

    // Методы из интерфейсов должны быть реализованы в подклассах
    abstract public function exchangeCodeForTokens(string $code): array;
    abstract public function fetchUserData(array $tokens): array;
    abstract public function findOrCreateUser(array $userData, ?string $role): User;
    abstract public function updateUserData(User $user, array $userData): void;
    abstract public function getProviderName(): string;
}
