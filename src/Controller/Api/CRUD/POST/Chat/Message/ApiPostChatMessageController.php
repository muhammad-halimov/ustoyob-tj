<?php

namespace App\Controller\Api\CRUD\POST\Chat\Message;

use App\ApiResource\AppMessages;
use App\Controller\Api\CRUD\Abstract\AbstractApiPostController;
use App\Dto\Chat\ChatMessagePostInput;
use App\Entity\Chat\Chat;
use App\Entity\Chat\ChatMessage;
use App\Entity\Trait\Readable\G;
use App\Entity\User;
use App\Service\Extra\LocalizationService;
use Symfony\Component\HttpFoundation\JsonResponse;

class ApiPostChatMessageController extends AbstractApiPostController
{
    public function __construct(private readonly LocalizationService $localizationService) {}

    protected function getInputClass(): string { return ChatMessagePostInput::class; }

    protected function setSerializationGroups(): array { return G::OPS_CHAT_MSGS; }

    protected function afterFetch(object|array $entity, User $user): void
    {
        /** @var ChatMessage $entity */
        if ($entity->getAuthor()) $this->localizationService->localizeUser($entity->getAuthor(), $this->getLocale());
    }

    protected function handle(User $bearer, object $dto): object
    {
        /** @var ChatMessagePostInput $dto */
        if (!$dto->chat || $dto->description === null)
            return $this->errorJson(AppMessages::MISSING_REQUIRED_FIELDS);

        $chat    = $dto->chat;
        $replyTo = $dto->replyTo;

        if ($chat->getAuthor() !== $bearer && $chat->getReplyAuthor() !== $bearer)
            return $this->errorJson(AppMessages::OWNERSHIP_MISMATCH);

        if ($replyTo && $replyTo->getChat() !== $chat)
            return $this->errorJson(AppMessages::OWNERSHIP_MISMATCH);

        $this->accessService->check($chat->getReplyAuthor());
        $this->accessService->checkBlackList($chat->getAuthor(), $chat->getReplyAuthor());

        $chatMessage = (new ChatMessage())
            ->setDescription($dto->description)
            ->setChat($chat)
            ->setReplyTo($replyTo)
            ->setAuthor($bearer);

        $this->persist($chatMessage);

        $chat->addMessage($chatMessage);

        $this->flush();

        return $chatMessage;
    }

    protected function checkOwnership(object $entity, User $bearer): ?JsonResponse
    {
        return null;
    }
}
