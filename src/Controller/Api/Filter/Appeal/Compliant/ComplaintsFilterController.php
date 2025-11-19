<?php

namespace App\Controller\Api\Filter\Appeal\Compliant;

use App\Entity\Appeal\Appeal;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;

class ComplaintsFilterController extends AbstractController
{
    public function __invoke(): JsonResponse
    {
        $complaints = [];
        $count = 1;

        foreach (Appeal::COMPLAINTS as $key => $value) {
            $complaints[] = [
                "id" => $count++,
                "complaint_code" => $value,
                "complaint_human" => $key
            ];
        }

        return $this->json($complaints);
    }
}
