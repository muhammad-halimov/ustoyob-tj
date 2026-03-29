<?php

namespace App\Controller\Api\CRUD\Abstract;

use App\ApiResource\AppMessages;
use App\Entity\User;
use App\Service\Extra\AccessService;
use Doctrine\ORM\EntityManagerInterface;
use Doctrine\ORM\Exception\ORMException;
use Doctrine\ORM\OptimisticLockException;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\RequestStack;
use Symfony\Component\Security\Core\User\UserInterface;
use Symfony\Component\Serializer\SerializerInterface;
use Symfony\Contracts\Service\Attribute\Required;

/**
 * Базовый контроллер для всех API-эндпоинтов.
 *
 * Предоставляет общие утилиты, чтобы дочерние контроллеры
 * не дублировали Security/EntityManager/AccessService инъекции и
 * типовые операции (errorJson, persist/flush, removeAndRespond).
 *
 * Зависимости внедряются через setter-injection (#[Required]),
 * поэтому дочерним классам достаточно объявить свой конструктор
 * только для специфичных сервисов — без super-конструктора.
 *
 * Паттерн использования в дочернем контроллере:
 *
 *   class MyController extends AbstractApiController
 *   {
 *       public function __construct(private readonly MyService $myService) {}
 *
 *       public function __invoke(): JsonResponse
 *       {
 *           $user = $this->checkedUser();
 *           ...
 *       }
 *   }
 */
abstract class AbstractApiHelperController extends AbstractController
{
    protected Security               $security;
    protected AccessService          $accessService;
    protected EntityManagerInterface $entityManager;
    protected RequestStack           $requestStack;
    protected SerializerInterface    $serializer;

    /**
     * Setter-injection базовых зависимостей.
     * Вызывается Symfony автоматически перед __invoke благодаря #[Required].
     * Дочерние контроллеры не обязаны объявлять эти зависимости в конструкторе.
     */
    #[Required]
    public function setBaseDependencies(
        Security               $security,
        AccessService          $accessService,
        EntityManagerInterface $entityManager,
        RequestStack           $requestStack,
        SerializerInterface    $serializer
    ): void {
        $this->security      = $security;
        $this->accessService = $accessService;
        $this->entityManager = $entityManager;
        $this->requestStack  = $requestStack;
        $this->serializer    = $serializer;
    }

    /**
     * DTO-класс входных данных для операции.
     * Переопределяется в дочернем контроллере если нужна валидация входа.
     */
    protected function getInputClass(): ?string { return null; }

    /**
     * FQCN сущности с которой работает контроллер.
     * Используется в getEntityById() для поиска через EntityManager.
     * Переопределяется в дочернем контроллере.
     */
    protected function getEntityClass(): string { return ''; }

    /**
     * Группы сериализации для ответа.
     * Переопределяется в дочернем контроллере через setSerializationGroups().
     */
    protected function setSerializationGroups(): array { return []; }

    /**
     * Формирует контекст сериализации с группами и опцией skip_null_values.
     * Передаётся в $this->json(..., context: ...).
     */
    protected function getSerializationGroups(bool $skipNullValues = false): array
    {
        return ['groups' => $this->setSerializationGroups(), 'skip_null_values' => $skipNullValues];
    }

    /**
     * Найти сущность по ID через EntityManager.
     * Класс сущности берётся из getEntityClass().
     *
     * @throws OptimisticLockException
     * @throws ORMException
     */
    protected function getEntityById(int $id): ?object
    {
        return $this->entityManager->find($this->getEntityClass(), $id) ?: null;
    }

    /** Хук для пост-обработки (локализация и т.д.). По умолчанию — no-op. */
    protected function afterFetch(object|array $entity, User $user): void {}

    /**
     * Сформировать стандартный JSON-ответ для сущности или коллекции.
     * Использует группы из getSerializationGroups().
     */
    protected function buildResponse(object|array $entity): JsonResponse
    {
        return $this->json($entity, context: $this->getSerializationGroups());
    }

    /**
     * Код ошибки по умолчанию для 404-ответов.
     * Переопределяется в дочернем контроллере при необходимости.
     */
    protected function getNotFoundError(): string { return AppMessages::RESOURCE_NOT_FOUND; }

    /**
     * Текущий пользователь из JWT-токена.
     * Может вернуть null если запрос анонимный — используй checkedUser() для защищённых эндпоинтов.
     */
    protected function getCurrentUser(): UserInterface|User { return $this->security->getUser(); }

    /**
     * Текущий пользователь с проверкой аутентификации, роли и статуса аккаунта.
     *
     * @param string $grade           Уровень проверки ('single' | 'double' | 'triple')
     * @param bool   $activeAndApproved  Проверять ли что аккаунт активен и подтверждён
     *
     * Бросает исключение (→ 401/403) при неудаче.
     * При успехе возвращает гарантированный User без null.
     */
    protected function checkedUser(string $grade = 'triple', bool $activeAndApproved = true): User
    {
        /** @var User|null $user */
        $user = $this->security->getUser();
        $this->accessService->check($user, $grade, $activeAndApproved);

        return $user;
    }

    /**
     * Уровень проверки пользователя по умолчанию.
     * Переопределяется в дочернем контроллере при необходимости.
     */
    protected function getUserGrade(): string { return 'double'; }

    /** Требовать ли активированный и подтверждённый аккаунт. */
    protected function isActiveAndApprovedRequired(): bool { return true; }

    /**
     * Проверка владения сущностью текущим пользователем.
     * Переопределяется в дочернем контроллере — возвращает JsonResponse с ошибкой
     * если пользователь не является владельцем, или null если проверка прошла.
     *
     * Пример использования:
     *   $ownershipError = $this->checkOwnership($entity, $user);
     *   if ($ownershipError) return $ownershipError;
     */
    protected function checkOwnership(object $entity, User $bearer): ?JsonResponse { return null; }

    /**
     * JSON-ответ с кодом и HTTP-статусом из AppError.
     * Используется для единообразной обработки ошибок во всех контроллерах.
     */
    protected function errorJson(string $errorCode): JsonResponse
    {
        $error = AppMessages::get($errorCode);

        return $this->json(['code' => $error->code, 'message' => $error->message,], $error->http);
    }

    /**
     * Текущая локаль из query-параметра ?locale=.
     * По умолчанию 'tj' если параметр не передан.
     */
    protected function getLocale(): string
    {
        return $this->requestStack->getCurrentRequest()?->query->get('locale', 'tj') ?? 'tj';
    }

    /**
     * Тело запроса декодированное из JSON.
     * Возвращает пустой массив если тело отсутствует или невалидно.
     */
    protected function getContent(): mixed
    {
        return json_decode($this->requestStack->getCurrentRequest()?->getContent() ?? '{}', true);
    }

    /**
     * Тело запроса декодированное из JSON.
     * Возвращает пустой массив если тело отсутствует или невалидно.
     */
    protected function getPath(): string
    {
        return $this->requestStack->getCurrentRequest()->getPathInfo();
    }

    /**
     * Загруженный файл из multipart/form-data запроса.
     *
     * @param string $key  Имя поля формы (по умолчанию 'imageFile')
     */
    protected function getFile(string $key = 'imageFile'): mixed
    {
        return $this->requestStack->getCurrentRequest()->files->get($key);
    }

    /**
     * Атрибут текущего запроса из bag'а атрибутов Symfony.
     * Используется для получения API Platform мета-данных:
     *   _api_resource_class, _api_normalization_context, _api_operation_name и т.д.
     */
    protected function getAttribute(string $attribute, mixed $default = null): mixed
    {
        return $this->requestStack->getCurrentRequest()->attributes->get($attribute, $default);
    }

    /**
     * Persist одной или нескольких сущностей и flush в одной транзакции.
     * Используется когда сущность новая и ещё не отслеживается Doctrine.
     */
    protected function persist(object ...$entities): void
    {
        foreach ($entities as $entity) $this->entityManager->persist($entity);

        $this->entityManager->flush();
    }

    /**
     * Только flush без persist.
     * Используется когда сущность уже отслеживается Unit of Work
     * (получена через find/query) — persist в таком случае избыточен.
     */
    protected function flush(): void { $this->entityManager->flush(); }

    /**
     * Удалить сущность и вернуть 204 No Content.
     * Стандартный ответ для DELETE-операций в REST API.
     */
    protected function removeAndRespond(object $entity): JsonResponse
    {
        $this->entityManager->remove($entity);
        $this->entityManager->flush();

        return $this->json(null, 204);
    }
}
