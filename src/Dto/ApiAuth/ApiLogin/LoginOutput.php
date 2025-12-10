<?php

namespace App\Dto\ApiAuth\ApiLogin;

use Symfony\Component\Serializer\Annotation\Groups;

final class LoginOutput
{
    #[Groups(['auth:read'])]
    public string $token;

    #[Groups(['auth:read'])]
    public ?string $message = null;

    #[Groups(['auth:read'])]
    public ?string $refresh_token_expiration = null;
}
