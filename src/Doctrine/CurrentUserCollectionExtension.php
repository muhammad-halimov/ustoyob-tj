<?php

namespace App\Doctrine;

use ApiPlatform\Doctrine\Orm\Extension\QueryCollectionExtensionInterface;
use ApiPlatform\Doctrine\Orm\Util\QueryNameGeneratorInterface;
use ApiPlatform\Metadata\Operation;
use App\Entity\User\BlackList;
use App\Entity\User\Favorite;
use Doctrine\ORM\QueryBuilder;
use Symfony\Bundle\SecurityBundle\Security;

/**
 * Doctrine ORM-расширение API Platform: ограничивает коллекции определённых
 * сущностей только записями, принадлежащими текущему пользователю.
 *
 * Как это работает:
 *   API Platform вызывает applyToCollection() для КАЖДОГО GetCollection-запроса.
 *   Мы перехватываем запросы к SECURED-сущностям и добавляем WHERE-условие
 *   «owner = текущий_пользователь» — тем самым юзер не может увидеть
 *   чужие записи, даже зная их ID (защита на уровне БД-запроса).
 *
 * Почему расширение, а не security в атрибуте #[ApiResource]?
 *   security-атрибут работает на уровне отдельного объекта (item),
 *   а расширение фильтрует на уровне SQL, что эффективнее для коллекций.
 *
 * Текущие сущности под защитой: BlackList, Favorite (см. SECURED).
 */
final readonly class CurrentUserCollectionExtension implements QueryCollectionExtensionInterface
{
    // Список сущностей, коллекции которых изолированы по owner-у.
    // Добавьте сюда новый класс, чтобы автоматически ограничить его коллекцию.
    private const array SECURED = [BlackList::class, Favorite::class];

    public function __construct(private Security $security) {}

    public function applyToCollection(
        QueryBuilder                $queryBuilder,
        QueryNameGeneratorInterface $queryNameGenerator,
        string                      $resourceClass,
        ?Operation                  $operation = null,
        array                       $context   = [],
    ): void {
        // Сущности вне списка SECURED не трогаем — их коллекции публичны
        if (!in_array($resourceClass, self::SECURED, true)) {
            return;
        }

        // Неаутентифицированный пользователь получит пустую коллекцию
        // (HTTP 200 с []), а не 403 — поведение намеренное: не раскрываем
        // сам факт существования записей
        $user = $this->security->getUser();
        if (!$user) {
            return;
        }

        // getRootAliases()[0] — псевдоним корневой сущности в DQL (обычно 'o').
        // Используем его, а не хардкодим 'o', чтобы не сломать сложные запросы
        // с несколькими JOIN-ами, где псевдоним может быть другим.
        $alias = $queryBuilder->getRootAliases()[0];

        // generateParameterName() гарантирует уникальность имени параметра
        // при наличии других расширений, добавляющих свои WHERE-условия.
        $param = $queryNameGenerator->generateParameterName('currentUser');

        $queryBuilder
            ->andWhere("$alias.owner = :$param")
            ->setParameter($param, $user);
    }
}
