<?php

namespace App\Dto\Chat;

use App\Dto\Image\ImageObjectInput;
use App\Entity\Chat\Chat;

class ChatMessagePatchInput
{
    public ?Chat   $chat        = null;
    public ?string $description = null;

    /** @var ImageObjectInput[] */
    public array   $images = [];
}
