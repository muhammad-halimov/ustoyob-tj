<?php

namespace App\Entity\Appeal\Types;

use App\Entity\Appeal\Appeal\Appeal;
use App\Repository\Appeal\AppealTicketRepository;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: AppealTicketRepository::class)]
class AppealTicket extends Appeal
{
    public function __construct()
    {
        parent::__construct();
        $this->setType('ticket');
    }

    public function __toString(): string
    {
        $title = $this->getTitle();
        $id    = $this->getId();
        return $title ? "Жалоба на услугу/объявление #$id: $title" : "Жалоба на услугу/объявление #$id";
    }
}
