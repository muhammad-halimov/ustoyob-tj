<?php

namespace App\Controller\Admin\Traits;

use EasyCorp\Bundle\EasyAdminBundle\Field\DateTimeField;

/**
 * Поля updatedAt / createdAt для configureFields.
 * Использование: yield from $this->timestampFields();
 */
trait TimestampFieldsTrait
{
    private function timestampFields(): array
    {
        return [
            DateTimeField::new('updatedAt', 'Обновлено')->hideOnForm(),
            DateTimeField::new('createdAt', 'Создано')->hideOnForm(),
        ];
    }
}
