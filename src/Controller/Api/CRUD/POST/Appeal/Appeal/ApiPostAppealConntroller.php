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
use App\Entity\Trait\Readable\G;

class ApiPostAppealConntroller extends AbstractApiPostController
{
    public function __construct(
        private readonly ChatRepository      $chatRepository,
        private readonly LocalizationService $localizationService,
    ) {}

    protected function getInputClass(): string { return AppealInput::class; }

    protected function setSerializationGroups(): array { return G::OPS_APPEALS; }

    protected function getUserGrade(): string { return 'anonymous'; }

    protected function isActiveAndApprovedRequired(): bool { return false; }

    protected function afterFetch(object|array $entity, ?User $user): void
    {
        if ($entity->getAuthor())
            $this->localizationService->localizeUser($entity->getAuthor(), $this->getLocale());

        if ($entity->getRespondent())
            $this->localizationService->localizeUser($entity->getRespondent(), $this->getLocale());

        if ($entity->getReason())
            $this->localizationService->localizeEntityFull($entity->getReason(), $this->getLocale());

        if (method_exists($entity, 'getTicket') && $entity->getTicket())
            $this->localizationService->localizeTicket($entity->getTicket(), $this->getLocale());
    }

    protected function handle(?User $bearer, object $dto): object
    {
        /** @var AppealInput $dto */
        if (!$dto->title || !$dto->description || !$dto->reason || !$dto->type)
            return $this->errorJson(AppMessages::MISSING_REQUIRED_FIELDS);

        $authRequired = $dto->reason->getAuthRequired();
        $hasNoChat    = $bearer && $dto->respondent && (
            !$this->chatRepository->findChatBetweenUsers($bearer, $dto->respondent) &&
            !$this->chatRepository->findChatBetweenUsers($dto->respondent, $bearer)
        );

        switch ($dto->type) {
            case 'ticket':
                if (!$dto->ticket)
                    return $this->errorJson(AppMessages::MISSING_TICKET);
                if (
                    $dto->respondent &&
                    $dto->ticket->getAuthor() !== $dto->respondent &&
                    $dto->ticket->getMaster() !== $dto->respondent
                )
                    return $this->errorJson(AppMessages::APPEAL_TICKET_MISMATCH);
                if ($authRequired && !$bearer)
                    return $this->errorJson(AppMessages::AUTHENTICATION_REQUIRED);

                $entity = (new AppealTicket())->setTicket($dto->ticket);

                break;

            case 'chat':
                if (!$bearer)
                    return $this->errorJson(AppMessages::AUTHENTICATION_REQUIRED);
                if ($hasNoChat)
                    return $this->errorJson(AppMessages::NO_INTERACTIONS);
                if ($authRequired)
                    return $this->errorJson(AppMessages::AUTH_REQUIRED_FOR_CHAT_APPEALS);
                if (!$dto->chat)
                    return $this->errorJson(AppMessages::MISSING_CHAT);
                if ($dto->chat->getAuthor() !== $bearer && $dto->chat->getReplyAuthor() !== $bearer)
                    return $this->errorJson(AppMessages::OWNERSHIP_MISMATCH);
                if (
                    $dto->respondent &&
                    $dto->chat->getReplyAuthor() !== $dto->respondent &&
                    $dto->chat->getAuthor() !== $dto->respondent
                )
                    return $this->errorJson(AppMessages::APPEAL_CHAT_MISMATCH);

                $entity = (new AppealChat())->setChat($dto->chat)->setTicket($dto->ticket);

                break;

            case 'review':
                if (!$dto->review)
                    return $this->errorJson(AppMessages::MISSING_REVIEW);
                if ($authRequired && !$bearer)
                    return $this->errorJson(AppMessages::AUTHENTICATION_REQUIRED);

                $entity = (new AppealReview())->setReview($dto->review)->setTicket($dto->ticket);

                break;

            case 'user':
                if (!$dto->respondent)
                    return $this->errorJson(AppMessages::MISSING_RESPONDENT);
                if ($authRequired && !$bearer)
                    return $this->errorJson(AppMessages::AUTHENTICATION_REQUIRED);
                $entity = new AppealUser();

                break;

            default:
                return $this->errorJson(AppMessages::WRONG_APPEAL_TYPE);
        }

        return $entity
            ->setTitle($dto->title)
            ->setDescription($dto->description)
            ->setReason($dto->reason)
            ->setRespondent($dto->respondent)
            ->setAuthor($bearer);
    }
}
