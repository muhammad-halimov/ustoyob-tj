<?php

namespace App\Dto\Chat;

use App\Entity\Chat\Chat;
use App\Entity\Chat\ChatMessage;

class ChatMessagePostInput
{
    public ?Chat        $chat        = null;
    public ?string      $description = null;
    public ?ChatMessage $replyTo     = null;
}
