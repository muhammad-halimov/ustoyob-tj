<?php

namespace App\Controller\Admin\Chat;

use App\Entity\Chat\ChatMessage;
use EasyCorp\Bundle\EasyAdminBundle\Config\Action;
use EasyCorp\Bundle\EasyAdminBundle\Config\Actions;
use EasyCorp\Bundle\EasyAdminBundle\Config\Crud;
use EasyCorp\Bundle\EasyAdminBundle\Controller\AbstractCrudController;
use EasyCorp\Bundle\EasyAdminBundle\Field\AssociationField;
use EasyCorp\Bundle\EasyAdminBundle\Field\CollectionField;
use EasyCorp\Bundle\EasyAdminBundle\Field\DateTimeField;
use EasyCorp\Bundle\EasyAdminBundle\Field\IdField;
use EasyCorp\Bundle\EasyAdminBundle\Field\TextField;

class ChatMessageCrudController extends AbstractCrudController
{
    public static function getEntityFqcn(): string
    {
        return ChatMessage::class;
    }

    public function configureCrud(Crud $crud): Crud
    {
        return parent::configureCrud($crud)
            ->setEntityPermission('ROLE_ADMIN')
            ->setEntityLabelInPlural('Сообщения чата')
            ->setEntityLabelInSingular('сообщение чата')
            ->setPageTitle(Crud::PAGE_NEW, 'Добавление сообщении чата')
            ->setPageTitle(Crud::PAGE_EDIT, 'Изменение сообщении чата')
            ->setPageTitle(Crud::PAGE_DETAIL, "Информация о сообщении чата");
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

        yield AssociationField::new('author', 'Автор')
            ->setRequired(true)
            ->setColumns(12);

        yield TextField::new('text', 'Сообщение')
            ->setRequired(true)
            ->setColumns(12);

        yield AssociationField::new('replyTo', 'Ответ на сообщение')
            ->setRequired(false)
            ->setColumns(12);

        yield CollectionField::new('chatImages', 'Галерея изображений')
            ->useEntryCrudForm(ChatImageCrudController::class)
            ->hideOnIndex()
            ->setColumns(12)
            ->setRequired(false);

        yield DateTimeField::new('updatedAt', 'Обновлено')
            ->hideOnForm();

        yield DateTimeField::new('createdAt', 'Создано')
            ->hideOnForm();
    }
}
