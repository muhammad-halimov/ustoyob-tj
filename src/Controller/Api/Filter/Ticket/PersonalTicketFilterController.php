<?php

namespace App\Controller\Api\Filter\Ticket;

use App\Entity\Ticket\Ticket;
use App\Entity\User;
use App\Repository\TicketRepository;
use App\Service\Extra\AccessService;
use App\Service\Extra\LocalizationService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;

class PersonalTicketFilterController extends AbstractController
{
    public function __construct(
        private readonly LocalizationService $localizationService,
        private readonly TicketRepository    $ticketRepository,
        private readonly AccessService       $accessService,
        private readonly Security            $security,
    ){}

    public function __invoke(Request $request): JsonResponse
    {
        /** @var User $bearerUser */
        $bearerUser = $this->security->getUser();

        $this->accessService->check($bearerUser);

        $locale = $request->get('locale') ?? 'tj';

        /** @var Ticket[] $data */
        $data = $this->ticketRepository->findTicketsByUserRole($bearerUser);

        foreach ($data as $ticket) {
            $this->localizationService->localizeGeography($ticket, $locale);

            if ($ticket->getSubcategory())
                $this->localizationService->localizeEntity($ticket->getSubcategory(), $locale);

            if ($ticket->getCategory())
                $this->localizationService->localizeEntity($ticket->getCategory(), $locale);

            if ($ticket->getUnit())
                $this->localizationService->localizeEntity($ticket->getUnit(), $locale);
        }

        return empty($data)
            ? $this->json(['message' => 'Resource not found'], 404)
            : $this->json($data, context: ['groups' => ['masterTickets:read', 'clientTickets:read']]);
    }
}
