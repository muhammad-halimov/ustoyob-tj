<?php

namespace App\Controller\Admin\Geography\District;

use App\Entity\Geography\District\Settlement;
use EasyCorp\Bundle\EasyAdminBundle\Controller\AbstractCrudController;
use EasyCorp\Bundle\EasyAdminBundle\Field\CollectionField;
use EasyCorp\Bundle\EasyAdminBundle\Field\DateTimeField;
use EasyCorp\Bundle\EasyAdminBundle\Field\IdField;
use EasyCorp\Bundle\EasyAdminBundle\Field\TextEditorField;
use EasyCorp\Bundle\EasyAdminBundle\Field\TextField;

class SettlementCrudController extends AbstractCrudController
{
    public static function getEntityFqcn(): string
    {
        return Settlement::class;
    }

    public function configureFields(string $pageName): iterable
    {
        yield IdField::new('id')
            ->hideOnForm();

        yield TextField::new('title', 'Название')
            ->setColumns(12)
            ->setRequired(true);

        yield TextEditorField::new('description', 'Описание')
            ->setColumns(12);

        yield CollectionField::new('village', 'Село')
            ->useEntryCrudForm(VillageCrudController::class)
            ->hideOnIndex()
            ->setColumns(12)
            ->setRequired(false);

        yield DateTimeField::new('updatedAt', 'Обновлено')
            ->hideOnForm();

        yield DateTimeField::new('createdAt', 'Создано')
            ->hideOnForm();
    }
}
