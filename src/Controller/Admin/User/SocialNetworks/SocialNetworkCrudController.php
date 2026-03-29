<?php

namespace App\Controller\Admin\User\SocialNetworks;

use App\Entity\User\SocialNetwork;
use EasyCorp\Bundle\EasyAdminBundle\Config\Action;
use EasyCorp\Bundle\EasyAdminBundle\Config\Actions;
use EasyCorp\Bundle\EasyAdminBundle\Config\Crud;
use EasyCorp\Bundle\EasyAdminBundle\Controller\AbstractCrudController;
use EasyCorp\Bundle\EasyAdminBundle\Field\ChoiceField;
use EasyCorp\Bundle\EasyAdminBundle\Field\IdField;
use EasyCorp\Bundle\EasyAdminBundle\Field\TextField;
use App\Controller\Admin\Traits\AdminActionsTrait;
use App\Controller\Admin\Traits\TimestampFieldsTrait;

class SocialNetworkCrudController extends AbstractCrudController
{
    use TimestampFieldsTrait;

    use AdminActionsTrait;

    public static function getEntityFqcn(): string
    {
        return SocialNetwork::class;
    }

    public function configureCrud(Crud $crud): Crud
    {
        return parent::configureCrud($crud)
            ->setEntityPermission('ROLE_ADMIN')
            ->setEntityLabelInPlural('Соц. сети')
            ->setEntityLabelInSingular('соц. сеть')
            ->setPageTitle(Crud::PAGE_NEW, 'Добавление соц. сети')
            ->setPageTitle(Crud::PAGE_EDIT, 'Изменение соц. сети')
            ->setPageTitle(Crud::PAGE_DETAIL, "Информация о соц. сети");
    }



    public function configureFields(string $pageName): iterable
    {
        yield IdField::new('id')
            ->hideOnForm();

        yield ChoiceField::new('network', 'Соц. сеть')
            ->setChoices(SocialNetwork::NETWORKS)
            ->setColumns(12)
            ->setRequired(true);

        yield TextField::new('handle', 'Ссылка')
            ->setColumns(12)
            ->setRequired(true);

        yield from $this->timestampFields();
    }
}
