<?php

namespace App\Entity\Trait\Readable;

use App\Service\Extra\SlugUtil;
use ReflectionClass;
use Symfony\Component\Serializer\Attribute\Groups;

/**
 * Декоративный slug для читаемых ссылок (/categories/{id}?slug={slug}).
 *
 * Как и у Ticket (06.09.2026, переход на UUID-PK): слаг НЕ персистится и
 * ничего не идентифицирует — реальный lookup всегда по UUID, фронт просто
 * собирает ссылку /x/{id}?slug={slug}, бэкенд slug из query игнорирует. Это
 * живая проекция getTitle(): меняется вместе с названием, а значит нет ни
 * колонки в БД, ни регенерации, ни проблемы уникальности/рассинхрона. А
 * раз title локализуется на чтение (?locale=, см. LocalizationService),
 * слаг автоматически следует за языком ответа.
 *
 * Подключать ВМЕСТЕ с TitleTrait (берёт getTitle()). Группы сериализации —
 * ровно те же, что у title в TitleTrait: слаг виден везде, где виден сам
 * заголовок — держать списки в синхроне. У сущностей без getTitle()
 * (User — имя/фамилия) свой getSlug() напрямую через SlugUtil.
 *
 * Если title пуст — слаг = имя класса в нижнем регистре ('category',
 * 'review'...); переопределить можно через slugFallback().
 */
trait SlugTrait
{
    #[Groups([
        G::USER_PUBLIC,
        G::MASTERS,
        G::CLIENTS,

        G::OCCUPATIONS,
        G::CATEGORIES,
        G::UNITS,

        G::LEGALS,
        G::FAVORITES,
        G::BLACK_LISTS,

        G::MASTER_TICKETS,
        G::CLIENT_TICKETS,

        G::REVIEWS,
        G::REVIEWS_CLIENT,

        G::CHATS,
        G::CHAT_MESSAGES,

        G::TECH_SUPPORT,
        G::TECH_SUPPORT_MESSAGES,

        G::GALLERIES,

        G::CITIES,
        G::DISTRICTS,
        G::PROVINCES,

        G::APPEAL,
        G::APPEAL_CHAT,
        G::APPEAL_TICKET,
        G::APPEAL_REVIEW,
        G::APPEAL_USER,

        G::APPEAL_REASON,
    ])]
    public function getSlug(): string
    {
        return SlugUtil::make($this->getTitle(), $this->slugFallback());
    }

    protected function slugFallback(): string
    {
        return strtolower((new ReflectionClass($this))->getShortName());
    }
}
