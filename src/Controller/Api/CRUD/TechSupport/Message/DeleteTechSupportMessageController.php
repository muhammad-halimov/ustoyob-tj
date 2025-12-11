<?php

namespace App\Controller\Api\CRUD\TechSupport\Message;

use App\Entity\TechSupport\TechSupport;
use App\Entity\User;
use App\Repository\TechSupport\TechSupportMessageRepository;
use App\Service\Extra\AccessService;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\JsonResponse;

class DeleteTechSupportMessageController extends AbstractController
{
    public function __construct(
        private readonly EntityManagerInterface       $entityManager,
        private readonly TechSupportMessageRepository $techSupportMessageRepository,
        private readonly AccessService                $accessService,
        private readonly Security                     $security,
    ){}

    public function __invoke(int $id): JsonResponse
    {
        /** @var User $bearerUser */
        $bearerUser = $this->security->getUser();

        $this->accessService->check($bearerUser);

        /** @var TechSupport $techSupportMessage */
        $techSupportMessage = $this->techSupportMessageRepository->find($id);

        if (!$techSupportMessage)
            return $this->json(['message' => "Resource not found"], 404);

        if ($techSupportMessage->getAuthor() !== $bearerUser)
            return $this->json(['message' => "Ownership doesn't match"], 400);

        $this->entityManager->remove($techSupportMessage);
        $this->entityManager->flush();

        return $this->json(['message' => 'Resource successfully removed'], 204);
    }
}
