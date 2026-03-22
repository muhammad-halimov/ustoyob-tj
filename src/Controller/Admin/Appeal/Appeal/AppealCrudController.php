<?php

namespace App\Controller\Admin\Appeal\Appeal;

use App\Controller\Admin\Appeal\AppealTypes\AppealChatCrudController;
use App\Controller\Admin\Appeal\AppealTypes\AppealReviewCrudController;
use App\Controller\Admin\Appeal\AppealTypes\AppealTicketCrudController;
use App\Controller\Admin\Appeal\AppealTypes\AppealUserCrudController;
use App\Controller\Admin\Extra\MultipleImageCrudController;
use App\Entity\Appeal\Appeal;
use App\Entity\Appeal\AppealTypes\AppealChat;
use App\Entity\Appeal\AppealTypes\AppealReview;
use App\Entity\Appeal\AppealTypes\AppealUser;
use Doctrine\ORM\QueryBuilder;
use EasyCorp\Bundle\EasyAdminBundle\Config\Action;
use EasyCorp\Bundle\EasyAdminBundle\Config\Actions;
use EasyCorp\Bundle\EasyAdminBundle\Config\Crud;
use EasyCorp\Bundle\EasyAdminBundle\Config\Filters;
use EasyCorp\Bundle\EasyAdminBundle\Context\AdminContext;
use EasyCorp\Bundle\EasyAdminBundle\Controller\AbstractCrudController;
use EasyCorp\Bundle\EasyAdminBundle\Field\AssociationField;
use EasyCorp\Bundle\EasyAdminBundle\Field\ChoiceField;
use EasyCorp\Bundle\EasyAdminBundle\Field\CollectionField;
use EasyCorp\Bundle\EasyAdminBundle\Field\DateTimeField;
use EasyCorp\Bundle\EasyAdminBundle\Field\FormField;
use EasyCorp\Bundle\EasyAdminBundle\Field\IdField;
use EasyCorp\Bundle\EasyAdminBundle\Field\TextEditorField;
use EasyCorp\Bundle\EasyAdminBundle\Field\TextField;
use EasyCorp\Bundle\EasyAdminBundle\Filter\ChoiceFilter;
use EasyCorp\Bundle\EasyAdminBundle\Filter\EntityFilter;
use EasyCorp\Bundle\EasyAdminBundle\Router\AdminUrlGenerator;
use Symfony\Component\HttpFoundation\Response;

class AppealCrudController extends AbstractCrudController
{
    public function __construct(private readonly AdminUrlGenerator $adminUrlGenerator) {}

    public static function getEntityFqcn(): string
    {
        return Appeal::class;
    }

    public function configureCrud(Crud $crud): Crud
    {
        return parent::configureCrud($crud)
            ->setEntityPermission('ROLE_ADMIN')
            ->setEntityLabelInPlural('Жалобы')
            ->setEntityLabelInSingular('Жалобу')
            ->setPageTitle(Crud::PAGE_EDIT, "Редактирование жалобы")
            ->setPageTitle(Crud::PAGE_DETAIL, "Информация о жалобе");
    }

    public function configureActions(Actions $actions): Actions
    {
        $actions
            ->add(Crud::PAGE_INDEX, Action::DETAIL);

        $actions
            ->reorder(Crud::PAGE_INDEX, [
                Action::DETAIL,
                Action::EDIT,
                Action::DELETE,
            ]);

        return parent::configureActions($actions)
            ->disable(Action::NEW)
            ->setPermissions([
                Action::DELETE => 'ROLE_ADMIN',
            ]);
    }

    public function detail(AdminContext $context): Response
    {
        $entity = $context->getEntity()->getInstance();
        /** @noinspection PhpParamsInspection */
        $url = $this->adminUrlGenerator
            ->setController($this->resolveCrud($entity))
            ->setAction(Action::DETAIL)
            ->setEntityId($entity->getId())
            ->generateUrl();
        return $this->redirect($url);
    }

    public function edit(AdminContext $context): Response
    {
        $entity = $context->getEntity()->getInstance();
        /** @noinspection PhpParamsInspection */
        $url = $this->adminUrlGenerator
            ->setController($this->resolveCrud($entity))
            ->setAction(Action::EDIT)
            ->setEntityId($entity->getId())
            ->generateUrl();
        return $this->redirect($url);
    }

    private function resolveCrud(Appeal $entity): string
    {
        return match (true) {
            $entity instanceof AppealChat   => AppealChatCrudController::class,
            $entity instanceof AppealReview => AppealReviewCrudController::class,
            $entity instanceof AppealUser   => AppealUserCrudController::class,
            default                         => AppealTicketCrudController::class,
        };
    }

    public function configureFilters(Filters $filters): Filters
    {
        return $filters
            ->add(ChoiceFilter::new('type', 'Тип')->setChoices(Appeal::TYPES))
            ->add(EntityFilter::new('author', 'Истец'))
            ->add(EntityFilter::new('respondent', 'Ответчик'))
            ->add(EntityFilter::new('reason', 'Причина жалобы'));
    }

    public function configureFields(string $pageName): iterable
    {
        // ── Tab 1: Жалоба — общие поля из всех 3 sub-CRUD ──────────────────
        yield FormField::addTab('Жалоба');

        yield IdField::new('id')
            ->hideOnForm();

        yield ChoiceField::new('type', 'Тип')
            ->setChoices(Appeal::TYPES)
            ->renderAsBadges([
                'ticket' => 'primary',
                'chat'   => 'warning',
                'review' => 'success',
            ])
            ->setDisabled()
            ->setColumns(12);

        yield TextField::new('title', 'Заголовок')
            ->setRequired(true)
            ->setColumns(12);

        yield AssociationField::new('author', 'Истец (null — анонимно)')
            ->setQueryBuilder(fn (QueryBuilder $qb) =>
                $qb->andWhere("CAST(entity.roles as text) NOT LIKE '%ROLE_ADMIN%'")
            )
            ->setRequired(false)
            ->setColumns(6);

        yield AssociationField::new('respondent', 'Ответчик')
            ->setQueryBuilder(fn (QueryBuilder $qb) =>
                $qb->andWhere("CAST(entity.roles as text) NOT LIKE '%ROLE_ADMIN%'")
            )
            ->setRequired(false)
            ->setColumns(6);

        yield AssociationField::new('reason', 'Причина жалобы')
            ->setRequired(false)
            ->setColumns(12)
            ->hideOnIndex();

        yield TextEditorField::new('description', 'Описание')
            ->setRequired(false)
            ->setColumns(12)
            ->hideOnIndex();

        yield CollectionField::new('images', 'Галерея изображений')
            ->useEntryCrudForm(MultipleImageCrudController::class)
            ->hideOnIndex()
            ->setColumns(12)
            ->setRequired(false);

        yield DateTimeField::new('updatedAt', 'Обновлено')
            ->hideOnForm();

        yield DateTimeField::new('createdAt', 'Создано')
            ->hideOnForm();
    }
}
