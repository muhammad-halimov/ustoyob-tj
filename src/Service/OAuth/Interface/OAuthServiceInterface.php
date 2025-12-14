<?php

namespace App\Service\OAuth\Interface;

/**
 * Интерфейс для OAuth провайдеров
 */
interface OAuthServiceInterface
{
    /**
     * Генерирует URL для авторизации
     */
    public function generateOAuthRedirectUri(): string;

    /**
     * Обрабатывает callback от провайдера
     *
     * @return array ['user' => User, 'token' => string]
     */
    public function handleCode(string $code, string $state, ?string $role): array;

    /**
     * Возвращает имя провайдера
     */
    public function getProviderName(): string;
}
