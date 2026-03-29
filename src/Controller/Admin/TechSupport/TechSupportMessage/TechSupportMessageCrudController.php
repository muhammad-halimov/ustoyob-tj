<?php

namespace App\Controller\Admin\TechSupport\TechSupportMessage;

use App\Controller\Admin\Extra\MultipleImageCrudController;
use App\Entity\TechSupport\TechSupportMessage;
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

class TechSupportMessageCrudController extends AbstractCrudController
{
    use TimestampFieldsTrait;

    use AdminActionsTrait;

    public static function getEntityFqcn(): string
    {
        return TechSupportMessage::class;
    }

    public function configureCrud(Crud $crud): Crud
    {
        return parent::configureCrud($crud)
            ->setEntityPermission('ROLE_ADMIN')
            ->setEntityLabelInPlural('Сообщения ТП')
            ->setEntityLabelInSingular('сообщение тп')
            ->setPageTitle(Crud::PAGE_NEW, 'Добавление сообщении тп')
            ->setPageTitle(Crud::PAGE_EDIT, 'Изменение сообщении тп')
            ->setPageTitle(Crud::PAGE_DETAIL, "Информация о сообщении тп");
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

        yield CollectionField::new('images', 'Галерея изображений')
            ->useEntryCrudForm(MultipleImageCrudController::class)
            ->hideOnIndex()
            ->setColumns(12)
            ->setRequired(false);

        yield from $this->timestampFields();
    }
}
