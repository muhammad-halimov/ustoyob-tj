<?php

namespace App\Controller\Admin\Appeal\AppealTypes;

use App\Controller\Admin\Appeal\AppealImageCrudController;
use App\Entity\Appeal\AppealTypes\AppealTicket;
use Doctrine\ORM\QueryBuilder;
use EasyCorp\Bundle\EasyAdminBundle\Config\Action;
use EasyCorp\Bundle\EasyAdminBundle\Config\Actions;
use EasyCorp\Bundle\EasyAdminBundle\Config\Crud;
use EasyCorp\Bundle\EasyAdminBundle\Controller\AbstractCrudController;
use EasyCorp\Bundle\EasyAdminBundle\Field\AssociationField;
use EasyCorp\Bundle\EasyAdminBundle\Field\ChoiceField;
use EasyCorp\Bundle\EasyAdminBundle\Field\CollectionField;
use EasyCorp\Bundle\EasyAdminBundle\Field\DateTimeField;
use EasyCorp\Bundle\EasyAdminBundle\Field\IdField;
use EasyCorp\Bundle\EasyAdminBundle\Field\TextField;

class AppealTicketCrudController extends AbstractCrudController
{
    public static function getEntityFqcn(): string
    {
        return AppealTicket::class;
    }

    public function configureCrud(Crud $crud): Crud
    {
        return parent::configureCrud($crud)
            ->setEntityPermission('ROLE_ADMIN')
            ->setEntityLabelInPlural('Жалоба на объявление/услугу')
            ->setEntityLabelInSingular('жалобу на объявление/услугу')
            ->setPageTitle(Crud::PAGE_NEW, 'Добавление жалобы на объявление/услугу')
            ->setPageTitle(Crud::PAGE_EDIT, 'Изменение жалобы на объявление/услугу')
            ->setPageTitle(Crud::PAGE_DETAIL, "Информация о жалобе на объявление/услугу");
    }


    public function configureActions(Actions $actions): Actions
    {
        $actions
            ->add(Crud::PAGE_INDEX, Action::DETAIL);

        $actions
            ->reorder(Crud::PAGE_INDEX, [
                Action::DETAIL,
                Action::EDIT,
                Action::DELETE
            ]);

        return parent::configureActions($actions)
            ->setPermissions([
                Action::NEW => 'ROLE_ADMIN',
                Action::DELETE => 'ROLE_ADMIN',
                Action::EDIT => 'ROLE_ADMIN',
            ]);
    }

    public function configureFields(string $pageName): iterable
    {
        yield IdField::new('id')
            ->hideOnForm();

        yield TextField::new('title', 'Заголовок')
            ->setRequired(true)
            ->setColumns(12);

        yield AssociationField::new('author', 'Истец')
            ->setQueryBuilder(function (QueryBuilder $qb) {
                return $qb->andWhere("CAST(entity.roles as text) NOT LIKE '%ROLE_ADMIN%'");
            })
            ->setRequired(true)
            ->setColumns(12);

        yield AssociationField::new('respondent', 'Ответчик')
            ->setQueryBuilder(function (QueryBuilder $qb) {
                return $qb->andWhere("CAST(entity.roles as text) NOT LIKE '%ROLE_ADMIN%'");
            })
            ->setRequired(true)
            ->setColumns(12);

        yield AssociationField::new('ticket', 'Объявление / Услуга')
            ->setRequired(true)
            ->setColumns(12);

        yield ChoiceField::new('reason', 'Причина жалобы')
            ->setChoices(AppealTicket::COMPLAINTS)
            ->setRequired(true)
            ->setColumns(12);

        yield TextField::new('description', 'Описание')
            ->setRequired(true)
            ->setColumns(12);

        yield CollectionField::new('appealTicketImages', 'Галерея изображений')
            ->useEntryCrudForm(AppealImageCrudController::class)
            ->hideOnIndex()
            ->setColumns(12)
            ->setRequired(false);

        yield DateTimeField::new('updatedAt', 'Обновлено')
            ->hideOnForm();

        yield DateTimeField::new('createdAt', 'Создано')
            ->hideOnForm();
    }
}
