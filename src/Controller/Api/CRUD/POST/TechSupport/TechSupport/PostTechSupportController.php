<?php

namespace App\Controller\Api\CRUD\POST\TechSupport\TechSupport;

use App\ApiResource\AppError;
use App\Controller\Api\CRUD\Abstract\AbstractApiController;
use App\Entity\Appeal\AppealReason;
use App\Entity\TechSupport\TechSupport;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;

class PostTechSupportController extends AbstractApiController
{

    public function __invoke(Request $request): JsonResponse
    {
        $bearerUser = $this->checkedUser('double');

        $data = $this->getContent();

        $titleParam       = $data['title'] ?? null;
        $reasonId         = $data['reason'] ?? null;
        $priorityParam    = $data['priority'] ?? null;
        $descriptionParam = $data['description'] ?? null;

        $reason = null;
        if ($reasonId !== null) {
            $reason = $this->entityManager->getRepository(AppealReason::class)->find((int) $reasonId);
            if (!$reason || !in_array($reason->getApplicableTo(), ['support', 'overall'], true)) {
                return $this->errorJson(AppError::WRONG_SUPPORT_REASON);
            }
        }

        $techSupport = (new TechSupport())
            ->setTitle($titleParam)
            ->setReason($reason)
            ->setStatus('new')
            ->setPriority($priorityParam)
            ->setDescription($descriptionParam)
            ->setAuthor($bearerUser);

        $this->persist($techSupport);

        return $this->json($techSupport, context: ['groups' => ['techSupport:read']]);
    }
}
