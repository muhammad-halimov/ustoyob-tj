<?php

namespace App\Controller\Admin\User\Occupation;

use App\Controller\Admin\Extra\TranslationCrudController;
use App\Controller\Admin\Field\VichImageField;
use App\Entity\User\Occupation;
use EasyCorp\Bundle\EasyAdminBundle\Config\Action;
use EasyCorp\Bundle\EasyAdminBundle\Config\Actions;
use EasyCorp\Bundle\EasyAdminBundle\Config\Crud;
use EasyCorp\Bundle\EasyAdminBundle\Controller\AbstractCrudController;
use EasyCorp\Bundle\EasyAdminBundle\Field\AssociationField;
use EasyCorp\Bundle\EasyAdminBundle\Field\CollectionField;
use EasyCorp\Bundle\EasyAdminBundle\Field\IdField;
use EasyCorp\Bundle\EasyAdminBundle\Field\IntegerField;
use EasyCorp\Bundle\EasyAdminBundle\Field\TextEditorField;
use App\Controller\Admin\Traits\AdminActionsTrait;
use App\Controller\Admin\Traits\TimestampFieldsTrait;
use App\Controller\Admin\Traits\VichImageHelpTrait;

class OccupationCrudController extends AbstractCrudController
{
    use VichImageHelpTrait;

    use TimestampFieldsTrait;

    use AdminActionsTrait;

    public static function getEntityFqcn(): string
    {
        return Occupation::class;
    }

    public function configureCrud(Crud $crud): Crud
    {
        return parent::configureCrud($crud)
            ->setEntityPermission('ROLE_ADMIN')
            ->setEntityLabelInPlural('Специальности')
            ->setEntityLabelInSingular('специальность')
            ->setPageTitle(Crud::PAGE_NEW, 'Добавление специальности')
            ->setPageTitle(Crud::PAGE_EDIT, 'Изменение специальности')
            ->setPageTitle(Crud::PAGE_DETAIL, "Информация о специальности");
    }


    public function configureFields(string $pageName): iterable
    {
        yield IdField::new('id')
            ->hideOnForm();

        yield CollectionField::new('translations', 'Название')
            ->useEntryCrudForm(TranslationCrudController::class)
            ->setFormTypeOptions(['by_reference' => false])
            ->setColumns(5)
            ->setRequired(false);

        yield AssociationField::new('categories', 'Категории работ')
            ->setFormTypeOptions(['by_reference' => false])
            ->setColumns(5);

        yield IntegerField::new('priority', 'Порядок')
            ->setColumns(2)
            ->setRequired(false);

        yield TextEditorField::new('description', 'Описание')
            ->setColumns(10)
            ->setRequired(true);

        yield VichImageField::new('imageFile', 'Фото')
            ->setHelp($this->vichImageBadgeHelp())
            ->onlyOnForms()
            ->setColumns(2);

        yield AssociationField::new('master', 'Мастеров')
            ->hideOnForm();

        yield from $this->timestampFields();
    }
}
