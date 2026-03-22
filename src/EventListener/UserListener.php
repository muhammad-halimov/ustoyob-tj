<?php

namespace App\EventListener;

use App\Entity\User;
use Doctrine\Bundle\DoctrineBundle\Attribute\AsEntityListener;
use Doctrine\ORM\Events;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;

/**
 * Автоматически хэширует пароль пользователя перед записью в БД.
 *
 * Зачем слушатель, а не логика в контроллере?
 *   Пароль может быть установлен из разных мест: регистрация, смена пароля,
 *   OAuth-создание аккаунта, команды консоли, фикстуры. Listener гарантирует,
 *   что plaintext никогда не попадёт в БД независимо от точки входа.
 */
#[AsEntityListener(event: Events::prePersist, entity: User::class)]
#[AsEntityListener(event: Events::preUpdate, entity: User::class)]
readonly class UserListener
{
    /**
     * Префиксы уже захэшированных паролей.
     *   $2y$, $2a$, $2b$ — bcrypt (PHP по умолчанию использует $2y$)
     *   $argon2 — Argon2i / Argon2id
     * Если пароль начинается с одного из них — он уже хэширован, пропускаем.
     */
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
