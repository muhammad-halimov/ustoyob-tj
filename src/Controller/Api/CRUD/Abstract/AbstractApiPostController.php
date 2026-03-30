<?php

namespace App\Controller\Api\CRUD\Abstract;

use App\ApiResource\AppMessages;
use App\Entity\User;
use stdClass;
use Symfony\Component\HttpFoundation\JsonResponse;
use Throwable;

/**
 * Шаблонный контроллер для POST-операций (создание сущности).
 *
 * Алгоритм зафиксирован в final __invoke:
 *   1. Аутентификация пользователя
 *   2. Десериализация тела запроса в DTO через getInputClass()
 *   3. Обработка/создание сущности через handle() → ранний выход если JsonResponse
 *   4. Persist
 *   5. Построение ответа через buildResponse() (по умолчанию 201)
 *
 * Подкласс обязан реализовать getInputClass() и handle().
 * Для нестандартного ответа — переопределить buildResponse() или getSerializationGroups().
 * Для нестандартного уровня аутентификации — переопределить getUserGrade().
 */
abstract class AbstractApiPostController extends AbstractApiHelperController
{
    /**
     * Создать сущность и вернуть её (будет persist + buildResponse),
     * либо вернуть JsonResponse для раннего выхода с ошибкой.
     */
    abstract protected function handle(User $bearer, object $dto): object;

    final public function __invoke(): JsonResponse
    {
        $bearer = $this->checkedUser($this->getUserGrade(), $this->isActiveAndApprovedRequired());

        $dto = new stdClass();

        // Если экшн ожидает входные данные — десериализуем тело запроса
        if ($inputClass = $this->getInputClass())
            try {
                // Берём тело запроса; если пустое — подставляем пустой JSON
                $raw = $this->requestStack->getCurrentRequest()->getContent() ?: '{}';
                $dto = $this->serializer->deserialize($raw, $inputClass, 'json');
            } catch (Throwable) {
                // Невалидный JSON или несоответствие структуры — возвращаем ошибку
                return $this->errorJson(AppMessages::INVALID_JSON);
            }

        $result = $this->handle($bearer, $dto);

        // Если handle вернул готовый ответ (например, ошибку) — отдаём как есть
        if ($result instanceof JsonResponse) return $result;

        $this->persist($result);

        $this->afterFetch($result, $bearer);

        return $this->buildResponse($result);
    }
}
