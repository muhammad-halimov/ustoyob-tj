<?php

namespace App\Controller\Admin\Gallery;

use App\Controller\Admin\Extra\MultipleImageCrudController;
use App\Entity\Gallery\Gallery;
use Doctrine\ORM\QueryBuilder;
use EasyCorp\Bundle\EasyAdminBundle\Config\Action;
use EasyCorp\Bundle\EasyAdminBundle\Config\Actions;
use EasyCorp\Bundle\EasyAdminBundle\Config\Crud;
use EasyCorp\Bundle\EasyAdminBundle\Controller\AbstractCrudController;
use EasyCorp\Bundle\EasyAdminBundle\Field\AssociationField;
use EasyCorp\Bundle\EasyAdminBundle\Field\CollectionField;
use EasyCorp\Bundle\EasyAdminBundle\Field\IdField;
use App\Controller\Admin\Traits\AdminActionsTrait;
use App\Controller\Admin\Traits\TimestampFieldsTrait;
use App\Controller\Admin\Traits\NonAdminUserQueryTrait;

class GalleryCrudController extends AbstractCrudController
{
    use NonAdminUserQueryTrait;

    use TimestampFieldsTrait;

    use AdminActionsTrait;

    public static function getEntityFqcn(): string
    {
        return Gallery::class;
    }

    public function configureCrud(Crud $crud): Crud
    {
        return parent::configureCrud($crud)
            ->setEntityPermission('ROLE_ADMIN')
            ->setEntityLabelInPlural('Галерея работ')
            ->setEntityLabelInSingular('галерею работ')
            ->setPageTitle(Crud::PAGE_NEW, 'Добавление галереи')
            ->setPageTitle(Crud::PAGE_EDIT, 'Изменение галереи')
            ->setPageTitle(Crud::PAGE_DETAIL, "Информация о галереи");
    }


    public function configureFields(string $pageName): iterable
    {
        yield IdField::new('id')
            ->hideOnForm();

        yield AssociationField::new('user', 'Мастер')
            ->setQueryBuilder($this->nonAdminQb())
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
