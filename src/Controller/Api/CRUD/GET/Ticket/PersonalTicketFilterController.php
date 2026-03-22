<?php

namespace App\Controller\Api\CRUD\GET\Ticket;

use App\ApiResource\AppError;
use App\Controller\Api\CRUD\Abstract\AbstractApiController;
use App\Repository\Ticket\TicketRepository;
use App\Service\Extra\LocalizationService;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;

class PersonalTicketFilterController extends AbstractApiController
{
    public function __construct(
        private readonly LocalizationService $localizationService,
        private readonly TicketRepository    $ticketRepository,
    ){}

    public function __invoke(Request $request): JsonResponse
    {
        $data = $this->ticketRepository->findTicketsByUserRole($this->checkedUser());

        if (empty($data))
            return $this->errorJson(AppError::RESOURCE_NOT_FOUND);

        foreach ($data as $ticket) {
            $this->localizationService->localizeTicket($ticket, $this->getLocale());
        }

        return $this->json($data, context: ['groups' => ['masterTickets:read', 'clientTickets:read', 'ticketImages:read']]);
    }
}
