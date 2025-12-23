<?php

namespace App\Controller\Admin\Ticket;

use App\Controller\Admin\Geography\AddressCrudController;
use App\Entity\Ticket\Ticket;
use Doctrine\ORM\QueryBuilder;
use EasyCorp\Bundle\EasyAdminBundle\Config\Action;
use EasyCorp\Bundle\EasyAdminBundle\Config\Actions;
use EasyCorp\Bundle\EasyAdminBundle\Config\Assets;
use EasyCorp\Bundle\EasyAdminBundle\Config\Crud;
use EasyCorp\Bundle\EasyAdminBundle\Controller\AbstractCrudController;
use EasyCorp\Bundle\EasyAdminBundle\Field\AssociationField;
use EasyCorp\Bundle\EasyAdminBundle\Field\BooleanField;
use EasyCorp\Bundle\EasyAdminBundle\Field\CollectionField;
use EasyCorp\Bundle\EasyAdminBundle\Field\DateTimeField;
use EasyCorp\Bundle\EasyAdminBundle\Field\IdField;
use EasyCorp\Bundle\EasyAdminBundle\Field\NumberField;
use EasyCorp\Bundle\EasyAdminBundle\Field\TextEditorField;
use EasyCorp\Bundle\EasyAdminBundle\Field\TextField;

class TicketCrudController extends AbstractCrudController
{
    public static function getEntityFqcn(): string
    {
        return Ticket::class;
    }

    public function configureAssets(Assets $assets): Assets
    {
        return parent::configureAssets($assets)
            ->addJsFile("assets/js/ticketCrud.js");
    }

    public function configureCrud(Crud $crud): Crud
    {
        return parent::configureCrud($crud)
            ->setEntityPermission('ROLE_ADMIN')
            ->setEntityLabelInPlural('Объявления')
            ->setEntityLabelInSingular('объявление')
            ->setPageTitle(Crud::PAGE_NEW, 'Добавление объявления')
            ->setPageTitle(Crud::PAGE_EDIT, 'Изменение объявления')
            ->setPageTitle(Crud::PAGE_DETAIL, "Информация о объявлении");
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

        yield BooleanField::new('active', 'Актуально')
            ->addCssClass("form-switch")
            ->setRequired(true)
            ->setColumns(2);

        yield BooleanField::new('service', 'Услуга')
            ->addCssClass("form-switch")
            ->setColumns(2);

        yield BooleanField::new('negotiableBudget', 'Договорная цена')
            ->addCssClass("form-switch")
            ->setColumns(8);

        yield AssociationField::new('author', 'Клиент')
            ->setQueryBuilder(function (QueryBuilder $qb) {
                return $qb->andWhere("CAST(entity.roles as text) NOT LIKE '%ROLE_ADMIN%'");
            })
            ->setRequired(true)
            ->addCssClass("author-field")
            ->setColumns(6);

        yield AssociationField::new('master', 'Мастер')
            ->setQueryBuilder(function (QueryBuilder $qb) {
                return $qb->andWhere("CAST(entity.roles as text) NOT LIKE '%ROLE_ADMIN%'");
            })
            ->setRequired(true)
            ->addCssClass("master-field")
            ->setColumns(6);

        yield TextEditorField::new('description', 'Описание')
            ->hideOnIndex()
            ->setRequired(true)
            ->setColumns(6);

        yield TextEditorField::new('notice', 'Доп. описание')
            ->hideOnIndex()
            ->setColumns(6);

        yield TextField::new('title', 'Название')
            ->setColumns(3)
            ->setRequired(true);

        yield AssociationField::new('category', 'Категория')
            ->setRequired(true)
            ->setColumns(3);

        yield AssociationField::new('subcategory', 'Подкатегория')
            ->hideOnIndex()
            ->setColumns(4);

        yield NumberField::new('budget', 'Бюджет')
            ->addCssClass("budget-field")
            ->setNumDecimals(1)
            ->setColumns(1);

        yield AssociationField::new('unit', 'Единицы')
            ->hideOnIndex()
            ->setRequired(true)
            ->setColumns(1);

        yield CollectionField::new('userTicketImages', 'Галерея изображений')
            ->useEntryCrudForm(TicketImageCrudController::class)
            ->hideOnIndex()
            ->setColumns(6)
            ->setRequired(false);

        yield CollectionField::new('addresses', 'Адрес')
            ->useEntryCrudForm(AddressCrudController::class)
            ->setRequired(false)
            ->setFormTypeOptions(['by_reference' => false])
            ->setColumns(6);

        yield DateTimeField::new('updatedAt', 'Обновлено')
            ->hideOnForm();

        yield DateTimeField::new('createdAt', 'Создано')
            ->hideOnForm();
    }
}
