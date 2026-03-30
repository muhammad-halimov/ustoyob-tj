<?php

namespace App\Controller\Api\CRUD\POST\User\User;

use App\ApiResource\AppMessages;
use App\Controller\Api\CRUD\Abstract\AbstractApiPostController;
use App\Dto\User\RoleInput;
use App\Entity\User;

class ApiPostGrantRoleController extends AbstractApiPostController
{
    protected function getInputClass(): string { return RoleInput::class; }

    protected function isActiveAndApprovedRequired(): bool { return false; }

    protected function handle(User $bearer, object $dto): object
    {
        /** @var RoleInput $dto */
        if (in_array('ROLE_ADMIN', $bearer->getRoles()))
            return $this->errorJson(AppMessages::ROLE_ALREADY_ADMIN);

        if (!in_array('ROLE_CLIENT', $bearer->getRoles()) && in_array('ROLE_MASTER', $bearer->getRoles()))
            return $this->errorJson(AppMessages::ROLE_ALREADY_MASTER);

        if (!in_array('ROLE_MASTER', $bearer->getRoles()) && in_array('ROLE_CLIENT', $bearer->getRoles()))
            return $this->errorJson(AppMessages::ROLE_ALREADY_CLIENT);

        if ($dto->role == 'master' || $dto->role == 'MASTER')
            $bearer->setRoles(['ROLE_MASTER']);
        elseif ($dto->role == 'client' || $dto->role == 'CLIENT')
            $bearer->setRoles(['ROLE_CLIENT']);
        else return $this->errorJson(AppMessages::WRONG_ROLE);

        $this->flush();

        return $this->buildResponse(['message' => "Granted {$dto->role} role"]);
    }
}
