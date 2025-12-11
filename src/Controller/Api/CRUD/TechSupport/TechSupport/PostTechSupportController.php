<?php

namespace App\Controller\Api\CRUD\TechSupport\TechSupport;

use App\Entity\TechSupport\TechSupport;
use App\Entity\User;
use App\Service\Extra\AccessService;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;

class PostTechSupportController extends AbstractController
{
    public function __construct(
        private readonly EntityManagerInterface $entityManager,
        private readonly AccessService          $accessService,
        private readonly Security               $security,
    ){}

    public function __invoke(Request $request): JsonResponse
    {
        /** @var User $bearerUser */
        $bearerUser = $this->security->getUser();

        $this->accessService->check($bearerUser, 'double');

        $techSupport = new TechSupport();

        $data = json_decode($request->getContent(), true);

        $titleParam = $data['title'];
        $reasonParam = $data['reason'];
        $priorityParam = $data['priority'];
        $descriptionParam = $data['description'];

        if (!in_array($reasonParam, array_values($techSupport::SUPPORT)))
            return $this->json(['message' => "Wrong support type", 400]);

        $techSupport
            ->setTitle($titleParam)
            ->setReason($reasonParam)
            ->setStatus("new")
            ->setPriority($priorityParam)
            ->setDescription($descriptionParam)
            ->setAuthor($bearerUser);

        $this->entityManager->persist($techSupport);
        $this->entityManager->flush();

        $message = [
            'id' => $techSupport->getId(),
            'title' => $techSupport->getTitle(),
            'supportReason' => $techSupport->getReason(),
            'status' => $techSupport->getStatus(),
            'priority' => $techSupport->getPriority(),
            'description' => $techSupport->getDescription(),
            'author' => "/api/users/{$techSupport->getAuthor()->getId()}",
        ];

        return $this->json($message);
    }
}
