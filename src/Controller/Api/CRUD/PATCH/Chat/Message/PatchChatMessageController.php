<?php

namespace App\Controller\Api\CRUD\PATCH\Chat\Message;

use App\ApiResource\AppError;
use App\Controller\Api\CRUD\Abstract\AbstractApiController;
use App\Entity\Chat\Chat;
use App\Entity\Chat\ChatMessage;
use App\Entity\Extra\MultipleImage;
use App\Service\Extra\ExtractIriService;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;

class PatchChatMessageController extends AbstractApiController
{
    public function __construct(
        private readonly ExtractIriService $extractIriService,
    ){}

    public function __invoke(int $id, Request $request): JsonResponse
    {
        $bearerUser = $this->checkedUser();

        $data = $this->getContent();

        $chatParam = $data['chat'] ?? null;
        $text = $data['description'] ?? null;
        $imagesParam = $data['images'] ?? null;

        /** @var Chat $chat */
        $chat = $this->extractIriService->extract($chatParam, Chat::class, 'chats');

        /** @var ChatMessage|JsonResponse $chatMessage */
        $chatMessage = $this->findOr404(ChatMessage::class, $id, AppError::CHAT_MESSAGE_NOT_FOUND);
        if ($chatMessage instanceof JsonResponse) return $chatMessage;

        if (!$chat) return $this->errorJson(AppError::CHAT_NOT_FOUND);

        if ($text === null && empty($imagesParam)) {
            return $this->errorJson(AppError::NOTHING_TO_UPDATE);
        }

        if ($chat->getAuthor() !== $bearerUser && $chat->getReplyAuthor() !== $bearerUser) {
            return $this->errorJson(AppError::OWNERSHIP_MISMATCH);
        }

        if ($text !== null) {
            $chatMessage->setDescription($text);
        }

        if ($imagesParam !== null) {
            $imageStrings = array_filter(array_map(
                fn($item) => is_array($item) && isset($item['image']) ? (string) $item['image'] : null,
                $imagesParam
            ));

            $existingImages = $chatMessage->getImages();

            foreach ($existingImages as $chatImage) {
                if (!in_array($chatImage->getImage(), $imageStrings, true)) {
                    $chatMessage->removeImage($chatImage);
                    $this->entityManager->remove($chatImage);
                }
            }

            $existingImageStrings = array_map(
                fn(MultipleImage $ci) => $ci->getImage(),
                $existingImages->toArray()
            );

            foreach ($imageStrings as $imageString) {
                if (!in_array($imageString, $existingImageStrings, true)) {
                    $newChatImage = (new MultipleImage())
                        ->setImage($imageString)
                        ->setAuthor($bearerUser);
                    $chatMessage->addImage($newChatImage);
                    $this->entityManager->persist($newChatImage);
                }
            }
        }

        $chatMessage->setUpdatedAt();
        $this->flush();

        return $this->json($chatMessage, context: [
            'groups' => ['chatMessages:read'],
            'skip_null_values' => false,
        ]);
    }
}
