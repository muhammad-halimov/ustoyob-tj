<?php

namespace App\Service\OAuth\Interface;

/**
 * Интерфейс для получения данных пользователя
 */
interface UserDataFetcherInterface
{
    /**
     * Получает данные пользователя от провайдера
     */
    public function fetchUserData(array $tokens): array;
}
