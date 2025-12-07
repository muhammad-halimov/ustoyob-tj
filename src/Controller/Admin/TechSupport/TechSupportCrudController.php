<?php

namespace App\Controller\Admin\TechSupport;

use App\Entity\TechSupport\TechSupport;
use Doctrine\ORM\QueryBuilder;
use EasyCorp\Bundle\EasyAdminBundle\Config\Action;
use EasyCorp\Bundle\EasyAdminBundle\Config\Actions;
use EasyCorp\Bundle\EasyAdminBundle\Config\Crud;
use EasyCorp\Bundle\EasyAdminBundle\Controller\AbstractCrudController;
use EasyCorp\Bundle\EasyAdminBundle\Field\AssociationField;
use EasyCorp\Bundle\EasyAdminBundle\Field\ChoiceField;
use EasyCorp\Bundle\EasyAdminBundle\Field\CollectionField;
use EasyCorp\Bundle\EasyAdminBundle\Field\DateTimeField;
use EasyCorp\Bundle\EasyAdminBundle\Field\IdField;
use EasyCorp\Bundle\EasyAdminBundle\Field\TextEditorField;
use EasyCorp\Bundle\EasyAdminBundle\Field\TextField;

class TechSupportCrudController extends AbstractCrudController
{
    public static function getEntityFqcn(): string
    {
        return TechSupport::class;
    }

    public function configureCrud(Crud $crud): Crud
    {
        return parent::configureCrud($crud)
            ->setEntityPermission('ROLE_ADMIN')
            ->setEntityLabelInPlural('Тех. поддержка')
            ->setEntityLabelInSingular('талон')
            ->setPageTitle(Crud::PAGE_NEW, 'Добавление талона')
            ->setPageTitle(Crud::PAGE_EDIT, 'Изменение талона')
            ->setPageTitle(Crud::PAGE_DETAIL, "Информация о талоне");
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
            ->hideOnForm();

        yield TextField::new('title', 'Заголовок')
            ->setRequired(true)
            ->setColumns(6);

        yield ChoiceField::new('reason', 'Категория талона')
            ->setColumns(6)
            ->setChoices(TechSupport::SUPPORT)
            ->addCssClass('support-field')
            ->setRequired(true);

        yield ChoiceField::new('status', 'Статус')
            ->setColumns(3)
            ->setChoices(TechSupport::STATUSES)
            ->addCssClass('status-field')
            ->setRequired(true);

        yield ChoiceField::new('priority', 'Приоритет')
            ->setColumns(3)
            ->setChoices(TechSupport::PRIORITIES)
            ->addCssClass('priority-field')
            ->setRequired(true);

        yield AssociationField::new('author', 'Клиент / Мастер')
            ->setQueryBuilder(function (QueryBuilder $qb) {
                return $qb->andWhere("CAST(entity.roles as text) NOT LIKE '%ROLE_ADMIN%'");
            })
            ->setRequired(true)
            ->setColumns(3);

        yield AssociationField::new('administrant', 'Исполнитель / Админ')
            ->setQueryBuilder(function (QueryBuilder $qb) {
                return $qb->andWhere("CAST(entity.roles as text) LIKE '%ROLE_ADMIN%'");
            })
            ->setRequired(true)
            ->addCssClass('administrant-field')
            ->setColumns(3);

        yield TextEditorField::new('description', 'Описание')
            ->setRequired(true)
            ->setColumns(12);

        yield CollectionField::new('techSupportImages', 'Галерея изображений')
            ->useEntryCrudForm(TechSupportImageCrudController::class)
            ->hideOnIndex()
            ->setColumns(12)
            ->setRequired(false);

        yield CollectionField::new('techSupportMessages', 'Сообщения')
            ->addCssClass('messages-field')
            ->useEntryCrudForm(TechSupportMessageCrudController::class)
            ->hideOnIndex()
            ->setColumns(12)
            ->setRequired(false);

        yield DateTimeField::new('updatedAt', 'Обновлено')
            ->hideOnForm();

        yield DateTimeField::new('createdAt', 'Создано')
            ->hideOnForm();
    }
}
