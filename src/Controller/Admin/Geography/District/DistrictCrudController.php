<?php

namespace App\Controller\Admin\Geography\District;

use App\Controller\Admin\Extra\TranslationCrudController;
use App\Controller\Admin\Field\VichImageField;
use App\Entity\Geography\District\District;
use EasyCorp\Bundle\EasyAdminBundle\Config\Action;
use EasyCorp\Bundle\EasyAdminBundle\Config\Actions;
use EasyCorp\Bundle\EasyAdminBundle\Config\Crud;
use EasyCorp\Bundle\EasyAdminBundle\Controller\AbstractCrudController;
use EasyCorp\Bundle\EasyAdminBundle\Field\AssociationField;
use EasyCorp\Bundle\EasyAdminBundle\Field\CollectionField;
use EasyCorp\Bundle\EasyAdminBundle\Field\IdField;
use EasyCorp\Bundle\EasyAdminBundle\Field\TextEditorField;
use App\Controller\Admin\Traits\AdminActionsTrait;
use App\Controller\Admin\Traits\TimestampFieldsTrait;
use App\Controller\Admin\Traits\VichImageHelpTrait;

class DistrictCrudController extends AbstractCrudController
{
    use VichImageHelpTrait;

    use TimestampFieldsTrait;

    use AdminActionsTrait;

    public static function getEntityFqcn(): string
    {
        return District::class;
    }

    public function configureCrud(Crud $crud): Crud
    {
        return parent::configureCrud($crud)
            ->setEntityPermission('ROLE_ADMIN')
            ->setEntityLabelInPlural('География района')
            ->setEntityLabelInSingular('географию района')
            ->setPageTitle(Crud::PAGE_NEW, 'Добавление района')
            ->setPageTitle(Crud::PAGE_EDIT, 'Изменение района')
            ->setPageTitle(Crud::PAGE_DETAIL, "Информация о районе");
    }


    public function configureFields(string $pageName): iterable
    {
        yield IdField::new('id')
            ->hideOnForm();

        yield CollectionField::new('translations', 'Название')
            ->useEntryCrudForm(TranslationCrudController::class)
            ->setFormTypeOptions(['by_reference' => false])
            ->setColumns(6)
            ->setRequired(false);

        yield AssociationField::new('province', 'Провинция')
            ->setColumns(6);

        yield TextEditorField::new('description', 'Описание')
            ->setColumns(10);

        yield VichImageField::new('imageFile', 'Фото')
            ->setHelp($this->vichImageBadgeHelp())
            ->onlyOnForms()
            ->setColumns(2);

        yield CollectionField::new('communities', 'ПГТ / Шаҳракҳо')
            ->useEntryCrudForm(CommunityCrudController::class)
            ->setFormTypeOptions(['by_reference' => false])
            ->setColumns(6)
            ->setRequired(false);

        yield CollectionField::new('settlements', 'Поселки / Ҷамоатҳо')
            ->useEntryCrudForm(SettlementCrudController::class)
            ->setFormTypeOptions(['by_reference' => false])
            ->setColumns(6)
            ->setRequired(false);

        yield from $this->timestampFields();
    }
}
