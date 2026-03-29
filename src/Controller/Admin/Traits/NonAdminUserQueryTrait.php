<?php

namespace App\Controller\Admin\Traits;

use Doctrine\ORM\QueryBuilder;

/**
 * QueryBuilder-фильтры для полей Association по ролям пользователя.
 *
 * nonAdminQb()  — только пользователи БЕЗ ROLE_ADMIN
 * adminOnlyQb() — только пользователи С ROLE_ADMIN
 *
 * Использование:
 *   ->setQueryBuilder($this->nonAdminQb())
 *   ->setQueryBuilder($this->adminOnlyQb())
 */
trait NonAdminUserQueryTrait
{
    private function nonAdminQb(): \Closure
    {
        return fn (QueryBuilder $qb) => $qb->andWhere("CAST(entity.roles as text) NOT LIKE '%ROLE_ADMIN%'");
    }

    private function adminOnlyQb(): \Closure
    {
        return fn (QueryBuilder $qb) => $qb->andWhere("CAST(entity.roles as text) LIKE '%ROLE_ADMIN%'");
    }
}
