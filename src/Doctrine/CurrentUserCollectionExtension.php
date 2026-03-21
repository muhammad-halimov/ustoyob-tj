<?php

namespace App\Doctrine;

use ApiPlatform\Doctrine\Orm\Extension\QueryCollectionExtensionInterface;
use ApiPlatform\Doctrine\Orm\Util\QueryNameGeneratorInterface;
use ApiPlatform\Metadata\Operation;
use App\Entity\Extra\BlackList;
use App\Entity\Extra\Favorite;
use Doctrine\ORM\QueryBuilder;
use Symfony\Bundle\SecurityBundle\Security;

/**
 * Restricts BlackList and Favorite collections to entries owned by the current user.
 * Applied automatically to all GetCollection operations on those entities.
 */
final readonly class CurrentUserCollectionExtension implements QueryCollectionExtensionInterface
{
    private const array SECURED = [BlackList::class, Favorite::class];

    public function __construct(private Security $security) {}

    public function applyToCollection(
        QueryBuilder                $queryBuilder,
        QueryNameGeneratorInterface $queryNameGenerator,
        string                      $resourceClass,
        ?Operation                  $operation = null,
        array                       $context   = [],
    ): void {
        if (!in_array($resourceClass, self::SECURED, true)) {
            return;
        }

        $user = $this->security->getUser();
        if (!$user) {
            return;
        }

        $alias = $queryBuilder->getRootAliases()[0];
        $param = $queryNameGenerator->generateParameterName('currentUser');

        $queryBuilder
            ->andWhere("$alias.owner = :$param")
            ->setParameter($param, $user);
    }
}
