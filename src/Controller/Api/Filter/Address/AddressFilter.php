<?php

namespace App\Controller\Api\Filter\Address;

use ApiPlatform\Doctrine\Orm\Filter\AbstractFilter;
use ApiPlatform\Doctrine\Orm\Util\QueryNameGeneratorInterface;
use ApiPlatform\Metadata\Operation;
use Doctrine\ORM\QueryBuilder;

final class AddressFilter extends AbstractFilter
{
    protected function filterProperty(
        string $property, $value,
        QueryBuilder $queryBuilder,
        QueryNameGeneratorInterface $queryNameGenerator,
        string $resourceClass,
        Operation $operation = null,
        array $context = []
    ): void {
        $geographyFields = [
            'province',
            'district',
            'city',
            'settlement',
            'community',
            'village',
            'suburb'
        ];

        if (!in_array($property, $geographyFields)) return;

        $alias = $queryBuilder->getRootAliases()[0];
        $addressAlias = $queryNameGenerator->generateJoinAlias('addresses');
        $geoAlias = $queryNameGenerator->generateJoinAlias($property);
        $parameterName = $queryNameGenerator->generateParameterName($property);

        // Получаем существующие JOIN чтобы не дублировать
        $existingJoins = $queryBuilder->getDQLPart('join');
        $addressJoinExists = false;

        foreach ($existingJoins as $joins) {
            foreach ($joins as $join) {
                if (str_contains($join->getJoin(), '.addresses')) {
                    $addressJoinExists = true;
                    $addressAlias = $join->getAlias();
                    break 2;
                }
            }
        }

        // JOIN с адресами если еще не было
        if (!$addressJoinExists) {
            $queryBuilder->leftJoin("$alias.addresses", $addressAlias);
        }

        // JOIN с географическим объектом
        $queryBuilder->leftJoin("$addressAlias.$property", $geoAlias);

        // Проверяем, является ли значение числом (ID) или строкой (title/description)
        if (is_numeric($value)) {
            // Поиск по ID
            $queryBuilder
                ->andWhere("$geoAlias.id = :$parameterName")
                ->setParameter($parameterName, (int)$value);
        } else {
            // Поиск по title или description (case-insensitive partial match)
            $queryBuilder
                ->andWhere("LOWER($geoAlias.title) LIKE LOWER(:$parameterName) OR LOWER($geoAlias.description) LIKE LOWER(:$parameterName)")
                ->setParameter($parameterName, "%$value%");
        }
    }

    public function getDescription(string $resourceClass): array
    {
        $description = [];
        $geographyFields = [
            'province' => 'Province',
            'district' => 'District',
            'city' => 'City',
            'settlement' => 'Settlement',
            'community' => 'Community',
            'village' => 'Village',
            'suburb' => 'Suburb',
        ];

        foreach ($geographyFields as $field => $label) {
            $description[$field] = [
                'property' => $field,
                'type' => 'string',
                'required' => false,
                'description' => "Filter by $label (numeric for exact ID match, text for case-insensitive partial search in title/description)",
            ];
        }

        return $description;
    }
}
