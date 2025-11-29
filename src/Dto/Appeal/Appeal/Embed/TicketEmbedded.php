<?php

namespace App\Dto\Appeal\Appeal\Embed;

class TicketEmbedded
{
    public int $id;
    public string $title;
    public ?bool $active = null;
    public ?bool $service = null;
}
