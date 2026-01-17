<?php

namespace App\Controller\Admin\User;

use App\Controller\Admin\Field\ExternalImageField;
use App\Controller\Admin\Field\VichImageField;
use App\Controller\Admin\Geography\AddressCrudController;
use App\Entity\User;
use App\Service\Auth\AccountConfirmationService;
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
use EasyCorp\Bundle\EasyAdminBundle\Field\DateField;
use EasyCorp\Bundle\EasyAdminBundle\Field\DateTimeField;
use EasyCorp\Bundle\EasyAdminBundle\Field\EmailField;
use EasyCorp\Bundle\EasyAdminBundle\Field\IdField;
use EasyCorp\Bundle\EasyAdminBundle\Field\NumberField;
use EasyCorp\Bundle\EasyAdminBundle\Field\TelephoneField;
use EasyCorp\Bundle\EasyAdminBundle\Field\TextEditorField;
use EasyCorp\Bundle\EasyAdminBundle\Field\TextField;
use EasyCorp\Bundle\EasyAdminBundle\Router\AdminUrlGenerator;
use Random\RandomException;
use Symfony\Component\HttpFoundation\RedirectResponse;
use Symfony\Component\Mailer\Exception\TransportExceptionInterface;

use Doctrine\ORM\QueryBuilder;
use EasyCorp\Bundle\EasyAdminBundle\Collection\FieldCollection;
use EasyCorp\Bundle\EasyAdminBundle\Collection\FilterCollection;
use EasyCorp\Bundle\EasyAdminBundle\Dto\EntityDto;
use EasyCorp\Bundle\EasyAdminBundle\Dto\SearchDto;
use EasyCorp\Bundle\EasyAdminBundle\Orm\EntityRepository;

class UserCrudController extends AbstractCrudController
{
    public function __construct(
        private readonly AccountConfirmationService  $accountConfirmationService,
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
            ->setPageTitle(Crud::PAGE_DETAIL, "Информация о пользователе")
            ->setDefaultSort(['id' => 'DESC']);
    }

    public function createIndexQueryBuilder(
        SearchDto $searchDto,
        EntityDto $entityDto,
        FieldCollection $fields,
        FilterCollection $filters
    ): QueryBuilder
    {
        $qb = $this->container->get(EntityRepository::class)->createQueryBuilder($searchDto, $entityDto, $fields, $filters);

        // Проверяем, сортируем ли мы по roles
        if ($searchDto->getSort() && isset($searchDto->getSort()['roles'])) {
            $direction = $searchDto->getSort()['roles'];

            // Добавляем кастомную сортировку: конвертируем JSON в текст для сортировки
            $qb->addSelect("CAST(entity.roles AS TEXT) as HIDDEN roles_text")->orderBy('roles_text', $direction);
        }

        return $qb;
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

        $actions
            ->add(Crud::PAGE_INDEX, Action::new('confirmAccountRequest', 'Подтвердить пользователя', 'fas fa-circle-check')
            ->linkToCrudAction('confirmAccountRequest'));

        return parent::configureActions($actions)
            ->setPermissions([
                Action::NEW => 'ROLE_ADMIN',
                Action::DELETE => 'ROLE_ADMIN',
                Action::EDIT => 'ROLE_ADMIN',
            ]);
    }

    /**
     * @throws RandomException
     * @throws TransportExceptionInterface
     */
    public function confirmAccountRequest(EntityManagerInterface $entityManager, AdminUrlGenerator $adminUrlGenerator): RedirectResponse
    {
        $id = $this->getContext()->getRequest()->get('entityId');
        $user = $entityManager->getRepository(User::class)->find($id);

        $currentPage = $this
            ->redirect($adminUrlGenerator
            ->setController(UserCrudController::class)
            ->setAction(Crud::PAGE_INDEX)
            ->generateUrl());

        if (!$user) {
            $this->addFlash('warning', 'Пользователь не найден.');
            return $currentPage;
        }

        if ($user->getActive() && $user->getApproved()) {
            $this->addFlash('warning', 'Пользователь уже одобрен и активен.');
            return $currentPage;
        }

        $response = $this->accountConfirmationService->sendConfirmationEmail($user);
        $this->addFlash('success', $response);

        return $currentPage;
    }

    public function configureFields(string $pageName): iterable
    {
        yield IdField::new('id')
            ->hideOnForm();

        yield BooleanField::new('active', 'Активен')
            ->addCssClass("form-switch")
            ->setColumns(12);

        yield BooleanField::new('approved', 'Подтвержден')
            ->addCssClass("form-switch")
            ->setColumns(12);

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
            ->setRequired(false)
            ->setChoices(User::GENDERS)
            ->setColumns(4);

        yield TextField::new('password', 'Пароль')
            ->setColumns(4)
            ->setRequired(false)
            ->hideOnIndex();

        yield TelephoneField::new('phone1', 'Телефон 1')
            ->setColumns(2)
            ->setRequired(false);

        yield TelephoneField::new('phone2', 'Телефон 2')
            ->hideOnIndex()
            ->setColumns(2)
            ->setRequired(false);

        yield TelephoneField::new('telegramChatId', 'ID телеграм чата (админ)')
            ->hideOnIndex()
            ->setColumns(4)
            ->setRequired(false);

        yield AssociationField::new('occupation', 'Специальность')
            ->setColumns(4)
            ->setFormTypeOptions(['by_reference' => false])
            ->addCssClass("occupation-field")
            ->hideOnIndex();

//        yield CollectionField::new('phones', 'Телефоны')
//            ->useEntryCrudForm(PhoneCrudController::class)
//            ->setColumns(5)
//            ->setFormTypeOptions(['by_reference' => false]);

        yield CollectionField::new('addresses', 'Адреса')
            ->useEntryCrudForm(AddressCrudController::class)
            ->setColumns(6)
            ->setFormTypeOptions(['by_reference' => false])
            ->addCssClass("addresses-field")
            ->hideOnIndex();

        yield DateField::new('dateOfBirth', 'Дата рождения')
            ->setColumns(2)
            ->hideOnIndex();

        yield TextEditorField::new('bio', 'О себе')
            ->hideOnIndex()
            ->setColumns(12)
            ->setRequired(false);

        yield CollectionField::new('socialNetworks', 'Соц. сети')
            ->useEntryCrudForm(SocialNetworkCrudController::class)
            ->hideOnIndex()
            ->setColumns(6)
            ->setRequired(false);

        yield CollectionField::new('education', 'Образование')
            ->useEntryCrudForm(EducationCrudController::class)
            ->hideOnIndex()
            ->setColumns(6)
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
            ->setColumns(6);

        yield ExternalImageField::new('imageExternalUrl', 'Фото профиля (внешняя ссылка)')
            ->hideOnIndex()
            ->setColumns(6);

        yield DateTimeField::new('updatedAt', 'Обновлено')
            ->hideOnForm();

        yield DateTimeField::new('createdAt', 'Создано')
            ->hideOnForm();
    }
}
