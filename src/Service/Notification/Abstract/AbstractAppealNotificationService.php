<?php

namespace App\Service\Notification\Abstract;

use App\Entity\Appeal\Appeal\Appeal;
use App\Entity\Appeal\Types\AppealChat;
use App\Entity\Appeal\Types\AppealReview;
use App\Entity\Appeal\Types\AppealTicket;
use App\Entity\Appeal\Types\AppealUser;
use App\Entity\User;
use App\Service\Extra\UuidUtil;
use Symfony\Component\Routing\Generator\UrlGeneratorInterface;

/**
 * Базовый класс для уведомлений о новых жалобах (07.09.2026, по просьбе
 * "прикрути уведомления и для создания жалоб" — до этого AppealListener
 * не существовал вообще, жалоба создавалась и просто лежала в БД, ни один
 * админ не узнавал о ней, пока сам не зайдёт в EasyAdmin проверить).
 *
 * В отличие от TechSupport/TicketApproval — тут НЕТ поля "ответственный
 * админ" (нет least-loaded-балансировки, нет AdminLoadBalancerService) —
 * уведомление уходит СРАЗУ ВСЕМ админам (ROLE_ADMIN/ROLE_SUPER_ADMIN), см.
 * AppealListener::postPersist(). Жалобы не настолько часты, чтобы их
 * требовалось распределять по очереди — решение пользователя при выборе
 * этой задачи.
 */
abstract class AbstractAppealNotificationService extends AbstractMailerService
{
    public function __construct(protected readonly UrlGeneratorInterface $urlGenerator) {}

    abstract public function sendAppealNotification(User $user, Appeal $appeal): mixed;

    protected function appealAdminUrl(Appeal $appeal): string
    {
        return $this->urlGenerator->generate(
            'admin_appeal_edit',
            ['entityId' => $appeal->getId()],
            UrlGeneratorInterface::ABSOLUTE_URL
        );
    }

    protected function reason(Appeal $appeal): string
    {
        return $appeal->getReason()?->getTitle() ?? $appeal->getReason()?->getCode() ?? 'Не указана';
    }

    /**
     * На что именно пожаловались — конкретика зависит от подтипа (см.
     * Appeal::TYPES/getTypeLabel() — тут то же самое, но с деталями
     * конкретного объекта жалобы, а не только типом). ID показываем
     * коротким (UuidUtil::short()) — тот же принцип, что и в __toString()
     * всех сущностей (см. чат) — полный UUID тут не нужен, это не ссылка,
     * а просто человекочитаемый ярлык внутри уведомления.
     */
    protected function subject(Appeal $appeal): string
    {
        return match (true) {
            $appeal instanceof AppealChat   => 'чат #' . UuidUtil::short($appeal->getChat()?->getId()),
            $appeal instanceof AppealReview => 'отзыв #' . UuidUtil::short($appeal->getReview()?->getId()),
            $appeal instanceof AppealTicket => 'объявление/услугу «' . ($appeal->getTicket()?->getTitle() ?? '—') . '»',
            $appeal instanceof AppealUser   => 'пользователя ' . ($appeal->getRespondent()?->getContact() ?? '—'),
            default => $appeal->getTypeLabel(),
        };
    }
}
