<?php

namespace App\Controller\Api\CRUD\POST\TechSupport\TechSupport;

use App\Entity\Appeal\AppealReason;
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

        $titleParam       = $data['title'] ?? null;
        $reasonId         = $data['reason'] ?? null;
        $priorityParam    = $data['priority'] ?? null;
        $descriptionParam = $data['description'] ?? null;

        $reason = null;
        if ($reasonId !== null) {
            $reason = $this->entityManager->getRepository(AppealReason::class)->find((int) $reasonId);
            if (!$reason || !in_array($reason->getApplicableTo(), ['support', 'overall'], true)) {
                return $this->json(['message' => 'Wrong support reason'], 400);
            }
        }

        $techSupport
            ->setTitle($titleParam)
            ->setReason($reason)
            ->setStatus('new')
            ->setPriority($priorityParam)
            ->setDescription($descriptionParam)
            ->setAuthor($bearerUser);

        $this->entityManager->persist($techSupport);
        $this->entityManager->flush();

        $message = [
            'id'          => $techSupport->getId(),
            'title'       => $techSupport->getTitle(),
            'supportReason' => $reason ? ['id' => $reason->getId(), 'code' => $reason->getCode()] : null,
            'status'      => $techSupport->getStatus(),
            'priority'    => $techSupport->getPriority(),
            'description' => $techSupport->getDescription(),
            'author'      => "/api/users/{$techSupport->getAuthor()->getId()}",
        ];

        return $this->json($message);
    }
}
