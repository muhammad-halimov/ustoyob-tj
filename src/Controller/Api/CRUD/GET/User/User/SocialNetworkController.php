<?php

namespace App\Controller\Api\CRUD\GET\User\User;

use App\Controller\Api\CRUD\Abstract\AbstractApiHelperController;
use App\Entity\User\SocialNetwork;
use Symfony\Component\HttpFoundation\JsonResponse;

class SocialNetworkController extends AbstractApiHelperController
{
    public function __invoke(): JsonResponse
    {
        $networks = [];
        $values = array_values(SocialNetwork::NETWORKS);

        for ($i = 0; $i < count($values); $i++) $networks[] = ["id" => $i + 1, "network" => $values[$i]];

        return $this->json($networks);
    }
}
