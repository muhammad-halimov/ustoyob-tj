<?php

namespace App\Dto\ApiAuth\ApiLogout;

use Symfony\Component\Serializer\Annotation\Groups;

final class LogoutOutput
{
    #[Groups(['auth:read'])]
    public bool $success;

    #[Groups(['auth:read'])]
    public ?string $message = null;
}
