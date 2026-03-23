<?php

namespace App\Controller\Api\CRUD\POST\Image;

use App\ApiResource\AppError;
use App\Controller\Api\CRUD\Abstract\AbstractApiController;
use App\Entity\Appeal\Appeal;
use App\Entity\Chat\ChatMessage;
use App\Entity\Extra\MultipleImage;
use App\Entity\Gallery\Gallery;
use App\Entity\Review\Review;
use App\Entity\TechSupport\TechSupportMessage;
use App\Entity\Ticket\Ticket;
use App\Entity\User;
use Doctrine\ORM\Exception\ORMException;
use Doctrine\ORM\OptimisticLockException;
use Symfony\Component\HttpFoundation\File\UploadedFile;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;

class UniversalImageUploadController extends AbstractApiController
{
    /**
     * @throws OptimisticLockException
     * @throws ORMException
     */
    public function __invoke(int $id, Request $request): JsonResponse
    {
        $bearerUser = $this->checkedUser('double');
        $entity     = $this->entityManager->find($this->getAttribute('_api_resource_class'), $id);

        if (!$entity)
            return $this->errorJson(AppError::RESOURCE_NOT_FOUND);

        $ownershipCheck = $this->checkOwnership($entity, $bearerUser);

        if ($ownershipCheck !== null)
            return $ownershipCheck;

        $additionalCheck = $this->performAdditionalChecks($entity);

        if ($additionalCheck !== null)
            return $additionalCheck;

        $imageFiles = $this->getFile();

        if (!$imageFiles)
            return $this->errorJson(AppError::NO_FILES_PROVIDED);

        $imageFiles = is_array($imageFiles) ? $imageFiles : [$imageFiles];

        foreach ($imageFiles as $imageFile)
            if ($imageFile instanceof UploadedFile && $imageFile->isValid())
                $this->processImageFile($entity, $imageFile, $bearerUser);

        $this->flush();

        // Берём normalizationContext прямо из метаданных операции API Platform —
        // те же группы, что прописаны в normalizationContext: на Post-операции сущности
        return $this->json($entity, 200, [], $this->getAttribute('_api_normalization_context', []));
    }

    private function checkOwnership(object $entity, User $bearerUser): ?JsonResponse
    {
        if ($entity instanceof ChatMessage) {
            $chat = $entity->getChat();

            if (!$chat)
                return $this->errorJson(AppError::CHAT_NOT_FOUND);

            $allowed = $chat->getAuthor() === $bearerUser || $chat->getReplyAuthor() === $bearerUser;
        } elseif ($entity instanceof Appeal) {
            $author = $entity->getAuthor();

            // Анонимная жалоба: только ответчик может загружать
            $allowed = $author === null
                ? $entity->getRespondent() === $bearerUser
                : $author === $bearerUser || $entity->getRespondent() === $bearerUser;
        } else {
            $parties = match (true) {
                $entity instanceof Gallery            => [$entity->getUser()],
                $entity instanceof User               => [$entity],
                $entity instanceof Review             => [$entity->getClient(), $entity->getMaster()],
                $entity instanceof TechSupportMessage => [$entity->getAuthor(), $entity->getTechSupport()?->getAdministrant()],
                $entity instanceof Ticket             => [$entity->getAuthor(), $entity->getMaster()],
                default                               => [],
            };
            $allowed = in_array($bearerUser, $parties, true);
        }

        return $allowed ? null : $this->errorJson(AppError::OWNERSHIP_MISMATCH);
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
            $this->entityManager->persist($entity);
            return;
        }

        $image = (new MultipleImage())->setImageFile($imageFile);

        // Gallery и Ticket хранят порядок отображения: position = следующий индекс коллекции
        if ($entity instanceof Gallery || $entity instanceof Ticket)
            $image->setPosition($entity->getImages()->count());

        // ChatMessage: помечаем автора загрузки и обновляем updatedAt → триггер Mercure SSE
        if ($entity instanceof ChatMessage) {
            $image->setAuthor($bearerUser);
            $entity->setUpdatedAt();
        }

        $entity->addImage($image);
        $this->entityManager->persist($image);
    }

}
