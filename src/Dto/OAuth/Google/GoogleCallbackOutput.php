<?php

namespace App\Dto\OAuth\Google;

use App\Entity\User;
use Symfony\Component\Serializer\Annotation\Groups;

final class GoogleCallbackOutput
{
    #[Groups([
        'google:read',
        'masters:read',
        'clients:read',
        'users:me:read'
    ])]
    public ?User $user = null;

    #[Groups([
        'google:read',
        'masters:read',
        'clients:read',
        'users:me:read'
    ])]
    public ?string $token = null;

    #[Groups([
        'google:read',
        'masters:read',
        'clients:read',
        'users:me:read'
    ])]
    public ?string $message = null;
}
