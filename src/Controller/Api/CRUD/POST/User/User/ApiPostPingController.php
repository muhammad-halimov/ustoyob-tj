<?php

namespace App\Controller\Api\CRUD\POST\User\User;

use App\Controller\Api\CRUD\Abstract\AbstractApiPostController;
use App\Entity\User;
use DateTimeImmutable;

class ApiPostPingController extends AbstractApiPostController
{
    protected function handle(User $bearer, object $dto): object
    {
        $bearer->setLastSeen(new DateTimeImmutable());
        $this->flush();
        return $this->buildResponse(['ok' => true]);
    }
}
