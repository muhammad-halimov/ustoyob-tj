<?php

namespace App\Dto\OAuth;

use Symfony\Component\Serializer\Annotation\Groups;

final class GeneralAuthUrlOutput
{
    #[Groups([
        'google:read',
        'instagram:read',
        'facebook:read',
    ])]
    public string $url;
}
