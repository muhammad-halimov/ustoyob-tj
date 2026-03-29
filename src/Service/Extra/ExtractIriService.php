<?php

namespace App\Service\Extra;

use App\ApiResource\AppMessages;
use Doctrine\ORM\EntityManagerInterface;
use InvalidArgumentException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

/**
 * Преобразует IRI-строку или числовой ID в Doctrine-сущность.
 *
 * IRI (Internationalized Resource Identifier) — это API Platform-формат
 * ссылки на ресурс: "/api/tickets/42" вместо простого числа 42.
 * Контроллеры получают данные как JSON, где пользователь может
 * передать как IRI-строку, так и число.
 *
 * extract() выполняет следующее:
 *   1. Если передан IRI ("/api/tickets/42") — извлекает ID regex-ом
 *   2. Если передано число ("42") — использует как ID напрямую
 *   3. Ищет сущность в БД, бросает 404 если не нашла
 */
readonly class ExtractIriService
{
    public function __construct(private EntityManagerInterface $em){}

    /**
     * @param string $iriOrId      IRI ("/api/tickets/42") или числовой ID ("42")
     * @param class-string|null $entityClass  FQCN сущности (Ticket::class, User::class, …)
     * @param string $routeName    Имя сегмента URI (например 'tickets' для /api/tickets/{id})
     */
    public function extract(string $iriOrId, ?string $entityClass, string $routeName): object
    {
        if ($entityClass === null) throw new InvalidArgumentException(AppMessages::get(AppMessages::MISSING_REQUIRED_FIELDS)->message);

        // Извлекаем ID из IRI. Если передано число — regex не срабатывает,
        // и $id остаётся оригинальной строкой (фаллбак на число).
        preg_match("#/api/$routeName/(\d+)#", $iriOrId, $matches);
        $id = $matches[1] ?? $iriOrId;

        $entity = $this->em->getRepository($entityClass)->find($id);

        if (!$entity) throw new NotFoundHttpException(AppMessages::get(AppMessages::RESOURCE_NOT_FOUND)->message);

        return $entity;
    }
}
