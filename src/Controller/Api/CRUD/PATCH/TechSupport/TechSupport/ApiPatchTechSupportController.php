<?php

namespace App\Controller\Api\CRUD\PATCH\TechSupport\TechSupport;

use App\ApiResource\AppMessages;
use App\Controller\Api\CRUD\Abstract\AbstractApiPatchController;
use App\Dto\TechSupport\TechSupportPatchInput;
use App\Entity\TechSupport\TechSupport;
use App\Entity\Trait\Readable\G;
use App\Entity\User;
use App\Repository\TechSupport\TechSupportRepository;
use App\Service\Extra\LocalizationService;
use App\Service\Extra\MercurePublisher;
use Symfony\Component\HttpFoundation\JsonResponse;

class ApiPatchTechSupportController extends AbstractApiPatchController
{
    // Проставляется в applyStatusTransition() при успешной смене статуса,
    // читается в afterFetch() (после flush) — публикуем в Mercure только
    // когда статус реально поменялся, а не на любой PATCH (title/description
    // и т.п. правки полей не транслируются, только смена статуса).
    private bool $statusChanged = false;

    public function __construct(
        private readonly TechSupportRepository $techSupportRepository,
        private readonly LocalizationService   $localizationService,
        private readonly MercurePublisher      $publisher,
    ) {}

    protected function setSerializationGroups(): array { return G::OPS_TECH_SUPPORT_POST; }

    // 'double' (дефолт CLIENT/MASTER) исключал бы обычный ROLE_ADMIN ещё до
    // checkOwnership() ниже — а тот прямо рассчитан на то, что "любой
    // ROLE_ADMIN может работать с любым тикетом" (тот же баг класса, что
    // чинили в ApiPostTechSupportMessageController::getUserGrade()).
    protected function getUserGrade(): string { return 'triple'; }

    protected function getNotFoundError(): string { return AppMessages::TECH_SUPPORT_NOT_FOUND; }

    protected function getInputClass(): string { return TechSupportPatchInput::class; }

    protected function getEntityById(string $id): ?object
    {
        return $this->techSupportRepository->find($id);
    }

    protected function checkOwnership(object $entity, ?User $bearer): ?JsonResponse
    {
        /** @var TechSupport $entity */
        // Любой ROLE_ADMIN может работать с любым тикетом, не только со
        // "своим" назначенным — тот же паттерн, что в ApiGetTechSupportController.
        // ROLE_SUPER_ADMIN проходит автоматически (см. User::getRoles()).
        $isAdmin = in_array('ROLE_ADMIN', $bearer->getRoles(), true);

        if (!$isAdmin && $entity->getAuthor() !== $bearer && $entity->getAdministrant() !== $bearer)
            return $this->errorJson(AppMessages::EXTRA_DENIED);

        return null;
    }

    /**
     * Таблица переходов, доступных АВТОРУ самостоятельно (без админа).
     *
     * Формат: [текущий статус => [список статусов, куда автор может перевести сам]]
     *
     *   new/renewed/in_progress → closed  (автор сам закрывает тикет — вопрос
     *                                       решился без участия админа, или
     *                                       заявка больше не актуальна; не
     *                                       нужно ждать, пока админ переведёт
     *                                       её в resolved/closed вручную)
     *   resolved → renewed | closed       (автор либо не согласен с решением
     *                                       и переоткрывает, либо соглашается
     *                                       и закрывает сам)
     *   closed   → renewed                (тикет закрыли из-за отсутствия
     *                                       ответа/нерешённости — автор
     *                                       возвращается и продолжает с тем
     *                                       же тикетом, вместо того чтобы
     *                                       заводить новый с нуля)
     *
     * banned сюда намеренно не входит — тикет в этом статусе для автора
     * полностью заблокирован (см. STATUS_BANNED и блокировку в
     * ApiPostTechSupportMessageController), самостоятельный выход из него
     * автору не положен ни в каком направлении.
     *
     * ROLE_ADMIN (включая ROLE_SUPER_ADMIN — см. User::getRoles()) переводит
     * тикет в ЛЮБОЙ статус из ЛЮБОГО, без ограничений этой таблицы — это
     * полный оverride для модерации/исправления ошибок, в т.ч. разбан
     * (banned → что угодно). Раньше banned был терминальным даже для админа;
     * это ограничение снято намеренно — в остальных местах (сообщения, фото)
     * админ и так уже обходит блокировку banned, самому статусу тоже незачем
     * быть исключением.
     */
    private const array AUTHOR_TRANSITIONS = [
        'new'         => ['closed'],
        'renewed'     => ['closed'],
        'in_progress' => ['closed'],
        'resolved'    => ['renewed', 'closed'],
        'closed'      => ['renewed'],
    ];

    /**
     * Автор тикета может патчить статус (по правилам AUTHOR_TRANSITIONS ниже)
     * и, в пределах 24ч с момента создания, title/description/images — тот
     * же принцип, что у Review/ChatMessage/TechSupportMessage: можно
     * поправить формулировку сразу после создания, но не переписывать
     * содержание тикета спустя произвольное время.
     * Админ может то же title/description/images (тоже под 24ч — единое
     * ограничение вне зависимости от того, кто редактирует), плюс
     * reason/priority — без ограничения по времени, это модерация, а не
     * содержание тикета.
     */
    protected function applyChanges(object $entity, User $bearer, object $dto): ?JsonResponse
    {
        /** @var TechSupport $entity */
        /** @var TechSupportPatchInput $dto */
        $isAdmin  = in_array('ROLE_ADMIN', $bearer->getRoles(), true);
        $isAuthor = $entity->getAuthor() === $bearer;

        // Статус теперь необязателен в теле запроса — PATCH умеет менять
        // и другие поля отдельно от смены статуса.
        if ($dto->status !== null) {
            if ($error = $this->applyStatusTransition($entity, $bearer, $isAdmin, $dto->status)) {
                return $error;
            }
        }

        // 24ч с момента создания тикета — тот же хелпер и код ошибки, что у
        // Review/ChatMessage/TechSupportMessage (см.
        // AbstractApiHelperController::isPastEditWindow, дефолт '-24 hours').
        // Доступно и автору, и админу — reason/priority этим не ограничены
        // (см. ниже, только под $isAdmin).
        if ($isAdmin || $isAuthor) {
            // !== null, не !empty() — иначе явное "images": [] (удалить
            // последнее фото) неотличимо от "images вообще не прислали".
            if ($dto->title !== null || $dto->description !== null || $dto->images !== null) {
                if ($this->isPastEditWindow($entity->getCreatedAt()))
                    return $this->errorJson(AppMessages::EDIT_WINDOW_EXPIRED);

                if ($dto->title !== null)       $entity->setTitle($dto->title);
                if ($dto->description !== null) $entity->setDescription($dto->description);
                if ($dto->images !== null)      $this->syncImages($entity, $dto->images, $bearer);
            }
        }

        if ($isAdmin) {
            if ($dto->reason !== null && !in_array($dto->reason->getApplicableTo(), ['support', 'overall'], true)) {
                return $this->errorJson(AppMessages::WRONG_SUPPORT_REASON);
            }

            if ($dto->priority !== null) $entity->setPriority($dto->priority);
            if ($dto->reason !== null)   $entity->setReason($dto->reason);
        }

        return null;
    }

    private function applyStatusTransition(TechSupport $entity, User $bearer, bool $isAdmin, string $newStatus): ?JsonResponse
    {
        // Сначала проверяем, что новый статус вообще существует в системе.
        if (!in_array($newStatus, array_values(TechSupport::STATUSES), true))
            return $this->errorJson(AppMessages::WRONG_TECH_SUPPORT_STATUS);

        // Админ — без ограничений, любой статус из любого (см. AUTHOR_TRANSITIONS
        // выше). Это касается и разбана: banned → что угодно тоже разрешено.
        if ($isAdmin) {
            $entity->setStatus($newStatus);
            $this->statusChanged = true;
            return null;
        }

        // Автор — только узкий список самостоятельных переходов из AUTHOR_TRANSITIONS.
        $isAuthor = $entity->getAuthor() === $bearer;
        $allowed  = self::AUTHOR_TRANSITIONS[$entity->getStatus()] ?? [];

        if (!$isAuthor || !in_array($newStatus, $allowed, true))
            return $this->errorJson(AppMessages::EXTRA_DENIED);

        $entity->setStatus($newStatus);
        $this->statusChanged = true;

        return null;
    }

    protected function afterFetch(object|array $entity, ?User $user): void
    {
        /** @var TechSupport $entity */
        if ($entity->getAuthor()) $this->localizationService->localizeUser($entity->getAuthor(), $this->getLocale());
        if ($entity->getAdministrant()) $this->localizationService->localizeUser($entity->getAdministrant(), $this->getLocale());
        if ($entity->getReason()) $this->localizationService->localizeEntityFull($entity->getReason(), $this->getLocale());

        // Инстантное обновление статуса в чате ТП — тот же топик и тот же
        // MercurePublisher, что уже используется для новых сообщений
        // (см. TechSupportMessageListener), просто другой type события.
        // Фронту не нужно ничего переподключать — тот же подписанный SSE-канал.
        if ($this->statusChanged) {
            $this->publisher->publish("tech-support:{$entity->getId()}", 'updated', $entity, G::OPS_TECH_SUPPORT);
        }
    }
}
