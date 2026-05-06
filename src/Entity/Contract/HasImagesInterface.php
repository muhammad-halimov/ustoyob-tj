<?php

namespace App\Entity\Contract;

use App\Entity\Extra\MultipleImage;
use Doctrine\Common\Collections\Collection;

interface HasImagesInterface
{
    /** @return Collection<int, MultipleImage> */
    public function getImages(): Collection;

    public function addImage(MultipleImage $image): static;

    public function removeImage(MultipleImage $image): static;
}
