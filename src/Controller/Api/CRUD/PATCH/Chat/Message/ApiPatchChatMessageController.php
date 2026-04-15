<?php

namespace App\Controller\Api\CRUD\PATCH\Chat\Message;

use App\ApiResource\AppMessages;
use App\Controller\Api\CRUD\Abstract\AbstractApiPatchController;
use App\Dto\Chat\ChatMessagePatchInput;
use App\Entity\Chat\Chat;
use App\Entity\Chat\ChatMessage;
use App\Entity\Extra\MultipleImage;
use App\Entity\Trait\Readable\G;
use App\Entity\User;
use App\Service\Extra\LocalizationService;
use Symfony\Component\HttpFoundation\JsonResponse;

class ApiPatchChatMessageController extends AbstractApiPatchController
{
    private ?Chat $chat = null;

    public function __construct(private readonly LocalizationService $localizationService) {}

    protected function getNotFoundError(): string { return AppMessages::CHAT_MESSAGE_NOT_FOUND; }

    protected function setSerializationGroups(): array { return G::OPS_CHAT_MSGS; }

    protected function getInputClass(): string { return ChatMessagePatchInput::class; }

    protected function afterFetch(object|array $entity, User $user): void
    {
        /** @var ChatMessage $entity */
        if ($entity->getAuthor()) $this->localizationService->localizeUser($entity->getAuthor(), $this->getLocale());
    }

    protected function getEntityById(int $id): ?object
    {
        /** @var ChatMessagePatchInput $dto */
        $dto        = $this->inputDto;
        $this->chat = $dto->chat;

        return $this->entityManager->find(ChatMessage::class, $id);
    }

    protected function checkOwnership(object $entity, User $bearer): ?JsonResponse
    {
        if (!$this->chat) return $this->errorJson(AppMessages::CHAT_NOT_FOUND);

        if ($this->chat->getAuthor() !== $bearer && $this->chat->getReplyAuthor() !== $bearer)
            return $this->errorJson(AppMessages::OWNERSHIP_MISMATCH);

        return null;
    }

    protected function applyChanges(object $entity, User $bearer, object $dto): ?JsonResponse
    {
        /** @var ChatMessage $entity */
        /** @var ChatMessagePatchInput $dto */
        $text        = $dto->description;
        $imagesParam = $dto->images;

        if ($text === null && empty($imagesParam))
            return $this->errorJson(AppMessages::NOTHING_TO_UPDATE);

        if ($text !== null) {
            $entity->setDescription($text);
        }

        if (!empty($imagesParam)) {
            $imageStrings = array_filter(array_map(
                fn($item) => isset($item->image) ? (string) $item->image : null,
                $imagesParam
            ));

            $existingImages = $entity->getImages();

            foreach ($existingImages as $chatImage) {
                if (!in_array($chatImage->getImage(), $imageStrings, true)) {
                    $entity->removeImage($chatImage);
                    $this->entityManager->remove($chatImage);
                }
            }

            $existingImageStrings = array_map(
                fn(MultipleImage $ci) => $ci->getImage(),
                $existingImages->toArray()
            );

            foreach ($imageStrings as $imageString) {
                if (!in_array($imageString, $existingImageStrings, true)) {
                    $newImage = (new MultipleImage())->setImage($imageString)->setAuthor($bearer);
                    $entity->addImage($newImage);
                    $this->entityManager->persist($newImage);
                }
            }
        }

        $entity->setUpdatedAt();

        return null;
    }
}
