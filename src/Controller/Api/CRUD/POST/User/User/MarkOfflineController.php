<?php

namespace App\Controller\Api\CRUD\POST\User\User;

use App\Controller\Api\CRUD\Abstract\AbstractApiController;
use App\Entity\User;
use Symfony\Component\HttpFoundation\JsonResponse;

class MarkOfflineController extends AbstractApiController
{
    public function __invoke(): JsonResponse
    {
        $this->denyAccessUnlessGranted('IS_AUTHENTICATED_FULLY');

        /** @var User $bearerUser */
        $this->currentUser()->setLastSeen(null);

        $this->flush();

        return $this->json(['ok' => true]);
    }
}
