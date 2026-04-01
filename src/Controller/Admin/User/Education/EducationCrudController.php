<?php

namespace App\Controller\Admin\User\Education;

use App\Entity\User\Education;
use EasyCorp\Bundle\EasyAdminBundle\Config\Crud;
use EasyCorp\Bundle\EasyAdminBundle\Controller\AbstractCrudController;
use EasyCorp\Bundle\EasyAdminBundle\Field\AssociationField;
use EasyCorp\Bundle\EasyAdminBundle\Field\BooleanField;
use EasyCorp\Bundle\EasyAdminBundle\Field\IdField;
use EasyCorp\Bundle\EasyAdminBundle\Field\IntegerField;
use EasyCorp\Bundle\EasyAdminBundle\Field\TextEditorField;
use EasyCorp\Bundle\EasyAdminBundle\Field\TextField;
use App\Controller\Admin\Traits\AdminActionsTrait;
use App\Controller\Admin\Traits\TimestampFieldsTrait;

class EducationCrudController extends AbstractCrudController
{
    use TimestampFieldsTrait;

    use AdminActionsTrait;

    public static function getEntityFqcn(): string
    {
        return Education::class;
    }

    public function configureCrud(Crud $crud): Crud
    {
        return parent::configureCrud($crud)
            ->setEntityPermission('ROLE_ADMIN')
            ->setEntityLabelInPlural('Образование')
            ->setEntityLabelInSingular('образование')
            ->setPageTitle(Crud::PAGE_NEW, 'Добавление образования')
            ->setPageTitle(Crud::PAGE_EDIT, 'Изменение образования')
            ->setPageTitle(Crud::PAGE_DETAIL, "Информация об образовании");
    }



    public function configureFields(string $pageName): iterable
    {
        yield IdField::new('id')
            ->hideOnForm();

        yield TextField::new('title', 'Название ВУЗа')
            ->setColumns(12);

        yield AssociationField::new('occupation', 'Специальность')
            ->setColumns(12);

        yield IntegerField::new('beginning', 'Начало')
            ->setColumns(12);

        yield IntegerField::new('ending', 'Окончание')
            ->setColumns(12);

        yield TextEditorField::new('description', 'Описание')
            ->setColumns(12);

        yield BooleanField::new('graduated', 'Окончено')
            ->setColumns(12);

        yield from $this->timestampFields();
    }
}
