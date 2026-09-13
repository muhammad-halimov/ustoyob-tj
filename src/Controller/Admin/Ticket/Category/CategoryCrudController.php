<?php

namespace App\Controller\Admin\Ticket\Category;

use App\Controller\Admin\Extra\TranslationCrudController;
use App\Controller\Admin\Field\VichImageField;
use App\Entity\Ticket\Category;
use EasyCorp\Bundle\EasyAdminBundle\Config\Crud;
use EasyCorp\Bundle\EasyAdminBundle\Controller\AbstractCrudController;
use EasyCorp\Bundle\EasyAdminBundle\Field\AssociationField;
use EasyCorp\Bundle\EasyAdminBundle\Field\CollectionField;
use EasyCorp\Bundle\EasyAdminBundle\Field\IdField;
use EasyCorp\Bundle\EasyAdminBundle\Field\IntegerField;
use App\Controller\Admin\Traits\AdminActionsTrait;
use App\Controller\Admin\Traits\TimestampFieldsTrait;
use App\Controller\Admin\Traits\VichImageHelpTrait;

class CategoryCrudController extends AbstractCrudController
{
    use VichImageHelpTrait;

    use TimestampFieldsTrait;

    use AdminActionsTrait;

    public static function getEntityFqcn(): string
    {
        return Category::class;
    }

    public function configureCrud(Crud $crud): Crud
    {
        return parent::configureCrud($crud)
            ->setEntityPermission('ROLE_SUPER_ADMIN')
            ->setEntityLabelInPlural('Категории услуг')
            ->setEntityLabelInSingular('категорию услуг')
            ->setPageTitle(Crud::PAGE_NEW, 'Добавление категории')
            ->setPageTitle(Crud::PAGE_EDIT, 'Изменение категории')
            ->setPageTitle(Crud::PAGE_DETAIL, "Информация о категории")
            ->setDefaultSort(['createdAt' => 'DESC']);
    }


    public function configureFields(string $pageName): iterable
    {
        yield IdField::new('id')
            ->hideOnForm();

        // БАГФИКС (13.09.2026): раньше здесь редактировалось только
        // название на каждый язык — реальное (видимое пользователям)
        // description жило ЕДИНОЙ строкой в поле "Описание" ниже, слепленной
        // из всех трёх языков разом (см. докблок старого CategoryFixture).
        // Теперь Translation несёт и title, и description на каждый локаль
        // (тот же паттерн, что уже у Legal/TranslationCrudController) —
        // редактировать реальный, показываемый по ?locale= текст нужно
        // именно здесь, по одной карточке на язык.
        yield CollectionField::new('translations', 'Переводы (название + описание по языкам)')
            ->useEntryCrudForm(TranslationCrudController::class)
            ->setFormTypeOptions(['by_reference' => false])
            ->setColumns(5)
            ->setRequired(false);

        yield AssociationField::new('occupations', 'Подкатегории')
            ->setFormTypeOptions(['by_reference' => false])
            ->setColumns(4);

        yield IntegerField::new('priority', 'Порядок')
            ->setColumns(1)
            ->setRequired(false);

        // БАГФИКС (13.09.2026): раньше здесь было ещё одно, отдельное поле
        // "Описание" — редактировало Category::$description НАПРЯМУЮ, в
        // отрыве от какого-либо конкретного языка/title. Сущность и API это
        // поле не потеряли (localizeEntityFull() по-прежнему подменяет его
        // переводом по текущей ?locale= на чтение — см.
        // CategoryTitleLocalizationProvider), но редактировать его отсюда
        // было только сбивающим с толку: правки тут никогда не видны
        // пользователям (перезаписываются при каждом чтении) и никак не
        // привязаны к title ни одного языка — реальный, видимый текст
        // редактируется только в "Переводы" выше, по одной карточке на язык.

        yield VichImageField::new('imageFile', 'Фото')
            ->setHelp($this->vichImageBadgeHelp())
            ->onlyOnForms()
            ->setColumns(2);

        yield from $this->timestampFields();
    }
}
