<?php

namespace App\Controller\Admin\Appeal\AppealTypes;

use App\Controller\Admin\Extra\MultipleImageCrudController;
use App\Entity\Appeal\Types\AppealUser;
use Doctrine\ORM\QueryBuilder;
use EasyCorp\Bundle\EasyAdminBundle\Config\Action;
use EasyCorp\Bundle\EasyAdminBundle\Config\Actions;
use EasyCorp\Bundle\EasyAdminBundle\Config\Crud;
use EasyCorp\Bundle\EasyAdminBundle\Config\Filters;
use EasyCorp\Bundle\EasyAdminBundle\Controller\AbstractCrudController;
use EasyCorp\Bundle\EasyAdminBundle\Field\AssociationField;
use EasyCorp\Bundle\EasyAdminBundle\Field\CollectionField;
use EasyCorp\Bundle\EasyAdminBundle\Field\IdField;
use EasyCorp\Bundle\EasyAdminBundle\Field\TextEditorField;
use EasyCorp\Bundle\EasyAdminBundle\Field\TextField;
use EasyCorp\Bundle\EasyAdminBundle\Filter\EntityFilter;
use App\Controller\Admin\Traits\AdminActionsTrait;
use App\Controller\Admin\Traits\NonAdminUserQueryTrait;
use App\Controller\Admin\Traits\TimestampFieldsTrait;

class AppealUserCrudController extends AbstractCrudController
{
    use AdminActionsTrait;
    use NonAdminUserQueryTrait;
    use TimestampFieldsTrait;

    public static function getEntityFqcn(): string
    {
        return AppealUser::class;
    }

    public function configureCrud(Crud $crud): Crud
    {
        return parent::configureCrud($crud)
            ->setEntityPermission('ROLE_ADMIN')
            ->setEntityLabelInPlural('Жалобы на пользователей')
            ->setEntityLabelInSingular('жалобу на пользователя')
            ->setPageTitle(Crud::PAGE_NEW, 'Добавление жалобы на пользователя')
            ->setPageTitle(Crud::PAGE_EDIT, 'Изменение жалобы на пользователя')
            ->setPageTitle(Crud::PAGE_DETAIL, 'Информация о жалобе на пользователя');
    }

    public function configureFilters(Filters $filters): Filters
    {
        return $filters
            ->add(EntityFilter::new('author', 'Истец'))
            ->add(EntityFilter::new('respondent', 'Ответчик'))
            ->add(EntityFilter::new('reason', 'Причина жалобы'));
    }

    public function configureFields(string $pageName): iterable
    {
        yield IdField::new('id')
            ->hideOnForm();

        yield TextField::new('title', 'Заголовок')
            ->setRequired(true)
            ->setColumns(6);

        yield AssociationField::new('reason', 'Причина жалобы')
            ->setQueryBuilder(function (QueryBuilder $qb) {
                return $qb->where("entity.applicableTo IN ('both')");
            })
            ->setRequired(false)
            ->setColumns(6);

        yield AssociationField::new('author', 'Истец (null — анонимно)')
            ->setQueryBuilder($this->nonAdminQb())
            ->setRequired(false)
            ->setColumns(6);

        yield AssociationField::new('respondent', 'Ответчик')
            ->setQueryBuilder($this->nonAdminQb())
            ->setRequired(true)
            ->setColumns(6);

        yield TextEditorField::new('description', 'Описание')
            ->setRequired(true)
            ->setColumns(12)
            ->hideOnIndex();

        yield CollectionField::new('images', 'Галерея изображений')
            ->useEntryCrudForm(MultipleImageCrudController::class)
            ->hideOnIndex()
            ->setColumns(12)
            ->setRequired(false);

        yield from $this->timestampFields();
    }
}
