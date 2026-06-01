<?php

namespace App\Controller\Api\CRUD\POST\User\User;

use App\ApiResource\AppMessages;
use App\Controller\Api\CRUD\Abstract\AbstractApiPostController;
use App\Dto\User\RoleInput;
use App\Entity\User;

class ApiPostGrantRoleController extends AbstractApiPostController
{
    protected function getInputClass(): string { return RoleInput::class; }

    protected function getUserGrade(): string { return 'single'; }

    protected function isActiveAndApprovedRequired(): bool { return false; }

    protected function handle(User $bearer, object $dto): object
    {
        $masterArr = ['master', 'MASTER', 'ROLE_MASTER'];
        $clientArr = ['client', 'CLIENT', 'ROLE_CLIENT'];

        /** @var RoleInput $dto */
        if (in_array('ROLE_ADMIN', $bearer->getRoles()))
            return $this->errorJson(AppMessages::ROLE_ALREADY_ADMIN);

        if (!in_array('ROLE_CLIENT', $bearer->getRoles()) && in_array('ROLE_MASTER', $bearer->getRoles()))
            return $this->errorJson(AppMessages::ROLE_ALREADY_MASTER);

        if (!in_array('ROLE_MASTER', $bearer->getRoles()) && in_array('ROLE_CLIENT', $bearer->getRoles()))
            return $this->errorJson(AppMessages::ROLE_ALREADY_CLIENT);

        if (in_array($dto->role, $masterArr))
            $bearer->setRoles(['ROLE_MASTER']);
        elseif (in_array($dto->role, $clientArr))
            $bearer->setRoles(['ROLE_CLIENT']);
        else return $this->errorJson(AppMessages::WRONG_ROLE);

        $this->flush();

        return $this->buildResponse(['message' => "Granted {$dto->role} role"]);
    }
}
