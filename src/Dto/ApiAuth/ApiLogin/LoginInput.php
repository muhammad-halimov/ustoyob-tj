<?php

namespace App\Dto\ApiAuth\ApiLogin;

use Symfony\Component\Serializer\Annotation\Groups;
use Symfony\Component\Validator\Constraints as Assert;

final class LoginInput
{
    #[Groups(['auth:write'])]
    #[Assert\NotBlank(message: 'Email is required')]
    #[Assert\Email]
    public string $email;

    #[Groups(['auth:write'])]
    public ?string $password = null;
}
