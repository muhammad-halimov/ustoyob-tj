<?php

namespace App\Controller\Api\Filter\Extra;

use ApiPlatform\Doctrine\Orm\Filter\AbstractFilter;
use ApiPlatform\Doctrine\Orm\Util\QueryNameGeneratorInterface;
use ApiPlatform\Metadata\Operation;
use Doctrine\ORM\QueryBuilder;

/**
 * Filters BlackList / Favorite entries by type=user|ticket.
 * Used instead of the built-in SearchFilter because both entities extend a MappedSuperclass.
 */
final class CollectionEntryTypeFilter extends AbstractFilter
{
    protected function filterProperty(
        string                      $property,
                                    $value,
        QueryBuilder                $queryBuilder,
        QueryNameGeneratorInterface $queryNameGenerator,
        string                      $resourceClass,
        ?Operation                  $operation = null,
        array                       $context   = [],
    ): void {
        $alias = $queryBuilder->getRootAliases()[0];

        if ($property === 'type') {
            if (!in_array($value, ['user', 'ticket'], true)) return;

            $param = $queryNameGenerator->generateParameterName('type');
            $queryBuilder
                ->andWhere("$alias.type = :$param")
                ->setParameter($param, $value);

            return;
        }

        if ($property === 'user' && is_numeric($value)) {
            $param = $queryNameGenerator->generateParameterName('user');
            $queryBuilder
                ->andWhere("IDENTITY($alias.user) = :$param")
                ->setParameter($param, (int) $value);

            return;
        }

        if ($property === 'ticket' && is_numeric($value)) {
            $param = $queryNameGenerator->generateParameterName('ticket');
            $queryBuilder
                ->andWhere("IDENTITY($alias.ticket) = :$param")
                ->setParameter($param, (int) $value);
        }
    }

    public function getDescription(string $resourceClass): array
    {
        return [
            'type' => [
                'property' => 'type',
                'type'     => 'string',
                'required' => false,
                'openapi'  => ['description' => 'Filter by entry type: user or ticket'],
            ],
            'user' => [
                'property' => 'user',
                'type'     => 'integer',
                'required' => false,
                'openapi'  => ['description' => 'Filter by target user ID'],
            ],
            'ticket' => [
                'property' => 'ticket',
                'type'     => 'integer',
                'required' => false,
                'openapi'  => ['description' => 'Filter by target ticket ID'],
            ],
        ];
    }
}
