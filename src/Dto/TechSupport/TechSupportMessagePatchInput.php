<?php

namespace App\Dto\TechSupport;

use App\Entity\TechSupport\TechSupport;

class TechSupportMessagePatchInput
{
    public ?TechSupport $techSupport = null;
    public ?string      $description = null;
}
