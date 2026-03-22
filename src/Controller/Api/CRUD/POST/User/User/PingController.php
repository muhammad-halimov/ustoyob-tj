<?php

namespace App\Controller\Api\CRUD\POST\User\User;

use App\Controller\Api\CRUD\Abstract\AbstractApiController;
use App\Entity\User;
use DateTimeImmutable;
use Symfony\Component\HttpFoundation\JsonResponse;

class PingController extends AbstractApiController
{
    public function __invoke(): JsonResponse
    {
        $this->denyAccessUnlessGranted('IS_AUTHENTICATED_FULLY');

        /** @var User $bearerUser */
        $this->currentUser()->setLastSeen(new DateTimeImmutable());

        $this->flush();

        return $this->json(['ok' => true]);
    }
}
