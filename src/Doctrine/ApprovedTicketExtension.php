<?php

namespace App\Doctrine;

use ApiPlatform\Doctrine\Orm\Extension\QueryCollectionExtensionInterface;
use ApiPlatform\Doctrine\Orm\Util\QueryNameGeneratorInterface;
use ApiPlatform\Metadata\Operation;
use App\Entity\Ticket\Ticket;
use Doctrine\ORM\QueryBuilder;

/**
 * Doctrine ORM extension: скрывает неодобренные тикеты из коллекций.
 *
 * Применяется ТОЛЬКО к:
 *   GET /api/tickets  — коллекция: только approved=true
 *
 * Item-запросы (GET /api/tickets/{id}) намеренно НЕ фильтруются здесь:
 * логика «автор видит свой неодобренный тикет» реализована в
 * TicketGeographyLocalizationProvider.
 *
 * НЕ применяется к:
 *   GET /api/tickets/me   — репозиторий напрямую, extension не вызывается.
 *   PATCH /api/tickets/{id} — аналогично.
 */
final class ApprovedTicketExtension implements QueryCollectionExtensionInterface
{
    public function applyToCollection(
        QueryBuilder                $queryBuilder,
        QueryNameGeneratorInterface $queryNameGenerator,
        string                      $resourceClass,
        ?Operation                  $operation = null,
        array                       $context   = [],
    ): void {
        if ($resourceClass !== Ticket::class) {
            return;
        }

        $alias = $queryBuilder->getRootAliases()[0];
        $param = $queryNameGenerator->generateParameterName('approved');

        $queryBuilder
            ->andWhere("$alias.approved = :$param")
            ->setParameter($param, true);
    }
}
