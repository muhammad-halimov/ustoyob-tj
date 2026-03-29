<?php

namespace App\Controller\Api\CRUD\POST\Appeal\Appeal;

use App\ApiResource\AppMessages;
use App\Controller\Api\CRUD\Abstract\AbstractApiPostController;
use App\Dto\Appeal\AppealInput;
use App\Entity\Appeal\Types\AppealChat;
use App\Entity\Appeal\Types\AppealReview;
use App\Entity\Appeal\Types\AppealTicket;
use App\Entity\Appeal\Types\AppealUser;
use App\Entity\User;
use App\Repository\Chat\ChatRepository;
use App\Service\Extra\LocalizationService;

class ApiPostAppealConntroller extends AbstractApiPostController
{
    public function __construct(
        private readonly ChatRepository      $chatRepository,
        private readonly LocalizationService $localizationService,
    ) {}

    protected function getInputClass(): string { return AppealInput::class; }

    protected function afterFetch(object|array $entity, User $user): void
    {
        if ($entity->getAuthor()) $this->localizationService->localizeUser($entity->getAuthor(), $this->getLocale());
        if ($entity->getRespondent()) $this->localizationService->localizeUser($entity->getRespondent(), $this->getLocale());
        if ($entity->getReason()) $this->localizationService->localizeEntityFull($entity->getReason(), $this->getLocale());
        if (method_exists($entity, 'getTicket') && $entity->getTicket()) $this->localizationService->localizeTicket($entity->getTicket(), $this->getLocale());
    }

    protected function handle(User $bearer, object $dto): object
    {
        /** @var AppealInput $dto */
        if (!$dto->title || !$dto->description || !$dto->reason || !$dto->type)
            return $this->errorJson(AppMessages::MISSING_REQUIRED_FIELDS);

        if ($dto->type === 'ticket') {
            if (!$dto->ticket)
                return $this->errorJson(AppMessages::MISSING_TICKET);

            if ($dto->respondent && $dto->ticket->getAuthor() !== $dto->respondent && $dto->ticket->getMaster() !== $dto->respondent)
                return $this->errorJson(AppMessages::APPEAL_TICKET_MISMATCH);

            return (new AppealTicket())
                ->setTitle($dto->title)
                ->setDescription($dto->description)
                ->setReason($dto->reason)
                ->setRespondent($dto->respondent)
                ->setAuthor($bearer)
                ->setTicket($dto->ticket);

        } elseif ($dto->type === 'chat') {

            if ($dto->respondent && (
                !$this->chatRepository->findChatBetweenUsers($bearer, $dto->respondent) &&
                !$this->chatRepository->findChatBetweenUsers($dto->respondent, $bearer)
            ))
                return $this->errorJson(AppMessages::NO_INTERACTIONS);

            if (!$dto->chat)
                return $this->errorJson(AppMessages::MISSING_CHAT);

            if ($dto->chat->getAuthor() !== $bearer && $dto->chat->getReplyAuthor() !== $bearer)
                return $this->errorJson(AppMessages::OWNERSHIP_MISMATCH);

            if ($dto->respondent && $dto->chat->getReplyAuthor() !== $dto->respondent && $dto->chat->getAuthor() !== $dto->respondent)
                return $this->errorJson(AppMessages::APPEAL_CHAT_MISMATCH);

            return (new AppealChat())
                ->setTitle($dto->title)
                ->setDescription($dto->description)
                ->setReason($dto->reason)
                ->setRespondent($dto->respondent)
                ->setAuthor($bearer)
                ->setChat($dto->chat)
                ->setTicket($dto->ticket);

        } elseif ($dto->type === 'review') {
            if (!$dto->review)
                return $this->errorJson(AppMessages::MISSING_REVIEW);

            return (new AppealReview())
                ->setTitle($dto->title)
                ->setDescription($dto->description)
                ->setReason($dto->reason)
                ->setRespondent($dto->respondent)
                ->setAuthor($bearer)
                ->setReview($dto->review)
                ->setTicket($dto->ticket);

        } elseif ($dto->type === 'user') {
            if (!$dto->respondent)
                return $this->errorJson(AppMessages::MISSING_RESPONDENT);

            return (new AppealUser())
                ->setTitle($dto->title)
                ->setDescription($dto->description)
                ->setReason($dto->reason)
                ->setRespondent($dto->respondent)
                ->setAuthor($bearer);

        } else return $this->errorJson(AppMessages::WRONG_APPEAL_TYPE);
    }
}
