<?php

namespace App\Dto\Chat;

use App\Entity\Ticket\Ticket;
use App\Entity\User;

class ChatPostInput
{
    public ?User   $replyAuthor = null;
    public ?Ticket $ticket      = null;
}
