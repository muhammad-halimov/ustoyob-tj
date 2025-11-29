<?php

namespace App\State\Appeal;

use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\ProcessorInterface;
use App\Dto\Appeal\Appeal\AppealInput;
use App\Dto\Appeal\Appeal\AppealOutput;
use App\Entity\Appeal\Appeal;
use App\Entity\Appeal\AppealTypes\AppealChat;
use App\Entity\Appeal\AppealTypes\AppealTicket;
use App\Entity\Chat\Chat;
use App\Entity\Ticket\Ticket;
use App\Entity\User;
use App\Service\ExtractIriService;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpKernel\Exception\BadRequestHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\Security\Core\Authorization\AuthorizationCheckerInterface;

readonly class AppealProcessor implements ProcessorInterface
{
    public function __construct(
        private AuthorizationCheckerInterface $authorizationChecker,
        private EntityManagerInterface        $entityManager,
        private ExtractIriService             $extractEntityFromIriService,
        private Security                      $security
    ) {}

    public function process(mixed $data, Operation $operation, array $uriVariables = [], array $context = []): AppealOutput
    {
        /** @var User $bearerUser */
        $bearerUser = $this->security->getUser();

        $this->authorizationChecker->isGranted('create', $data);

        // Валидация complaint reason
        $allComplaints = array_unique(array_merge(AppealChat::COMPLAINTS, AppealTicket::COMPLAINTS));

        if (!in_array($data->reason, array_values($allComplaints))) {
            throw new BadRequestHttpException('Wrong complaint reason');
        }

        // Найти respondent
        /** @var User $respondent */
        $respondent = $this->extractEntityFromIriService->extract($data->respondent, User::class, 'users');

        if (!$respondent) throw new NotFoundHttpException('Respondent not found');

        // Создание Appeal
        $appeal = new Appeal();
        $appeal->setType($data->type);

        if ($data->type === 'ticket') {
            $this->processTicketAppeal($appeal, $data, $bearerUser, $respondent);
        } elseif ($data->type === 'chat') {
            $this->processChatAppeal($appeal, $data, $bearerUser, $respondent);
        } else {
            throw new BadRequestHttpException('Wrong type');
        }

        $this->entityManager->persist($appeal);
        $this->entityManager->flush();

        return $this->toOutput($appeal, $bearerUser, $respondent);
    }

    private function processTicketAppeal(Appeal $appeal, AppealInput $data, User $bearerUser, User $respondent): void
    {
        if (!$data->ticket) {
            throw new BadRequestHttpException('Missing ticket');
        }

        /** @var Ticket $ticket */
        $ticket = $this->extractEntityFromIriService->extract($data->ticket, Ticket::class, 'tickets');

        if (!$ticket) {
            throw new NotFoundHttpException('Ticket not found');
        }

        // Проверка, что respondent связан с ticket
        if ($ticket->getAuthor() !== $respondent && $ticket->getMaster() !== $respondent) {
            throw new BadRequestHttpException("Respondent's ticket doesn't match");
        }

        $appealTicket = new AppealTicket();
        $appealTicket
            ->setTitle($data->title)
            ->setDescription($data->description)
            ->setReason($data->reason)
            ->setRespondent($respondent)
            ->setAuthor($bearerUser)
            ->setTicket($ticket);

        $appeal->addAppealTicket($appealTicket);
    }

    private function processChatAppeal(Appeal $appeal, AppealInput $data, User $bearerUser, User $respondent): void
    {
        if (!$data->chat) {
            throw new BadRequestHttpException('Missing chat');
        }

        /** @var Chat $chat */
        $chat = $this->extractEntityFromIriService->extract($data->chat, Chat::class, 'chats');

        if (!$chat) {
            throw new NotFoundHttpException('Chat not found');
        }

        // Проверка владельца
        if ($chat->getAuthor() !== $bearerUser) {
            throw new BadRequestHttpException("Ownership doesn't match");
        }

        // Проверка respondent
        if ($chat->getReplyAuthor() !== $respondent) {
            throw new BadRequestHttpException("Respondent's chat doesn't match");
        }

        $appealChat = new AppealChat();
        $appealChat
            ->setTitle($data->title)
            ->setDescription($data->description)
            ->setComplaintReason($data->reason)
            ->setRespondent($respondent)
            ->setAuthor($bearerUser)
            ->setChat($chat);

        $appeal->addAppealChat($appealChat);
    }

    private function toOutput(Appeal $appeal, User $author, User $respondent): AppealOutput
    {
        $output = new AppealOutput();
        $output->id = $appeal->getId();
        $output->type = $appeal->getType();
        $output->author = "/api/users/{$author->getId()}";
        $output->respondent = "/api/users/{$respondent->getId()}";
        $output->createdAt = $appeal->getCreatedAt();
        $output->updatedAt = $appeal->getUpdatedAt();

        if ($appeal->getType() === 'ticket' && !$appeal->getAppealTicket()->isEmpty()) {
            $appealTicket = $appeal->getAppealTicket()->first();
            $output->title = $appealTicket->getTitle();
            $output->description = $appealTicket->getDescription();
            $output->reason = $appealTicket->getReason();
            $output->ticket = "/api/tickets/{$appealTicket->getTicket()->getId()}";
        } elseif ($appeal->getType() === 'chat' && !$appeal->getAppealChat()->isEmpty()) {
            $appealChat = $appeal->getAppealChat()->first();
            $output->title = $appealChat->getTitle();
            $output->description = $appealChat->getDescription();
            $output->reason = $appealChat->getComplaintReason();
            $output->chat = "/api/chats/{$appealChat->getChat()->getId()}";
        }

        return $output;
    }
}
