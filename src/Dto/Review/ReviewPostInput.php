<?php

namespace App\Dto\Review;

use App\Entity\Ticket\Ticket;
use App\Entity\User;

class ReviewPostInput
{
    public ?string $type        = null;
    public float   $rating      = 0;
    public ?Ticket $ticket      = null;
    public ?string $description = null;
    public ?User   $master      = null;
    public ?User   $client      = null;
}
