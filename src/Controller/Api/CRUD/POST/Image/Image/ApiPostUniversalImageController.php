<?php

namespace App\Controller\Api\CRUD\POST\Image\Image;

use App\ApiResource\AppMessages;
use App\Controller\Api\CRUD\Abstract\AbstractApiHelperController;
use App\Entity\Appeal\Appeal\Appeal;
use App\Entity\Chat\ChatMessage;
use App\Entity\Extra\MultipleImage;
use App\Entity\Gallery\Gallery;
use App\Entity\Review\Review;
use App\Entity\TechSupport\TechSupportMessage;
use App\Entity\Ticket\Ticket;
use App\Entity\Trait\Readable\G;
use App\Entity\User;
use App\Service\Extra\LocalizationService;
use Doctrine\ORM\Exception\ORMException;
use Doctrine\ORM\OptimisticLockException;
use Symfony\Component\HttpFoundation\File\UploadedFile;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;

class ApiPostUniversalImageController extends AbstractApiHelperController
{
    public function __construct(private readonly LocalizationService $localizationService) {}

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

    protected function afterFetch(array|object $entity, User $user): void
    {
        $this->localizationService->localizeUser(match (true) {
            $entity instanceof Gallery            => $entity->getUser(),
            $entity instanceof User               => $entity,
            $entity instanceof Review             => $entity->getClient() ?? $entity->getMaster(),
            $entity instanceof TechSupportMessage => $entity->getAuthor() ?? $entity->getTechSupport()?->getAdministrant(),
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
    public function __invoke(int $id, Request $request): JsonResponse
    {
        $bearerUser = $this->checkedUser('double');
        $entity     = $this->entityManager->find($this->getAttribute('_api_resource_class'), $id);

        if (!$entity)
            return $this->errorJson(AppMessages::RESOURCE_NOT_FOUND);

        $ownershipCheck = $this->checkOwnership($entity, $bearerUser);

        if ($ownershipCheck !== null)
            return $ownershipCheck;

        $additionalCheck = $this->performAdditionalChecks($entity);

        if ($additionalCheck !== null)
            return $additionalCheck;

        $imageFiles = $this->getFile();

        if (!$imageFiles)
            return $this->errorJson(AppMessages::NO_FILES_PROVIDED);

        $imageFiles = is_array($imageFiles) ? $imageFiles : [$imageFiles];

        foreach ($imageFiles as $imageFile)
            if ($imageFile instanceof UploadedFile && $imageFile->isValid())
                $this->processImageFile($entity, $imageFile, $bearerUser);

        $this->flush();

        $this->afterFetch($entity, $bearerUser);

        return $this->buildResponse($entity);
    }

    protected function checkOwnership(object $entity, User $bearer): ?JsonResponse
    {
        if ($entity instanceof ChatMessage) {
            $chat = $entity->getChat();

            if (!$chat)
                return $this->errorJson(AppMessages::CHAT_NOT_FOUND);

            $allowed = $chat->getAuthor() === $bearer || $chat->getReplyAuthor() === $bearer;
        } elseif ($entity instanceof Appeal) {
            $author = $entity->getAuthor();

            // Анонимная жалоба: только ответчик может загружать
            $allowed = $author === null
                ? $entity->getRespondent() === $bearer
                : $author === $bearer || $entity->getRespondent() === $bearer;
        } else {
            $parties = match (true) {
                $entity instanceof Gallery            => [$entity->getUser()],
                $entity instanceof User               => [$entity],
                $entity instanceof Review             => [$entity->getClient(), $entity->getMaster()],
                $entity instanceof TechSupportMessage => [$entity->getAuthor(), $entity->getTechSupport()?->getAdministrant()],
                $entity instanceof Ticket             => [$entity->getAuthor(), $entity->getMaster()],
                default                               => [],
            };
            $allowed = in_array($bearer, $parties, true);
        }

        return $allowed ? null : $this->errorJson(AppMessages::OWNERSHIP_MISMATCH);
    }

    /**
     * Дополнительные проверки после ownership, специфичные для конкретной сущности.
     * На данный момент — проверка чёрного списка для ChatMessage.
     */
    private function performAdditionalChecks(object $entity): ?JsonResponse
    {
        if ($entity instanceof ChatMessage) {
            $chat = $entity->getChat();
            if ($chat) $this->accessService->checkBlackList($chat->getAuthor(), $chat->getReplyAuthor());
        }

        return null;
    }

    private function processImageFile(object $entity, UploadedFile $imageFile, User $bearerUser): void
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
