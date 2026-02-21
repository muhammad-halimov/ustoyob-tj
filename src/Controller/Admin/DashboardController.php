<?php

namespace App\Controller\Admin;

use App\Controller\Admin\TechSupport\TechSupportCrudController;
use App\Controller\Admin\User\UserCrudController;
use App\Entity\Appeal\Appeal;
use App\Entity\Chat\Chat;
use App\Entity\Gallery\Gallery;
use App\Entity\Geography\City\City;
use App\Entity\Geography\District\District;
use App\Entity\Geography\Province;
use App\Entity\Legal\Legal;
use App\Entity\Review\Review;
use App\Entity\TechSupport\TechSupport;
use App\Entity\Ticket\Category;
use App\Entity\Ticket\Ticket;
use App\Entity\Ticket\Unit;
use App\Entity\User;
use App\Entity\User\Occupation;
use EasyCorp\Bundle\EasyAdminBundle\Attribute\AdminDashboard;
use EasyCorp\Bundle\EasyAdminBundle\Config\Dashboard;
use EasyCorp\Bundle\EasyAdminBundle\Config\MenuItem;
use EasyCorp\Bundle\EasyAdminBundle\Controller\AbstractDashboardController;
use EasyCorp\Bundle\EasyAdminBundle\Router\AdminUrlGenerator;
use Psr\Container\ContainerExceptionInterface;
use Psr\Container\NotFoundExceptionInterface;
use Symfony\Component\HttpFoundation\Response;

#[AdminDashboard(routePath: '/', routeName: 'admin')]
class DashboardController extends AbstractDashboardController
{
    /**
     * @throws ContainerExceptionInterface
     * @throws NotFoundExceptionInterface
     */
    public function index(): Response
    {
        return $this
            ->redirect(url: $this->container
            ->get(AdminUrlGenerator::class)
            ->setController(TechSupportCrudController::class)
            ->generateUrl());
    }

    public function configureDashboard(): Dashboard
    {
        return Dashboard::new()
            ->setTitle('USTOYOB.TJ');
    }

    public function configureMenuItems(): iterable
    {
        yield MenuItem::section('Мастера и клиенты');
            yield MenuItem::linkToCrud('Галерея работ', 'fas fa-images', Gallery::class);
            yield MenuItem::linkToCrud('Объявление / Услуги', 'fas fa-ticket', Ticket::class);

        yield MenuItem::section('Пользователи и группы');
            yield MenuItem::linkToCrud('Пользователи', 'fas fa-users', User::class);
            yield MenuItem::linkToCrud('Чаты и сообщения', 'fas fa-comments', Chat::class);
            yield MenuItem::linkToCrud('Отзывы', 'fas fa-star', Review::class);
            yield MenuItem::linkToCrud('Тех. поддержка', 'fas fa-headset', TechSupport::class);
            yield MenuItem::linkToCrud('Жалобы', 'fas fa-triangle-exclamation', Appeal::class);

        yield MenuItem::section('Доп. настройки');
            yield MenuItem::subMenu('География', 'fas fa-location-dot')->setSubItems([
                MenuItem::linkToCrud('Город', 'fas fa-city', City::class),
                MenuItem::linkToCrud('Район', 'fas fa-building', District::class),
                MenuItem::linkToCrud('Область', 'fas fa-map-pin', Province::class),
            ]);
            yield MenuItem::subMenu('Категории', 'fas fa-layer-group')->setSubItems([
                MenuItem::linkToCrud('Категории работ', 'fas fa-briefcase', Category::class),
                MenuItem::linkToCrud('Специальности / Подкатегории', 'fas fa-user-doctor', Occupation::class),
            ]);
            yield MenuItem::linkToCrud('Ед. измерения', 'fas fa-gauge', Unit::class);
            yield MenuItem::linkToCrud('Регуляции', 'fas fa-lock', Legal::class);
            yield MenuItem::linkToUrl('API','fas fa-link', '/api')
                ->setLinkTarget('_blank');
    }
}
