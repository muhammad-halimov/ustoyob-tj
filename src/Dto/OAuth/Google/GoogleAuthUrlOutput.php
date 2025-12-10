<?php

namespace App\Dto\OAuth\Google;

use Symfony\Component\Serializer\Annotation\Groups;

final class GoogleAuthUrlOutput
{
    #[Groups(['google:read'])]
    public string $url;
}
