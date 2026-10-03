<?php

namespace App\Controller\Api\CRUD\Abstract;

use App\ApiResource\AppMessages;
use App\Dto\Image\ImageObjectInput;
use App\Entity\Contract\EditableMessageInterface;
use App\Entity\Contract\HasImagesInterface;
use App\Entity\Extra\EntityRevision;
use App\Entity\Extra\MultipleImage;
use App\Entity\User;
use App\Service\Extra\AccessService;
use App\Service\Extra\EntityDirectoryNamerService;
use DateTimeImmutable;
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
use Vich\UploaderBundle\Mapping\PropertyMapping;

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
    protected Security                  $security;
    protected AccessService             $accessService;
    protected EntityManagerInterface    $entityManager;
    protected RequestStack              $requestStack;
    protected SerializerInterface       $serializer;
    protected EntityDirectoryNamerService $directoryNamer;

    /**
     * Setter-injection базовых зависимостей.
     * Вызывается Symfony автоматически перед __invoke благодаря #[Required].
     * Дочерние контроллеры не обязаны объявлять эти зависимости в конструкторе.
     */
    #[Required]
    public function setBaseDependencies(
        Security                  $security,
        AccessService             $accessService,
        EntityManagerInterface    $entityManager,
        RequestStack              $requestStack,
        SerializerInterface       $serializer,
        EntityDirectoryNamerService $directoryNamer,
    ): void {
        $this->security       = $security;
        $this->accessService  = $accessService;
        $this->entityManager  = $entityManager;
        $this->requestStack   = $requestStack;
        $this->serializer     = $serializer;
        $this->directoryNamer = $directoryNamer;
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
    protected function getEntityById(string $id): ?object
    {
        return $this->entityManager->find($this->getEntityClass(), $id) ?: null;
    }

    /** Хук для пост-обработки (локализация и т.д.). По умолчанию — no-op. */
    protected function afterFetch(object|array $entity, ?User $user): void {}

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
    protected function checkedUser(string $grade = 'triple', bool $activeAndApproved = true): ?User
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
    protected function checkOwnership(object $entity, ?User $bearer): ?JsonResponse { return null; }

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
     * Заголовок запроса.
     *
     * @param ?string $key ключ заголовка
     */
    protected function getHeader(?string $key): string|null
    {
        return $this->requestStack->getCurrentRequest()->headers->get($key);
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

    /**
     * Грубая эвристика "это правка или фактически переписывание текста
     * заново" — используется PATCH-контроллерами Review/ChatMessage/
     * TechSupportMessage, чтобы отличить реальную правку (опечатка,
     * уточнение) от полной замены текста на другой, что обесценивало бы
     * лимит на редактирование ниже — иначе можно было бы просто стереть
     * старое содержимое и вписать что угодно новое в рамках "правки".
     *
     * similar_text() — совпадение в процентах между $old и $new. Ниже
     * порога — считаем "слишком другое", вызывающий код должен отклонить
     * (AppMessages::EDIT_TOO_DIFFERENT). $new === '' (например, стирают
     * текст, оставляя только фото) — НЕ считается "слишком другим": это не
     * переписывание, а прицельное удаление текста.
     */
    protected function isEditTooDifferent(?string $old, string $new, float $minSimilarityPercent = 50.0): bool
    {
        if ($old === null || $old === '' || $new === '') return false;

        similar_text($old, $new, $percent);

        return $percent < $minSimilarityPercent;
    }

    /**
     * "Старше $window с создания" — один и тот же хелпер для Review/
     * ChatMessage/TechSupportMessage, раньше был скопирован в каждый
     * PATCH-контроллер по отдельности (`new DateTimeImmutable('-24 hours')`
     * инлайном/своей константой в каждом) — теперь одно место. У Review
     * и у "сообщений" разная ДЛИНА окна (см. MESSAGE_EDIT_WINDOW ниже), но
     * это разные значения одного и того же параметра, а не разная логика.
     */
    protected function isPastEditWindow(DateTimeImmutable $createdAt, string $window = '-24 hours'): bool
    {
        return $createdAt < new DateTimeImmutable($window);
    }

    /**
     * Окно редактирования ChatMessage/TechSupportMessage — короче, чем у
     * Review (24ч, дефолт isPastEditWindow() выше): переписка — это быстрый
     * обмен репликами, опечатку правят сразу же, а не через полдня. Общее
     * для обоих, чтобы не разъезжались по разным контроллерам.
     */
    protected const string MESSAGE_EDIT_WINDOW = '-15 minutes';

    /**
     * Мягкое удаление сообщения (ChatMessage, TechSupportMessage) —
     * description заменяется на переведённый плейсхолдер (текст берётся из
     * AppMessages::MESSAGE_DELETED_PLACEHOLDER — один реестр статических
     * текстов на всё приложение, не отдельная константа тут), ставится
     * $deletedByAuthor, фото убираются (с логом в audit trail, как любое
     * другое удаление фото). Физически строка в БД не пропадает —
     * дальнейшая правка description проходит через тот же preUpdate/
     * postUpdate у соответствующего листенера, что и обычный PATCH, поэтому
     * сама подмена автоматически попадает в EntityRevision без отдельного
     * лога здесь.
     *
     * Локаль под плейсхолдер — СВОЯ (дефолт 'eng'), не через общий дефолт
     * AppMessages ('tj', см. AppErrorLocaleListener): тот годится для текста
     * ОТВЕТА, но не для того, что навсегда пишется в БД — если язык явно не
     * запрошен ?locale=, в базу не должен молча лечь язык, который никто не
     * выбирал.
     *
     * Идемпотентно: повторный вызов на уже удалённом сообщении — no-op
     * (проверка живёт здесь, а не в каждом вызывающем контроллере).
     */
    protected function softDeleteMessage(EditableMessageInterface $message, User $bearer): void
    {
        if ($message->isDeletedByAuthor()) return;

        foreach ($message->getImages()->toArray() as $image) {
            $this->logImagesDeletion([$image], $message, $bearer);
            $message->getImages()->removeElement($image);
            $this->entityManager->remove($image);
        }

        $locale = $this->requestStack->getCurrentRequest()?->query->get('locale');
        $locale = in_array($locale, ['tj', 'eng', 'ru'], true) ? $locale : 'eng';

        $message->setDescription(AppMessages::get(AppMessages::MESSAGE_DELETED_PLACEHOLDER, $locale)->message);
        $message->setDeletedByAuthor(true);
        $message->setUpdatedAt();
    }

    /**
     * DELETE сообщения (ChatMessage/TechSupportMessage). Пустое сообщение — без
     * текста и без фото — удаляется физически: так бывает, когда фото к нему не
     * загрузились (двухшаговая отправка, см. wouldLeaveMessageEmpty), и клиент
     * убирает за собой. «Мягко» удалять в нём нечего, а плейсхолдер «Сообщение
     * удалено» остался бы в переписке мусором у обеих сторон. Остальные —
     * мягкое удаление (softDeleteMessage).
     */
    protected function deleteMessage(EditableMessageInterface $message, User $bearer): void
    {
        $isEmpty = !$message->isDeletedByAuthor()
            && trim((string) $message->getDescription()) === ''
            && $message->getImages()->isEmpty();

        if ($isEmpty) {
            $this->entityManager->remove($message);
            return;
        }

        $this->softDeleteMessage($message, $bearer);
    }

    /**
     * Останется ли сообщение без текста И без фото после PATCH — используют
     * ChatMessage/TechSupportMessage, чтобы не дать отредактировать
     * сообщение в полностью пустое состояние (см. AppMessages::MESSAGE_EMPTY).
     *
     * Специально только PATCH, не POST: на создании пустой текст обязан
     * проходить — фото прикрепляется ОТДЕЛЬНЫМ запросом уже ПОСЛЕ создания
     * (см. handle() у ApiPost{Chat,TechSupport}MessageController), сущности
     * с фото ещё не существует в момент самого POST. Закрыть эту дыру на
     * уровне POST нельзя, не сломав двухшаговую отправку "фото без текста".
     *
     * @param string|null        $newText   $dto->description (null = не трогали)
     * @param ImageObjectInput[]|null $newImages $dto->images (null = не трогали)
     */
    protected function wouldLeaveMessageEmpty(EditableMessageInterface $message, ?string $newText, ?array $newImages): bool
    {
        $resultingText = $newText ?? $message->getDescription();
        if (trim((string) $resultingText) !== '') return false;

        $hasImages = $newImages !== null
            ? (bool) array_filter($newImages, fn(object $item) => !empty($item->image ?? null))
            : !$message->getImages()->isEmpty();

        return !$hasImages;
    }

    /**
     * Синхронизирует коллекцию изображений сущности с входящим массивом.
     * Удаляет изображения не вошедшие в список, обновляет приоритеты существующих,
     * добавляет новые. Порядок элементов в массиве определяет priority.
     *
     * @param HasImagesInterface $entity      Сущность реализующая HasImagesInterface
     * @param array              $imagesParam Массив объектов с публичным свойством ->image
     * @param User               $bearer      Автор для новых изображений
     */
    protected function syncImages(HasImagesInterface $entity, array $imagesParam, User $bearer): void
    {
        $incomingNames = array_filter(array_map(
            fn(object $item): ?string => isset($item->image) ? (string) $item->image : null,
            $imagesParam
        ));

        // Собираем все удаляемые за этот вызов фото в один массив — если PATCH
        // убирает несколько фото сразу, это ОДНА запись EntityRevision со
        // списком, а не по записи на каждое (см. logImagesDeletion()).
        // Логируем ДО removeImage(): она обнуляет обратную связь на самом
        // MultipleImage (см. Ticket::removeImage() — $image->setTicket(null)
        // и аналоги), а buildImagePath() внутри logImagesDeletion() как раз
        // читает эту связь, чтобы определить папку — после removeImage() она
        // уже пуста, путь ушёл бы в "misc" вместо настоящей директории.
        $removedImages = [];
        foreach ($entity->getImages()->toArray() as $existing) {
            if (!in_array($existing->getImage(), $incomingNames, true)) {
                $removedImages[] = $existing;
            }
        }
        $this->logImagesDeletion($removedImages, $entity, $bearer);

        foreach ($removedImages as $existing) {
            // НЕ $entity->removeImage($existing) — тот домен-метод ещё и
            // обнуляет обратную связь ($existing->setTicket(null) и т.п.),
            // а VichUploaderBundle сам читает её в СВОЁМ preRemove-листенере,
            // чтобы понять, из какой папки физически удалить файл (та же
            // EntityDirectoryNamerService, что и у buildImagePath() выше).
            // Обнули её раньше времени — Vich так же попадёт на "misc" и
            // ничего не удалит с диска, файл осиротеет. Просто убираем
            // элемент из коллекции (нужно только чтобы дальнейшие циклы
            // ниже — existingByName/добавление новых — не видели удаляемое
            // фото), связь остаётся нетронутой до самого DELETE в БД.
            $entity->getImages()->removeElement($existing);
            $this->entityManager->remove($existing);
        }

        $existingByName = [];
        foreach ($entity->getImages() as $existing) {
            if ($existing->getImage()) {
                $existingByName[$existing->getImage()] = $existing;
            }
        }

        foreach ($imagesParam as $position => $imageData) {
            $imagePath = isset($imageData->image) ? (string) $imageData->image : null;
            if (!$imagePath) continue;

            if (isset($existingByName[$imagePath])) {
                $existingByName[$imagePath]->setPriority($position);
            } else {
                $newImage = (new MultipleImage())
                    ->setImage($imagePath)
                    ->setPriority($position)
                    ->setAuthor($bearer);
                $entity->addImage($newImage);
                $this->entityManager->persist($newImage);
            }
        }
    }

    /**
     * Lог удаления фото (audit trail, см. EntityRevision) — единая точка
     * для ВСЕХ сущностей с изображениями: как для syncImages() (удаление —
     * побочный эффект PATCH владельца, возможно сразу нескольких фото), так
     * и для ApiDeleteMultipleImageController (прямое админское удаление
     * одного фото — вызывается с массивом из одного элемента). Один
     * EntityRevision на весь $images — если удалили 3 фото за один запрос,
     * это одна запись со списком из 3, а не 3 отдельные записи. Фото не
     * редактируется, только удаляется, поэтому action всегда ACTION_DELETED,
     * а не снимок "было/стало" как у текстовых сущностей.
     *
     * protected (не private): нужен из ApiDeleteMultipleImageController,
     * который лежит в другом неймспейсе.
     *
     * @param MultipleImage[] $images
     */
    protected function logImagesDeletion(array $images, HasImagesInterface $parent, User $bearer): void
    {
        if (!$images) return;

        $parentId = method_exists($parent, 'getId') ? $parent->getId() : null;

        $revision = (new EntityRevision())
            ->setEntityType('multiple_image')
            // Единого ID на несколько удалённых фото не бывает — берём
            // первое, полный список (с полными путями) — в $snapshot ниже.
            ->setEntityId($images[0]->getId())
            ->setParentId($parentId)
            ->setEntity((new \ReflectionClass($parent))->getShortName())
            ->setAction(EntityRevision::ACTION_DELETED)
            ->setSnapshot([
                'images' => array_map(
                    fn(MultipleImage $image) => ['image' => $this->buildImagePath($image, $parent)],
                    $images
                ),
            ])
            ->setActor($bearer);

        $this->entityManager->persist($revision);
    }

    /**
     * Определяет, какой сущности принадлежит фото — у MultipleImage связи с
     * владельцами опциональны и взаимоисключающи (заполнена ровно одна, см.
     * докблок класса), поэтому просто берём первую непустую. Нужен
     * ApiDeleteMultipleImageController — там, в отличие от syncImages(),
     * владелец заранее неизвестен (удаляют по ID самого фото, а не через
     * PATCH владельца).
     */
    protected function resolveImageParent(MultipleImage $image): ?HasImagesInterface
    {
        return $image->getTicket()
            ?? $image->getReview()
            ?? $image->getChatMessage()
            ?? $image->getTechSupportMessage()
            ?? $image->getTechSupport()
            ?? $image->getGallery()
            ?? $image->getAppeal();
    }

    /**
     * Полный путь до файла фото (не просто имя) — тот же
     * uri_prefix/директория, что реально отдаёт Vich (см.
     * config/packages/vich_uploader.yaml и EntityDirectoryNamerService,
     * которую переиспользуем напрямую, а не дублируем её match(...) здесь
     * третий раз). PropertyMapping тут — формальность: сигнатура
     * DirectoryNamerInterface требует его, но сама реализация
     * directoryName() его не читает, поэтому значения полей не важны.
     */
    private function buildImagePath(MultipleImage $image, HasImagesInterface $parent): string
    {
        $directory = $this->directoryNamer->directoryName($image, new PropertyMapping('imageFile', 'image'));

        return "/uploads/{$directory}/{$image->getImage()}";
    }
}
