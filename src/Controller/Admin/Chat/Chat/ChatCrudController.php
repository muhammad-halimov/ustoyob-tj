<?php

namespace App\Controller\Admin\Chat\Chat;

use App\Controller\Admin\Chat\ChatMessage\ChatMessageCrudController;
use App\Entity\Chat\Chat;
use EasyCorp\Bundle\EasyAdminBundle\Config\Action;
use EasyCorp\Bundle\EasyAdminBundle\Config\Actions;
use EasyCorp\Bundle\EasyAdminBundle\Config\Crud;
use EasyCorp\Bundle\EasyAdminBundle\Controller\AbstractCrudController;
use EasyCorp\Bundle\EasyAdminBundle\Field\AssociationField;
use EasyCorp\Bundle\EasyAdminBundle\Field\BooleanField;
use EasyCorp\Bundle\EasyAdminBundle\Field\CollectionField;
use EasyCorp\Bundle\EasyAdminBundle\Field\IdField;
use App\Controller\Admin\Traits\AdminActionsTrait;
use App\Controller\Admin\Traits\TimestampFieldsTrait;

class ChatCrudController extends AbstractCrudController
{
    use TimestampFieldsTrait;

    use AdminActionsTrait;

    public static function getEntityFqcn(): string
    {
        return Chat::class;
    }

    public function configureCrud(Crud $crud): Crud
    {
        return parent::configureCrud($crud)
            ->setEntityPermission('ROLE_ADMIN')
            ->setEntityLabelInPlural('Чат')
            ->setEntityLabelInSingular('чат')
            ->setPageTitle(Crud::PAGE_NEW, 'Добавление чата')
            ->setPageTitle(Crud::PAGE_EDIT, 'Изменение чата')
            ->setPageTitle(Crud::PAGE_DETAIL, "Информация о чате");
    }



    public function configureFields(string $pageName): iterable
    {
        yield IdField::new('id')
            ->hideOnForm();

        yield BooleanField::new('active', 'Актуально')
            ->addCssClass("form-switch")
            ->setColumns(12);

        yield AssociationField::new('author', 'Автор')
            ->setRequired(true)
            ->setColumns(4);

        yield AssociationField::new('replyAuthor', 'Ответчик')
            ->setRequired(true)
            ->setColumns(4);

        yield AssociationField::new('ticket', 'Услуга/Объявление')
            ->setColumns(4);

        yield CollectionField::new('messages', 'Сообщения')
            ->useEntryCrudForm(ChatMessageCrudController::class)
            ->hideOnIndex()
            ->setColumns(12)
            ->setRequired(false);

        yield from $this->timestampFields();
    }
}
