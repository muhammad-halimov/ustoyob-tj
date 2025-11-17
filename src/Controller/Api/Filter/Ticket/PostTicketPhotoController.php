<?php

namespace App\Controller\Api\Filter\Ticket;

use App\Entity\Ticket\Ticket;
use App\Entity\Ticket\TicketImage;
use App\Entity\User;
use App\Repository\TicketRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;

class PostTicketPhotoController extends AbstractController
{
    public function __construct(
        private readonly EntityManagerInterface $entityManager,
        private readonly TicketRepository       $ticketRepository,
        private readonly Security               $security,
    ) {}

    public function __invoke(int $id, Request $request): JsonResponse
    {
        $this->denyAccessUnlessGranted('IS_AUTHENTICATED_FULLY');
        $allowedRoles = ["ROLE_ADMIN", "ROLE_CLIENT", "ROLE_MASTER"];

        /** @var User $user */
        $user = $this->security->getUser();
        /** @var Ticket $ticket */
        $ticket = $this->ticketRepository->find($id);
        $imageFiles = $request->files->get('imageFile');

        if (!array_intersect($allowedRoles, $user->getRoles()))
            return $this->json(['message' => 'Access denied'], 403);

        if (!$ticket)
            return $this->json(['message' => 'Ticket not found'], 404);

        if (!$imageFiles)
            return $this->json(['message' => 'No files provided'], 400);

        if ($ticket->getAuthor() !== $user && $ticket->getMaster() !== $user)
            return $this->json(['message' => "Ownership doesn't match"], 400);

        $imageFiles = is_array($imageFiles) ? $imageFiles : [$imageFiles];

        foreach ($imageFiles as $imageFile) {
            if ($imageFile->isValid()) {
                $ticketImage = (new TicketImage())->setImageFile($imageFile);
                $ticket->addUserTicketImage($ticketImage);
                $this->entityManager->persist($ticketImage);
            }
        }

        $this->entityManager->flush();

        return new JsonResponse([
            'message' => 'Photos uploaded successfully',
            'count' => count($imageFiles)
        ]);
    }
}
