<?php

namespace App\Dto\Appeal\Appeal;

use DateTimeInterface;

class AppealOutput
{
    public int $id;
    public string $type;
    public string $title;
    public string $description;
    public string $reason;
    public string $respondent; // IRI
    public string $author; // IRI
    public ?string $ticket = null; // IRI
    public ?string $chat = null; // IRI
    public DateTimeInterface $createdAt;
    public DateTimeInterface $updatedAt;
}
