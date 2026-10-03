<?php

namespace App\EventListener;

use App\Entity\Extra\EntityRevision;
use App\Entity\TechSupport\TechSupportMessage;
use App\Service\Notification\Push\PushNotifier;
use App\Entity\User;
use App\Service\Extra\MercurePublisher;
use App\Service\Notification\Email\NotifyNewTechSupportEmailService;
use App\Service\Notification\NotificationDispatcher;
use App\Service\Notification\Telegram\NotifyNewTechSupportTelegramBotService;
use Doctrine\Bundle\DoctrineBundle\Attribute\AsEntityListener;
use Doctrine\ORM\Event\PostUpdateEventArgs;
use Doctrine\ORM\Event\PreUpdateEventArgs;
use Doctrine\ORM\EntityManagerInterface;
use Doctrine\ORM\Events;
use Symfony\Bundle\SecurityBundle\Security;

/**
 * MERCURE для техподдержки — см. ChatMessageListener для общего объяснения
 * механизма (тот же MercurePublisher, тот же формат конверта событий).
 *
 * В отличие от чата: в Mercure публикуется ТОЛЬКО создание нового сообщения
 * (postPersist). Обновление и удаление сообщений техподдержки по фронтенду
 * не транслируются — постраничные GET-запросы достаточны для этих случаев.
 * Но audit trail (EntityRevision) пишется и на update — это для
 * админов/разбора споров, а не realtime-уведомление, см. preUpdate/postUpdate.
 *
 * Топик: "tech-support:{techSupportId}" — см. TechSupport::getMercureTopic()
 * и ApiGetTechSupportSubscribeTokenController.
 *
 * Плюс уведомление назначенному администранту — те же каналы, что
 * TechSupportListener уже использует при создании тикета (см. там), просто
 * другой метод (sendTechSupportMessageNotification). Не шлём, если сообщение
 * написал сам администрант — незачем уведомлять о своём же ответе.
 */
#[AsEntityListener(event: Events::postPersist, entity: TechSupportMessage::class)]
#[AsEntityListener(event: Events::preUpdate, entity: TechSupportMessage::class)]
#[AsEntityListener(event: Events::postUpdate, entity: TechSupportMessage::class)]
class TechSupportMessageListener
{
    /**
     * @var array<int, array{old: ?string, new: ?string}> Сообщения (по spl_object_id) → было/стало,
     * для записи EntityRevision в postUpdate (тот же приём, что в
     * TicketListener/ChatMessageListener — changeset доступен только в
     * preUpdate, но персистить новую сущность внутри preUpdate нельзя).
     */
    private array $pendingRevision = [];

    public function __construct(
        private readonly NotifyNewTechSupportTelegramBotService $telegramNotifier,
        private readonly NotifyNewTechSupportEmailService       $emailNotifier,
        private readonly NotificationDispatcher                 $dispatcher,
        private readonly MercurePublisher                       $publisher,
        private readonly EntityManagerInterface                 $entityManager,
        private readonly Security                               $security,
        private readonly PushNotifier                           $pushNotifier,
    ) {}

    public function postPersist(TechSupportMessage $message): void
    {
        $techSupport = $message->getTechSupport();

        if (!$techSupport?->getId()) return;

        $this->publisher->publish("tech-support:{$techSupport->getId()}", 'created', $message, ['techSupportMessages:read']);

        $this->notifyAdmin($message, $techSupport->getAdministrant());

        // Push собеседнику (автору обращения или администратору). Сообщение только с фото уходит пустым —
        // push по нему шлёт загрузка фото (ApiPostUniversalImageController).
        $this->pushNotifier->techSupportMessage($message);
    }

    /**
     * Редактируется только description (см. ApiPatchTechSupportMessageController) —
     * версионируем только его, фото логируются отдельно (см. syncImages()
     * в AbstractApiHelperController).
     */
    public function preUpdate(TechSupportMessage $message, PreUpdateEventArgs $event): void
    {
        if ($event->hasChangedField('description')) {
            $this->pendingRevision[spl_object_id($message)] = [
                'old' => $event->getOldValue('description'),
                'new' => $event->getNewValue('description'),
            ];
        }
    }

    public function postUpdate(TechSupportMessage $message, PostUpdateEventArgs $event): void
    {
        $key = spl_object_id($message);
        if (!isset($this->pendingRevision[$key])) return;

        $descriptionDiff = $this->pendingRevision[$key];
        unset($this->pendingRevision[$key]);

        $revision = (new EntityRevision())
            ->setEntityType('tech_support_message')
            ->setEntityId($message->getId())
            ->setParentId($message->getTechSupport()?->getId())
            ->setEntity('TechSupport')
            ->setAction(EntityRevision::ACTION_UPDATED)
            ->setSnapshot(['description' => $descriptionDiff])
            ->setActor($this->currentUser());

        // persist+flush здесь безопасны: postUpdate вызывается уже после
        // записи изменений TechSupportMessage в БД, текущий flush завершён.
        $this->entityManager->persist($revision);
        $this->entityManager->flush();
    }

    private function notifyAdmin(TechSupportMessage $message, ?User $admin): void
    {
        if ($admin === null || !in_array('ROLE_ADMIN', $admin->getRoles(), true)) return;
        if ($admin === $message->getAuthor()) return; // не уведомляем админа о его же сообщении

        $this->dispatcher->send(
            sendTelegram: fn() => $this->telegramNotifier->sendTechSupportMessageNotification(user: $admin, message: $message),
            sendEmail:    fn() => $this->emailNotifier->sendTechSupportMessageNotification(user: $admin, message: $message),
            label:        'TechSupportMessage',
            logContext:   [
                'techSupportId'        => $message->getTechSupport()?->getId(),
                'techSupportMessageId' => $message->getId(),
                'adminId'              => $admin->getId(),
            ],
        );
    }

    private function currentUser(): ?User
    {
        /** @var User|null $user */
        $user = $this->security->getUser();

        return $user;
    }
}
