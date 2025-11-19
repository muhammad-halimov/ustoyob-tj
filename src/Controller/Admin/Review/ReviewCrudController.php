<?php

namespace App\Controller\Admin\Review;

use App\Entity\Review\Review;
use EasyCorp\Bundle\EasyAdminBundle\Config\Action;
use EasyCorp\Bundle\EasyAdminBundle\Config\Actions;
use EasyCorp\Bundle\EasyAdminBundle\Config\Assets;
use EasyCorp\Bundle\EasyAdminBundle\Config\Crud;
use EasyCorp\Bundle\EasyAdminBundle\Controller\AbstractCrudController;
use EasyCorp\Bundle\EasyAdminBundle\Field\AssociationField;
use EasyCorp\Bundle\EasyAdminBundle\Field\ChoiceField;
use EasyCorp\Bundle\EasyAdminBundle\Field\CollectionField;
use EasyCorp\Bundle\EasyAdminBundle\Field\DateTimeField;
use EasyCorp\Bundle\EasyAdminBundle\Field\IdField;
use EasyCorp\Bundle\EasyAdminBundle\Field\NumberField;
use EasyCorp\Bundle\EasyAdminBundle\Field\TextEditorField;

class ReviewCrudController extends AbstractCrudController
{
    public static function getEntityFqcn(): string
    {
        return Review::class;
    }

    public function configureAssets(Assets $assets): Assets
    {
        return parent::configureAssets($assets)
            ->addJsFile("assets/js/reviewCrud.js");
    }

    public function configureCrud(Crud $crud): Crud
    {
        return parent::configureCrud($crud)
            ->setEntityPermission('ROLE_ADMIN')
            ->setEntityLabelInPlural('Отзывы')
            ->setEntityLabelInSingular('отзыв')
            ->setPageTitle(Crud::PAGE_NEW, 'Добавление отзыва')
            ->setPageTitle(Crud::PAGE_EDIT, 'Изменение отзыва')
            ->setPageTitle(Crud::PAGE_DETAIL, "Информация об отзыве");
    }

    public function configureActions(Actions $actions): Actions
    {
        $actions
            ->add(Crud::PAGE_INDEX, Action::DETAIL);

        $actions
            ->reorder(Crud::PAGE_INDEX, [
                Action::DETAIL,
                Action::EDIT,
                Action::DELETE
            ]);

        return parent::configureActions($actions)
            ->setPermissions([
                Action::NEW => 'ROLE_ADMIN',
                Action::DELETE => 'ROLE_ADMIN',
                Action::EDIT => 'ROLE_ADMIN',
            ]);
    }

    public function configureFields(string $pageName): iterable
    {
        yield IdField::new('id')
            ->onlyOnIndex();

        yield ChoiceField::new('type', 'Тип отзыва')
            ->setRequired(true)
            ->allowMultipleChoices(false)
            ->renderExpanded()
            ->addCssClass("form-switch")
            ->setChoices(Review::TYPES)
            ->setColumns(12);

        yield AssociationField::new('master', 'Мастер')
            ->setRequired(true)
            ->setColumns(6);

        yield AssociationField::new('services', 'Услуга')
//            ->setFormTypeOptions(['by_reference' => false])
            ->addCssClass("services-field")
            ->setColumns(6);

        yield NumberField::new('rating', 'Оценка')
            ->setRequired(true)
            ->setNumDecimals(1)
            ->setColumns(6);

        yield AssociationField::new('client', 'Клиент')
            ->setRequired(true)
            ->setColumns(6);

        yield TextEditorField::new('description', 'Описание')
            ->setColumns(12);

        yield CollectionField::new('reviewImages', 'Галерея изображений')
            ->useEntryCrudForm(ReviewImageCrudController::class)
            ->hideOnIndex()
            ->setColumns(12);

        yield DateTimeField::new('updatedAt', 'Обновлено')
            ->onlyOnIndex();

        yield DateTimeField::new('createdAt', 'Создано')
            ->onlyOnIndex();
    }
}
