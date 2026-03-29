<?php

namespace App\Service\Extra;

use App\Entity\Appeal\Appeal\Appeal;
use Doctrine\Common\Collections\Collection;

/**
 * Применяет перевод (locale-зависимый title/description) к сущностям
 * географии и любым иным переводимым сущностям.
 *
 * Модель переводов:
 *   Entity содержит коллекцию Translation-объектов, каждый из которых
 *   хранит locale + title (+ опц. description).
 *   Сервис находит нужный перевод и filter() и вызывает entity::setTitle().
 *
 * Фоллбэк-стратегия:
 *   Если перевод на запрошенный locale не найден — берётся первый
 *   доступный (translations->first()), а если переводов нет вовсе —
 *   ставится 'Unknown'.
 *
 * Методы:
 *   localizeGeography()   — полный обход адресной иерархии единицы
 *   localizeEntity()      — простая локализация: только setTitle()
 *   localizeEntityFull()  — полная локализация: setTitle() + setDescription()
 *   getLocalizedTitle()   — возвращает строку без применения к сущности
 */
readonly class LocalizationService
{
    /**
     * Локализует всю адресную иерархию сущности (тикет, юзер и т.д.).
     * Обходит все адреса и вызывает localizeEntity() для каждой части:
     * вилаят → шахр → район → [махалла, дехот, община] → город → [молокан]
     */
    public function localizeGeography(object $entity, string $locale): void
    {
        if (!method_exists($entity, 'getAddresses')) {
            return;
        }

        foreach ($entity->getAddresses() as $address) {

            // Province
            if ($province = $address->getProvince()) {
                $this->localizeEntity($province, $locale);
            }

            // City
            if ($city = $address->getCity()) {
                $this->localizeEntity($city, $locale);
            }

            // Suburb
            if ($suburb = $address->getSuburb()) {
                $this->localizeEntity($suburb, $locale);
            }

            // District
            if ($district = $address->getDistrict()) {
                $this->localizeEntity($district, $locale);

                // Settlements
                foreach ($district->getSettlements() as $settlement) {
                    $this->localizeEntity($settlement, $locale);

                    // Villages
                    foreach ($settlement->getVillages() as $village) {
                        $this->localizeEntity($village, $locale);
                    }
                }

                // Communities
                foreach ($district->getCommunities() as $community) {
                    $this->localizeEntity($community, $locale);
                }
            }

            // Settlement (direct)
            if ($settlement = $address->getSettlement()) {
                $this->localizeEntity($settlement, $locale);
            }

            // Community (direct)
            if ($community = $address->getCommunity()) {
                $this->localizeEntity($community, $locale);
            }

            // Village (direct)
            if ($village = $address->getVillage()) {
                $this->localizeEntity($village, $locale);
            }
        }
    }

    /**
     * Локализует одну сущность: находит перевод по locale и вызывает
     * entity->setTitle(). Если перевода нет — берёт первый из списка;
     * если переводов нет вовсе — ставит 'Unknown'.
     *
     * Безопасно работает с любыми объектами: перед вызовом проверяет наличие
     * нужных методов через method_exists().
     */
    public function localizeEntity(object $entity, string $locale): void
    {
        if (!$entity) return;

        if (!method_exists($entity, 'getTranslations') || !method_exists($entity, 'setTitle')) {
            return;
        }

        /** @var Collection $translations */
        $translations = $entity->getTranslations();

        $translation = $translations
            ->filter(fn ($t) => $t->getLocale() === $locale)
            ->first();

        $fallback = $translations->first();

        $title =
            ($translation && method_exists($translation, 'getTitle'))
                ? $translation->getTitle()
                : ($fallback && method_exists($fallback, 'getTitle')
                ? $fallback->getTitle()
                : 'Unknown'
            );

        $entity->setTitle($title);
    }

    /**
     * То же, что localizeEntity(), но дополнительно применяет setDescription().
     * Используется для сущностей, у которых перевод содержит и title и description
     * (например Legal, AppealReason).
     */
    public function localizeEntityFull(object $entity, string $locale): void
    {
        if (!$entity) return;

        if (!method_exists($entity, 'getTranslations')) {
            return;
        }

        /** @var Collection $translations */
        $translations = $entity->getTranslations();

        $translation = $translations->filter(fn($t) => $t->getLocale() === $locale)->first();
        $fallback    = $translations->first();
        $resolved    = $translation ?: $fallback;

        if (method_exists($entity, 'setTitle') && $resolved && method_exists($resolved, 'getTitle')) {
            $entity->setTitle($resolved->getTitle());
        }

        if (method_exists($entity, 'setDescription') && $resolved && method_exists($resolved, 'getDescription')) {
            $desc = $resolved->getDescription();
            if ($desc !== null) {
                $entity->setDescription($desc);
            }
        }
    }

    /**
     * Локализация тикета целиком: адреса + категория + единица + подкатегория.
     *
     * Одним вызовом заменяет повторяющийся блок из 8 строк,
     * который раньше дублировался в Post/Patch/Filter-контроллерах.
     */
    public function localizeTicket(object $ticket, string $locale): void
    {
        $this->localizeGeography($ticket, $locale);

        if (method_exists($ticket, 'getCategory') && $ticket->getCategory()) {
            $this->localizeEntity($ticket->getCategory(), $locale);
        }

        if (method_exists($ticket, 'getUnit') && $ticket->getUnit()) {
            $this->localizeEntity($ticket->getUnit(), $locale);
        }

        if (method_exists($ticket, 'getSubcategory') && $ticket->getSubcategory()) {
            $this->localizeEntity($ticket->getSubcategory(), $locale);
        }

        if (method_exists($ticket, 'getAuthor') && $ticket->getAuthor()) {
            $this->localizeUser($ticket->getAuthor(), $locale);
        }

        if (method_exists($ticket, 'getMaster') && $ticket->getMaster()) {
            $this->localizeUser($ticket->getMaster(), $locale);
        }
    }

    /**
     * Локализация тикета целиком: адреса + категория + единица + подкатегория.
     *
     * Одним вызовом заменяет повторяющийся блок из 8 строк,
     * который раньше дублировался в Post/Patch/Filter-контроллерах.
     */
    public function localizeUser(object $user, string $locale): void
    {
        $this->localizeGeography($user, $locale);

        if (method_exists($user, 'getOccupation')) {
            foreach ($user->getOccupation() as $occupation) {
                $this->localizeEntity($occupation, $locale);
            }
        }

        if (method_exists($user, 'getEducation')) {
            foreach ($user->getEducation() as $education) {
                $occupation = $education->getOccupation();
                if ($occupation !== null) $this->localizeEntity($occupation, $locale);
            }
        }
    }

    public function localizeAppeal(Appeal $appeal, string $locale): void
    {
        if ($appeal->getAuthor())     $this->localizeUser($appeal->getAuthor(), $locale);
        if ($appeal->getRespondent()) $this->localizeUser($appeal->getRespondent(), $locale);
        if ($appeal->getReason())     $this->localizeEntity($appeal->getReason(), $locale);

        if ($appeal->getTicket()) {
            $this->localizeTicket($appeal->getTicket(), $locale);
        }

        $review = $appeal->getReviewAssoc();
        if ($review !== null) {
            if ($review->getMaster()) $this->localizeUser($review->getMaster(), $locale);
            if ($review->getClient()) $this->localizeUser($review->getClient(), $locale);
            if ($review->getTicket()) $this->localizeTicket($review->getTicket(), $locale);
        }

        $chat = $appeal->getChatAssoc();
        if ($chat !== null) {
            if ($chat->getAuthor())      $this->localizeUser($chat->getAuthor(), $locale);
            if ($chat->getReplyAuthor()) $this->localizeUser($chat->getReplyAuthor(), $locale);
            if ($chat->getTicket()) $this->localizeTicket($chat->getTicket(), $locale);
        }
    }

    /**
     * Возвращает локализованный title как строку (entity не изменяется).
     * Используется в местах, где нужно только получить строку без
     * побочных эффектов (например, для логирования или ответа API с доп. полем).
     *
     * @param object $entity
     * @param string $locale
     * @return string
     */
    public function getLocalizedTitle(object $entity, string $locale): string
    {
        $translation = $entity->getTranslations()->filter(fn($t) => $t->getLocale() === $locale)->first();

        if ($translation) {
            return $translation->getTitle();
        }

        $fallback = $entity->getTranslations()->first();
        return $fallback ? $fallback->getTitle() : 'Unknown';
    }
}
