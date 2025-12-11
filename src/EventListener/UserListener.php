<?php

namespace App\EventListener;

use App\Entity\User;
use Doctrine\Bundle\DoctrineBundle\Attribute\AsEntityListener;
use Doctrine\ORM\Events;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;

#[AsEntityListener(event: Events::prePersist, entity: User::class)]
#[AsEntityListener(event: Events::preUpdate, entity: User::class)]
readonly class UserListener
{
    private const array HASHED_PASSWORD_PREFIX = ['$2y$', '$argon2', '$2a$', '$2b$'];

    public function __construct(
        private UserPasswordHasherInterface $passwordHasher,
    ) {}

    /**
     * Хэшируем пароль перед сохранением пользователя
     */
    public function prePersist(User $user): void
    {
        $this->hashPasswordIfNeeded($user);
    }

    /**
     * Хэшируем пароль перед обновлением пользователя
     */
    public function preUpdate(User $user): void
    {
        $this->hashPasswordIfNeeded($user);
    }

    /**
     * Хэширует пароль, если он еще не хэширован
     */
    private function hashPasswordIfNeeded(User $user): void
    {
        $password = $user->getPassword();

        if (!$password || $this->isPasswordHashed($password)) {
            return;
        }

        $hashedPassword = $this->passwordHasher->hashPassword($user, $password);
        $user->setPassword($hashedPassword);
    }

    /**
     * Проверяет, хэширован ли пароль
     */
    private function isPasswordHashed(string $password): bool
    {
        return array_any(self::HASHED_PASSWORD_PREFIX, fn($prefix) => str_starts_with($password, $prefix));
    }
}
