<?php

namespace App\Controller\Api\CRUD\POST\Image\Image;

use App\ApiResource\AppMessages;
use App\Controller\Api\CRUD\Abstract\AbstractApiHelperController;
use App\Entity\Appeal\Appeal\Appeal;
use App\Entity\Chat\ChatMessage;
use App\Entity\Extra\MultipleImage;
use App\Entity\Gallery\Gallery;
use App\Entity\Review\Review;
use App\Entity\TechSupport\TechSupport;
use App\Entity\TechSupport\TechSupportMessage;
use App\Entity\Ticket\Ticket;
use App\Entity\Trait\Readable\G;
use App\Entity\User;
use App\Service\Extra\LocalizationService;
use App\Service\Notification\Push\PushNotifier;
use Doctrine\ORM\Exception\ORMException;
use Doctrine\ORM\OptimisticLockException;
use Symfony\Component\HttpFoundation\File\UploadedFile;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;

class ApiPostUniversalImageController extends AbstractApiHelperController
{
    public function __construct(
        private readonly LocalizationService $localizationService,
        private readonly PushNotifier        $pushNotifier,
    ) {}

    protected function setSerializationGroups(): array {
        return [
            G::GALLERIES,
            G::CHAT_MESSAGES,
            G::TECH_SUPPORT_MESSAGES,
            G::REVIEWS,
            G::APPEAL,
            G::MASTER_TICKETS,
            G::TICKET_IMAGES,
            G::CLIENT_TICKETS,
            G::USER_PUBLIC,
            G::USERS_ME,
            G::MASTERS,
            G::CLIENTS,
            G::APPEAL_REASON,
        ];
    }

    protected function afterFetch(array|object $entity, ?User $user): void
    {
        $this->localizationService->localizeUser(match (true) {
            $entity instanceof Gallery            => $entity->getUser(),
            $entity instanceof User               => $entity,
            $entity instanceof Review             => $entity->getClient() ?? $entity->getMaster(),
            $entity instanceof TechSupportMessage => $entity->getAuthor() ?? $entity->getTechSupport()?->getAdministrant(),
            $entity instanceof TechSupport        => $entity->getAuthor() ?? $entity->getAdministrant(),
            $entity instanceof ChatMessage        => $entity->getAuthor() ?? $entity->getChat()?->getReplyAuthor(),
            $entity instanceof Ticket             => $entity->getAuthor() ?? $entity->getMaster(),
            $entity instanceof Appeal             => $entity->getAuthor(),
            default                               => $user,
        }, $this->getLocale());
    }

    /**
     * @throws OptimisticLockException
     * @throws ORMException
     */
    public function __invoke(string $id, Request $request): JsonResponse
    {
        $entity = $this->entityManager->find($this->getAttribute('_api_resource_class'), $id);

        if (!$entity)
            return $this->errorJson(AppMessages::RESOURCE_NOT_FOUND);

        // Проверку типа сущности делаем ДО обязательной авторизации:
        // для TechSupport разрешён анонимный доступ (email/токен в форме),
        // для всех остальных сущностей — обязательна полноценная авторизация.
        if ($entity instanceof TechSupport) {
            $bearerUser = $this->checkedUser(grade: 'anonymous');
        } else {
            $bearerUser = $this->checkedUser('double');
        }

        $ownershipCheck = $this->checkOwnership($entity, $bearerUser);

        if ($ownershipCheck !== null)
            return $ownershipCheck;

        $additionalCheck = $this->performAdditionalChecks($entity, $bearerUser);

        if ($additionalCheck !== null)
            return $additionalCheck;

        $imageFiles = $this->getFile();

        if (!$imageFiles)
            return $this->errorJson(AppMessages::NO_FILES_PROVIDED);

        $imageFiles = is_array($imageFiles) ? $imageFiles : [$imageFiles];

        // Сообщение чата только с фото создаётся пустым (push по нему не ушёл, см. PushNotifier) —
        // уведомление о нём шлём, когда к нему прикрепились первые фото.
        $photoOnlyMessage = $entity instanceof ChatMessage
            && trim((string) $entity->getDescription()) === ''
            && $entity->getImages()->isEmpty();

        foreach ($imageFiles as $imageFile)
            if ($imageFile instanceof UploadedFile && $imageFile->isValid())
                $this->processImageFile($entity, $imageFile, $bearerUser);

        $this->flush();

        if ($photoOnlyMessage && !$entity->getImages()->isEmpty())
            $this->pushNotifier->chatMessage($entity);

        $this->afterFetch($entity, $bearerUser);

        return $this->buildResponse($entity);
    }

    protected function checkOwnership(object $entity, ?User $bearer): ?JsonResponse
    {
        if ($entity instanceof ChatMessage) {
            $chat = $entity->getChat();

            if (!$chat)
                return $this->errorJson(AppMessages::CHAT_NOT_FOUND);

            $allowed = $chat->getAuthor() === $bearer || $chat->getReplyAuthor() === $bearer;
        } elseif ($entity instanceof Appeal) {
            $author = $entity->getAuthor();

            $allowed = $author === null
                ? $entity->getRespondent() === $bearer
                : $author === $bearer || $entity->getRespondent() === $bearer;
        } elseif ($entity instanceof TechSupport && !$bearer) {
            if ($entity->getAuthor() !== null || $entity->getGuestAccessToken() === null) {
                return $this->errorJson(AppMessages::OWNERSHIP_MISMATCH);
            }

            $providedToken = $this->getHeader('X-Guest-Access-Token');

            if ($providedToken === null) {
                return $this->errorJson(AppMessages::AUTHENTICATION_REQUIRED);
            }

            $allowed = hash_equals($entity->getGuestAccessToken(), $providedToken);
            return $allowed ? null : $this->errorJson(AppMessages::OWNERSHIP_MISMATCH);
        } else {
            $parties = match (true) {
                $entity instanceof Gallery            => [$entity->getUser()],
                $entity instanceof User               => [$entity],
                $entity instanceof Review             => [$entity->getClient(), $entity->getMaster()],
                $entity instanceof TechSupportMessage => [$entity->getAuthor(), $entity->getTechSupport()?->getAdministrant()],
                $entity instanceof TechSupport        => [$entity->getAuthor(), $entity->getAdministrant()],
                $entity instanceof Ticket             => [$entity->getAuthor(), $entity->getMaster()],
                default                               => [],
            };
            $allowed = in_array($bearer, $parties, true);
        }

        return $allowed ? null : $this->errorJson(AppMessages::OWNERSHIP_MISMATCH);
    }

    /**
     * Дополнительные проверки после ownership, специфичные для конкретной сущности:
     *   - ChatMessage: проверка чёрного списка.
     *   - TechSupport/TechSupportMessage: заблокированный тикет (STATUS_BANNED)
     *     доступен для загрузки фото только админу — автор/гость больше не может
     *     взаимодействовать (см. тот же STATUS_BANNED-паттерн в
     *     ApiPostTechSupportMessageController).
     *   - Ticket: тот же принцип через Ticket::banned (bool) — единая точка
     *     блокировки для обоих типов "забаненных" сущностей.
     */
    private function performAdditionalChecks(object $entity, ?User $bearer): ?JsonResponse
    {
        if ($entity instanceof ChatMessage) {
            $chat = $entity->getChat();

            // Асимметрично: проверяем именно того, кто грузит фото ($bearer),
            // а не любую блокировку между сторонами (см. AccessService::checkBlackList).
            if ($chat) {
                $recipient = $chat->getAuthor() === $bearer ? $chat->getReplyAuthor() : $chat->getAuthor();
                $this->accessService->checkBlackList($bearer, $recipient);
            }
        }

        $techSupport = match (true) {
            $entity instanceof TechSupport        => $entity,
            $entity instanceof TechSupportMessage => $entity->getTechSupport(),
            default                               => null,
        };

        $isBanned = match (true) {
            $techSupport !== null     => $techSupport->getStatus() === TechSupport::STATUS_BANNED,
            $entity instanceof Ticket => $entity->getBanned(),
            default                   => false,
        };

        if ($isBanned && !($bearer && in_array('ROLE_ADMIN', $bearer->getRoles(), true))) {
            return $this->errorJson(AppMessages::ACCESS_DENIED);
        }

        return null;
    }

    private function processImageFile(object $entity, UploadedFile $imageFile, ?User $bearerUser): void
    {
        // User меняет своё аватар — Single image, не MultipleImage
        if ($entity instanceof User) {
            $entity->setImageFile($imageFile);
            $this->persist($entity);
            return;
        }

        $image = (new MultipleImage())->setImageFile($imageFile)->setAuthor($bearerUser);

        // Gallery и Ticket хранят порядок отображения: priority = следующий индекс коллекции
        if ($entity instanceof Gallery || $entity instanceof Ticket)
            $image->setPriority($entity->getImages()->count());

        // ChatMessage: обновляем updatedAt → триггер Mercure SSE
        if ($entity instanceof ChatMessage) {
            $entity->setUpdatedAt();
        }

        $entity->addImage($image);
        $this->persist($image);
    }

}
