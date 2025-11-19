<?php

namespace App\Controller\Api\Filter\Appeal\Support;

use App\Entity\Appeal\Appeal;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;

class SupportFilterController extends AbstractController
{
    public function __invoke(): JsonResponse
    {
        $supports = [];
        $count = 1;

        foreach (Appeal::SUPPORT as $key => $value) {
            $supports[] = [
                "id" => $count++,
                "support_code" => $value,
                "support_human" => $key
            ];
        }

        return $this->json($supports);
    }
}
