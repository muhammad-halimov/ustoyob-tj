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
use EasyCorp\Bundle\EasyAdminBundle\Field\TextField;

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
            ->setEntityLabelInPlural('ТП / Жалобы')
            ->setEntityLabelInSingular('талон / жалобу')
            ->setPageTitle(Crud::PAGE_NEW, 'Добавление талона / жалобы')
            ->setPageTitle(Crud::PAGE_EDIT, 'Изменение талона / жалобы')
            ->setPageTitle(Crud::PAGE_DETAIL, "Информация о талоне / жалобе");
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

        yield ChoiceField::new('type', 'Тип')
            ->setRequired(true)
            ->renderExpanded()
            ->addCssClass("form-switch")
            ->setChoices(Appeal::TYPES)
            ->setColumns(12);

        yield BooleanField::new('ticketAppeal', 'Жалоба на объявление / услугу')
            ->hideOnIndex()
            ->setColumns(12);

        yield TextField::new('title', 'Заголовок')
            ->setRequired(true)
            ->setColumns(6);

        yield ChoiceField::new('supportReason', 'Категория талона')
            ->setColumns(6)
            ->setChoices(Appeal::SUPPORT)
            ->addCssClass('support-field')
            ->setRequired(true);

        yield ChoiceField::new('status', 'Статус')
            ->setColumns(3)
            ->setChoices(Appeal::STATUSES)
            ->addCssClass('status-field')
            ->setRequired(true);

        yield ChoiceField::new('priority', 'Приоритет')
            ->setColumns(3)
            ->setChoices(Appeal::PRIORITIES)
            ->addCssClass('priority-field')
            ->setRequired(true);

        yield AssociationField::new('administrant', 'Исполнитель')
            ->hideOnIndex()
            ->setRequired(true)
            ->addCssClass('administrant-field')
            ->setColumns(6);

        yield TextEditorField::new('description', 'Описание')
            ->hideOnIndex()
            ->setRequired(true)
            ->setColumns(12);

        yield AssociationField::new('author', 'Клиент / Мастер - Истец')
            ->setRequired(true)
            ->setColumns(6);

        yield AssociationField::new('ticket', 'Объявление / Услуга')
            ->hideOnIndex()
            ->setRequired(true)
            ->addCssClass('ticket-field')
            ->setColumns(6);

        yield ChoiceField::new('complaintReason', 'Причина жалобы')
            ->setColumns(6)
            ->setChoices(Appeal::COMPLAINTS)
            ->addCssClass('compliant-field')
            ->setRequired(true);

        yield AssociationField::new('respondent', 'Клиент / Мастер - Ответчик')
            ->hideOnIndex()
            ->setRequired(true)
            ->addCssClass('respondent-field')
            ->setColumns(6);

        yield CollectionField::new('appealImages', 'Галерея изображений')
            ->useEntryCrudForm(AppealImageCrudController::class)
            ->hideOnIndex()
            ->setColumns(12)
            ->setRequired(false);

        yield CollectionField::new('appealMessages', 'Сообщения')
            ->addCssClass('messages-field')
            ->useEntryCrudForm(AppealMessageCrudController::class)
            ->hideOnIndex()
            ->setColumns(12)
            ->setRequired(false);

        yield DateTimeField::new('updatedAt', 'Обновлено')
            ->hideOnForm()
            ->hideOnIndex();

        yield DateTimeField::new('createdAt', 'Создано')
            ->hideOnForm();
    }
}
