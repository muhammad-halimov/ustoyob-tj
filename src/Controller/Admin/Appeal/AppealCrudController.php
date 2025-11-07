<?php

namespace App\Controller\Admin\Appeal;

use App\Entity\Appeal\Appeal;
use EasyCorp\Bundle\EasyAdminBundle\Config\Action;
use EasyCorp\Bundle\EasyAdminBundle\Config\Actions;
use EasyCorp\Bundle\EasyAdminBundle\Config\Assets;
use EasyCorp\Bundle\EasyAdminBundle\Config\Crud;
use EasyCorp\Bundle\EasyAdminBundle\Controller\AbstractCrudController;
use EasyCorp\Bundle\EasyAdminBundle\Field\AssociationField;
use EasyCorp\Bundle\EasyAdminBundle\Field\BooleanField;
use EasyCorp\Bundle\EasyAdminBundle\Field\ChoiceField;
use EasyCorp\Bundle\EasyAdminBundle\Field\CollectionField;
use EasyCorp\Bundle\EasyAdminBundle\Field\DateTimeField;
use EasyCorp\Bundle\EasyAdminBundle\Field\IdField;
use EasyCorp\Bundle\EasyAdminBundle\Field\TextEditorField;

class AppealCrudController extends AbstractCrudController
{
    public static function getEntityFqcn(): string
    {
        return Appeal::class;
    }

    public function configureAssets(Assets $assets): Assets
    {
        return parent::configureAssets($assets)
            ->addJsFile("assets/js/appealCrud.js");
    }

    public function configureCrud(Crud $crud): Crud
    {
        return parent::configureCrud($crud)
            ->setEntityPermission('ROLE_ADMIN')
            ->setEntityLabelInPlural('Жалобы')
            ->setEntityLabelInSingular('жалобу')
            ->setPageTitle(Crud::PAGE_NEW, 'Добавление жалобы')
            ->setPageTitle(Crud::PAGE_EDIT, 'Изменение жалобы')
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
            ->onlyOnIndex();

        yield BooleanField::new('ticketAppeal', 'Объявление')
            ->setColumns(12);

        yield AssociationField::new('user', 'Истец')
            ->setRequired(true)
            ->setColumns(6);

        yield AssociationField::new('ticket', 'Объявление')
            ->setRequired(true)
            ->addCssClass('ticket-field')
            ->setColumns(6);

        yield ChoiceField::new('reason', 'Причина')
            ->setColumns(6)
            ->setChoices(Appeal::REASONS)
            ->setRequired(true);

        yield AssociationField::new('respondent', 'Ответчик')
            ->setRequired(true)
            ->addCssClass('respondent-field')
            ->setColumns(6);

        yield TextEditorField::new('description', 'Описание')
            ->setRequired(true)
            ->setColumns(12);

        yield CollectionField::new('appealImages', 'Галерея изображений')
            ->useEntryCrudForm(AppealImageCrudController::class)
            ->hideOnIndex()
            ->setColumns(12)
            ->setRequired(false);

        yield DateTimeField::new('updatedAt', 'Обновлено')
            ->onlyOnIndex();

        yield DateTimeField::new('createdAt', 'Создано')
            ->onlyOnIndex();
    }
}
