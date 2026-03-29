<?php

namespace App\EventListener;

use App\ApiResource\AppMessages;
use App\Entity\Extra\Translation;
use Symfony\Component\EventDispatcher\Attribute\AsEventListener;
use Symfony\Component\HttpKernel\Event\RequestEvent;
use Symfony\Component\HttpKernel\KernelEvents;

/**
 * Устанавливает локаль для AppError в самом начале обработки запроса.
 *
 * Priority: 20 — этот слушатель нужно запустить ДО большинства контроллеров
 * и провайдеров (у которых priority по умолчанию 0 или -10), чтобы сообщения
 * об ошибках уже были на нужном языке к моменту их формирования.
 *
 * Как работает локализация:
 *   - Клиент передаёт ?locale=ru|eng|tj в query-строке
 *   - Этот слушатель читает параметр и записывает локаль в статическое
 *     состояние AppError (безопасно, поскольку каждый PHP-FPM запрос изолирован)
 *   - Все последующие AppError::get() автоматически вернут сообщение
 *     на нужном языке без явной передачи $locale в каждый вызов
 */
#[AsEventListener(event: KernelEvents::REQUEST, priority: 20)]
class AppErrorLocaleListener
{
    public function __invoke(RequestEvent $event): void
    {
        // Суб-запросы (forward, ESI) не должны менять глобальную локаль —
        // обрабатываем только основной (master) запрос
        if (!$event->isMainRequest()) {
            return;
        }

        // Читаем локаль из Query-параметра; «tj» — дефолт, если не передана
        $locale = $event->getRequest()->query->get('locale', 'tj');

        // Translation::LOCALES = ['Таджикский' => 'tj', 'Английский' => 'eng', 'Русский' => 'ru']
        // Если передан неизвестный код — откатываемся к «tj», а не возвращаем ошибку
        if (!in_array($locale, array_values(Translation::LOCALES), true)) {
            $locale = 'tj';
        }

        // Устанавливаем локаль глобально — все AppError::get() в этом запросе
        // будут возвращать сообщения на нужном языке
        AppMessages::setLocale($locale);
    }
}
