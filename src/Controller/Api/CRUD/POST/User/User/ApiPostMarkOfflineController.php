<?php

namespace App\Controller\Api\CRUD\POST\User\User;

use App\Controller\Api\CRUD\Abstract\AbstractApiPostController;
use App\Entity\User;

class ApiPostMarkOfflineController extends AbstractApiPostController
{
    protected function handle(User $bearer, object $dto): object
    {
        $bearer->setLastSeen(null);
        $this->flush();
        return $this->buildResponse(['ok' => true]);
    }
}
