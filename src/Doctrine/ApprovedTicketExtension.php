<?php

namespace App\Doctrine;

use ApiPlatform\Doctrine\Orm\Extension\QueryCollectionExtensionInterface;
use ApiPlatform\Doctrine\Orm\Extension\QueryItemExtensionInterface;
use ApiPlatform\Doctrine\Orm\Util\QueryNameGeneratorInterface;
use ApiPlatform\Metadata\Operation;
use App\Entity\Ticket\Ticket;
use App\Entity\User;
use Doctrine\ORM\QueryBuilder;
use Symfony\Bundle\SecurityBundle\Security;

/**
 * Doctrine ORM-расширение API Platform: скрывает неодобренные тикеты
 * из всех публичных GET-запросов.
 *
 * Применяется к:
 *   GET /api/tickets          — коллекция: только approved=true
 *   GET /api/tickets/{id}     — один тикет: approved=true ИЛИ автор = текущий пользователь
 *
 * НЕ применяется к:
 *   GET /api/tickets/me       — контроллер использует репозиторий напрямую,
 *                               минуя API Platform query-extensions (намеренно).
 *   PATCH /api/tickets/{id}   — аналогично; владелец всегда может редактировать
 *                               собственный неодобренный тикет.
 *
 * Одобрение устанавливается администратором через EasyAdmin или выделенный
 * admin-эндпоинт. Поле approved = false по умолчанию.
 */
final class ApprovedTicketExtension implements QueryCollectionExtensionInterface, QueryItemExtensionInterface
{
    public function __construct(private readonly Security $security) {}

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
        if ($resourceClass !== Ticket::class) {
            return;
        }

        $alias        = $queryBuilder->getRootAliases()[0];
        $paramApproved = $queryNameGenerator->generateParameterName('approved');
        $currentUser  = $this->security->getUser();

        // Если запрашивающий — авторизованный пользователь, показываем тикет
        // когда он одобрен ИЛИ когда текущий пользователь является его автором.
        if ($currentUser instanceof User) {
            $paramAuthor = $queryNameGenerator->generateParameterName('author');
            $queryBuilder
                ->andWhere("$alias.approved = :$paramApproved OR $alias.author = :$paramAuthor")
                ->setParameter($paramApproved, true)
                ->setParameter($paramAuthor, $currentUser);
        } else {
            // Гость видит только одобренные тикеты.
            $queryBuilder
                ->andWhere("$alias.approved = :$paramApproved")
                ->setParameter($paramApproved, true);
        }
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

