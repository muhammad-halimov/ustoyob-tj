<?php

namespace App\Controller\Admin\User;

use App\Entity\User\Phone;
use EasyCorp\Bundle\EasyAdminBundle\Controller\AbstractCrudController;
use EasyCorp\Bundle\EasyAdminBundle\Field\BooleanField;
use EasyCorp\Bundle\EasyAdminBundle\Field\ChoiceField;
use EasyCorp\Bundle\EasyAdminBundle\Field\DateTimeField;
use EasyCorp\Bundle\EasyAdminBundle\Field\IdField;
use EasyCorp\Bundle\EasyAdminBundle\Field\TextField;

class PhoneCrudController extends AbstractCrudController
{
    public static function getEntityFqcn(): string
    {
        return Phone::class;
    }

    public function configureFields(string $pageName): iterable
    {
         yield IdField::new('id')
            ->hideOnForm();

        yield BooleanField::new('main', 'Основной')
            ->setColumns(6);

        yield BooleanField::new('verified', 'Проверен')
            ->setColumns(6);

        yield ChoiceField::new('countryCode', 'Cтрана')
            ->setChoices(Phone::CODES)
            ->setColumns(12);

        yield TextField::new('phone', 'Номер')
            ->setColumns(12)
            ->setRequired(true);

        yield DateTimeField::new('updatedAt', 'Обновлено')
            ->hideOnForm();

        yield DateTimeField::new('createdAt', 'Создано')
            ->hideOnForm();
    }
}
