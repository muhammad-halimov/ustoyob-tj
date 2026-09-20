<?php

namespace App\EventSubscriber;

use Symfony\Component\EventDispatcher\EventSubscriberInterface;
use Symfony\Component\HttpKernel\Event\ResponseEvent;
use Symfony\Component\HttpKernel\KernelEvents;

/**
 * Делает кэшируемым редирект Liip Imagine (/media/cache/resolve/...).
 *
 * По умолчанию редирект приходит с "Cache-Control: private, max-age=0,
 * must-revalidate" — и каждый показ картинки в WebView/браузере снова
 * заходил бы в PHP только ради 302. URL превью для одной картинки всегда
 * одинаков (см. ImageUrl), а цель редиректа детерминирована, поэтому редирект
 * можно кэшировать: сутки, публично. Сам итоговый файл в /media/cache
 * должен раздаваться статикой с длинным Cache-Control (см. README, "Кэш
 * картинок") — это уже настройка nginx.
 *
 * Меняем только успешные редиректы: ошибки (например, нет исходного файла)
 * кэшироваться не должны.
 */
final class ImageResolveCacheSubscriber implements EventSubscriberInterface
{
    /** Сутки: если кэш превью когда-нибудь очистят, клиент не будет годами идти по мёртвому редиректу. */
    private const int REDIRECT_TTL = 86400;

    public static function getSubscribedEvents(): array
    {
        return [KernelEvents::RESPONSE => 'onResponse'];
    }

    public function onResponse(ResponseEvent $event): void
    {
        if (!$event->isMainRequest()) return;

        $request = $event->getRequest();
        if ($request->attributes->get('_route') !== 'liip_imagine_filter') return;

        $response = $event->getResponse();
        if (!$response->isRedirection()) return;

        $response->setPublic();
        $response->setMaxAge(self::REDIRECT_TTL);
    }
}
