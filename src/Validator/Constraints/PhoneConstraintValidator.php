<?php

namespace App\Validator\Constraints;

use Symfony\Component\Validator\Constraint;
use Symfony\Component\Validator\ConstraintValidator;
use Symfony\Component\Validator\Exception\UnexpectedTypeException;

class PhoneConstraintValidator extends ConstraintValidator
{
    // Строгие паттерны для известных стран
    private const array STRICT_PATTERNS = [
        '+992' => '/^(\+992)?[0-9]{9}$/',      // Таджикистан
        '+998' => '/^(\+998)?[0-9]{9}$/',      // Узбекистан
        '+996' => '/^(\+996)?[0-9]{9}$/',      // Кыргызстан
        '+7'   => '/^(\+7)?[0-9]{10}$/',       // Россия/Казахстан
        '+1'   => '/^(\+1)?[0-9]{10}$/',       // США/Канада
        '+44'  => '/^(\+44)?[0-9]{10}$/',      // Великобритания
        '+49'  => '/^(\+49)?[0-9]{10,11}$/',   // Германия
        '+33'  => '/^(\+33)?[0-9]{9}$/',       // Франция
        '+86'  => '/^(\+86)?[0-9]{11}$/',      // Китай
        '+81'  => '/^(\+81)?[0-9]{10}$/',      // Япония
        '+91'  => '/^(\+91)?[0-9]{10}$/',      // Индия
        '+971' => '/^(\+971)?[0-9]{9}$/',      // ОАЭ
        '+380' => '/^(\+380)?[0-9]{9}$/',      // Украина
        '+375' => '/^(\+375)?[0-9]{9}$/',      // Беларусь
    ];

    // Универсальный паттерн для остальных стран (стандарт E.164)
    // Международный формат: + и от 7 до 15 цифр
    private const string GENERIC_PATTERN = '/^\+[1-9][0-9]{6,14}$/';

    public function validate(mixed $value, Constraint $constraint): void
    {
        if (!$constraint instanceof PhoneConstraint) {
            throw new UnexpectedTypeException($constraint, PhoneConstraint::class);
        }

        if (null === $value || '' === $value) {
            return;
        }

        $cleaned = preg_replace('/[^\d+]/', '', $value);

        // Если номер начинается с +
        if (str_starts_with($cleaned, '+')) {
            $countryCode = $this->detectCountryCode($cleaned);

            // Если страна известна - строгая валидация
            if ($countryCode && isset(self::STRICT_PATTERNS[$countryCode])) {
                if (!$this->isValidForCountry($cleaned, $countryCode)) {
                    $this->context
                        ->buildViolation($constraint->getMessage($countryCode))
                        ->setParameter('{{ value }}', $value)
                        ->addViolation();
                }
            }
            // Если страна неизвестна - универсальная валидация
            else {
                if (!preg_match(self::GENERIC_PATTERN, $cleaned)) {
                    $this->context
                        ->buildViolation($constraint->getMessage('international'))
                        ->setParameter('{{ value }}', $value)
                        ->addViolation();
                }
            }
        }
        // Если номер без кода - добавляем +992 (Таджикистан по умолчанию)
        else {
            if (!preg_match('/^[0-9]{9}$/', $cleaned)) {
                $this->context
                    ->buildViolation($constraint->getMessage())
                    ->setParameter('{{ value }}', $value)
                    ->addViolation();
            }
        }
    }

    private function detectCountryCode(string $phone): ?string
    {
        // Проверяем известные коды (от длинных к коротким)
        $codes = array_keys(self::STRICT_PATTERNS);
        usort($codes, fn($a, $b) => strlen($b) - strlen($a));

        foreach ($codes as $code) {
            if (str_starts_with($phone, $code)) {
                return $code;
            }
        }

        // Для неизвестных стран извлекаем код (1-4 цифры после +)
        if (preg_match('/^\+([1-9][0-9]{0,3})/', $phone, $matches)) {
            return '+' . $matches[1];
        }

        return null;
    }

    private function isValidForCountry(string $phone, string $countryCode): bool
    {
        $pattern = self::STRICT_PATTERNS[$countryCode] ?? null;

        if (!$pattern) {
            return false;
        }

        return (bool) preg_match($pattern, $phone);
    }
}
