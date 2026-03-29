<?php

namespace App\Controller\Admin\Ticket\Category;

use App\Controller\Admin\Extra\TranslationCrudController;
use App\Controller\Admin\Field\VichImageField;
use App\Entity\Ticket\Category;
use EasyCorp\Bundle\EasyAdminBundle\Config\Action;
use EasyCorp\Bundle\EasyAdminBundle\Config\Actions;
use EasyCorp\Bundle\EasyAdminBundle\Config\Crud;
use EasyCorp\Bundle\EasyAdminBundle\Controller\AbstractCrudController;
use EasyCorp\Bundle\EasyAdminBundle\Field\CollectionField;
use EasyCorp\Bundle\EasyAdminBundle\Field\IdField;
use EasyCorp\Bundle\EasyAdminBundle\Field\IntegerField;
use EasyCorp\Bundle\EasyAdminBundle\Field\TextEditorField;
use App\Controller\Admin\Traits\AdminActionsTrait;
use App\Controller\Admin\Traits\TimestampFieldsTrait;
use App\Controller\Admin\Traits\VichImageHelpTrait;

class CategoryCrudController extends AbstractCrudController
{
    use VichImageHelpTrait;

    use TimestampFieldsTrait;

    use AdminActionsTrait;

    public static function getEntityFqcn(): string
    {
        return Category::class;
    }

    public function configureCrud(Crud $crud): Crud
    {
        return parent::configureCrud($crud)
            ->setEntityPermission('ROLE_ADMIN')
            ->setEntityLabelInPlural('Категории услуг')
            ->setEntityLabelInSingular('категорию услуг')
            ->setPageTitle(Crud::PAGE_NEW, 'Добавление категории')
            ->setPageTitle(Crud::PAGE_EDIT, 'Изменение категории')
            ->setPageTitle(Crud::PAGE_DETAIL, "Информация о категории");
    }


    public function configureFields(string $pageName): iterable
    {
        yield IdField::new('id')
            ->hideOnForm();

        yield CollectionField::new('translations', 'Название')
            ->useEntryCrudForm(TranslationCrudController::class)
            ->setFormTypeOptions(['by_reference' => false])
            ->setColumns(10)
            ->setRequired(false);

        yield IntegerField::new('priority', 'Порядок')
            ->setColumns(2)
            ->setRequired(false);

        yield TextEditorField::new('description', 'Описание')
            ->setColumns(10)
            ->setRequired(false);

        yield VichImageField::new('imageFile', 'Фото')
            ->setHelp($this->vichImageBadgeHelp())
            ->onlyOnForms()
            ->setColumns(2);

        yield from $this->timestampFields();
    }
}
