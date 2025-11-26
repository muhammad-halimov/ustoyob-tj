<?php

namespace App\Controller\Admin\Appeal;

use App\Controller\Admin\Appeal\AppealTypes\AppealChatCrudController;
use App\Controller\Admin\Appeal\AppealTypes\AppealTicketCrudController;
use App\Entity\Appeal\Appeal;
use EasyCorp\Bundle\EasyAdminBundle\Config\Action;
use EasyCorp\Bundle\EasyAdminBundle\Config\Actions;
use EasyCorp\Bundle\EasyAdminBundle\Config\Assets;
use EasyCorp\Bundle\EasyAdminBundle\Config\Crud;
use EasyCorp\Bundle\EasyAdminBundle\Controller\AbstractCrudController;
use EasyCorp\Bundle\EasyAdminBundle\Field\ChoiceField;
use EasyCorp\Bundle\EasyAdminBundle\Field\CollectionField;
use EasyCorp\Bundle\EasyAdminBundle\Field\DateTimeField;
use EasyCorp\Bundle\EasyAdminBundle\Field\FormField;
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

        yield FormField::addTab('Типы жалоб', 'fas fa-list');
            yield ChoiceField::new('type', 'Тип')
                ->setRequired(true)
                ->allowMultipleChoices(false)
                ->renderExpanded()
                ->addCssClass("form-switch")
                ->setChoices(Appeal::TYPES)
                ->setColumns(12);

        yield TextEditorField::new('getInfo', 'Информация о жалобе')
            ->hideOnForm();

        yield FormField::addTab('Услуга / Объявление', 'fas fa-ticket');
            yield CollectionField::new('appealTicket', 'Жалоба на услугу/объявление')
                ->useEntryCrudForm(AppealTicketCrudController::class)
                ->allowDelete(false)
                ->allowAdd(false)
                ->hideOnIndex()
                ->setColumns(12)
                ->addCssClass("ticket-field")
                ->setRequired(false);

        yield FormField::addTab('Чат', 'fas fa-comments');
            yield CollectionField::new('appealChat', 'Жалоба на чат')
                ->useEntryCrudForm(AppealChatCrudController::class)
                ->allowDelete(false)
                ->allowAdd(false)
                ->hideOnIndex()
                ->setColumns(12)
                ->addCssClass("chat-field")
                ->setRequired(false);

        yield DateTimeField::new('updatedAt', 'Обновлено')
            ->hideOnForm();

        yield DateTimeField::new('createdAt', 'Создано')
            ->hideOnForm();
    }
}
