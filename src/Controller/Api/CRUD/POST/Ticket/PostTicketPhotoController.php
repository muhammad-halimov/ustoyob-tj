<?php

namespace App\Controller\Api\CRUD\POST\Ticket;

use App\ApiResource\AppError;
use App\Controller\Api\CRUD\Abstract\AbstractPhotoUploadController;
use App\Entity\Extra\MultipleImage;
use App\Entity\Ticket\Ticket;
use App\Entity\User;
use App\Repository\Ticket\TicketRepository;
use Symfony\Component\HttpFoundation\File\UploadedFile;
use Symfony\Component\HttpFoundation\JsonResponse;

class PostTicketPhotoController extends AbstractPhotoUploadController
{
    public function __construct(
        private readonly TicketRepository $ticketRepository,
    ) {}

    protected function findEntity(int $id): ?object
    {
        return $this->ticketRepository->find($id);
    }

    protected function checkOwnership(object $entity, User $bearerUser): ?JsonResponse
    {
        /** @var Ticket $entity */
        if ($entity->getAuthor() !== $bearerUser && $entity->getMaster() !== $bearerUser) {
            return $this->errorJson(AppError::OWNERSHIP_MISMATCH);
        }
        return null;
    }

    protected function processImageFile(object $entity, UploadedFile $imageFile, User $bearerUser): void
    {
        /** @var Ticket $entity */
        $position = $entity->getImages()->count();
        $ticketImage = (new MultipleImage())->setImageFile($imageFile)->setPosition($position);
        $entity->addUserTicketImage($ticketImage);
        $this->entityManager->persist($ticketImage);
    }

    protected function getEntityName(): string
    {
        return Ticket::class;
    }
}
