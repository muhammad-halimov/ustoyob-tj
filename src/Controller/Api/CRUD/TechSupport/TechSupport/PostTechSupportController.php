<?php

namespace App\Controller\Api\CRUD\TechSupport\TechSupport;

use App\Entity\TechSupport\TechSupport;
use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;

class PostTechSupportController extends AbstractController
{
    public function __construct(
        private readonly EntityManagerInterface $entityManager,
        private readonly Security               $security,
    ){}

    public function __invoke(Request $request): JsonResponse
    {
        $this->denyAccessUnlessGranted('IS_AUTHENTICATED_FULLY');
        $allowedRoles = ["ROLE_CLIENT", "ROLE_MASTER"];

        /** @var User $bearerUser */
        $bearerUser = $this->security->getUser();
        $techSupport = new TechSupport();

        $data = json_decode($request->getContent(), true);

        $titleParam = $data['title'];
        $supportReasonParam = $data['supportReason'];
        $priorityParam = $data['priority'];
        $descriptionParam = $data['description'];

        if (!array_intersect($allowedRoles, $bearerUser->getRoles()))
            return $this->json(['message' => 'Access denied'], 403);

        if (in_array("ROLE_ADMIN", $bearerUser->getRoles()))
            return $this->json(['message' => 'Access denied'], 403);

        if (!in_array($supportReasonParam, array_values($techSupport::SUPPORT)))
            return $this->json(['message' => "Wrong support type", 400]);

        $techSupport
            ->setTitle($titleParam)
            ->setSupportReason($supportReasonParam)
            ->setStatus("new")
            ->setPriority($priorityParam)
            ->setDescription($descriptionParam)
            ->setAuthor($bearerUser);

        $this->entityManager->persist($techSupport);
        $this->entityManager->flush();

        $message = [
            'id' => $techSupport->getId(),
            'title' => $techSupport->getTitle(),
            'supportReason' => $techSupport->getSupportReason(),
            'status' => $techSupport->getStatus(),
            'priority' => $techSupport->getPriority(),
            'description' => $techSupport->getDescription(),
            'author' => "/api/users/{$techSupport->getAuthor()->getId()}",
        ];

        return $this->json($message);
    }
}
