<?php

namespace App\Controller\Admin\Chat\ChatMessage;

use App\Controller\Admin\Extra\MultipleImageCrudController;
use App\Entity\Chat\ChatMessage;
use EasyCorp\Bundle\EasyAdminBundle\Config\Action;
use EasyCorp\Bundle\EasyAdminBundle\Config\Actions;
use EasyCorp\Bundle\EasyAdminBundle\Config\Crud;
use EasyCorp\Bundle\EasyAdminBundle\Controller\AbstractCrudController;
use EasyCorp\Bundle\EasyAdminBundle\Field\AssociationField;
use EasyCorp\Bundle\EasyAdminBundle\Field\CollectionField;
use EasyCorp\Bundle\EasyAdminBundle\Field\IdField;
use EasyCorp\Bundle\EasyAdminBundle\Field\TextField;
use App\Controller\Admin\Traits\AdminActionsTrait;
use App\Controller\Admin\Traits\TimestampFieldsTrait;

class ChatMessageCrudController extends AbstractCrudController
{
    use TimestampFieldsTrait;

    use AdminActionsTrait;

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



    public function configureFields(string $pageName): iterable
    {
        yield IdField::new('id')
            ->hideOnForm();

        yield AssociationField::new('author', 'Автор')
            ->setRequired(true)
            ->setColumns(12);

        yield TextField::new('description', 'Сообщение')
            ->setRequired(true)
            ->setColumns(12);

        yield AssociationField::new('replyTo', 'Ответ на сообщение')
            ->setRequired(false)
            ->setColumns(12);

        yield CollectionField::new('images', 'Галерея изображений')
            ->useEntryCrudForm(MultipleImageCrudController::class)
            ->hideOnIndex()
            ->setColumns(12)
            ->setRequired(false);

        yield from $this->timestampFields();
    }
}
