<?php

namespace App\Controller\Admin\Geography;

use App\Entity\Extra\Translation;
use EasyCorp\Bundle\EasyAdminBundle\Controller\AbstractCrudController;
use EasyCorp\Bundle\EasyAdminBundle\Field\ChoiceField;
use EasyCorp\Bundle\EasyAdminBundle\Field\DateTimeField;
use EasyCorp\Bundle\EasyAdminBundle\Field\IdField;
use EasyCorp\Bundle\EasyAdminBundle\Field\TextField;

class TranslationCrudController extends AbstractCrudController
{
    public static function getEntityFqcn(): string
    {
        return Translation::class;
    }

    public function configureFields(string $pageName): iterable
    {
        yield IdField::new('id')
            ->hideOnForm();

        yield ChoiceField::new('locale', 'Язык')
            ->setColumns(12)
            ->setChoices(Translation::LOCALES)
            ->setRequired(true);

        yield TextField::new('title', 'Название')
            ->setColumns(12)
            ->setRequired(true);

        yield DateTimeField::new('updatedAt', 'Обновлено')
            ->hideOnForm();

        yield DateTimeField::new('createdAt', 'Создано')
            ->hideOnForm();
    }
}
