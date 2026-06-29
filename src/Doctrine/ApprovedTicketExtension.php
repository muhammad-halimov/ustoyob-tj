<?php

namespace App\Doctrine;

use ApiPlatform\Doctrine\Orm\Extension\QueryCollectionExtensionInterface;
use ApiPlatform\Doctrine\Orm\Extension\QueryItemExtensionInterface;
use ApiPlatform\Doctrine\Orm\Util\QueryNameGeneratorInterface;
use ApiPlatform\Metadata\Operation;
use App\Entity\Ticket\Ticket;
use Doctrine\ORM\QueryBuilder;

/**
 * Doctrine ORM-расширение API Platform: скрывает неодобренные тикеты
 * из публичных GET-запросов.
 *
 * Применяется к:
 *   GET /api/tickets      — коллекция: только approved=true
 *   GET /api/tickets/{id} — одиночный: только approved=true
 *                           (исключение «автор видит свой тикет» обрабатывается
 *                            в TicketGeographyLocalizationProvider на уровне провайдера)
 *
 * НЕ применяется к:
 *   GET /api/tickets/me   — репозиторий напрямую, extension не вызывается.
 *   PATCH /api/tickets/{id} — аналогично.
 */
final class ApprovedTicketExtension implements QueryCollectionExtensionInterface, QueryItemExtensionInterface
{
    public function applyToCollection(
        QueryBuilder                $queryBuilder,
        QueryNameGeneratorInterface $queryNameGenerator,
        string                      $resourceClass,
        ?Operation                  $operation = null,
        array                       $context   = [],
    ): void {
        $this->addApprovedFilter($queryBuilder, $resourceClass, $queryNameGenerator);
    }

    public function applyToItem(
        QueryBuilder                $queryBuilder,
        QueryNameGeneratorInterface $queryNameGenerator,
        string                      $resourceClass,
        array                       $identifiers,
        ?Operation                  $operation = null,
        array                       $context   = [],
    ): void {
        $this->addApprovedFilter($queryBuilder, $resourceClass, $queryNameGenerator);
    }

    private function addApprovedFilter(
        QueryBuilder                $queryBuilder,
        string                      $resourceClass,
        QueryNameGeneratorInterface $queryNameGenerator,
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

