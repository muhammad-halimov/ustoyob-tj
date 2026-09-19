<?php

namespace App\Controller\Api\CRUD\POST\User\RecentlyWatched;

use App\ApiResource\AppMessages;
use App\Controller\Api\CRUD\Abstract\AbstractApiPostController;
use App\Dto\User\RecentlyWatchedInput;
use App\Entity\Ticket\Ticket;
use App\Entity\Trait\Readable\G;
use App\Entity\User;
use App\Entity\User\RecentlyWatched;
use App\Repository\User\RecentlyWatchedRepository;
use App\Service\Extra\LocalizationService;
use DateTimeImmutable;

/**
 * POST /recently-watched { ticket: IRI } — отметить, что текущий пользователь
 * (Bearer) только что просмотрел тикет.
 *
 * Идемпотентно: если тикет уже в ленте — обновляется только viewedAt (тикет
 * всплывает наверх), дубликата и 409 нет — фронт вызывает эндпоинт на каждом
 * открытии карточки, не думая о том, был ли тикет уже отмечен.
 *
 * Тикет должен быть доступен пользователю прямо сейчас — то же правило, что у
 * GET /tickets/{id} (TicketGeographyLocalizationProvider::provide()): публично
 * видимый (approved + активный публикатор) либо свой. Иначе 404 ticket_not_found
 * — не выдаём даже факт существования скрытого тикета.
 */
class ApiPostRecentlyWatchedController extends AbstractApiPostController
{
    public function __construct(
        private readonly RecentlyWatchedRepository $repository,
        private readonly LocalizationService       $localizationService,
    ) {}

    protected function getInputClass(): string { return RecentlyWatchedInput::class; }

    protected function setSerializationGroups(): array { return G::OPS_RECENTLY_WATCHED; }

    protected function getUserGrade(): string { return 'triple'; }

    protected function handle(?User $bearer, object $dto): object
    {
        /** @var RecentlyWatchedInput $dto */
        if (!$dto->ticket) return $this->errorJson(AppMessages::MISSING_TICKET);

        if (!$this->isVisibleTo($dto->ticket, $bearer)) return $this->errorJson(AppMessages::TICKET_NOT_FOUND);

        $entry = $this->repository->findOneByOwnerAndTicket($bearer, $dto->ticket)
            ?? (new RecentlyWatched())->setOwner($bearer)->setTicket($dto->ticket);

        return $entry->setViewedAt(new DateTimeImmutable());
    }

    /**
     * Срабатывает уже после persist+flush (см. AbstractApiPostController::__invoke):
     * подрезает историю до MAX_PER_OWNER и локализует ответ.
     */
    protected function afterFetch(object|array $entity, ?User $user): void
    {
        /** @var RecentlyWatched $entity */
        $overflow = $this->repository->findOverflow($user);

        if ($overflow) {
            foreach ($overflow as $old) $this->entityManager->remove($old);
            $this->flush();
        }

        $this->localizationService->localizeTicket($entity->getTicket(), $this->getLocale());
    }

    private function isVisibleTo(Ticket $ticket, User $user): bool
    {
        $publisher = $ticket->getService() ? $ticket->getMaster() : $ticket->getAuthor();

        $isPublic = $ticket->getApproved()
            && $publisher !== null
            && $publisher->getActive()
            && $publisher->getApproved();

        return $isPublic || $ticket->getAuthor() === $user || $ticket->getMaster() === $user;
    }
}
