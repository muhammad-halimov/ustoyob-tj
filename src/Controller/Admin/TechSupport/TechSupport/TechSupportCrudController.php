<?php

namespace App\Controller\Admin\TechSupport\TechSupport;

use App\Controller\Admin\TechSupport\TechSupportMessage\TechSupportMessageCrudController;
use App\Entity\TechSupport\TechSupport;
use Doctrine\ORM\QueryBuilder;
use EasyCorp\Bundle\EasyAdminBundle\Config\Action;
use EasyCorp\Bundle\EasyAdminBundle\Config\Actions;
use EasyCorp\Bundle\EasyAdminBundle\Config\Crud;
use EasyCorp\Bundle\EasyAdminBundle\Controller\AbstractCrudController;
use EasyCorp\Bundle\EasyAdminBundle\Field\AssociationField;
use EasyCorp\Bundle\EasyAdminBundle\Field\ChoiceField;
use EasyCorp\Bundle\EasyAdminBundle\Field\CollectionField;
use EasyCorp\Bundle\EasyAdminBundle\Field\IdField;
use EasyCorp\Bundle\EasyAdminBundle\Field\TextEditorField;
use EasyCorp\Bundle\EasyAdminBundle\Field\TextField;
use App\Controller\Admin\Traits\AdminActionsTrait;
use App\Controller\Admin\Traits\TimestampFieldsTrait;
use App\Controller\Admin\Traits\NonAdminUserQueryTrait;

class TechSupportCrudController extends AbstractCrudController
{
    use NonAdminUserQueryTrait;

    use TimestampFieldsTrait;

    use AdminActionsTrait;

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


    public function configureFields(string $pageName): iterable
    {
        yield IdField::new('id')
            ->hideOnForm();

        yield TextField::new('title', 'Заголовок')
            ->setRequired(true)
            ->setColumns(6);

        yield AssociationField::new('reason', 'Категория талона')
            ->setColumns(6)
            ->setRequired(false);

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
            ->setQueryBuilder($this->nonAdminQb())
            ->setRequired(true)
            ->setColumns(3);

        yield AssociationField::new('administrant', 'Исполнитель / Админ')
            ->setQueryBuilder($this->adminOnlyQb())
            ->setRequired(true)
            ->addCssClass('administrant-field')
            ->setColumns(3);

        yield TextEditorField::new('description', 'Описание')
            ->setRequired(true)
            ->setColumns(12);

        yield CollectionField::new('techSupportMessages', 'Сообщения')
            ->addCssClass('messages-field')
            ->useEntryCrudForm(TechSupportMessageCrudController::class)
            ->hideOnIndex()
            ->setColumns(12)
            ->setRequired(false);

        yield from $this->timestampFields();
    }
}
