<?php

namespace App\Controller\Api\CRUD\Abstract;

use App\ApiResource\AppMessages;
use App\Entity\User;
use Symfony\Component\HttpFoundation\JsonResponse;

/**
 * Шаблонный контроллер для GET /me — текущий пользователь или его единственная связанная сущность.
 *
 * Алгоритм зафиксирован в final __invoke:
 *   1. Аутентификация пользователя (activeAndApproved управляется через isActiveAndApprovedRequired)
 *   2. Загрузка сущности через fetchSelf(user)
 *   3. Если null → 404 (код из getNotFoundError)
 *   4. Хук afterFetch — для пост-обработки (локализация и т.д.), по умолчанию no-op
 *   5. JSON-ответ через buildResponse
 *
 * Подкласс обязан объявить fetchSelf().
 * Переопределяет isActiveAndApprovedRequired() если аккаунт может быть неактивным.
 */
abstract class AbstractApiGetSelfController extends AbstractApiHelperController
{
    /** Загрузить целевую сущность для текущего пользователя. null → 404. */
    abstract protected function fetchSelf(User $user): object|array|null;

    final public function __invoke(): JsonResponse
    {
        $bearer = $this->checkedUser($this->getUserGrade(), $this->isActiveAndApprovedRequired());
        $entity = $this->fetchSelf($bearer);

        if ($entity === null) return $this->errorJson(AppMessages::RESOURCE_NOT_FOUND);

        $this->afterFetch($entity, $bearer);

        return $this->buildResponse($entity);
    }
}
