<?php

namespace App\Service\OAuth\Interface;

/**
 * Интерфейс для обмена authorization code на токены
 */
interface TokenExchangeInterface
{
    /**
     * Обменивает authorization code на токены
     */
    public function exchangeCodeForTokens(string $code): array;
}
