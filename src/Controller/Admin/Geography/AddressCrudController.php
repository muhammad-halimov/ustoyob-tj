<?php

namespace App\Controller\Admin\Geography;

use App\Entity\Geography\Address;
use EasyCorp\Bundle\EasyAdminBundle\Config\Crud;
use EasyCorp\Bundle\EasyAdminBundle\Controller\AbstractCrudController;
use EasyCorp\Bundle\EasyAdminBundle\Field\AssociationField;
use EasyCorp\Bundle\EasyAdminBundle\Field\IdField;
use EasyCorp\Bundle\EasyAdminBundle\Field\DateTimeField;

class AddressCrudController extends AbstractCrudController
{
    public static function getEntityFqcn(): string
    {
        return Address::class;
    }

    public function configureCrud(Crud $crud): Crud
    {
        return $crud
            ->setEntityLabelInSingular('Адрес')
            ->setEntityLabelInPlural('Адреса')
            ->setPageTitle(Crud::PAGE_NEW, 'Создать адрес')
            ->setPageTitle(Crud::PAGE_EDIT, 'Редактировать адрес')
            ->setDefaultSort(['id' => 'DESC']);
    }

    public function configureFields(string $pageName): iterable
    {
        yield IdField::new('id')
            ->onlyOnIndex();

        yield AssociationField::new('province', 'Область')
            ->autocomplete()
            ->setColumns(6)
            ->setRequired(false);

        yield AssociationField::new('city', 'Город')
            ->autocomplete()
            ->setColumns(6)
            ->setRequired(false);

        yield AssociationField::new('district', 'Район')
            ->autocomplete()
            ->setColumns(6)
            ->setRequired(false);

        yield AssociationField::new('suburb', 'Квартал')
            ->autocomplete()
            ->setColumns(6)
            ->setRequired(false);

        yield AssociationField::new('settlement', 'Поселок')
            ->autocomplete()
            ->setColumns(6)
            ->setRequired(false);

        yield AssociationField::new('community', 'ПГТ')
            ->autocomplete()
            ->setColumns(6)
            ->setRequired(false);

        yield AssociationField::new('village', 'Село')
            ->autocomplete()
            ->setColumns(6)
            ->setRequired(false);

        yield DateTimeField::new('createdAt', 'Создан')
            ->onlyOnIndex();

        yield DateTimeField::new('updatedAt', 'Обновлен')
            ->onlyOnIndex();
    }
}
