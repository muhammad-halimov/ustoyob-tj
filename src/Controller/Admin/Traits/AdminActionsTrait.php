<?php

namespace App\Controller\Admin\Traits;

use EasyCorp\Bundle\EasyAdminBundle\Config\Action;
use EasyCorp\Bundle\EasyAdminBundle\Config\Actions;
use EasyCorp\Bundle\EasyAdminBundle\Config\Crud;

/**
 * Стандартная конфигурация действий для большинства CRUD-контроллеров.
 * Добавляет кнопку Detail на страницу Index и устанавливает
 * права ROLE_ADMIN на создание, редактирование и удаление.
 */
trait AdminActionsTrait
{
    public function configureActions(Actions $actions): Actions
    {
        $actions->add(Crud::PAGE_INDEX, Action::DETAIL);

        $actions->reorder(Crud::PAGE_INDEX, [
            Action::DETAIL,
            Action::EDIT,
            Action::DELETE,
        ]);

        return parent::configureActions($actions)
            ->setPermissions([
                Action::NEW    => 'ROLE_ADMIN',
                Action::DELETE => 'ROLE_ADMIN',
                Action::EDIT   => 'ROLE_ADMIN',
            ]);
    }
}
