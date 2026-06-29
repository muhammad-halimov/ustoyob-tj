<?php

namespace App\State\Localization\Geography;

use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\ProviderInterface;
use App\Entity\Ticket\Ticket;
use App\Repository\Ticket\TicketRepository;
use App\Service\Extra\LocalizationService;
use App\State\Localization\AbstractLocalizationProvider;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\RequestStack;
use Symfony\Component\Security\Core\User\UserInterface;

readonly class TicketGeographyLocalizationProvider extends AbstractLocalizationProvider
{
    public function __construct(
        ProviderInterface          $itemProvider,
        ProviderInterface          $collectionProvider,
        RequestStack               $requestStack,
        LocalizationService        $localizationService,
        private Security           $security,
        private TicketRepository   $ticketRepository,
    ) {
        parent::__construct($itemProvider, $collectionProvider, $requestStack, $localizationService);
    }

    protected function supports(object $entity): bool
    {
        return $entity instanceof Ticket;
    }

    /**
     * Для одиночного GET тикет получаем напрямую из репозитория (минуя extension),
     * затем применяем правило доступа:
     *   - approved=true  → доступен всем
     *   - approved=false → только автору (авторизованному пользователю-владельцу)
     *   - не существует  → null → 404
     *
     * Для коллекций делегируем родителю (с фильтром через extension).
     */
    public function provide(Operation $operation, array $uriVariables = [], array $context = []): object|array|null
    {
        if ($operation instanceof Get) {
            $ticket = $this->ticketRepository->find($uriVariables['id'] ?? 0);

            if (!$ticket instanceof Ticket) {
                return null;
            }

            // Неодобренный тикет видит только его автор.
            if (!$ticket->getApproved()) {
                $currentUser = $this->security->getUser();
                $authorEmail = $ticket->getAuthor()?->getUserIdentifier();
                if (!$currentUser instanceof UserInterface || $authorEmail === null || $authorEmail !== $currentUser->getUserIdentifier()) {
                    return null;
                }
            }

            $locale = $this->requestStack->getCurrentRequest()?->query->get('locale', 'tj') ?? 'tj';
            $this->localize($ticket, $locale);
            return $ticket;
        }

        // GetCollection — делегируем родителю (с фильтром через extension).
        return parent::provide($operation, $uriVariables, $context);
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
