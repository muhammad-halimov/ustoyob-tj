<?php

namespace App\Service\OAuth\Interface;

use App\Entity\User;

/**
 * Интерфейс для управления пользователями OAuth
 */
interface UserManagementInterface
{
    /**
     * Находит или создает пользователя на основе данных от провайдера
     */
    public function findOrCreateUser(array $userData, ?string $role): User;

    /**
     * Обновляет данные существующего пользователя
     */
    public function updateUserData(User $user, array $userData): void;
}
