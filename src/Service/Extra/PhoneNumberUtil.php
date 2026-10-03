<?php

namespace App\Service\Extra;

/**
 * Номер телефона для входа — всегда в одном виде, E.164 (+992901234567):
 * так он хранится в User::$phone, по нему ищется пользователь при входе, на
 * него уходит SMS. Любой ввод (пробелы, скобки, дефисы, 00 вместо +) сводится
 * к этому виду здесь, в одном месте.
 *
 * Без кода страны номер считается таджикским: 9 цифр → +992XXXXXXXXX (так же,
 * как PhoneConstraintValidator для телефонов профиля). Остальные страны —
 * только с кодом.
 */
final class PhoneNumberUtil
{
    public const string DEFAULT_COUNTRY_CODE = '992';

    /** Сколько цифр после кода страны — для стран, где это известно точно. */
    private const array NATIONAL_LENGTH = [
        '992' => 9,  // Таджикистан
        '998' => 9,  // Узбекистан
        '996' => 9,  // Кыргызстан
        '7'   => 10, // Россия/Казахстан
    ];

    /** E.164 или null, если это не номер телефона. */
    public static function normalize(?string $raw): ?string
    {
        if ($raw === null) return null;

        $value = trim($raw);
        if ($value === '' || str_contains($value, '@')) return null;

        // Кроме цифр допускаются только разделители, которые люди ставят в номерах
        if (!preg_match('/^\+?[\d\s()\-.]+$/', $value)) return null;

        $plus   = str_starts_with($value, '+');
        $digits = preg_replace('/\D/', '', $value);

        if (!$plus && str_starts_with($digits, '00')) {
            $digits = substr($digits, 2);
            $plus   = true;
        }

        if (!$plus) {
            $digits = match (true) {
                strlen($digits) === 9                                                   => self::DEFAULT_COUNTRY_CODE . $digits,
                strlen($digits) === 12 && str_starts_with($digits, self::DEFAULT_COUNTRY_CODE) => $digits,
                default                                                                 => null,
            };
            if ($digits === null) return null;
        }

        if (!preg_match('/^[1-9]\d{7,14}$/', $digits)) return null;

        foreach (self::NATIONAL_LENGTH as $code => $length) {
            if (str_starts_with($digits, $code) && strlen($digits) !== strlen($code) + $length) return null;
        }

        return '+' . $digits;
    }

    /** Похоже ли значение на номер телефона (а не на email). */
    public static function isPhone(?string $raw): bool
    {
        return self::normalize($raw) !== null;
    }

    /** Совпадает ли номер с одним из кодов стран из списка ("992,7,+998"). Пустой список — любые страны. */
    public static function inCountries(string $phone, string $countryCodes): bool
    {
        $codes = array_filter(array_map(static fn(string $c) => ltrim(trim($c), '+'), explode(',', $countryCodes)));
        if ($codes === []) return true;

        return array_any($codes, static fn(string $code) => str_starts_with($phone, '+' . $code));
    }

    /** +992 90 *** ** 67 — для логов и сообщений «код отправлен на …». */
    public static function mask(string $phone): string
    {
        $len = strlen($phone);
        if ($len < 8) return $phone;

        return substr($phone, 0, 6) . str_repeat('*', $len - 8) . substr($phone, -2);
    }
}
