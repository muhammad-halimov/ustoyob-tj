<?php

namespace App\Controller\Admin\Field;

use EasyCorp\Bundle\EasyAdminBundle\Contracts\Field\FieldInterface;
use EasyCorp\Bundle\EasyAdminBundle\Field\FieldTrait;
use Vich\UploaderBundle\Form\Type\VichImageType;

class VichImageField implements FieldInterface
{
    use FieldTrait;

    /**
     * Создает новое поле VichImageField
     *
     * @param string $propertyName Имя свойства (например, 'imageFile')
     * @param string|null $label Метка поля
     * @return static
     */
    public static function new(string $propertyName, ?string $label = null): static
    {
        return (new self())
            ->setProperty($propertyName)
            ->setLabel($label)
            ->setTemplatePath('admin/field/vich_image.html.twig') // шаблон для index/detail
            ->setFormType(VichImageType::class)            // форма загрузки для new/edit
            ->addCssClass('field-vich-image');
    }
}
