<?php

namespace App\State\Localization\Geography;

use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\ProviderInterface;
use App\Entity\Ticket\Ticket;
use App\Repository\Ticket\TicketRepository;
use App\Service\Extra\LocalizationService;
use App\State\Localization\AbstractLocalizationProvider;
use Psr\Log\LoggerInterface;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\RequestStack;

readonly class TicketGeographyLocalizationProvider extends AbstractLocalizationProvider
{
    public function __construct(
        ProviderInterface   $itemProvider,
        ProviderInterface   $collectionProvider,
        RequestStack        $requestStack,
        LocalizationService $localizationService,
        private Security    $security,
        private TicketRepository $ticketRepository,
        private LoggerInterface $logger,
    ) {
        parent::__construct($itemProvider, $collectionProvider, $requestStack, $localizationService);
    }

    protected function supports(object $entity): bool
    {
        return $entity instanceof Ticket;
    }

    /**
     * Для одиночного GET:
     *   1. Загружаем тикет по ID без фильтра approved.
     *   2. Публично виден, только если approved=true И публикатор (мастер —
     *      для service, автор — иначе) сам active+approved — то же условие,
     *      что ApprovedTicketExtension применяет к коллекции GET /tickets.
     *      Раньше здесь проверялся только ticket.approved — если публикатор
     *      уже одобренного тикета потом деактивировался, тикет пропадал из
     *      коллекции, но всё ещё был доступен по прямой ссылке /tickets/{id}.
     *   3. Иначе — виден только автору/мастеру (владельцу тикета).
     */
    public function provide(Operation $operation, array $uriVariables = [], array $context = []): object|array|null
    {
        if ($operation instanceof Get) {
            // (int) убран (06.09.2026, переход на UUID-PK) — id тикета
            // теперь UUID-строка, приведение к int обнулило бы её.
            $id     = $uriVariables['id'] ?? null;
            $ticket = $id !== null ? $this->ticketRepository->find($id) : null;

            if (!$ticket instanceof Ticket) {
                return null;
            }

            $locale = $this->requestStack->getCurrentRequest()?->query->get('locale', 'tj') ?? 'tj';

            $publisher = $ticket->getService() ? $ticket->getMaster() : $ticket->getAuthor();
            $isPubliclyVisible = $ticket->getApproved()
                && $publisher !== null
                && $publisher->getActive()
                && $publisher->getApproved();

            if ($isPubliclyVisible) {
                $this->localize($ticket, $locale);
                return $ticket;
            }

            // Не видно публично (либо сам тикет не approved, либо
            // деактивирован/не подтверждён его публикатор): виден только
            // автору или мастеру (владельцу тикета).
            $user = $this->security->getUser();
            if ($user !== null) {
                $identifier = $user->getUserIdentifier();
                $isOwner =
                    ($ticket->getAuthor() !== null && $ticket->getAuthor()->getUserIdentifier() === $identifier) ||
                    ($ticket->getMaster() !== null && $ticket->getMaster()->getUserIdentifier() === $identifier);

                $this->logger->info('TicketProvider[GET]', [
                    'id'          => $id,
                    'approved'    => $ticket->getApproved(),
                    'authorEmail' => $ticket->getAuthor()?->getUserIdentifier(),
                    'masterEmail' => $ticket->getMaster()?->getUserIdentifier(),
                    'currentUser' => $identifier,
                    'isOwner'     => $isOwner,
                ]);

                if ($isOwner) {
                    $this->localize($ticket, $locale);
                    return $ticket;
                }
            }

            return null;
        }


        return parent::provide($operation, $uriVariables, $context);
    }

    protected function localize(object $entity, string $locale): void
    {
        /** @var Ticket $entity */
        $this->localizationService->localizeGeography($entity, $locale);

        if ($entity->getCategory()) {
            // localizeEntityFull() — та же причина, что в
            // LocalizationService::localizeTicket() (см. её докблок):
            // Category::description теперь per-locale.
            $this->localizationService->localizeEntityFull($entity->getCategory(), $locale);
        }

        if ($entity->getUnit()) {
            // localizeEntityFull() — БАГФИКС (13.09.2026): Unit::description
            // per-locale (см. докблок UnitTitleLocalizationProvider).
            $this->localizationService->localizeEntityFull($entity->getUnit(), $locale);
        }

        if ($entity->getSubcategory()) {
            // localizeEntityFull() — Occupation::description тоже per-locale,
            // см. докблок OccupationTitleLocalizationProvider.
            $this->localizationService->localizeEntityFull($entity->getSubcategory(), $locale);
        }
    }
}
