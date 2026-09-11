<?php

namespace App\State\Localization\Review;

use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\Operation;
use App\Entity\Review\Review;
use App\State\Localization\AbstractLocalizationProvider;

readonly class ReviewLocalizationProvider extends AbstractLocalizationProvider
{
    /**
     * Для одиночного GET /reviews/{id} — тот же критерий видимости, что
     * ReviewVisibilityExtension применяет к коллекции GET /reviews: ОБЕ
     * стороны отзыва (master и client, каждая если заполнена) должны быть
     * active = true AND approved = true. Плюс (с 26.08.2026, поправлено
     * 11.09.2026 — см. докблок Ticket::$everApproved и
     * ReviewVisibilityExtension) — тикет (объявление), к которому привязан
     * отзыв, если заполнен, должен быть хоть раз одобрен (everApproved =
     * true), а не обязательно одобрен ПРЯМО СЕЙЧАС — иначе временный сброс
     * approved рутинной правкой контента тикета прятал бы отзыв до
     * повторной модерации, хотя отзыв не про текущую редакцию текста.
     *
     * Раньше здесь проверялся только "субъект" (сторона, соответствующая
     * Review::$type) — этого было недостаточно, потому что master и client
     * сериализуются в ответе ПОЛНОСТЬЮ (не IRI-ссылкой): вторая сторона
     * (не субъект) утекала бы в ответ целиком со своими данными, даже если
     * сама деактивирована/не подтверждена. Поэтому деактивация ЛЮБОЙ из
     * сторон теперь скрывает отзыв целиком, а не только когда деактивирован
     * тот, о ком формально сам отзыв.
     *
     * Если сторона/тикет не заполнены (null) — не скрываем по ним (null-safe,
     * как в FavoriteVisibilityExtension).
     *
     * GET /reviews/me через этот provider не проходит — у него свой
     * контроллер (ApiGetMyReviewsController), поэтому self-доступ не задет.
     */
    public function provide(Operation $operation, array $uriVariables = [], array $context = []): object|array|null
    {
        if ($operation instanceof Get) {
            $review = $this->itemProvider->provide($operation, $uriVariables, $context);

            if (!$review instanceof Review) {
                return null;
            }

            $master = $review->getMaster();
            $client = $review->getClient();
            $ticket = $review->getTicket();

            $masterHidden = $master !== null && (!$master->getActive() || !$master->getApproved());
            $clientHidden = $client !== null && (!$client->getActive() || !$client->getApproved());
            $ticketHidden = $ticket !== null && !$ticket->getEverApproved();

            if ($masterHidden || $clientHidden || $ticketHidden) {
                return null;
            }

            // resolveLocale() из LocaleResolveTrait объявлен private в
            // AbstractLocalizationProvider — из класса-наследника недоступен,
            // поэтому резолвим локаль так же, как TicketGeographyLocalizationProvider.
            $locale = $this->requestStack->getCurrentRequest()?->query->get('locale', 'tj') ?? 'tj';
            $this->localize($review, $locale);

            return $review;
        }

        return parent::provide($operation, $uriVariables, $context);
    }

    protected function supports(object $entity): bool
    {
        return $entity instanceof Review;
    }

    protected function localize(object $entity, string $locale): void
    {
        /** @var Review $entity */
        if ($entity->getMaster()) $this->localizationService->localizeUser($entity->getMaster(), $locale);
        if ($entity->getClient()) $this->localizationService->localizeUser($entity->getClient(), $locale);
        if ($entity->getTicket()) $this->localizationService->localizeTicket($entity->getTicket(), $locale);
    }
}
