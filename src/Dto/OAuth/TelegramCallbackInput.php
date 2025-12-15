<?php

namespace App\Dto\OAuth;

use Symfony\Component\Serializer\Attribute\Groups;
use Symfony\Component\Validator\Constraints as Assert;

final class TelegramCallbackInput
{
    #[Groups(['telegram:write'])]
    #[Assert\NotBlank]
    #[Assert\Positive]
    public int $id;

    #[Groups(['telegram:write'])]
    public ?string $username = null;

    #[Groups(['telegram:write'])]
    public ?string $firstName = null;

    #[Groups(['telegram:write'])]
    public ?string $lastName = null;

    #[Groups(['telegram:write'])]
    public ?string $photoUrl = null;

    #[Groups(['telegram:write'])]
    public ?string $role = null;
}
