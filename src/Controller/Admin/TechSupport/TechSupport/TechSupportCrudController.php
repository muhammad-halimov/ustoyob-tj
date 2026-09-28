<?php

namespace App\Controller\Admin\TechSupport\TechSupport;

use App\Controller\Admin\TechSupport\TechSupportMessage\TechSupportMessageCrudController;
use App\Controller\Admin\Extra\MultipleImageCrudController;
use App\Entity\TechSupport\TechSupport;
use EasyCorp\Bundle\EasyAdminBundle\Config\Assets;
use EasyCorp\Bundle\EasyAdminBundle\Config\Crud;
use EasyCorp\Bundle\EasyAdminBundle\Controller\AbstractCrudController;
use EasyCorp\Bundle\EasyAdminBundle\Field\AssociationField;
use EasyCorp\Bundle\EasyAdminBundle\Field\ChoiceField;
use EasyCorp\Bundle\EasyAdminBundle\Field\CollectionField;
use EasyCorp\Bundle\EasyAdminBundle\Field\IdField;
use EasyCorp\Bundle\EasyAdminBundle\Field\TextEditorField;
use EasyCorp\Bundle\EasyAdminBundle\Field\TextField;
use App\Controller\Admin\Traits\AdminActionsTrait;
use App\Controller\Admin\Traits\TimestampFieldsTrait;
use App\Controller\Admin\Traits\NonAdminUserQueryTrait;
use Firebase\JWT\JWT;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Attribute\Route;

class TechSupportCrudController extends AbstractCrudController
{
    use NonAdminUserQueryTrait;

    use TimestampFieldsTrait;

    use AdminActionsTrait;

    public function __construct(
        // bind из services.yaml, тот же секрет, что и у API-подписных токенов —
        // см. mercureToken() ниже и аналогичный приём в TicketApprovalCrudController.
        private readonly string $mercureJwtSecret,
    ) {}

    public static function getEntityFqcn(): string
    {
        return TechSupport::class;
    }

    public function configureCrud(Crud $crud): Crud
    {
        return parent::configureCrud($crud)
            ->setEntityPermission('ROLE_SUPER_ADMIN')
            ->setEntityLabelInPlural('Тех. поддержка')
            ->setEntityLabelInSingular('талон')
            ->setPageTitle(Crud::PAGE_NEW, 'Добавление талона')
            ->setPageTitle(Crud::PAGE_EDIT, 'Изменение талона')
            ->setPageTitle(Crud::PAGE_DETAIL, "Информация о талоне")
            ->setDefaultSort(['createdAt' => 'DESC']);
    }

    // [MERCURE] JS слушает топик "tech-supports-queue" и показывает баннер
    // "Есть обновления" на списке — см. mercureToken()/TechSupportListMercureListener.
    public function configureAssets(Assets $assets): Assets
    {
        return parent::configureAssets($assets)->addJsFile('assets/js/techSupportCrud.js');
    }


    public function configureFields(string $pageName): iterable
    {
        yield IdField::new('id')
            ->hideOnForm();

        yield TextField::new('title', 'Заголовок')
            ->setRequired(true)
            ->setColumns(4);

        yield AssociationField::new('reason', 'Категория талона')
            ->setColumns(4)
            ->setRequired(false);

        yield TextField::new('guestEmail', 'Гостевая эл. почта')
            ->setColumns(4);

        yield ChoiceField::new('status', 'Статус')
            ->setColumns(3)
            ->setChoices(TechSupport::STATUSES)
            ->addCssClass('status-field')
            ->setRequired(true);

        yield ChoiceField::new('priority', 'Приоритет')
            ->setColumns(3)
            ->setChoices(TechSupport::PRIORITIES)
            ->addCssClass('priority-field')
            ->setRequired(true);

        yield AssociationField::new('author', 'Клиент / Мастер')
            ->setQueryBuilder($this->nonAdminQb())
            ->setColumns(3);

        yield AssociationField::new('administrant', 'Исполнитель / Админ')
            ->setQueryBuilder($this->adminOnlyQb())
            ->setRequired(true)
            ->addCssClass('administrant-field')
            ->setColumns(3);

        yield TextEditorField::new('description', 'Описание')
            ->setRequired(true)
            ->setColumns(12);

        yield CollectionField::new('techSupportMessages', 'Сообщения')
            ->addCssClass('messages-field')
            ->useEntryCrudForm(TechSupportMessageCrudController::class)
            ->hideOnIndex()
            ->setColumns(12)
            ->setRequired(false);

        yield CollectionField::new('images', 'Галерея изображений')
            ->useEntryCrudForm(MultipleImageCrudController::class)
            ->hideOnIndex()
            ->setColumns(12)
            ->setRequired(false);

        yield from $this->timestampFields();
    }

    /**
     * GET /admin/tech-supports/mercure-token
     *
     * Аналог TicketApprovalCrudController::mercureToken() — токен для
     * admin-сессии (см. её докблок за полное обоснование), топик
     * "tech-supports-queue".
     *
     * Путь НЕ "/tech-support/mercure-token" по той же причине, по которой
     * там выбран "/admin/ticket-approvals/..." — совпал бы с уже
     * зарегистрированным "/tech-support/{entityId}".
     */
    #[Route('/admin/tech-supports/mercure-token', name: 'admin_tech_support_mercure_token')]
    public function mercureToken(): JsonResponse
    {
        $this->denyAccessUnlessGranted('ROLE_SUPER_ADMIN');

        $topic = 'tech-supports-queue';

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
