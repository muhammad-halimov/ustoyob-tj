<?php

namespace App\Controller\Api\CRUD\GET\TechSupport\TechSupport;

use App\Entity\User;
use Doctrine\ORM\QueryBuilder;

class ApiAdminApiTechSupportController extends AbstractApiTechSupportController
{
    protected function fetchTechSupports(User $user): QueryBuilder { return $this->techSupportRepository->findTechSupportsByAdmin($user); }
}
