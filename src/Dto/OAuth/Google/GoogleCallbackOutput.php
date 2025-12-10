<?php

namespace App\Dto\OAuth\Google;

use App\Entity\User;
use Symfony\Component\Serializer\Annotation\Groups;

final class GoogleCallbackOutput
{
    #[Groups(['google:read'])]
    public User $user;

    #[Groups(['google:read'])]
    public string $token;
}
