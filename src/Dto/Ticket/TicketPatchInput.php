<?php

namespace App\Dto\Ticket;

use App\Dto\Image\ImageObjectInput;

class TicketPatchInput extends TicketInput
{
    /**
     * @var ImageObjectInput[]
     */
    public array $images;
}
