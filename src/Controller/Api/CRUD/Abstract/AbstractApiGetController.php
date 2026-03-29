<?php

namespace App\Controller\Api\CRUD\Abstract;

use Doctrine\ORM\Exception\ORMException;
use Doctrine\ORM\OptimisticLockException;
use Symfony\Component\HttpFoundation\JsonResponse;

/**
 * Шаблонный контроллер для GET-операций над одной сущностью.
 *
 * Алгоритм зафиксирован в final __invoke:
 *   1. Аутентификация пользователя
 *   2. Поиск сущности через findEntity() (по умолчанию — через getEntityClass())
 *   3. Проверка прав (checkOwnership)
 *   4. Построение ответа через buildResponse()
 *
 * Подкласс переопределяет нужные методы из AbstractApiController:
 *   getEntityClass(), checkOwnership(), buildResponse() / getSerializationGroups().
 */
abstract class AbstractApiGetController extends AbstractApiHelperController
{
    /**
     * @throws OptimisticLockException
     * @throws ORMException
     */
    final public function __invoke(int $id): JsonResponse
    {
        $bearer = $this->checkedUser($this->getUserGrade());
        $entity = $this->getEntityById($id);

        if (!$entity) return $this->errorJson($this->getNotFoundError());

        if ($error = $this->checkOwnership($entity, $bearer)) return $error;

        return $this->buildResponse($entity);
    }
}
