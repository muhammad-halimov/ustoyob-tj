<?php

namespace App\Controller\Admin\Traits;

/**
 * Справочный HTML с поддерживаемыми форматами файлов для VichImageField.
 *
 * Использование:
 *   VichImageField::new('imageFile', 'Фото')
 *       ->setHelp($this->vichImageBadgeHelp())
 *       ->onlyOnForms()
 *       ->setColumns(X);
 */
trait VichImageHelpTrait
{
    private function vichImageBadgeHelp(): string
    {
        return '
            <div class="mt-3">
                <span class="badge badge-info">*.jpg</span>
                <span class="badge badge-info">*.jpeg</span>
                <span class="badge badge-info">*.png</span>
                <span class="badge badge-info">*.jiff</span>
                <span class="badge badge-info">*.webp</span>
            </div>
        ';
    }
}
