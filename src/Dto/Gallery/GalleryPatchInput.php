<?php

namespace App\Dto\Gallery;

use App\Dto\Image\ImageObjectInput;

class GalleryPatchInput
{
    /** @var ImageObjectInput[]|null */
    public ?array $images = null;
}
