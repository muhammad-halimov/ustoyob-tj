<?php

namespace App\Controller\Admin\Ticket;

use App\Entity\Ticket\Unit;
use EasyCorp\Bundle\EasyAdminBundle\Config\Crud;
use EasyCorp\Bundle\EasyAdminBundle\Controller\AbstractCrudController;
use EasyCorp\Bundle\EasyAdminBundle\Field\DateTimeField;
use EasyCorp\Bundle\EasyAdminBundle\Field\IdField;
use EasyCorp\Bundle\EasyAdminBundle\Field\TextEditorField;
use EasyCorp\Bundle\EasyAdminBundle\Field\TextField;

class UnitCrudController extends AbstractCrudController
{
    public static function getEntityFqcn(): string
    {
        return Unit::class;
    }

    public function configureCrud(Crud $crud): Crud
    {
        return parent::configureCrud($crud)
            ->setEntityPermission('ROLE_ADMIN')
            ->setEntityLabelInPlural('Единицы измерения')
            ->setEntityLabelInSingular('единицу измерения')
            ->setPageTitle(Crud::PAGE_NEW, 'Добавление единицы измерения')
            ->setPageTitle(Crud::PAGE_EDIT, 'Изменение единицы измерения')
            ->setPageTitle(Crud::PAGE_DETAIL, "Информация об единицы измерения");
    }

    public function configureFields(string $pageName): iterable
    {
        yield IdField::new('id')
            ->hideOnForm();

        yield TextField::new('title', 'Единица измерения')
            ->setRequired(true)
            ->setColumns(12);

        yield TextEditorField::new('description', 'Описание')
            ->setColumns(12);

        yield DateTimeField::new('updatedAt', 'Обновлено')
            ->hideOnForm();

        yield DateTimeField::new('createdAt', 'Создано')
            ->hideOnForm();
    }
}
