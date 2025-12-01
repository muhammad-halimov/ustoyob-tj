<?php

namespace App\Controller\Api\Filter\User;

use ApiPlatform\Doctrine\Orm\Filter\AbstractFilter;
use ApiPlatform\Doctrine\Orm\Util\QueryNameGeneratorInterface;
use ApiPlatform\Metadata\Operation;
use Doctrine\ORM\QueryBuilder;
use Symfony\Component\TypeInfo\Type;

final class RolesFilter extends AbstractFilter
{
    protected function filterProperty(
        string $property, $value,
        QueryBuilder $queryBuilder,
        QueryNameGeneratorInterface $queryNameGenerator,
        string $resourceClass,
        Operation $operation = null,
        array $context = []
    ): void {
        if ($property !== 'roles') {
            return;
        }

        $alias = $queryBuilder->getRootAliases()[0];
        $parameterName = $queryNameGenerator->generateParameterName($property);

        // Используем CAST функцию
        $queryBuilder
            ->andWhere("CAST($alias.roles AS TEXT) LIKE :$parameterName")
            ->setParameter($parameterName, "%\"$value\"%");
    }

    public function getDescription(string $resourceClass): array
    {
        return [
            'roles' => [
                'property' => 'roles',
                'type' => Type::string(),  // Новый API
                'required' => false,
            ],
        ];
    }
}
