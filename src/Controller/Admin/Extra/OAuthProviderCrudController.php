<?php

namespace App\Controller\Admin\Extra;

use App\Entity\Extra\OAuthProvider;
use EasyCorp\Bundle\EasyAdminBundle\Controller\AbstractCrudController;
use EasyCorp\Bundle\EasyAdminBundle\Field\DateTimeField;
use EasyCorp\Bundle\EasyAdminBundle\Field\IdField;
use EasyCorp\Bundle\EasyAdminBundle\Field\TextField;

class OAuthProviderCrudController extends AbstractCrudController
{
    public static function getEntityFqcn(): string
    {
        return OAuthProvider::class;
    }

    public function configureFields(string $pageName): iterable
    {
        yield IdField::new('id')
            ->hideOnForm();

        yield TextField::new('provider', 'Провайдер')
            ->setColumns(4)
            ->setRequired(true);

        yield TextField::new('providerId', 'ID провайдера')
            ->setColumns(5)
            ->setRequired(true);

        yield DateTimeField::new('createdAt', 'Создано')
            ->setColumns(3)
            ->setDisabled();
    }
}
