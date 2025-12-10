<?php

namespace App\Dto\OAuth\Google;

use Symfony\Component\Serializer\Annotation\Groups;

final class GoogleCallbackInput
{
    #[Groups(['google:write'])]
    public string $code;

    #[Groups(['google:write'])]
    public string $state;
}
