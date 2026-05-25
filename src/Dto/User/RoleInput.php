<?php

namespace App\Dto\User;

use Symfony\Component\Validator\Constraints as Assert;

class RoleInput
{
    #[Assert\NotBlank]
    #[Assert\Choice(
        choices: ['ROLE_MASTER', 'ROLE_CLIENT'],
        message: 'Invalid role. Allowed: ROLE_MASTER, ROLE_CLIENT.',
    )]
    public ?string $role = null;
}
