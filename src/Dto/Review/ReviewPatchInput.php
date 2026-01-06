<?php

namespace App\Dto\Review;

use App\Dto\Image\ImageObjectInput;

class ReviewPatchInput
{
    public float $rating;

    public string $description;

    /**
     * @var ImageObjectInput[]
     */
    public array $images;
}
