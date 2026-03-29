<?php

namespace App\Controller\Api\CRUD\GET\TechSupport\TechSupport;

use App\Entity\User;
use Doctrine\ORM\QueryBuilder;

class ApiUserApiTechSupportController extends AbstractApiTechSupportController
{
    protected function fetchTechSupports(User $user): QueryBuilder { return $this->techSupportRepository->findTechSupportsByUser($user); }
}
