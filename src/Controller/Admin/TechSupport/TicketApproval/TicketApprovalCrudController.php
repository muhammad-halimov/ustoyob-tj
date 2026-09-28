<?php

namespace App\Controller\Admin\TechSupport\TicketApproval;

use App\Controller\Admin\Ticket\Ticket\TicketCrudController;
use App\Controller\Admin\Traits\AdminActionsTrait;
use App\Controller\Admin\Traits\NonAdminUserQueryTrait;
use App\Controller\Admin\Traits\TimestampFieldsTrait;
use App\Entity\TechSupport\TicketApproval;
use Doctrine\ORM\EntityManagerInterface;
use EasyCorp\Bundle\EasyAdminBundle\Config\Action;
use EasyCorp\Bundle\EasyAdminBundle\Config\Actions;
use EasyCorp\Bundle\EasyAdminBundle\Config\Assets;
use EasyCorp\Bundle\EasyAdminBundle\Config\Crud;
use EasyCorp\Bundle\EasyAdminBundle\Config\Option\EA;
use EasyCorp\Bundle\EasyAdminBundle\Context\AdminContext;
use EasyCorp\Bundle\EasyAdminBundle\Controller\AbstractCrudController;
use EasyCorp\Bundle\EasyAdminBundle\Dto\BatchActionDto;
use EasyCorp\Bundle\EasyAdminBundle\Field\AssociationField;
use EasyCorp\Bundle\EasyAdminBundle\Field\BooleanField;
use EasyCorp\Bundle\EasyAdminBundle\Field\IdField;
use EasyCorp\Bundle\EasyAdminBundle\Field\TextareaField;
use EasyCorp\Bundle\EasyAdminBundle\Field\TextEditorField;
use EasyCorp\Bundle\EasyAdminBundle\Router\AdminUrlGenerator;
use Doctrine\ORM\QueryBuilder;
use Firebase\JWT\JWT;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\RedirectResponse;
use Symfony\Component\HttpKernel\Exception\BadRequestHttpException;
use Symfony\Component\Routing\Attribute\Route;

class TicketApprovalCrudController extends AbstractCrudController
{
    use NonAdminUserQueryTrait;

    use TimestampFieldsTrait;

    // configureActions уже переопределён ниже (нужно доп. batch-действие) —
    // достаём базовую реализацию трейта под своим именем, чтобы не
    // дублировать её содержимое (стандартные DETAIL/EDIT/DELETE + права).
    use AdminActionsTrait {
        configureActions as private baseConfigureActions;
    }

    public function __construct(
        private readonly AdminUrlGenerator $adminUrlGenerator,
        // bind из services.yaml, тот же секрет, что и у API-подписных токенов
        // (ApiGetChatSubscribeTokenController и т.д.) — см. mercureToken() ниже.
        private readonly string            $mercureJwtSecret,
    ) {}

    public static function getEntityFqcn(): string
    {
        return TicketApproval::class;
    }

    public function configureCrud(Crud $crud): Crud
    {
        return parent::configureCrud($crud)
            ->setEntityPermission('ROLE_SUPER_ADMIN')
            ->setEntityLabelInPlural('Подтверждение объявлений/услуг')
            ->setEntityLabelInSingular('подтверждение')
            ->setPageTitle(Crud::PAGE_NEW, 'Добавление подтверждения')
            ->setPageTitle(Crud::PAGE_EDIT, 'Изменение подтверждения')
            ->setPageTitle(Crud::PAGE_DETAIL, "Информация о подтверждении")
            ->setDefaultSort(['createdAt' => 'DESC']);
    }

    // [MERCURE] JS слушает топик "ticket-approvals" и показывает баннер
    // "Есть обновления" на списке — см. mercureToken()/TicketApprovalListMercureListener.
    public function configureAssets(Assets $assets): Assets
    {
        return parent::configureAssets($assets)->addJsFile('assets/js/ticketApprovalCrud.js');
    }

    public function configureActions(Actions $actions): Actions
    {
        $actions = $this->baseConfigureActions($actions);

        // Массовое подтверждение — выделяешь несколько строк в списке и
        // одной кнопкой ставишь approved=true каждой (у отдельной строки то
        // же самое делается переключателем поля 'approved' — тут просто
        // пакетный вариант для очереди из нескольких заявок сразу).
        $actions->add(Crud::PAGE_INDEX, Action::new('batchApprove', 'Подтвердить выбранные', 'fas fa-check-double')
            ->createAsBatchAction()
            ->askConfirmation(
                'Подтвердить все выбранные заявки? Соответствующие тикеты станут одобренными и снова видны публично.',
                'Подтвердить'
            )
            ->linkToCrudAction('batchApprove'));

        return $actions;
    }

    public function configureFields(string $pageName): iterable
    {
        yield IdField::new('id')
            ->hideOnForm();

        yield BooleanField::new('approved', 'Одобрено')
            ->renderAsSwitch()
            ->setColumns(12);

        yield AssociationField::new('administrant', 'Исполнитель / Админ')
            ->setQueryBuilder($this->adminOnlyQb())
            ->addCssClass('administrant-field')
            ->setColumns(6)
            ->setRequired(true);

        yield AssociationField::new('ticket', 'Объявление / Услуга')
            ->setHelp($this->buildTicketPreviewLink($pageName))
            ->setQueryBuilder(fn (QueryBuilder $qb) => $qb->orderBy('entity.id', 'ASC'))
            ->setColumns(6)
            ->setRequired(true);

        yield TextEditorField::new('description', 'Описание')
            ->setColumns(12);

        // Биндим на виртуальные геттеры, а не на $snapshot (json-колонка)
        // напрямую: EasyAdmin определяет тип виджета по маппингу колонки и
        // падает на "Array to string conversion" при прямом биндинге на
        // json-поле, независимо от класса Field.
        //
        // ДВА разных поля на ОДНИ и те же данные, не одно — потому что
        // EasyAdmin рендерит DETAIL и EDIT/NEW через принципиально разные
        // пути: DETAIL — через setTemplateName() (я управляю выводом
        // напрямую), EDIT/NEW — всегда через настоящий Symfony Form-виджет
        // конкретного класса Field (тут — TextEditorType/TextareaType),
        // который сам, дополнительно, экранирует переданное значение.
        // Раньше здесь было одно HTML-поле (Trix) — на DETAIL оно показывало
        // "<br>" как перенос строки, а на EDIT удвоенно экранировало то же
        // значение ("<br>" превращался в видимый текст "&lt;br&gt;", уже
        // экранированный "&lt;div&gt;" — в "&amp;lt;div&amp;gt;", проверено
        // живьём) — единственным рабочим вариантом было прятать его с формы
        // насовсем (->hideOnForm()), из-за чего "было → стало" пропадало при
        // редактировании. Теперь вместо этого — раздельные поля, оба видны:
        //   - snapshotSummary (HTML, <br>) — только DETAIL, raw HTML.
        //   - snapshotSummaryPlain (текст, "\n") — только EDIT/NEW, обычный
        //     <textarea> (не Trix): значение НЕ предэкранировано, поэтому
        //     единственное экранирование самого Symfony Form-виджета —
        //     корректное, а "\n" браузер сам показывает как перенос строки
        //     (white-space: pre у textarea), без нужды в "<br>".
        yield TextEditorField::new('snapshotSummary', 'Что изменилось (было → стало)')
            ->setTemplateName('crud/field/text')
            ->setDisabled()
            ->onlyOnDetail()
            ->setColumns(12);

        yield TextareaField::new('snapshotSummaryPlain', 'Что изменилось (было → стало)')
            ->setDisabled()
            ->setNumOfRows(8)
            ->onlyOnForms()
            ->setColumns(12);

        yield from $this->timestampFields();
    }

    private function buildTicketPreviewLink(string $pageName): string
    {
        if (!in_array($pageName, [Crud::PAGE_EDIT, Crud::PAGE_DETAIL], true)) {
            return '';
        }

        /** @var TicketApproval|null $ticketApproval */
        $ticketApproval = $this->getContext()?->getEntity()?->getInstance();
        $ticket = $ticketApproval?->getTicket();

        if (!$ticket) return '';

        $url = $this->adminUrlGenerator
            ->setController(TicketCrudController::class)
            ->setAction(Crud::PAGE_EDIT)
            ->setEntityId($ticket->getId())
            ->generateUrl();

        // %s, а не %d (06.09.2026, переход на UUID-PK) — Ticket::$id
        // теперь Uuid-объект, не число; %d привёл бы к 0/предупреждению.
        /** @noinspection HtmlUnknownTarget */
        return sprintf('<a href="%s" target="_blank">Открыть карточку тикета #%s ↗</a>', $url, $ticket->getId());
    }

    /**
     * Обработчик batch-действия 'batchApprove' — ставит approved=true всем
     * выбранным TicketApproval разом. Переиспользует TicketApproval::
     * setApproved() как есть (та же сущность, что и при ручном подтверждении
     * одной строки переключателем поля 'approved') — вся связанная логика
     * (каскадное одобрение Ticket, защита от повторной установки true у уже
     * одобренной записи и т.д.) отрабатывает точно так же.
     *
     * CSRF-проверка и сверка entityFqcn — по тому же паттерну, что встроенный
     * AbstractCrudController::batchDelete().
     */
    public function batchApprove(AdminContext $context, BatchActionDto $batchActionDto, EntityManagerInterface $entityManager): RedirectResponse
    {
        if (!$this->isCsrfTokenValid('ea-batch-action-batchApprove-' . $batchActionDto->getEntityFqcn(), $batchActionDto->getCsrfToken())) {
            return $this->redirectToRoute($context->getDashboardRouteName());
        }

        if ($batchActionDto->getEntityFqcn() !== TicketApproval::class) {
            throw new BadRequestHttpException();
        }

        $repository = $entityManager->getRepository(TicketApproval::class);

        foreach ($batchActionDto->getEntityIds() as $entityId) {
            /** @var TicketApproval|null $approval */
            $approval = $repository->find($entityId);

            if ($approval && !$approval->isApproved()) {
                $approval->setApproved(true);
            }
        }

        $entityManager->flush();

        return $this->redirect(
            $this->adminUrlGenerator->setAction(Crud::PAGE_INDEX)->set(EA::PAGE, 1)->generateUrl()
        );
    }

    /**
     * GET /ticket-approval/mercure-token
     *
     * Аналог ApiGetChatSubscribeTokenController (см. API), но для admin-
     * сессии (firewall 'admin', form_login), а не JWT-Bearer — обычный
     * Symfony-маршрут внутри этого же CRUD-контроллера, доступ проверяется
     * стандартным IsGranted по сессионной куке, отдельный Bearer не нужен.
     *
     * Топик общий "ticket-approvals" (не по конкретной заявке) — вся очередь
     * видна любому ROLE_SUPER_ADMIN, см. configureCrud()/TicketApprovalListMercureListener.
     */
    // Путь НЕ "/ticket-approval/mercure-token" — он бы совпал с уже
    // зарегистрированным EasyAdmin-маршрутом "/ticket-approval/{entityId}"
    // (тот стоит раньше в таблице маршрутов и не ограничивает entityId
    // форматом UUID), из-за чего "mercure-token" ловился бы как entityId и
    // падал с ошибкой преобразования в uuid. Проверено живьём.
    #[Route('/admin/ticket-approvals/mercure-token', name: 'admin_ticket_approval_mercure_token')]
    public function mercureToken(): JsonResponse
    {
        $this->denyAccessUnlessGranted('ROLE_SUPER_ADMIN');

        $topic = 'ticket-approvals';

        $token = JWT::encode(
            payload: [
                'mercure' => ['subscribe' => [$topic]],
                'exp'     => time() + 3600,
            ],
            key: $this->mercureJwtSecret,
            alg: 'HS256',
        );

        return new JsonResponse(['token' => $token, 'topic' => $topic]);
    }
}
