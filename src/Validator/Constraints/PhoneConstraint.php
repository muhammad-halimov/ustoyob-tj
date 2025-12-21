<?php

namespace App\Validator\Constraints;

use Attribute;
use Symfony\Component\Validator\Constraint;

#[Attribute(Attribute::TARGET_PROPERTY)]
class PhoneConstraint extends Constraint
{
    public string $message = "Invalid phone number format";

    public function __construct(
        public string $lang = 'ENG',
        mixed $options = null,
        ?array $groups = null,
        mixed $payload = null
    ) {
        parent::__construct($options, $groups, $payload);
    }

    public function getMessage(string $countryCode = '+992'): string
    {
        $examples = [
            '+992' => '+992 XX XXX XX XX',
            'international' => '+XXX XXXXXXXXXX',
        ];

        $example = $examples[$countryCode] ?? $examples['international'];

        return match($this->lang) {
            'RU' => "Неверный формат номера телефона. Пример: $example",
            'TJ' => "Раками гушии муштари нодуруст аст. Мисол: $example",
            default => "Invalid phone number. Example: $example",
        };
    }
}
