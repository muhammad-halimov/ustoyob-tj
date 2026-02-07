<?php

namespace App\Controller\Api\CRUD\Ticket;

use App\Controller\Api\CRUD\Image\AbstractPhotoUploadController;
use App\Entity\Ticket\Ticket;
use App\Entity\Ticket\TicketImage;
use App\Entity\User;
use App\Repository\TicketRepository;
use App\Service\Extra\AccessService;
use Doctrine\ORM\EntityManagerInterface;
use ReflectionClass;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\File\UploadedFile;
use Symfony\Component\HttpFoundation\JsonResponse;

class PostTicketPhotoController extends AbstractPhotoUploadController
{
    public function __construct(
        EntityManagerInterface            $entityManager,
        Security                          $security,
        AccessService                     $accessService,
        private readonly TicketRepository $ticketRepository,
    ) {
        parent::__construct($entityManager, $security, $accessService);
    }

    protected function findEntity(int $id): ?object
    {
        return $this->ticketRepository->find($id);
    }

    protected function checkOwnership(object $entity, User $bearerUser): ?JsonResponse
    {
        /** @var Ticket $entity */
        if ($entity->getAuthor() !== $bearerUser && $entity->getMaster() !== $bearerUser) {
            return $this->json(['message' => "Ownership doesn't match"], 400);
        }
        return null;
    }

    protected function processImageFile(object $entity, UploadedFile $imageFile, User $bearerUser): void
    {
        /** @var Ticket $entity */
        $ticketImage = (new TicketImage())->setImageFile($imageFile);
        $entity->addUserTicketImage($ticketImage);
        $this->entityManager->persist($ticketImage);
    }

    protected function getEntityName(): string
    {
        return (new ReflectionClass(Ticket::class))->getName();
    }
}
