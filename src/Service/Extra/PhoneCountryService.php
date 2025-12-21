<?php

namespace App\Service\Extra;

class PhoneCountryService
{
    private const array COUNTRIES = [
        '+992' => ['name' => 'Tajikistan', 'name_ru' => 'Таджикистан', 'format' => 'XX XXX XX XX', 'length' => 9],
        '+998' => ['name' => 'Uzbekistan', 'name_ru' => 'Узбекистан', 'format' => 'XX XXX XX XX', 'length' => 9],
        '+996' => ['name' => 'Kyrgyzstan', 'name_ru' => 'Кыргызстан', 'format' => 'XXX XX XX XX', 'length' => 9],
        '+7'   => ['name' => 'Russia/Kazakhstan', 'name_ru' => 'Россия/Казахстан', 'format' => 'XXX XXX XX XX', 'length' => 10],
        '+1'   => ['name' => 'USA/Canada', 'name_ru' => 'США/Канада', 'format' => '(XXX) XXX-XXXX', 'length' => 10],
        '+44'  => ['name' => 'United Kingdom', 'name_ru' => 'Великобритания', 'format' => 'XXXX XXXXXX', 'length' => 10],
        '+49'  => ['name' => 'Germany', 'name_ru' => 'Германия', 'format' => 'XXX XXXXXXX', 'length' => [10, 11]],
        '+33'  => ['name' => 'France', 'name_ru' => 'Франция', 'format' => 'X XX XX XX XX', 'length' => 9],
        '+86'  => ['name' => 'China', 'name_ru' => 'Китай', 'format' => 'XXX XXXX XXXX', 'length' => 11],
        '+81'  => ['name' => 'Japan', 'name_ru' => 'Япония', 'format' => 'XX XXXX XXXX', 'length' => 10],
        '+91'  => ['name' => 'India', 'name_ru' => 'Индия', 'format' => 'XXXXX XXXXX', 'length' => 10],
        '+971' => ['name' => 'UAE', 'name_ru' => 'ОАЭ', 'format' => 'XX XXX XXXX', 'length' => 9],
        '+380' => ['name' => 'Ukraine', 'name_ru' => 'Украина', 'format' => 'XX XXX XX XX', 'length' => 9],
        '+375' => ['name' => 'Belarus', 'name_ru' => 'Беларусь', 'format' => 'XX XXX XX XX', 'length' => 9],
        '+995' => ['name' => 'Georgia', 'name_ru' => 'Грузия', 'format' => 'XXX XX XX XX', 'length' => 9],
        '+994' => ['name' => 'Azerbaijan', 'name_ru' => 'Азербайджан', 'format' => 'XX XXX XX XX', 'length' => 9],
        '+993' => ['name' => 'Turkmenistan', 'name_ru' => 'Туркменистан', 'format' => 'XX XX XX XX', 'length' => 8],
    ];

    public function getCountryInfo(string $countryCode): ?array
    {
        return self::COUNTRIES[$countryCode] ?? null;
    }

    public function isKnownCountry(string $countryCode): bool
    {
        return isset(self::COUNTRIES[$countryCode]);
    }

    public function getAllCountries(): array
    {
        return self::COUNTRIES;
    }

    public function validatePhoneLength(string $phone, string $countryCode): bool
    {
        $info = $this->getCountryInfo($countryCode);

        $digitCount = strlen(preg_replace('/\D/', '', str_replace($countryCode, '', $phone)));

        if (!$info) {
            // Для неизвестных стран проверяем общий диапазон 7-15 цифр (стандарт E.164)
            return $digitCount >= 7 && $digitCount <= 15;
        }

        if (is_array($info['length'])) {
            return in_array($digitCount, $info['length']);
        }

        return $digitCount === $info['length'];
    }

    public function getCountryName(string $countryCode, string $locale = 'en'): string
    {
        $info = $this->getCountryInfo($countryCode);

        if (!$info) {
            return 'Unknown';
        }

        return match($locale) {
            'ru' => $info['name_ru'] ?? $info['name'],
            default => $info['name'],
        };
    }

    public function getFormatExample(string $countryCode): string
    {
        $info = $this->getCountryInfo($countryCode);

        if (!$info) {
            return $countryCode . ' XXXXXXXXXX';
        }

        return $countryCode . ' ' . $info['format'];
    }
}
