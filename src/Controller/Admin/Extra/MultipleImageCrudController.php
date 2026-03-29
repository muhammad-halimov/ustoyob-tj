<?php

namespace App\Controller\Admin\Extra;

use App\Controller\Admin\Field\VichImageField;
use App\Entity\Extra\MultipleImage;
use EasyCorp\Bundle\EasyAdminBundle\Controller\AbstractCrudController;
use EasyCorp\Bundle\EasyAdminBundle\Field\IdField;
use App\Controller\Admin\Traits\TimestampFieldsTrait;
use App\Controller\Admin\Traits\VichImageHelpTrait;

class MultipleImageCrudController extends AbstractCrudController
{
    use VichImageHelpTrait;

    use TimestampFieldsTrait;

    public static function getEntityFqcn(): string
    {
        return MultipleImage::class;
    }

    public function configureFields(string $pageName): iterable
    {
        yield IdField::new('id')
            ->hideOnForm();

        yield VichImageField::new('imageFile', 'Фото')
            ->setHelp($this->vichImageBadgeHelp())
            ->onlyOnForms()
            ->setColumns(12);

        yield from $this->timestampFields();
    }
}
