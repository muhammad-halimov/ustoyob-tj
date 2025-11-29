<?php

namespace App\Dto\Appeal\Appeal;

use Symfony\Component\Validator\Constraints as Assert;

class AppealInput
{
    #[Assert\NotBlank(message: 'Type is required')]
    #[Assert\Choice(choices: ['ticket', 'chat'], message: 'Type must be either "ticket" or "chat"')]
    public string $type;

    #[Assert\NotBlank(message: 'Title is required')]
    #[Assert\Length(min: 3, max: 255)]
    public string $title;

    #[Assert\NotBlank(message: 'Description is required')]
    public string $description;

    #[Assert\NotBlank(message: 'Reason is required')]
    public string $reason;

    #[Assert\NotBlank(message: 'Respondent is required')]
    public string $respondent; // IRI или ID

    public ?string $ticket = null; // IRI или ID, обязателен если type=ticket

    public ?string $chat = null; // IRI или ID, обязателен если type=chat
}
