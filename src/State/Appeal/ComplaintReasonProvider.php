<?php

namespace App\State\Appeal;

use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\ProviderInterface;
use App\Dto\Appeal\Appeal\ComplaintReasonOutput;
use App\Entity\Appeal\AppealTypes\AppealChat;
use App\Entity\Appeal\AppealTypes\AppealTicket;

class ComplaintReasonProvider implements ProviderInterface
{
    public function provide(Operation $operation, array $uriVariables = [], array $context = []): array
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

        return $complaints;
    }
}
