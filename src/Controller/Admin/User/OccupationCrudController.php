<?php

namespace App\Controller\Admin\User;

use App\Controller\Admin\Extra\TranslationCrudController;
use App\Controller\Admin\Field\VichImageField;
use App\Entity\User\Occupation;
use EasyCorp\Bundle\EasyAdminBundle\Config\Action;
use EasyCorp\Bundle\EasyAdminBundle\Config\Actions;
use EasyCorp\Bundle\EasyAdminBundle\Config\Crud;
use EasyCorp\Bundle\EasyAdminBundle\Controller\AbstractCrudController;
use EasyCorp\Bundle\EasyAdminBundle\Field\AssociationField;
use EasyCorp\Bundle\EasyAdminBundle\Field\CollectionField;
use EasyCorp\Bundle\EasyAdminBundle\Field\DateTimeField;
use EasyCorp\Bundle\EasyAdminBundle\Field\IdField;
use EasyCorp\Bundle\EasyAdminBundle\Field\IntegerField;
use EasyCorp\Bundle\EasyAdminBundle\Field\TextEditorField;

class OccupationCrudController extends AbstractCrudController
{
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

        yield CollectionField::new('translations', 'Название')
            ->useEntryCrudForm(TranslationCrudController::class)
            ->setFormTypeOptions(['by_reference' => false])
            ->setColumns(6)
            ->setRequired(false);

        yield AssociationField::new('categories', 'Категории работ')
            ->setFormTypeOptions(['by_reference' => false])
            ->setColumns(6);

        yield TextEditorField::new('description', 'Описание')
            ->setColumns(12)
            ->setRequired(true);

        yield AssociationField::new('master', 'Мастеров')
            ->hideOnForm();

        yield VichImageField::new('imageFile', 'Изображение')
            ->setHelp('
                <div class="mt-3">
                    <span class="badge badge-info">*.jpg</span>
                    <span class="badge badge-info">*.jpeg</span>
                    <span class="badge badge-info">*.png</span>
                    <span class="badge badge-info">*.jiff</span>
                    <span class="badge badge-info">*.webp</span>
                </div>
            ')
            ->onlyOnForms()
            ->setColumns(12);

        yield IntegerField::new('order', 'Порядок')
            ->setColumns(2)
            ->setRequired(false);

        yield DateTimeField::new('updatedAt', 'Обновлено')
            ->hideOnForm();

        yield DateTimeField::new('createdAt', 'Создано')
            ->hideOnForm();
    }
}
