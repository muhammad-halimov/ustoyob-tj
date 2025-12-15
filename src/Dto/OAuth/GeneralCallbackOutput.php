<?php

namespace App\Dto\OAuth;

use App\Entity\User;
use Symfony\Component\Serializer\Attribute\Groups;

final class GeneralCallbackOutput
{
    #[Groups([
        'google:read',
        'instagram:read',
        'facebook:read',
        'telegram:read',
        'masters:read',
        'clients:read',
        'users:me:read'
    ])]
    public ?User $user = null;

    #[Groups([
        'google:read',
        'instagram:read',
        'facebook:read',
        'telegram:read',
        'masters:read',
        'clients:read',
        'users:me:read'
    ])]
    public ?string $token = null;

    #[Groups([
        'google:read',
        'instagram:read',
        'facebook:read',
        'telegram:read',
        'masters:read',
        'clients:read',
        'users:me:read'
    ])]
    public ?string $message = null;
}
