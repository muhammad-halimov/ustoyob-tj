<?php

namespace App\Controller\Admin\Ticket\Ticket;

use App\Controller\Admin\Extra\MultipleImageCrudController;
use App\Controller\Admin\Geography\Abstract\AddressCrudController;
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
use EasyCorp\Bundle\EasyAdminBundle\Field\IdField;
use EasyCorp\Bundle\EasyAdminBundle\Field\NumberField;
use EasyCorp\Bundle\EasyAdminBundle\Field\TextEditorField;
use EasyCorp\Bundle\EasyAdminBundle\Field\TextField;
use App\Controller\Admin\Traits\AdminActionsTrait;
use App\Controller\Admin\Traits\TimestampFieldsTrait;
use App\Controller\Admin\Traits\NonAdminUserQueryTrait;

class TicketCrudController extends AbstractCrudController
{
    use NonAdminUserQueryTrait;

    use TimestampFieldsTrait;

    use AdminActionsTrait;

    public static function getEntityFqcn(): string
    {
        return Ticket::class;
    }

    public function configureAssets(Assets $assets): Assets
    {
        return parent::configureAssets($assets)->addJsFile("assets/js/ticketCrud.js");
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


    public function configureFields(string $pageName): iterable
    {
        yield IdField::new('id')
            ->hideOnForm();

        yield BooleanField::new('active', 'Актуально')
            ->addCssClass("form-switch")
            ->setColumns(2);

        yield BooleanField::new('service', 'Услуга')
            ->addCssClass("form-switch")
            ->setColumns(2);

        yield BooleanField::new('negotiableBudget', 'Договорная цена')
            ->addCssClass("form-switch")
            ->setColumns(8);

        yield AssociationField::new('author', 'Клиент')
            ->setQueryBuilder($this->nonAdminQb())
            ->setRequired(true)
            ->addCssClass("author-field")
            ->setColumns(6);

        yield AssociationField::new('master', 'Мастер')
            ->setQueryBuilder($this->nonAdminQb())
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

        yield CollectionField::new('images', 'Галерея изображений')
            ->useEntryCrudForm(MultipleImageCrudController::class)
            ->hideOnIndex()
            ->setColumns(6)
            ->setRequired(false);

        yield CollectionField::new('addresses', 'Адрес')
            ->useEntryCrudForm(AddressCrudController::class)
            ->setRequired(false)
            ->setFormTypeOptions(['by_reference' => false])
            ->setColumns(6);

        yield from $this->timestampFields();
    }
}
