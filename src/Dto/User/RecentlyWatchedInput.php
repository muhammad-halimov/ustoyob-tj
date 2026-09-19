<?php

namespace App\Dto\User;

use App\Entity\Ticket\Ticket;

class RecentlyWatchedInput
{
    public ?Ticket $ticket = null;
}
