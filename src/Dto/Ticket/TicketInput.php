<?php

namespace App\Dto\Ticket;

use App\Entity\Geography\District\District;
use App\Entity\Ticket\Category;
use App\Entity\Ticket\Unit;
use Symfony\Component\Validator\Constraints as Assert;

class TicketInput
{
    #[Assert\NotBlank(message: 'Title is required')]
    #[Assert\Length(min: 3, max: 255)]
    public string $title;

    #[Assert\NotBlank(message: 'Title is required')]
    #[Assert\Length(min: 3, max: 255)]
    public string $description;

    #[Assert\NotBlank(message: 'Title is required')]
    #[Assert\Length(min: 3, max: 255)]
    public string $notice;

    #[Assert\NotBlank(message: 'Title is required')]
    public bool $active;

    #[Assert\NotBlank(message: 'Title is required')]
    public bool $service;

    #[Assert\NotBlank(message: 'Title is required')]
    public int $budget;

    #[Assert\NotBlank(message: 'Category is required')]
    public Category $category; // IRI или ID

    #[Assert\NotBlank(message: 'Unit is required')]
    public Unit $unit; // IRI или ID

    #[Assert\NotBlank(message: 'Unit is required')]
    public District $district; // IRI или ID
}
