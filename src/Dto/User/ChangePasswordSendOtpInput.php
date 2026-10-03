<?php

namespace App\Dto\User;

use Symfony\Component\Validator\Constraints as Assert;

/** Email или телефон (тогда код придёт по SMS) — что-то одно. */
class ChangePasswordSendOtpInput
{
    #[Assert\Email]
    public ?string $email = null;

    #[Assert\Length(max: 32)]
    public ?string $phone = null;
}
