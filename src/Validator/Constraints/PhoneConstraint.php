<?php

namespace App\Validator\Constraints;

use Attribute;
use Symfony\Component\Validator\Constraint;

#[Attribute(Attribute::TARGET_PROPERTY)]
class PhoneConstraint extends Constraint
{
    public string $message = "Invalid phone number. Example: +992 XXX XX XX XX";

    // Конструктор для передачи языка
    public function __construct(
        public string $lang = 'ENG',
        mixed $options = null,
        array $groups = null,
        mixed $payload = null
    ) {
        parent::__construct($options, $groups, $payload);
    }

    public function getMessage(): string
    {
        return match($this->lang) {
            'RU' => "Неверный формат номера телефона. Пример: +992 XXX XX XX XX",
            'TJ' => "Раками гушии муштари нодуруст аст. Мисол: +992 XXX XX XX XX",
            default => $this->message,
        };
    }
}
