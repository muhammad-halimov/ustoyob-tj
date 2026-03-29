<?php

namespace App\Dto\TechSupport;

use App\Entity\TechSupport\TechSupport;

class TechSupportMessagePostInput
{
    public ?TechSupport $techSupport = null;
    public ?string      $description = null;
}
