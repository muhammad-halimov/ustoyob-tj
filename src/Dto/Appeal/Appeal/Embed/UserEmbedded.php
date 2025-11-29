<?php

namespace App\Dto\Appeal\Appeal\Embed;

class UserEmbedded
{
    public int $id;
    public string $email;
    public ?string $name = null;
    public ?string $surname = null;
    public string|null $image = null;
}
