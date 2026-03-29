<?php

namespace App\Controller\Admin\Legal;

use App\Controller\Admin\Extra\TranslationCrudController;
use App\Entity\Legal\Legal;
use App\Repository\Legal\LegalRepository;
use EasyCorp\Bundle\EasyAdminBundle\Config\Action;
use EasyCorp\Bundle\EasyAdminBundle\Config\Actions;
use EasyCorp\Bundle\EasyAdminBundle\Config\Crud;
use EasyCorp\Bundle\EasyAdminBundle\Controller\AbstractCrudController;
use EasyCorp\Bundle\EasyAdminBundle\Field\ChoiceField;
use EasyCorp\Bundle\EasyAdminBundle\Field\CollectionField;
use EasyCorp\Bundle\EasyAdminBundle\Field\IdField;
use EasyCorp\Bundle\EasyAdminBundle\Field\TextEditorField;
use EasyCorp\Bundle\EasyAdminBundle\Field\TextField;
use App\Controller\Admin\Traits\AdminActionsTrait;
use App\Controller\Admin\Traits\TimestampFieldsTrait;

class LegalCrudController extends AbstractCrudController
{
    use TimestampFieldsTrait;

    use AdminActionsTrait;

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


    public function configureFields(string $pageName): iterable
    {
        yield IdField::new('id')
            ->hideOnForm();

        yield CollectionField::new('translations', 'Переводы')
            ->useEntryCrudForm(TranslationCrudController::class)
            ->setFormTypeOptions(['by_reference' => false])
            ->setColumns(6)
            ->setRequired(true);

        yield ChoiceField::new('type', 'Тип регуляции')
            ->setRequired(true)
            ->allowMultipleChoices(false)
            ->setChoices(Legal::TYPES)
            ->setColumns(6);

        yield TextEditorField::new('description', 'Описание')
            ->setRequired(true)
            ->setColumns(12);

        yield from $this->timestampFields();
    }
}
