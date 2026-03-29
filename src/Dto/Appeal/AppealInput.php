<?php

namespace App\Dto\Appeal;

use App\Entity\Appeal\Reason\AppealReason;
use App\Entity\Chat\Chat;
use App\Entity\Review\Review;
use App\Entity\Ticket\Ticket;
use App\Entity\User;

class AppealInput
{
    public ?string       $type        = null;
    public ?string       $title       = null;
    public ?string       $description = null;
    public ?AppealReason $reason      = null;
    public ?User         $respondent  = null;
    public ?Ticket       $ticket      = null;
    public ?Chat         $chat        = null;
    public ?Review       $review      = null;
}
