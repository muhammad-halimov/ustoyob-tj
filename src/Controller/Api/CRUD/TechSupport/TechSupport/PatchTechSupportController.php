<?php

namespace App\Controller\Api\CRUD\TechSupport\TechSupport;

use App\Entity\TechSupport\TechSupport;
use App\Entity\User;
use App\Repository\TechSupport\TechSupportRepository;
use App\Service\Extra\AccessService;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;

class PatchTechSupportController extends AbstractController
{
    public function __construct(
        private readonly EntityManagerInterface $entityManager,
        private readonly TechSupportRepository  $techSupportRepository,
        private readonly AccessService          $accessService,
        private readonly Security               $security,
    ){}

    public function __invoke(int $id, Request $request): JsonResponse
    {
        /** @var User $bearerUser */
        $bearerUser = $this->security->getUser();

        $this->accessService->check($bearerUser, 'double');

        /** @var TechSupport $techSupport */
        $techSupport = $this->techSupportRepository->find($id);

        $data = json_decode($request->getContent(), true);

        $statusParam = $data['status'];

        if (!in_array("ROLE_ADMIN", $bearerUser->getRoles()) && $statusParam == 'in_progress')
            return $this->json(['message' => 'Extra denied'], 403);

        if (!$techSupport)
            return $this->json(['message' => 'Tech support not found'], 404);

        if ($techSupport->getAuthor() !== $bearerUser && $techSupport->getAdministrant() !== $bearerUser)
            return $this->json(['message' => 'Extra denied'], 403);

        if (!in_array($statusParam, array_values($techSupport::STATUSES)))
            return $this->json([
                'message' => 'Wrong status type. Formats [new, renewed, in_progress, resolved, closed]'
            ], 400);

        $techSupport->setStatus($statusParam);

        $this->entityManager->flush();

        $message = [
            'id' => $techSupport->getId(),
            'title' => $techSupport->getTitle(),
            'supportReason' => $techSupport->getReason(),
            'status' => $techSupport->getStatus(),
            'priority' => $techSupport->getPriority(),
            'administrant' => "/api/users/{$techSupport->getAdministrant()->getId()}" ?? null,
            'description' => $techSupport->getDescription(),
            'author' => "/api/users/{$techSupport->getAuthor()->getId()}",
        ];

        return $this->json($message);
    }
}
