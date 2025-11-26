<?php

namespace App\Controller\Api\Filter\TechSupport;

use App\Entity\TechSupport\TechSupport;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;

class SupportReasonFilterController extends AbstractController
{
    public function __invoke(): JsonResponse
    {
        $supports = [];
        $count = 1;

        foreach (TechSupport::SUPPORT as $key => $value) {
            $supports[] = [
                "id" => $count++,
                "support_code" => $value,
                "support_human" => $key
            ];
        }

        return $this->json($supports);
    }
}
