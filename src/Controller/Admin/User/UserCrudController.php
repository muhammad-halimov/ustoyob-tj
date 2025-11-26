<?php

namespace App\Controller\Admin\User;

use App\Controller\Admin\Field\VichImageField;
use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use EasyCorp\Bundle\EasyAdminBundle\Config\Action;
use EasyCorp\Bundle\EasyAdminBundle\Config\Actions;
use EasyCorp\Bundle\EasyAdminBundle\Config\Assets;
use EasyCorp\Bundle\EasyAdminBundle\Config\Crud;
use EasyCorp\Bundle\EasyAdminBundle\Controller\AbstractCrudController;
use EasyCorp\Bundle\EasyAdminBundle\Field\AssociationField;
use EasyCorp\Bundle\EasyAdminBundle\Field\BooleanField;
use EasyCorp\Bundle\EasyAdminBundle\Field\ChoiceField;
use EasyCorp\Bundle\EasyAdminBundle\Field\CollectionField;
use EasyCorp\Bundle\EasyAdminBundle\Field\DateTimeField;
use EasyCorp\Bundle\EasyAdminBundle\Field\EmailField;
use EasyCorp\Bundle\EasyAdminBundle\Field\IdField;
use EasyCorp\Bundle\EasyAdminBundle\Field\NumberField;
use EasyCorp\Bundle\EasyAdminBundle\Field\TelephoneField;
use EasyCorp\Bundle\EasyAdminBundle\Field\TextEditorField;
use EasyCorp\Bundle\EasyAdminBundle\Field\TextField;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;

class UserCrudController extends AbstractCrudController
{
    public function __construct(
        private readonly UserPasswordHasherInterface $passwordEncoder
    ){}


    public static function getEntityFqcn(): string
    {
        return User::class;
    }

    public function configureAssets(Assets $assets): Assets
    {
        return parent::configureAssets($assets)
            ->addJsFile("assets/js/userCrud.js");
    }

    public function configureCrud(Crud $crud): Crud
    {
        return parent::configureCrud($crud)
            ->setEntityPermission('ROLE_ADMIN')
            ->setEntityLabelInPlural('Пользователи')
            ->setEntityLabelInSingular('пользователя')
            ->setPageTitle(Crud::PAGE_NEW, 'Добавление пользователя')
            ->setPageTitle(Crud::PAGE_EDIT, 'Изменение пользователя')
            ->setPageTitle(Crud::PAGE_DETAIL, "Информация о пользователе");
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

    public function persistEntity(EntityManagerInterface $entityManager, $entityInstance): void
    {
        if ($entityInstance instanceof User && $entityInstance->getPlainPassword()) {
            $this->addFlash('info', 'Пароль изменен и сохранен!');
            $entityInstance->setPassword($this->passwordEncoder->hashPassword($entityInstance, $entityInstance->getPlainPassword()));
        }

        parent::persistEntity($entityManager, $entityInstance);
    }

    public function updateEntity(EntityManagerInterface $entityManager, $entityInstance): void
    {
        if ($entityInstance instanceof User && $entityInstance->getPlainPassword()) {
            $this->addFlash('info', 'Пароль изменен и сохранен!');
            $entityInstance->setPassword($this->passwordEncoder->hashPassword($entityInstance, $entityInstance->getPlainPassword()));
        }

        parent::updateEntity($entityManager, $entityInstance);
    }

    public function configureFields(string $pageName): iterable
    {
        yield IdField::new('id')
            ->onlyOnIndex();

        yield ChoiceField::new('roles', 'Права')
            ->setRequired(true)
            ->allowMultipleChoices()
            ->renderExpanded()
            ->addCssClass("form-switch")
            ->setChoices(User::ROLES)
            ->setColumns(12);

        yield BooleanField::new('atHome', 'Принимает у себя')
            ->addCssClass("form-switch")
            ->hideOnIndex()
            ->setColumns(12);

        yield EmailField::new('email', 'Эл. почта')
            ->setColumns(4)
            ->setRequired(true);

        yield TextField::new('name', 'Имя')
            ->setColumns(4)
            ->setRequired(true);

        yield TextField::new('surname', 'Фамилия')
            ->setColumns(4)
            ->setRequired(true);

        yield TextField::new('patronymic', 'Отчество')
            ->hideOnIndex()
            ->setColumns(4)
            ->setRequired(false);

        yield NumberField::new('rating', 'Рейтинг')
            ->setNumDecimals(1)
            ->hideOnIndex()
            ->setColumns(4)
            ->setRequired(false);

        yield ChoiceField::new('gender', 'Пол')
            ->setRequired(true)
            ->setChoices(User::GENDERS)
            ->setColumns(4);

        $plainPassword = TextField::new('plainPassword')
            ->setRequired(false)
            ->onlyOnForms();

        if (crud::PAGE_NEW === $pageName) {
            $plainPassword->setLabel('Пароль')
                ->setRequired(true)
                ->setColumns(4);
        } else {
            $plainPassword->setLabel('Новый пароль')
                ->setColumns(4);
        }

        yield $plainPassword;

        yield TelephoneField::new('phone1', 'Телефон 1')
            ->setColumns(4)
            ->setRequired(false);

        yield TelephoneField::new('phone2', 'Телефон 2')
            ->hideOnIndex()
            ->setColumns(4)
            ->setRequired(false);

        yield AssociationField::new('occupation', 'Специальность')
            ->setColumns(6)
            ->setFormTypeOptions(['by_reference' => false])
            ->addCssClass("occupation-field")
            ->hideOnIndex();

        yield AssociationField::new('districts', 'Районы работ')
            ->setColumns(6)
            ->setFormTypeOptions(['by_reference' => false])
            ->addCssClass("districts-field")
            ->hideOnIndex();

        yield TextEditorField::new('bio', 'О себе')
            ->hideOnIndex()
            ->setColumns(12)
            ->setRequired(false);

        yield CollectionField::new('socialNetworks', 'Соц. сети')
            ->useEntryCrudForm(SocialNetworkCrudController::class)
            ->hideOnIndex()
            ->setColumns(12)
            ->setRequired(false);

        yield CollectionField::new('education', 'Образование')
            ->useEntryCrudForm(EducationCrudController::class)
            ->hideOnIndex()
            ->setColumns(12)
            ->setRequired(false);

        yield VichImageField::new('imageFile', 'Фото профиля')
            ->setHelp('
                <div class="mt-3">
                    <span class="badge badge-info">*.jpg</span>
                    <span class="badge badge-info">*.jpeg</span>
                    <span class="badge badge-info">*.png</span>
                    <span class="badge badge-info">*.jiff</span>
                    <span class="badge badge-info">*.webp</span>
                </div>
            ')
            ->onlyOnForms()
            ->setColumns(12);

        yield TextField::new('password', 'Пароль')
            ->onlyOnDetail();

        yield DateTimeField::new('updatedAt', 'Обновлено')
            ->onlyOnIndex();

        yield DateTimeField::new('createdAt', 'Создано')
            ->onlyOnIndex();
    }
}
