<?php

namespace App\Dto\Review;

use App\Dto\Image\ImageObjectInput;

class ReviewPatchInput
{
    public float   $rating      = 0;
    public ?string $description = null;

    /** @var ImageObjectInput[] */
    public array   $images = [];
}
