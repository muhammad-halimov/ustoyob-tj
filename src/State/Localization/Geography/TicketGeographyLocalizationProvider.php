<?php

namespace App\State\Localization\Geography;

use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\Operation;
use App\Entity\Ticket\Ticket;
use App\Entity\User;
use App\Repository\Ticket\TicketRepository;
use App\State\Localization\AbstractLocalizationProvider;
use Symfony\Bundle\SecurityBundle\Security;

readonly class TicketGeographyLocalizationProvider extends AbstractLocalizationProvider
{
    // Дополнительные зависимости инжектируются через services.yaml (именованные аргументы).
    public Security          $security;
    public TicketRepository  $ticketRepository;

    protected function supports(object $entity): bool
    {
        return $entity instanceof Ticket;
    }

    /**
     * Для одиночного GET: если тикет не найден через стандартный провайдер
     * (approved=false → null), проверяем — возможно, текущий пользователь его автор.
     * Автор всегда может видеть свой тикет независимо от статуса одобрения.
     */
    public function provide(Operation $operation, array $uriVariables = [], array $context = []): object|array|null
    {
        $result = parent::provide($operation, $uriVariables, $context);

        if ($result === null && $operation instanceof Get) {
            $currentUser = $this->security->getUser();
            if ($currentUser instanceof User && isset($uriVariables['id'])) {
                $ticket = $this->ticketRepository->find($uriVariables['id']);
                if ($ticket instanceof Ticket && $ticket->getAuthor()?->getId() === $currentUser->getId()) {
                    $locale = $this->requestStack->getCurrentRequest()?->query->get('locale', 'tj') ?? 'tj';
                    $this->localize($ticket, $locale);
                    return $ticket;
                }
            }
        }

        return $result;
    }

    protected function localize(object $entity, string $locale): void
    {
        /** @var Ticket $entity */
        $this->localizationService->localizeGeography($entity, $locale);

        if ($entity->getCategory()) {
            $this->localizationService->localizeEntity($entity->getCategory(), $locale);
        }

        if ($entity->getUnit()) {
            $this->localizationService->localizeEntity($entity->getUnit(), $locale);
        }

        if ($entity->getSubcategory()) {
            $this->localizationService->localizeEntity($entity->getSubcategory(), $locale);
        }
    }
}
