<?php

namespace App\Controller\Admin\Ticket\Unit;

use App\Controller\Admin\Extra\TranslationCrudController;
use App\Entity\Ticket\Unit;
use EasyCorp\Bundle\EasyAdminBundle\Config\Crud;
use EasyCorp\Bundle\EasyAdminBundle\Controller\AbstractCrudController;
use EasyCorp\Bundle\EasyAdminBundle\Field\CollectionField;
use EasyCorp\Bundle\EasyAdminBundle\Field\IdField;
use EasyCorp\Bundle\EasyAdminBundle\Field\IntegerField;
use EasyCorp\Bundle\EasyAdminBundle\Field\TextEditorField;
use App\Controller\Admin\Traits\TimestampFieldsTrait;

class UnitCrudController extends AbstractCrudController
{
    use TimestampFieldsTrait;

    public static function getEntityFqcn(): string
    {
        return Unit::class;
    }

    public function configureCrud(Crud $crud): Crud
    {
        return parent::configureCrud($crud)
            ->setEntityPermission('ROLE_SUPER_ADMIN')
            ->setEntityLabelInPlural('Единицы измерения')
            ->setEntityLabelInSingular('единицу измерения')
            ->setPageTitle(Crud::PAGE_NEW, 'Добавление единицы измерения')
            ->setPageTitle(Crud::PAGE_EDIT, 'Изменение единицы измерения')
            ->setPageTitle(Crud::PAGE_DETAIL, "Информация об единицы измерения")
            ->setDefaultSort(['createdAt' => 'DESC']);
    }

    public function configureFields(string $pageName): iterable
    {
        yield IdField::new('id')
            ->hideOnForm();

        yield IntegerField::new('priority', 'Порядок')
            ->setColumns(1)
            ->setRequired(false);

        yield CollectionField::new('translations', 'Название')
            ->useEntryCrudForm(TranslationCrudController::class)
            ->setFormTypeOptions(['by_reference' => false])
            ->setColumns(12)
            ->setRequired(false);

        yield from $this->timestampFields();
    }
}
