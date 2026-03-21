<?php

namespace App\Controller\Api\Filter\Translation;

use ApiPlatform\Doctrine\Orm\Filter\AbstractFilter;
use ApiPlatform\Doctrine\Orm\Util\QueryNameGeneratorInterface;
use ApiPlatform\Metadata\Operation;
use Doctrine\ORM\QueryBuilder;
use Doctrine\Persistence\ManagerRegistry;
use Psr\Log\LoggerInterface;
use Symfony\Component\Serializer\NameConverter\NameConverterInterface;

/**
 * Фильтрует по переводам (таблица translation) через JOIN.
 *
 * Поддерживает:
 *   - прямые поля:    title, description
 *   - вложенные пути: province.title, suburbs.title, settlements.villages.title
 *
 * Использование:
 *   #[ApiFilter(TranslationSearchFilter::class, properties: [
 *       'title'                      => 'partial',
 *       'description'                => 'partial',
 *       'province.title'             => 'partial',
 *       'suburbs.title'              => 'partial',
 *       'settlements.title'          => 'partial',
 *       'settlements.villages.title' => 'partial',
 *       'communities.title'          => 'partial',
 *   ])]
 */
final class TranslationSearchFilter extends AbstractFilter
{
    private const array TRANSLATION_FIELDS = ['title', 'description'];

    public function __construct(
        ManagerRegistry $managerRegistry,
        ?LoggerInterface $logger = null,
        ?array $properties = null,
        ?NameConverterInterface $nameConverter = null,
    ) {
        parent::__construct($managerRegistry, $logger, $properties, $nameConverter);
    }

    protected function filterProperty(
        string $property,
        mixed $value,
        QueryBuilder $queryBuilder,
        QueryNameGeneratorInterface $queryNameGenerator,
        string $resourceClass,
        ?Operation $operation = null,
        array $context = [],
    ): void {
        if ($value === null || $value === '') {
            return;
        }

        $strategy  = $this->properties[$property] ?? 'partial';
        $parts     = explode('.', $property);
        $field     = array_pop($parts); // последний элемент — поле (title / description)

        if (!in_array($field, self::TRANSLATION_FIELDS, true)) {
            return;
        }

        $rootAlias = $queryBuilder->getRootAliases()[0];

        // JOIN по цепочке связей: province -> province.translations
        // suburbs -> suburbs.translations
        // settlements -> settlements.villages -> settlements.villages.translations
        $currentAlias = $rootAlias;
        foreach ($parts as $relation) {
            $joinAlias    = $queryNameGenerator->generateJoinAlias($relation);
            $queryBuilder->leftJoin("$currentAlias.$relation", $joinAlias);
            $currentAlias = $joinAlias;
        }

        // JOIN на translations последней сущности в цепочке
        $translationAlias = $queryNameGenerator->generateJoinAlias('translations');
        $queryBuilder->leftJoin("$currentAlias.translations", $translationAlias);

        $parameterName = $queryNameGenerator->generateParameterName($field);

        match ($strategy) {
            'exact'  => $queryBuilder
                ->andWhere("$translationAlias.$field = :$parameterName")
                ->setParameter($parameterName, $value),
            'start'  => $queryBuilder
                ->andWhere("$translationAlias.$field LIKE :$parameterName")
                ->setParameter($parameterName, addcslashes($value, '%_') . '%'),
            'end'    => $queryBuilder
                ->andWhere("$translationAlias.$field LIKE :$parameterName")
                ->setParameter($parameterName, '%' . addcslashes($value, '%_')),
            default  => $queryBuilder
                ->andWhere("$translationAlias.$field LIKE :$parameterName")
                ->setParameter($parameterName, '%' . addcslashes($value, '%_') . '%'),
        };
    }

    public function getDescription(string $resourceClass): array
    {
        $description = [];

        foreach ($this->properties ?? [] as $property => $strategy) {
            $description[$property] = [
                'property'    => $property,
                'type'        => 'string',
                'required'    => false,
                'strategy'    => $strategy,
                'description' => "Filter by translated $property ($strategy match)",
            ];
        }

        return $description;
    }
}
