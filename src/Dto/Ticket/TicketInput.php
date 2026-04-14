<?php

namespace App\Dto\Ticket;

use App\Entity\Ticket\Category;
use App\Entity\Ticket\Unit;
use App\Entity\User\Occupation;

class TicketInput
{
    public ?string     $title            = null;
    public ?string     $description      = null;
    public ?string     $notice           = null;
    public ?bool       $active           = null;
    public ?float      $budget           = null;
    public ?bool       $negotiableBudget = null;
    public ?Category   $category         = null;
    public ?Occupation $subcategory      = null;
    public ?Unit       $unit             = null;
    public array       $address          = [];
}
