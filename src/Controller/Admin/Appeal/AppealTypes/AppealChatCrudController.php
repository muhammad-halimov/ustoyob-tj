<?php

namespace App\Controller\Admin\Appeal\AppealTypes;

use App\Controller\Admin\Appeal\AppealImageCrudController;
use App\Entity\Appeal\AppealTypes\AppealChat;
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

class AppealChatCrudController extends AbstractCrudController
{
    public static function getEntityFqcn(): string
    {
        return AppealChat::class;
    }

    public function configureCrud(Crud $crud): Crud
    {
        return parent::configureCrud($crud)
            ->setEntityPermission('ROLE_ADMIN')
            ->setEntityLabelInPlural('Жалоба на чат')
            ->setEntityLabelInSingular('жалобу на чат')
            ->setPageTitle(Crud::PAGE_NEW, 'Добавление жалобы на чат')
            ->setPageTitle(Crud::PAGE_EDIT, 'Изменение жалобы на чат')
            ->setPageTitle(Crud::PAGE_DETAIL, "Информация о жалобе на чат");
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

        yield TextField::new('title', 'Заголовок')
            ->setRequired(true)
            ->setColumns(12);

        yield AssociationField::new('author', 'Истец')
            ->setRequired(true)
            ->setColumns(12);

        yield AssociationField::new('respondent', 'Ответчик')
            ->setRequired(true)
            ->setColumns(12);

        yield AssociationField::new('chat', 'Чат')
            ->setRequired(true)
            ->setColumns(12);

        yield ChoiceField::new('complaintReason', 'Причина жалобы')
            ->setChoices(AppealChat::COMPLAINTS)
            ->setRequired(true)
            ->setColumns(12);

        yield TextField::new('description', 'Описание')
            ->setRequired(true)
            ->setColumns(12);

        yield CollectionField::new('appealChatImages', 'Галерея изображений')
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
