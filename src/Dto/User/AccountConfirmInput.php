<?php

namespace App\Dto\User;

use Symfony\Component\Validator\Constraints as Assert;

class AccountConfirmInput
{
    #[Assert\NotBlank]
    #[Assert\Length(min: 32, max: 256)]
    #[Assert\Regex(
        pattern: '/^[a-zA-Z0-9_\-]+$/',
        message: 'Invalid token format.',
    )]
    public string $token;
}
