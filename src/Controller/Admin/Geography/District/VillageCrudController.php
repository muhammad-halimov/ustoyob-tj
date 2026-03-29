<?php

namespace App\Controller\Admin\Geography\District;

use App\Controller\Admin\Extra\TranslationCrudController;
use App\Controller\Admin\Field\VichImageField;
use App\Entity\Geography\District\Village;
use EasyCorp\Bundle\EasyAdminBundle\Controller\AbstractCrudController;
use EasyCorp\Bundle\EasyAdminBundle\Field\CollectionField;
use EasyCorp\Bundle\EasyAdminBundle\Field\IdField;
use EasyCorp\Bundle\EasyAdminBundle\Field\TextEditorField;
use App\Controller\Admin\Traits\TimestampFieldsTrait;
use App\Controller\Admin\Traits\VichImageHelpTrait;

class VillageCrudController extends AbstractCrudController
{
    use VichImageHelpTrait;

    use TimestampFieldsTrait;

    public static function getEntityFqcn(): string
    {
        return Village::class;
    }

    public function configureFields(string $pageName): iterable
    {
        yield IdField::new('id')
            ->hideOnForm();

        yield CollectionField::new('translations', 'Название')
            ->useEntryCrudForm(TranslationCrudController::class)
            ->setFormTypeOptions(['by_reference' => false])
            ->setColumns(12)
            ->setRequired(false);

        yield TextEditorField::new('description', 'Описание')
            ->setColumns(12);

        yield VichImageField::new('imageFile', 'Фото')
            ->setHelp($this->vichImageBadgeHelp())
            ->onlyOnForms()
            ->setColumns(12);

        yield from $this->timestampFields();
    }
}
