<?php

namespace App\Controller\Admin\Appeal\AppealReason;

use App\Controller\Admin\Extra\TranslationCrudController;
use App\Entity\Appeal\Reason\AppealReason;
use EasyCorp\Bundle\EasyAdminBundle\Config\Action;
use EasyCorp\Bundle\EasyAdminBundle\Config\Actions;
use EasyCorp\Bundle\EasyAdminBundle\Config\Crud;
use EasyCorp\Bundle\EasyAdminBundle\Controller\AbstractCrudController;
use EasyCorp\Bundle\EasyAdminBundle\Field\ChoiceField;
use EasyCorp\Bundle\EasyAdminBundle\Field\CollectionField;
use EasyCorp\Bundle\EasyAdminBundle\Field\IdField;
use EasyCorp\Bundle\EasyAdminBundle\Field\TextField;
use App\Controller\Admin\Traits\AdminActionsTrait;
use App\Controller\Admin\Traits\TimestampFieldsTrait;

class AppealReasonCrudController extends AbstractCrudController
{
    use AdminActionsTrait;
    use TimestampFieldsTrait;

    public static function getEntityFqcn(): string
    {
        return AppealReason::class;
    }

    public function configureCrud(Crud $crud): Crud
    {
        return parent::configureCrud($crud)
            ->setEntityPermission('ROLE_ADMIN')
            ->setEntityLabelInPlural('Причины жалоб')
            ->setEntityLabelInSingular('причину жалобы')
            ->setPageTitle(Crud::PAGE_NEW, 'Добавление причины жалобы')
            ->setPageTitle(Crud::PAGE_EDIT, 'Изменение причины жалобы')
            ->setPageTitle(Crud::PAGE_DETAIL, 'Информация о причине жалобы');
    }

    public function configureFields(string $pageName): iterable
    {
        yield IdField::new('id')->hideOnForm();

        yield TextField::new('code', 'Код (machine-readable)')
            ->setHelp('Уникальный идентификатор: fraud, offend, bad_quality и т.д.')
            ->setRequired(true)
            ->setColumns(6);

        yield ChoiceField::new('applicableTo', 'Применяется к')
            ->setChoices(AppealReason::APPLICABLE_TO_CHOICES)
            ->setRequired(true)
            ->setColumns(6);

        yield CollectionField::new('translations', 'Переводы')
            ->useEntryCrudForm(TranslationCrudController::class)
            ->setFormTypeOptions(['by_reference' => false])
            ->setColumns(12)
            ->setRequired(false);

        yield from $this->timestampFields();
    }
}
