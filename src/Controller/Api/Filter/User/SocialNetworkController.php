<?php

namespace App\Controller\Api\Filter\User;

use App\Entity\User\SocialNetwork;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;

class SocialNetworkController extends AbstractController
{
    public function __invoke(): JsonResponse
    {
        $networks = [];
        $values = array_values(SocialNetwork::NETWORKS);

        for ($i = 0; $i < count($values); $i++)
            $networks[] = ["id" => $i + 1, "network" => $values[$i]];

        return $this->json($networks);
    }
}
