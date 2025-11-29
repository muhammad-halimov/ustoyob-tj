<?php

namespace App\Controller\Api\Filter\Appeal;

use App\Dto\Appeal\Appeal\ComplaintReasonOutput;
use App\Entity\Appeal\AppealTypes\AppealChat;
use App\Entity\Appeal\AppealTypes\AppealTicket;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;

class AppealReasonFilterController extends AbstractController
{
    public function __invoke(): JsonResponse
    {
        $allComplaints = array_merge(
            AppealChat::COMPLAINTS,
            AppealTicket::COMPLAINTS,
        );

        // Удаляем дубликаты
        $uniqueComplaints = [];
        $seenCodes = [];

        foreach ($allComplaints as $humanReadable => $code) {
            if (!in_array($code, $seenCodes)) {
                $uniqueComplaints[$humanReadable] = $code;
                $seenCodes[] = $code;
            }
        }

        $complaints = [];
        $id = 1;

        foreach ($uniqueComplaints as $humanReadable => $code) {
            $complaints[] = new ComplaintReasonOutput($id++, $code, $humanReadable);
        }

        return $this->json($complaints);
    }
}
