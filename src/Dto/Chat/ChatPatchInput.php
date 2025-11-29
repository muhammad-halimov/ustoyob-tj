<?php

namespace App\Dto\Chat;

use Symfony\Component\Validator\Constraints as Assert;

class ChatPatchInput
{
    #[Assert\NotBlank(message: 'Status is required')]
    public bool $active;
}
