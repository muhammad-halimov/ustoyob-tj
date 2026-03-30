<?php

namespace App\Controller\Api\CRUD\Abstract;

use App\ApiResource\AppMessages;
use App\Entity\User;
use Doctrine\ORM\QueryBuilder;
use Doctrine\ORM\Tools\Pagination\Paginator as DoctrinePaginator;
use Exception;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;

/**
 * Шаблонный контроллер для коллекционных GET-фильтров текущего пользователя.
 *
 * Алгоритм зафиксирован в final __invoke:
 *   1. Аутентификация пользователя
 *   2. Чтение page/itemsPerPage из запроса
 *   3. Загрузка QueryBuilder через fetchQuery(user) — null означает пустую коллекцию
 *   4. Применение пагинации через Doctrine Paginator (на уровне БД)
 *   5. Хук afterFetch (например, локализация) — по умолчанию no-op
 *   6. JSON-ответ в формате hydra:member + hydra:totalItems + hydra:view
 *
 * Подкласс обязан реализовать fetchQuery. Переопределяет setSerializationGroups()
 * при необходимости задать группы вручную.
 */
abstract class AbstractApiGetCollectionController extends AbstractApiHelperController
{
    /** @return QueryBuilder|null  null → пустая коллекция (нет подходящего запроса) */
    abstract protected function fetchQuery(User $user): ?QueryBuilder;

    /**
     * @throws Exception
     */
    final public function __invoke(Request $request): JsonResponse
    {
        $bearer = $this->checkedUser($this->getUserGrade(), $this->isActiveAndApprovedRequired());

        $page         = max(1, (int) ($request->query->get('page', 1)));
        $itemsPerPage = max(1, min(100, (int) ($request->query->get('itemsPerPage', 25))));

        $results = $this->buildPaginator($page, $itemsPerPage, $bearer);

        $this->afterFetch($results, $bearer);

        return $this->buildResponse($results);
    }

    /**
     * @throws Exception
     */
    private function buildPaginator(mixed $page, mixed $itemsPerPage, User $user): array|JsonResponse
    {
        $qb = $this->fetchQuery($user);

        if ($qb === null) return $this->errorJson(AppMessages::RESOURCE_NOT_FOUND);

        $offset = ($page - 1) * $itemsPerPage;

        $query     = $qb->setFirstResult($offset)->setMaxResults($itemsPerPage)->getQuery();
        $paginator = new DoctrinePaginator($query, false);
        $total     = count($paginator);

        if ($total === 0) return $this->errorJson(404);

        return iterator_to_array($paginator->getIterator());
    }
}
