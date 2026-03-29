<?php

namespace App\Controller\Api\CRUD\Abstract;

use Doctrine\ORM\Exception\ORMException;
use Doctrine\ORM\OptimisticLockException;
use Symfony\Component\HttpFoundation\JsonResponse;

/**
 * Шаблонный контроллер для DELETE-операций.
 *
 * Алгоритм зафиксирован в final __invoke:
 *   1. Аутентификация пользователя
 *   2. Поиск сущности через getEntityClass() по ID → 404 если не найдена
 *   3. Проверка прав (checkOwnership)
 *   4. Удаление и 204-ответ
 *
 * Подкласс переопределяет getEntityClass() и при необходимости checkOwnership().
 */
abstract class AbstractApiDeleteController extends AbstractApiHelperController
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

        return $this->removeAndRespond($entity);
    }
}
