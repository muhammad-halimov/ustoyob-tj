<?php

namespace App\Entity\TechSupport;

use App\Entity\Extra\EntityRevision;
use App\Entity\Ticket\Ticket;
use App\Entity\Trait\Readable\CreatedAtTrait;
use App\Entity\Trait\Readable\DescriptionTrait;
use App\Entity\Trait\Readable\SnapshotSummaryTrait;
use App\Entity\Trait\Readable\UpdatedAtTrait;
use App\Entity\User;
use App\Repository\TechSupport\TicketApprovalRepository;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\IdGenerator\UuidGenerator;
use Symfony\Component\Uid\Uuid;

/**
 * Заявка на (повторное) одобрение объявления/услуги — заводится
 * TicketListener при любой содержательной правке Ticket (см. её
 * NOTIFIABLE_FIELDS и адресную часть в onFlush) либо вручную админом.
 *
 * $snapshot — СПИСОК отдельных правок за окно "СЕЙЧАС ждёт решения админа"
 * (см. TicketListener::resolveApproval — правки одного тикета в пределах
 * 24ч с момента создания текущей неодобренной заявки копятся в НЕЙ ЖЕ через
 * appendSnapshot(), а не плодят новую заявку на каждый чих). Каждый элемент
 * списка — {at, changes}: changes в том же формате {field: {old, new}}, что
 * пишет EntityRevision для той же самой правки (один $snapshot-параметр
 * уходит в обе сущности за один вызов buildApprovalAndRevision, см.
 * TicketListener), at — когда это конкретно произошло.
 *
 * Важно: это ДОБАВЛЕНИЕ, а не слияние — если budget поменяли 200→300, а
 * через 5 минут 300→350, в списке будет ДВА отдельных элемента (200→300 и
 * 300→350), а не один смазанный (200→350). Ничего не перезаписывается и не
 * теряется — ровно то же, что EntityRevision хранил бы, будь она заведена
 * заново на каждую правку, только собранное в одной заявке, а не размазанное
 * по нескольким.
 */
#[ORM\Entity(repositoryClass: TicketApprovalRepository::class)]
#[ORM\HasLifecycleCallbacks]
class TicketApproval
{
    use CreatedAtTrait, UpdatedAtTrait, DescriptionTrait, SnapshotSummaryTrait;

    #[ORM\Id]
    #[ORM\GeneratedValue(strategy: 'CUSTOM')]
    #[ORM\CustomIdGenerator(class: UuidGenerator::class)]
    #[ORM\Column(type: 'uuid', unique: true)]
    private ?Uuid $id = null;

    #[ORM\Column(type: 'boolean', options: ['default' => false])]
    private bool $approved = false;

    #[ORM\ManyToOne(inversedBy: 'ticketApprovals')]
    #[ORM\JoinColumn(nullable: true, onDelete: 'SET NULL')]
    private ?User $administrant = null;

    #[ORM\ManyToOne(inversedBy: 'ticketApprovals')]
    #[ORM\JoinColumn(nullable: true, onDelete: 'CASCADE')]
    private ?Ticket $ticket = null;

    /**
     * @var array<int, array{at: string, changes: array<string, mixed>, isNew?: bool}>
     * Список правок за окно, см. докблок класса. 'at' — ISO 8601
     * (DateTimeImmutable::ATOM), 'changes' — снимок этой конкретной правки
     * в формате {field: {old, new}}, тот же, что уходит в EntityRevision.
     * 'isNew' — только у самого первого элемента, см. appendSnapshot()/
     * isCreationOnly() и докблок TicketListener::postPersist() (05.09.2026).
     */
    #[ORM\Column(type: 'json')]
    private array $snapshot = [];

    public function getId(): ?Uuid
    {
        return $this->id;
    }

    public function getSnapshot(): array
    {
        return $this->snapshot;
    }

    public function setSnapshot(array $snapshot): static
    {
        $this->snapshot = $snapshot;
        return $this;
    }

    /**
     * Добавляет ОДНУ правку в конец списка — ничего не перезаписывает и не
     * сливает с предыдущими элементами (см. докблок класса: budget 200→300,
     * потом 300→350 — это ДВА отдельных элемента, а не один 200→350).
     * Вызывается при переиспользовании заявки в пределах 24ч-окна (см.
     * TicketListener::resolveApproval); у новой заявки просто становится
     * первым и единственным элементом списка.
     *
     * $isNew (добавлено 05.09.2026, см. TicketListener::postPersist()) —
     * true ТОЛЬКО для самой первой записи заявки, заведённой прямо на
     * СОЗДАНИЕ тикета (это не правка, а исходное содержимое объявления) —
     * см. isCreationOnly() ниже, которая по этому флагу решает, как
     * уведомление и description должны выглядеть ("Новое объявление", а не
     * "Изменены поля"). Ни один последующий вызов (реальная правка тикета)
     * этот параметр не передаёт — как только появляется ВТОРАЯ запись,
     * isCreationOnly() автоматически становится false.
     */
    public function appendSnapshot(array $changes, bool $isNew = false): static
    {
        $entry = [
            'at'      => (new \DateTimeImmutable())->format(DATE_ATOM),
            'changes' => $changes,
        ];

        if ($isNew) $entry['isNew'] = true;

        $this->snapshot[] = $entry;

        return $this;
    }

    /**
     * true, если заявка ещё ни разу не редактировалась после создания —
     * единственная запись в $snapshot и она сама помечена isNew (см.
     * appendSnapshot()). Как только тикет хоть раз содержательно
     * отредактируют, добавится вторая запись (без isNew) — и это условие
     * само перестанет выполняться, никакого отдельного сброса флага не
     * требуется. Используется уведомлениями (Telegram/email) и
     * refreshDescriptionFromSnapshot() ниже, чтобы не путать "вот новое
     * объявление" с "вот что поменялось" — семантически разные вещи.
     */
    public function isCreationOnly(): bool
    {
        return count($this->snapshot) === 1 && ($this->snapshot[0]['isNew'] ?? false);
    }

    /**
     * Пересобирает человекочитаемый $description из АКТУАЛЬНОГО списка
     * $snapshot (объединение полей по ВСЕМ накопленным правкам, без
     * повторов) — единая точка после любого appendSnapshot()/setSnapshot(),
     * вместо ручной склейки строк на стороне вызывающего кода (TicketListener
     * раньше собирал строку из $labels отдельно от snapshot — при накоплении
     * за 24ч это было бы неверно: $labels новой правки не включали бы поля,
     * изменившиеся ПРЕЖДЕ в этом же окне). FIELD_LABELS переиспользован из
     * EntityRevision — один и тот же перевод имён полей, не дублируем.
     *
     * Для isCreationOnly() (см. выше) текст другой — "Изменены поля: ..."
     * вводит в заблуждение, когда речь о самой первой публикации объявления,
     * а не о правке (05.09.2026, по жалобе на уведомление, которое читалось
     * как диф правки для только что созданного тикета).
     */
    public function refreshDescriptionFromSnapshot(): static
    {
        $fields = [];
        foreach ($this->snapshot as $entry) {
            foreach (array_keys($entry['changes'] ?? []) as $field) {
                $fields[$field] = true;
            }
        }

        $labels = array_map(
            fn(string $field): string => EntityRevision::FIELD_LABELS[$field] ?? $field,
            array_keys($fields),
        );

        $this->setDescription(
            $this->isCreationOnly()
                ? 'Новое объявление на проверку'
                : 'Изменены поля: ' . implode(', ', $labels),
        );

        return $this;
    }

    protected function getFieldLabels(): array
    {
        return EntityRevision::FIELD_LABELS;
    }

    public function isApproved(): bool
    {
        return $this->approved;
    }

    public function setApproved(bool $approved): static
    {
        if ($this->approved === true && $approved === false) {
            throw new \LogicException('Revoking approval is not allowed: approved cannot be reverted back to false.');
        }

        // Если тикет уже забанен, Ticket::setApproved(true) сам откажется
        // применить значение (см. Ticket::setBanned/setApproved) — но без
        // этой проверки approved у самой заявки на подтверждение всё равно
        // проставился бы в true, создавая рассинхрон с реальным состоянием
        // тикета (заявка "одобрена", а тикет как был неодобрен, так и остался).
        if ($approved && $this->ticket?->getBanned()) {
            return $this;
        }

        $this->approved = $approved;

        if ($approved && $this->ticket !== null) {
            $this->ticket->setApproved(true);
        }

        return $this;
    }

    public function getAdministrant(): ?User
    {
        return $this->administrant;
    }

    public function setAdministrant(?User $administrant): static
    {
        $this->administrant = $administrant;

        return $this;
    }

    public function getTicket(): ?Ticket
    {
        return $this->ticket;
    }

    public function setTicket(?Ticket $ticket): static
    {
        $this->ticket = $ticket;

        // Если approval включили до привязки тикета.
        if ($this->approved && $ticket !== null) {
            $ticket->setApproved(true);
        }

        return $this;
    }
}
