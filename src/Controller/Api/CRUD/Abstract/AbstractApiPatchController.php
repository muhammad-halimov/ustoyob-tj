<?php

namespace App\Controller\Api\CRUD\Abstract;

use App\ApiResource\AppMessages;
use App\Entity\User;
use Doctrine\ORM\Exception\ORMException;
use Doctrine\ORM\OptimisticLockException;
use Symfony\Component\HttpFoundation\JsonResponse;
use Throwable;

/**
 * Шаблонный контроллер для PATCH-операций.
 *
 * Алгоритм зафиксирован в final __invoke:
 *   1. Аутентификация пользователя
 *   2. Десериализация тела запроса в DTO через getInputClass()
 *   3. Поиск сущности через findEntity() (inputDto доступен внутри findEntity)
 *   4. Проверка прав (checkOwnership)
 *   5. Применение изменений (applyChanges) → возможный ранний выход с ошибкой
 *   6. Flush
 *   7. Построение ответа через buildResponse()
 *
 * Подкласс обязан реализовать getInputClass() и applyChanges().
 * Остальное настраивается через getEntityClass(), checkOwnership(),
 * getSerializationGroups() или buildResponse() из AbstractApiController.
 */
abstract class AbstractApiPatchController extends AbstractApiHelperController
{
    protected ?object $inputDto = null;

    abstract protected function applyChanges(object $entity, User $bearer, object $dto): ?JsonResponse;

    /**
     * @throws OptimisticLockException
     * @throws ORMException
     */
    final public function __invoke(int $id): JsonResponse
    {
        $bearer = $this->checkedUser($this->getUserGrade());

        // Если экшн ожидает входные данные — десериализуем тело запроса
        try {
            // Берём тело запроса; если пустое — подставляем пустой JSON
            $raw = $this->requestStack->getCurrentRequest()->getContent() ?: '{}';
            $this->inputDto = $this->serializer->deserialize($raw, $this->getInputClass(), 'json');
        } catch (Throwable) {
            // Невалидный JSON или несоответствие структуры — возвращаем ошибку
            return $this->errorJson(AppMessages::INVALID_JSON);
        }

        $entity = $this->getEntityById($id);

        if (!$entity) return $this->errorJson($this->getNotFoundError());

        if ($error = $this->checkOwnership($entity, $bearer)) return $error;

        if ($error = $this->applyChanges($entity, $bearer, $this->inputDto)) return $error;

        $this->flush();

        $this->afterFetch($entity, $bearer);

        return $this->buildResponse($entity);
    }
}

