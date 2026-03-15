<?php

namespace App\Entity\Appeal\AppealTypes;

use App\Entity\Appeal\Appeal;
use App\Repository\Appeal\AppealUserRepository;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: AppealUserRepository::class)]
class AppealUser extends Appeal
{
    public function __construct()
    {
        parent::__construct();
        $this->setType('user');
    }

    public function __toString(): string
    {
        $title = $this->getTitle();
        $id    = $this->getId();
        return $title ? "Жалоба на пользователя #$id: $title" : "Жалоба на пользователя #$id";
    }
}
