<?php

namespace App\Controller\Admin\Geography\Province;

use App\Controller\Admin\Extra\TranslationCrudController;
use App\Controller\Admin\Field\VichImageField;
use App\Entity\Geography\Province\Province;
use App\Repository\Geography\City\CityRepository;
use App\Repository\Geography\District\DistrictRepository;
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

class ProvinceCrudController extends AbstractCrudController
{
    use VichImageHelpTrait;

    use TimestampFieldsTrait;

    use AdminActionsTrait;

    public static function getEntityFqcn(): string
    {
        return Province::class;
    }

    public function configureCrud(Crud $crud): Crud
    {
        return parent::configureCrud($crud)
            ->setEntityPermission('ROLE_ADMIN')
            ->setEntityLabelInPlural('Область')
            ->setEntityLabelInSingular('область')
            ->setPageTitle(Crud::PAGE_NEW, 'Добавление области')
            ->setPageTitle(Crud::PAGE_EDIT, 'Изменение области')
            ->setPageTitle(Crud::PAGE_DETAIL, "Информация об области");
    }


    public function configureFields(string $pageName): iterable
    {
        /** @var Province $province */
        $province = $this->getContext()?->getEntity()?->getInstance();

        yield IdField::new('id')
            ->hideOnForm();

        yield CollectionField::new('translations', 'Название')
            ->useEntryCrudForm(TranslationCrudController::class)
            ->setFormTypeOptions(['by_reference' => false])
            ->setColumns(4)
            ->setRequired(false);

        yield AssociationField::new('cities', 'Города')
            ->setColumns(4)
            ->setFormTypeOptions([
                'by_reference' => false,
                'query_builder' => function (CityRepository $repo) use ($province) {
                    $qb = $repo
                        ->createQueryBuilder('c')
                        ->where('c.province IS NULL');

                    if ($province && $province->getId())
                        $qb
                            ->orWhere('c.province = :province')
                            ->setParameter('province', $province);

                    return $qb;
                },
            ]);

        yield AssociationField::new('districts', 'Районы')
            ->setColumns(4)
            ->setFormTypeOptions([
                'by_reference' => false,
                'query_builder' => function (DistrictRepository $repo) use ($province) {
                    $qb = $repo
                        ->createQueryBuilder('d')
                        ->where('d.province IS NULL');

                    if ($province && $province->getId())
                        $qb
                            ->orWhere('d.province = :province')
                            ->setParameter('province', $province);

                    return $qb;
                },
            ]);

        yield TextEditorField::new('description', 'Описание')
            ->setColumns(10);

        yield VichImageField::new('imageFile', 'Фото')
            ->setHelp($this->vichImageBadgeHelp())
            ->onlyOnForms()
            ->setColumns(2);

        yield from $this->timestampFields();
    }
}
