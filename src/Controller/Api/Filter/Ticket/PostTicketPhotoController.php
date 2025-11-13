<?php

namespace App\Controller\Api\Filter\Ticket;

use App\Entity\Ticket\TicketImage;
use App\Repository\TicketRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;

class PostTicketPhotoController extends AbstractController
{
    public function __construct(
        private readonly EntityManagerInterface $entityManager,
        private readonly TicketRepository       $ticketRepository,
    ) {}

    public function __invoke(int $id, Request $request): JsonResponse
    {
        $this->denyAccessUnlessGranted('IS_AUTHENTICATED_FULLY');

        $userRoles = $this->getUser()?->getRoles() ?? [];
        $allowedRoles = ["ROLE_ADMIN", "ROLE_CLIENT", "ROLE_MASTER"];

        if (!array_intersect($allowedRoles, $userRoles))
            return $this->json(['message' => 'Access denied'], 403);

        $ticket = $this->ticketRepository->find($id);
        if (!$ticket) return $this->json(['message' => 'Ticket not found'], 404);

        $imageFiles = $request->files->get('imageFile');
        if (!$imageFiles) return $this->json(['message' => 'No files provided'], 400);

        $imageFiles = is_array($imageFiles) ?
            $imageFiles :
            [$imageFiles];

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
