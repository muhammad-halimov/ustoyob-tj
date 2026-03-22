<?php

namespace App\Dto\Appeal;

use App\Entity\Chat\Chat;
use App\Entity\Review\Review;
use App\Entity\Ticket\Ticket;
use App\Entity\User;
use Symfony\Component\Validator\Constraints as Assert;

class AppealInput
{
    #[Assert\NotBlank(message: 'Type is required')]
    #[Assert\Choice(choices: ['ticket', 'chat', 'review', 'user'], message: 'Type must be one of: ticket, chat, review, user')]
    public string $type;

    #[Assert\NotBlank(message: 'Title is required')]
    #[Assert\Length(min: 3, max: 255)]
    public string $title;

    #[Assert\NotBlank(message: 'Description is required')]
    public string $description;

    #[Assert\NotBlank(message: 'Reason is required')]
    public string $reason;

    #[Assert\NotBlank(message: 'Respondent is required')]
    public User $respondent; // IRI или ID

    public ?Ticket $ticket = null; // IRI или ID, обязателен если type=ticket

    public ?Chat $chat = null; // IRI или ID, обязателен если type=chat

    public ?Review $review = null; // IRI или ID, обязателен если type=chat
}
