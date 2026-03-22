<?php

namespace App\EventSubscriber;

use App\Entity\Ticket\Ticket;
use Doctrine\ORM\EntityManagerInterface;
use Psr\Cache\CacheItemPoolInterface;
use Psr\Cache\InvalidArgumentException;
use Symfony\Component\EventDispatcher\EventSubscriberInterface;
use Symfony\Component\HttpKernel\Event\ResponseEvent;
use Symfony\Component\HttpKernel\KernelEvents;

/**
 * Подсчитывает уникальные просмотры тикета с дедупликацией по IP-адресу.
 *
 * Алгоритм:
 *   1. Срабатывает на каждый GET-ответ (kernel.response)
 *   2. Проверяет, является ли текущий ресурс объектом Ticket
 *   3. Формирует уникальный Redis-ключ: IP + ticketId
 *   4. Если ключ уже есть в кэше — просмотр уже был засчитан, пропускаем
 *   5. Если нет — сохраняем ключ на TTL секунд и инкрементируем viewsCount
 *
 * Почему kernel.RESPONSE, а не kernel.REQUEST?
 *   API Platform десериализует сущность и кладёт её в request->attributes['data']
 *   только в процессе обработки запроса. На этапе REQUEST атрибут ещё пуст.
 *   Поэтому слушаем RESPONSE — гарантированно после работы провайдера.
 *
 * Кэш-пул: ticket_views_cache_pool (Redis, см. config/packages/framework.yaml)
 */
class TicketViewSubscriber implements EventSubscriberInterface
{
    // Один и тот же IP не будет засчитан повторно в течение 1 часа
    private const int TTL = 3600;

    public function __construct(
        private readonly EntityManagerInterface $em,
        // Инжектируется по имени аргумента $ticketViewsCachePool —
        // Symfony автоматически связывает его с pool'ом ticket_views_cache_pool
        private readonly CacheItemPoolInterface $ticketViewsCachePool,
    ) {}

    public static function getSubscribedEvents(): array
    {
        return [KernelEvents::RESPONSE => 'onResponse'];
    }

    /**
     * @throws InvalidArgumentException
     */
    public function onResponse(ResponseEvent $event): void
    {
        // Суб-запросы (ESI, forward) не засчитываем — только основной запрос
        if (!$event->isMainRequest()) return;
        // Просмотры считаем только для GET; POST/PATCH/DELETE не являются "просмотром"
        if ($event->getRequest()->getMethod() !== 'GET') return;

        // API Platform кладёт десериализованную сущность в атрибут 'data'
        $ticket = $event->getRequest()->attributes->get('data');
        // Нас интересует только одиночный Ticket (не коллекция, не другая сущность)
        if (!$ticket instanceof Ticket) return;

        // md5 используется исключительно для безопасного формирования ключа кэша:
        // IP может содержать символы (: для IPv6), недопустимые в ключах Redis
        $ip       = $event->getRequest()->getClientIp() ?? 'unknown';
        $cacheKey = sprintf('ticket_view_%d_%s', $ticket->getId(), md5($ip));

        $item = $this->ticketViewsCachePool->getItem($cacheKey);
        // Ключ уже есть — этот IP уже смотрел тикет в течение TTL, выходим
        if ($item->isHit()) return;

        // Записываем маркер в Redis на TTL секунд; значение «true» не важно —
        // нам нужен лишь факт существования ключа (isHit)
        $item->set(true)->expiresAfter(self::TTL);
        $this->ticketViewsCachePool->save($item);

        $ticket->incrementViewsCount();
        // Ticket уже отслеживается UoW; flush() достаточно без persist()
        $this->em->flush();
    }
}
