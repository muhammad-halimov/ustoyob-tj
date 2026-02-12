<?php

namespace App\Controller\Admin\Legal;

use App\Entity\Legal\Legal;
use App\Repository\Legal\LegalRepository;
use EasyCorp\Bundle\EasyAdminBundle\Config\Action;
use EasyCorp\Bundle\EasyAdminBundle\Config\Actions;
use EasyCorp\Bundle\EasyAdminBundle\Config\Crud;
use EasyCorp\Bundle\EasyAdminBundle\Controller\AbstractCrudController;
use EasyCorp\Bundle\EasyAdminBundle\Field\ChoiceField;
use EasyCorp\Bundle\EasyAdminBundle\Field\DateTimeField;
use EasyCorp\Bundle\EasyAdminBundle\Field\IdField;
use EasyCorp\Bundle\EasyAdminBundle\Field\TextEditorField;
use EasyCorp\Bundle\EasyAdminBundle\Field\TextField;

class LegalCrudController extends AbstractCrudController
{
    public function __construct(private readonly LegalRepository $legalRepository){}


    public static function getEntityFqcn(): string
    {
        return Legal::class;
    }

    public function configureCrud(Crud $crud): Crud
    {
        return parent::configureCrud($crud)
            ->setEntityPermission('ROLE_ADMIN')
            ->setEntityLabelInPlural('Регуляции')
            ->setEntityLabelInSingular('регуляцию')
            ->setPageTitle(Crud::PAGE_NEW, 'Добавление регуляции')
            ->setPageTitle(Crud::PAGE_EDIT, 'Изменение регуляции')
            ->setPageTitle(Crud::PAGE_DETAIL, "Информация о регуляции");
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

        if ($this->legalRepository->count() >= count(Legal::TYPES)) {
            $actions
                ->remove(Crud::PAGE_INDEX, Action::NEW)
                ->remove(Crud::PAGE_DETAIL, Action::NEW)
                ->remove(Crud::PAGE_NEW, Action::NEW)
                ->remove(Crud::PAGE_EDIT, Action::NEW);
        }

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

        yield ChoiceField::new('type', 'Тип регуляции')
            ->setRequired(true)
            ->allowMultipleChoices(false)
            ->setChoices(Legal::TYPES)
            ->setColumns(6);

        yield TextField::new('title', 'Название')
            ->setRequired(true)
            ->setColumns(6);

        yield TextEditorField::new('description', 'Описание')
            ->setRequired(true)
            ->setColumns(12);

        yield DateTimeField::new('updatedAt', 'Обновлено')
            ->hideOnForm();

        yield DateTimeField::new('createdAt', 'Создано')
            ->hideOnForm();
    }
}
