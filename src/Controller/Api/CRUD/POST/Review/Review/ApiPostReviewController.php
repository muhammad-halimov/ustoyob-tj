<?php

namespace App\Controller\Api\CRUD\POST\Review\Review;

use App\ApiResource\AppMessages;
use App\Controller\Api\CRUD\Abstract\AbstractApiPostController;
use App\Dto\Review\ReviewPostInput;
use App\Entity\Review\Review;
use App\Entity\Trait\Readable\G;
use App\Entity\User;
use App\Repository\Chat\ChatRepository;
use App\Repository\Review\ReviewRepository;
use App\Service\Extra\LocalizationService;

class ApiPostReviewController extends AbstractApiPostController
{
    public function __construct(
        private readonly ChatRepository      $chatRepository,
        private readonly ReviewRepository    $reviewRepository,
        private readonly LocalizationService $localizationService,
    ) {}

    protected function getInputClass(): string { return ReviewPostInput::class; }

    protected function setSerializationGroups(): array { return G::OPS_REVIEWS; }

    protected function afterFetch(object|array $entity, User $user): void
    {
        /** @var Review $entity */
        if ($entity->getMaster()) $this->localizationService->localizeUser($entity->getMaster(), $this->getLocale());
        if ($entity->getClient()) $this->localizationService->localizeUser($entity->getClient(), $this->getLocale());
        if ($entity->getTicket()) $this->localizationService->localizeTicket($entity->getTicket(), $this->getLocale());
    }

    protected function handle(User $bearer, object $dto): object
    {
        /** @var ReviewPostInput $dto */
        if (!$dto->ticket)
            return $this->errorJson(AppMessages::MISSING_TICKET);

        if ($dto->rating < 1 || $dto->rating > 5) return $this->errorJson(AppMessages::INVALID_RATING);

        $ticket = $dto->ticket;
        $client = $dto->client;
        $master = $dto->master;

        if (
            !$this->chatRepository->findChatBetweenUsers($bearer, $master) &&
            !$this->chatRepository->findChatBetweenUsers($bearer, $client)
        )
            return $this->errorJson(AppMessages::NO_INTERACTIONS);

        if ($this->reviewRepository->findExistingReviewByAuthorAndTicket($bearer, $ticket))
            return $this->errorJson(AppMessages::REVIEW_ALREADY_EXISTS);

        $review = new Review();

        if ($dto->type === 'client') {
            if (!$dto->client)
                return $this->errorJson(AppMessages::CLIENT_PARAM_REQUIRED);

            if (!$client)
                return $this->errorJson(AppMessages::CLIENT_NOT_FOUND);

            if (!in_array('ROLE_MASTER', $bearer->getRoles()))
                return $this->errorJson(AppMessages::REVIEW_NOT_MASTER);

            if (!in_array('ROLE_CLIENT', $client->getRoles()))
                return $this->errorJson(AppMessages::REVIEW_CLIENT_ROLE_MISMATCH);

            if ($ticket->getService() && $ticket->getAuthor() !== $client)
                return $this->errorJson(AppMessages::REVIEW_CLIENT_TICKET_MISMATCH);

            $review->setTicket($ticket)->setMaster($bearer)->setClient($client);

        } elseif ($dto->type === 'master') {
            if (!$dto->master)
                return $this->errorJson(AppMessages::MASTER_PARAM_REQUIRED);

            if (!$master)
                return $this->errorJson(AppMessages::MASTER_NOT_FOUND);

            if (!in_array('ROLE_CLIENT', $bearer->getRoles()))
                return $this->errorJson(AppMessages::REVIEW_NOT_CLIENT);

            if (!in_array('ROLE_MASTER', $master->getRoles()))
                return $this->errorJson(AppMessages::REVIEW_MASTER_ROLE_MISMATCH);

            if (!$ticket->getService() && $ticket->getMaster() !== $master)
                return $this->errorJson(AppMessages::REVIEW_MASTER_SERVICE_MISMATCH);

            $review->setTicket($ticket)->setClient($bearer)->setMaster($master);

        } else return $this->errorJson(AppMessages::WRONG_REVIEW_TYPE);

        $review
            ->setDescription($dto->description)
            ->setRating($dto->rating)
            ->setType($dto->type);

        return $review;
    }
}
