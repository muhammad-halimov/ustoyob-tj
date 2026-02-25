<?php

namespace App\Controller\Api\CRUD\Chat\Message;

use App\Entity\Chat\Chat;
use App\Entity\Chat\ChatImage;
use App\Entity\Chat\ChatMessage;
use App\Entity\User;
use App\Repository\Chat\ChatMessageRepository;
use App\Service\Extra\AccessService;
use App\Service\Extra\ExtractIriService;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;

class PatchChatMessageController extends AbstractController
{
    public function __construct(
        private readonly EntityManagerInterface $entityManager,
        private readonly ChatMessageRepository  $chatMessageRepository,
        private readonly ExtractIriService      $extractIriService,
        private readonly AccessService          $accessService,
        private readonly Security               $security,
    ){}

    public function __invoke(int $id, Request $request): JsonResponse
    {
        /** @var User $bearerUser */
        $bearerUser = $this->security->getUser();

        $this->accessService->check($bearerUser);

        $data = json_decode($request->getContent(), true);
        $chatParam = $data['chat'] ?? null;
        $text = $data['text'] ?? null;
        $imagesParam = $data['images'] ?? null; // optional array of image filename strings

        // Извлекаем ID из строки "/api/chats/1" или просто "1"
        /** @var Chat $chat */
        $chat = $this->extractIriService->extract($chatParam, Chat::class, 'chats');
        /** @var ChatMessage $chatMessage */
        $chatMessage = $this->chatMessageRepository->find($id);

        if(!$chatMessage)
            return $this->json(['message' => "Chat message not found"], 404);

        if($chatParam !== null && !$chat)
            return $this->json(['message' => "Chat not found"], 404);

        if(!$chat)
            return $this->json(['message' => "Chat not found"], 404);

        if (!$text && empty($imagesParam))
            return $this->json(['message' => "Nothing to update"], 400);

        if ($chat->getAuthor() !== $bearerUser && $chat->getReplyAuthor() !== $bearerUser)
            return $this->json(['message' => "Ownership doesn't match"], 403);

        if ($text) {
            $chatMessage->setText($text);
        }

        // Sync images: keep existing ChatImage entries whose image string is in the new list,
        // remove those that are not, and add new entries for strings not yet in the collection.
        if ($imagesParam !== null) {
            // Expected format: [{"image": "photo_abc.jpg"}, ...]
            $imageStrings = array_filter(array_map(
                fn($item) => is_array($item) && isset($item['image']) ? (string) $item['image'] : null,
                $imagesParam
            ));

            $existingImages = $chatMessage->getChatImages();

            // Remove images not in the new list
            foreach ($existingImages as $chatImage) {
                if (!in_array($chatImage->getImage(), $imageStrings, true)) {
                    $chatMessage->removeChatImage($chatImage);
                    $this->entityManager->remove($chatImage);
                }
            }

            // Collect already-existing image strings
            $existingImageStrings = array_map(
                fn(ChatImage $ci) => $ci->getImage(),
                $existingImages->toArray()
            );

            // Add new image string entries that don't exist yet
            foreach ($imageStrings as $imageString) {
                if (!in_array($imageString, $existingImageStrings, true)) {
                    $newChatImage = (new ChatImage())
                        ->setImage($imageString)
                        ->setAuthor($bearerUser);
                    $chatMessage->addChatImage($newChatImage);
                    $this->entityManager->persist($newChatImage);
                }
            }
        }

        $this->entityManager->flush();

        return $this->json($chatMessage, context: [
            'groups' => ['chatMessages:read'],
            'skip_null_values' => false,
        ]);
    }
}
