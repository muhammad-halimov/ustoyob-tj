<?php

namespace App\Controller\Admin\Geography\District;

use App\Entity\Geography\District\Village;
use EasyCorp\Bundle\EasyAdminBundle\Controller\AbstractCrudController;
use EasyCorp\Bundle\EasyAdminBundle\Field\DateTimeField;
use EasyCorp\Bundle\EasyAdminBundle\Field\IdField;
use EasyCorp\Bundle\EasyAdminBundle\Field\TextEditorField;
use EasyCorp\Bundle\EasyAdminBundle\Field\TextField;

class VillageCrudController extends AbstractCrudController
{
    public static function getEntityFqcn(): string
    {
        return Village::class;
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

        yield DateTimeField::new('updatedAt', 'Обновлено')
            ->hideOnForm();

        yield DateTimeField::new('createdAt', 'Создано')
            ->hideOnForm();
    }
}
