<?php

namespace App\Controller\Api\Filter\Appeal;

use App\Entity\Appeal\AppealTypes\AppealChat;
use App\Entity\Appeal\AppealTypes\AppealTicket;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;

class ComplaintsFilterController extends AbstractController
{
    public function __invoke(): JsonResponse
    {
        $allComplaints = array_unique(
            array_merge(
                AppealChat::COMPLAINTS,
                AppealTicket::COMPLAINTS,
            )
        );

        $complaints = [];
        $id = 1;

        foreach ($allComplaints as $humanReadable => $code) {
            $complaints[] = [
                'id' => $id++,
                'complaint_code' => $code,
                'complaint_human' => $humanReadable
            ];
        }

        return $this->json($complaints);
    }
}
