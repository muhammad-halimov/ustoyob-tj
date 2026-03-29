<?php

namespace App\Dto\User;

use App\Entity\Ticket\Ticket;
use App\Entity\User;

class CollectionEntryInput
{
    public ?User   $user   = null;
    public ?Ticket $ticket = null;
}
