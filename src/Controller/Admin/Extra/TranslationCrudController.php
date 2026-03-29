<?php

namespace App\Controller\Admin\Extra;

use App\Entity\Extra\Translation;
use EasyCorp\Bundle\EasyAdminBundle\Controller\AbstractCrudController;
use EasyCorp\Bundle\EasyAdminBundle\Field\ChoiceField;
use EasyCorp\Bundle\EasyAdminBundle\Field\IdField;
use EasyCorp\Bundle\EasyAdminBundle\Field\TextEditorField;
use EasyCorp\Bundle\EasyAdminBundle\Field\TextField;
use App\Controller\Admin\Traits\TimestampFieldsTrait;

class TranslationCrudController extends AbstractCrudController
{
    use TimestampFieldsTrait;

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

        yield TextEditorField::new('description', 'Описание')
            ->setColumns(12)
            ->setRequired(false);

        yield from $this->timestampFields();
    }
}
