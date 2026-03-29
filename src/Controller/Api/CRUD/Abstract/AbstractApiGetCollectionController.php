<?php

namespace App\Controller\Api\CRUD\Abstract;

use App\Entity\User;
use Doctrine\ORM\QueryBuilder;
use Doctrine\ORM\Tools\Pagination\Paginator as DoctrinePaginator;
use Exception;
use Symfony\Component\HttpFoundation\JsonResponse;

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
    final public function __invoke(): JsonResponse
    {
        $bearer  = $this->checkedUser($this->getUserGrade());
        $request = $this->requestStack->getCurrentRequest();

        $page         = max(1, (int) ($request->query->get('page', 1)));
        $itemsPerPage = max(1, min(100, (int) ($request->query->get('itemsPerPage', 25))));

        $qb = $this->fetchQuery($bearer);

        if ($qb === null) return $this->errorJson($this->getNotFoundError());

        $offset = ($page - 1) * $itemsPerPage;

        $query     = $qb->setFirstResult($offset)->setMaxResults($itemsPerPage)->getQuery();
        $paginator = new DoctrinePaginator($query, false);
        $total     = count($paginator);

        if ($total === 0) return $this->errorJson($this->getNotFoundError());

        $results = iterator_to_array($paginator->getIterator());

        $this->afterFetch($results, $bearer);

        return $this->buildHydraResponse($results, $total, $page, $itemsPerPage);
    }

    private function buildHydraResponse(array $results, int $total, int $page, int $itemsPerPage): JsonResponse
    {
        $path       = $this->getPath();
        $totalPages = max(1, (int) ceil($total / $itemsPerPage));

        $view = [
            '@type'       => 'hydra:PartialCollectionView',
            'hydra:first' => $path . '?page=1',
            'hydra:last'  => $path . '?page=' . $totalPages,
        ];

        if ($page > 1)           $view['hydra:previous'] = $path . '?page=' . ($page - 1);
        if ($page < $totalPages) $view['hydra:next']     = $path . '?page=' . ($page + 1);

        return $this->buildResponse(['hydra:member' => $results, 'hydra:totalItems' => $total, 'hydra:view' => $view]);
    }
}
