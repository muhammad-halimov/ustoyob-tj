<?php

namespace App\Dto\Image;

use Symfony\Component\HttpFoundation\File\File;
use Symfony\Component\Validator\Constraints as Assert;

class ImageInput
{
    /**
     * @var File[]
     */
    #[Assert\NotBlank(message: 'imageFile is required')]
    #[Assert\Count(min: 1, minMessage: 'At least one file is required')]
    #[Assert\All([new Assert\File(mimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'], mimeTypesMessage: 'Invalid image format')])]
    public array $imageFile = [];
}
