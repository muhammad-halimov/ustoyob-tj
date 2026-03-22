<?php

namespace App\Controller\Api\CRUD\DELETE\TechSupport\Message;

use App\ApiResource\AppError;
use App\Controller\Api\CRUD\Abstract\AbstractApiController;
use App\Entity\TechSupport\TechSupportMessage;
use Symfony\Component\HttpFoundation\JsonResponse;

class DeleteTechSupportMessageController extends AbstractApiController
{
    public function __invoke(int $id): JsonResponse
    {
        /** @var TechSupportMessage|JsonResponse $message */
        $message = $this->findOr404(TechSupportMessage::class, $id);

        if ($message instanceof JsonResponse)
            return $message;

        if ($message->getAuthor() !== $this->checkedUser()) {
            return $this->errorJson(AppError::OWNERSHIP_MISMATCH);
        }

        return $this->removeAndRespond($message);
    }
}
