<?php

namespace App\Controller\Api\CRUD\Appeal;

use App\Entity\Appeal\Appeal;
use App\Entity\User;
use App\Repository\User\AppealRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;

class PatchSupportAppealController extends AbstractController
{
    public function __construct(
        private readonly EntityManagerInterface $entityManager,
        private readonly AppealRepository       $appealRepository,
        private readonly Security               $security,
    ){}

    public function __invoke(int $id, Request $request): JsonResponse
    {
        $this->denyAccessUnlessGranted('IS_AUTHENTICATED_FULLY');
        $allowedRoles = ["ROLE_ADMIN", "ROLE_CLIENT", "ROLE_MASTER"];

        /** @var User $bearerUser */
        $bearerUser = $this->security->getUser();
        /** @var Appeal $appeal */
        $appeal = $this->appealRepository->find($id);

        $data = json_decode($request->getContent(), true);

        $statusParam = $data['status'];

        if (!array_intersect($allowedRoles, $bearerUser->getRoles()))
            return $this->json(['message' => 'Access denied'], 403);

        if (!in_array("ROLE_ADMIN", $bearerUser->getRoles()) && $statusParam == 'in_progress')
            return $this->json(['message' => 'Access denied'], 403);

        if (!$appeal)
            return $this->json(['message' => 'Appeal not found'], 404);

        if (
            $appeal->getAuthor() !== $bearerUser &&
            $appeal->getRespondent() !== $bearerUser &&
            $appeal->getAdministrant() !== $bearerUser
        ) {
            return $this->json(['message' => 'Access denied'], 403);
        }

        if (!in_array($statusParam, array_values($appeal::STATUSES)))
            return $this->json([
                'message' => 'Wrong status type. Formats [new, renewed, in_progress, resolved, closed]'
            ], 400);

        $appeal->setStatus($statusParam);

        $this->entityManager->flush();

        $message = [
            'id' => $appeal->getId(),
            'type' => $appeal->getType(),
            'title' => $appeal->getTitle(),
            'supportReason' => $appeal->getSupportReason(),
            'status' => $appeal->getStatus(),
            'priority' => $appeal->getPriority(),
            'administrant' => "/api/users/{$appeal->getAdministrant()->getId()}" ?? null,
            'description' => $appeal->getDescription(),
            'author' => "/api/users/{$appeal->getAuthor()->getId()}",
        ];

        return $this->json($message);
    }
}
