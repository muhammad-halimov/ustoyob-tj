<?php

namespace App\Dto\Chat;

use App\Entity\Ticket\Ticket;
use App\Entity\User;
use Symfony\Component\Validator\Constraints as Assert;

class ChatPostInput
{
    #[Assert\NotBlank(message: 'Reply author is required')]
    public User $replyAuthor;

    public ?Ticket $ticket; // IRI или ID
}
