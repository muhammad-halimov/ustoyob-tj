<?php

namespace App\Dto\Ticket;

use App\Entity\Geography\District\District;
use App\Entity\Ticket\Category;
use App\Entity\Ticket\Unit;
use App\Entity\User;
use DateTime;

class TicketOutput
{
    public ?int $id = null;
    public ?string $title = null;
    public ?string $description = null;
    public ?string $notice = null;
    public ?bool $active = null;
    public ?bool $service = null;
    public ?float $budget = null;
    public ?Category $category = null;
    public ?Unit $unit = null;
    public ?District $district = null;
    public ?User $master = null;
    public ?User $author = null;
    public ?DateTime $createdAt = null;
    public ?DateTime $updatedAt = null;

    /** @var array */
    public array $images = [];
}
