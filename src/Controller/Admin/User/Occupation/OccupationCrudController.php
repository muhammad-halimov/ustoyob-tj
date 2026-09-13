<?php

namespace App\Controller\Admin\User\Occupation;

use App\Controller\Admin\Extra\TranslationCrudController;
use App\Controller\Admin\Field\VichImageField;
use App\Entity\User\Occupation;
use EasyCorp\Bundle\EasyAdminBundle\Config\Crud;
use EasyCorp\Bundle\EasyAdminBundle\Controller\AbstractCrudController;
use EasyCorp\Bundle\EasyAdminBundle\Field\AssociationField;
use EasyCorp\Bundle\EasyAdminBundle\Field\CollectionField;
use EasyCorp\Bundle\EasyAdminBundle\Field\IdField;
use EasyCorp\Bundle\EasyAdminBundle\Field\IntegerField;
use App\Controller\Admin\Traits\AdminActionsTrait;
use App\Controller\Admin\Traits\TimestampFieldsTrait;
use App\Controller\Admin\Traits\VichImageHelpTrait;

class OccupationCrudController extends AbstractCrudController
{
    use VichImageHelpTrait;

    use TimestampFieldsTrait;

    use AdminActionsTrait;

    public static function getEntityFqcn(): string
    {
        return Occupation::class;
    }

    public function configureCrud(Crud $crud): Crud
    {
        return parent::configureCrud($crud)
            ->setEntityPermission('ROLE_SUPER_ADMIN')
            ->setEntityLabelInPlural('Специальности')
            ->setEntityLabelInSingular('специальность')
            ->setPageTitle(Crud::PAGE_NEW, 'Добавление специальности')
            ->setPageTitle(Crud::PAGE_EDIT, 'Изменение специальности')
            ->setPageTitle(Crud::PAGE_DETAIL, "Информация о специальности")
            ->setDefaultSort(['createdAt' => 'DESC']);
    }


    public function configureFields(string $pageName): iterable
    {
        yield IdField::new('id')
            ->hideOnForm();

        // БАГФИКС (13.09.2026): раньше рядом было ещё одно, отдельное поле
        // "Описание" — редактировало Occupation::$description НАПРЯМУЮ, в
        // отрыве от какого-либо конкретного языка/title (тот же случай, что
        // и у CategoryCrudController — см. её докблок). Реальный, видимый по
        // ?locale= текст редактируется здесь, в "Переводы", по одной
        // карточке на язык.
        yield CollectionField::new('translations', 'Переводы (название + описание по языкам)')
            ->useEntryCrudForm(TranslationCrudController::class)
            ->setFormTypeOptions(['by_reference' => false])
            ->setColumns(5)
            ->setRequired(false);

        yield AssociationField::new('category', 'Категория')
            ->setColumns(4);

        yield IntegerField::new('priority', 'Порядок')
            ->setColumns(1)
            ->setRequired(false);

        yield VichImageField::new('imageFile', 'Фото')
            ->setHelp($this->vichImageBadgeHelp())
            ->onlyOnForms()
            ->setColumns(2);

        yield AssociationField::new('master', 'Мастеров')
            ->hideOnForm();

        yield from $this->timestampFields();
    }
}
