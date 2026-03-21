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
        if ($property !== 'type' || !in_array($value, ['user', 'ticket'], true)) {
            return;
        }

        $alias = $queryBuilder->getRootAliases()[0];
        $param = $queryNameGenerator->generateParameterName('type');

        $queryBuilder
            ->andWhere("$alias.type = :$param")
            ->setParameter($param, $value);
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
        ];
    }
}
