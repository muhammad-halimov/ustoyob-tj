<?php

namespace App\Controller\Api\CRUD\POST\TechSupport\Message;

use App\ApiResource\AppError;
use App\Controller\Api\CRUD\Abstract\AbstractApiController;
use App\Entity\TechSupport\TechSupport;
use App\Entity\TechSupport\TechSupportMessage;
use App\Service\Extra\ExtractIriService;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;

class PostTechSupportMessageController extends AbstractApiController
{
    public function __construct(
        private readonly ExtractIriService $extractIriService,
    ){}

    public function __invoke(Request $request): JsonResponse
    {
        $bearerUser = $this->checkedUser();

        $data = json_decode($request->getContent(), true);
        $text = $data['description'] ?? null;
        $techSupportParam = $data['techSupport'] ?? null;

        if (!$text) return $this->errorJson(AppError::EMPTY_TEXT);
        if (!$techSupportParam) return $this->errorJson(AppError::MISSING_REQUIRED_FIELDS);

        /** @var TechSupport|null $techSupport */
        $techSupport = $this->extractIriService->extract($techSupportParam, TechSupport::class, 'tech-suports');
        if (!$techSupport) return $this->errorJson(AppError::TECH_SUPPORT_NOT_FOUND);

        if ($techSupport->getAdministrant() !== $bearerUser && $techSupport->getAuthor() !== $bearerUser) {
            return $this->errorJson(AppError::OWNERSHIP_MISMATCH);
        }

        $techSupportMessage = (new TechSupportMessage())
            ->setDescription($text)
            ->setTechSupport($techSupport)
            ->setAuthor($bearerUser);

        $techSupport->addTechSupportMessage($techSupportMessage);
        $this->persist($techSupportMessage);

        return $this->json([
            'techSupport' => ['id' => $techSupport->getId()],
            'message' => ['id' => $techSupportMessage->getId()],
        ]);
    }
}
