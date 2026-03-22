<?php

namespace App\Controller\Api\CRUD\Abstract;

use App\ApiResource\AppError;
use App\Entity\User;
use App\Service\Extra\AccessService;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\RequestStack;
use Symfony\Component\Security\Core\User\UserInterface;
use Symfony\Contracts\Service\Attribute\Required;

/**
 * Базовый контроллер для всех API-эндпоинтов.
 *
 * Предоставляет общие утилиты, чтобы дочерние контроллеры
 * не дублировали Security/EntityManager/AccessService инъекции и
 * типовые операции (errorJson, findOr404, persist/flush, removeAndRespond).
 *
 * Зависимости внедряются через setter-injection (#[Required]),
 * поэтому дочерним классам достаточно объявить свой конструктор
 * только для специфичных сервисов.
 */
abstract class AbstractApiController extends AbstractController
{
    protected Security               $security;
    protected AccessService          $accessService;
    protected EntityManagerInterface $entityManager;
    protected RequestStack           $requestStack;

    #[Required]
    public function setBaseDependencies(
        Security               $security,
        AccessService          $accessService,
        EntityManagerInterface $entityManager,
        RequestStack           $requestStack,
    ): void {
        $this->security      = $security;
        $this->accessService = $accessService;
        $this->entityManager = $entityManager;
        $this->requestStack  = $requestStack;
    }

    /**
     * Текущий пользователь из токена (может быть null).
     */
    protected function currentUser(): UserInterface|User
    {
        return $this->security->getUser();
    }

    /**
     * Текущий пользователь с проверкой аутентификации и роли.
     * Бросает исключение при неудаче — возвращает гарантированный User.
     */
    protected function checkedUser(string $grade = 'triple', bool $activeAndApproved = true): User
    {
        /** @var User|null $user */
        $user = $this->security->getUser();
        $this->accessService->check($user, $grade, $activeAndApproved);

        return $user;
    }

    /**
     * JSON-ответ с кодом и сообщением из AppError.
     */
    protected function errorJson(string $errorCode): JsonResponse
    {
        $error = AppError::get($errorCode);

        return $this->json(['code' => $error->code, 'message' => $error->message,], $error->http);
    }

    /**
     * Найти сущность или вернуть JsonResponse с ошибкой.
     *
     * Вызывающий код должен проверить: if ($result instanceof JsonResponse) return $result;
     */
    protected function findOr404(string $class, mixed $id, string $errorCode = AppError::RESOURCE_NOT_FOUND): object
    {
        return $this->entityManager->getRepository($class)->find($id) ?? $this->errorJson($errorCode);
    }

    /**
     * Возврат локали
     */
    protected function getLocale(): string
    {
        return $this->requestStack->getCurrentRequest()?->query->get('locale', 'tj') ?? 'tj';
    }

    /**
     * Возврат контента
     */
    protected function getContent(): mixed
    {
        return json_decode($this->requestStack->getCurrentRequest()?->getContent() ?? '{}', true);
    }

    /**
     * Persist одной или нескольких сущностей + flush.
     */
    protected function persist(object ...$entities): void
    {
        foreach ($entities as $entity) $this->entityManager->persist($entity);

        $this->entityManager->flush();
    }

    /**
     * Только flush (когда persist не нужен — Doctrine уже отслеживает сущность).
     */
    protected function flush(): void
    {
        $this->entityManager->flush();
    }

    /**
     * Удалить сущность и вернуть 204-ответ.
     */
    protected function removeAndRespond(object $entity): JsonResponse
    {
        $this->entityManager->remove($entity);
        $this->entityManager->flush();

        return $this->json(null, 204);
    }
}
