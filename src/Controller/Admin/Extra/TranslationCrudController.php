<?php

namespace App\Controller\Admin\Extra;

use App\Entity\Extra\Translation;
use EasyCorp\Bundle\EasyAdminBundle\Config\Crud;
use EasyCorp\Bundle\EasyAdminBundle\Controller\AbstractCrudController;
use EasyCorp\Bundle\EasyAdminBundle\Field\ChoiceField;
use EasyCorp\Bundle\EasyAdminBundle\Field\IdField;
use EasyCorp\Bundle\EasyAdminBundle\Field\TextareaField;
use EasyCorp\Bundle\EasyAdminBundle\Field\TextField;
use App\Controller\Admin\Traits\TimestampFieldsTrait;

class TranslationCrudController extends AbstractCrudController
{
    use TimestampFieldsTrait;

    public static function getEntityFqcn(): string
    {
        return Translation::class;
    }

    public function configureCrud(Crud $crud): Crud
    {
        return parent::configureCrud($crud)
            ->setDefaultSort(['createdAt' => 'DESC']);
    }

    public function configureFields(string $pageName): iterable
    {
        yield IdField::new('id')
            ->hideOnForm();

        yield ChoiceField::new('locale', 'Язык')
            ->setColumns(12)
            ->setChoices(Translation::LOCALES)
            ->setRequired(true);

        yield TextField::new('title', 'Название')
            ->setColumns(12)
            ->setRequired(true);

        // БАГФИКС (13.09.2026): TextEditorField (WYSIWYG/TipTap) не
        // инициализировался внутри вложенной формы CollectionField
        // (useEntryCrudForm) — виден только лейбл "Описание", сама область
        // редактора не рендерится (JS-виджет привязывается только к формам,
        // отрендеренным на исходную загрузку страницы, а не к тем, что
        // EasyAdmin подставляет динамически для записей коллекции). Этот
        // контроллер используется ИСКЛЮЧИТЕЛЬНО как вложенная форма
        // ('translations' у Category/Occupation/Legal/City/Province/
        // District/Suburb/Settlement/Village/Community) — то есть баг бил
        // по всем им сразу. TextEditorField тут и не нужен по смыслу:
        // Translation::getDescription() (DescriptionTrait) делает
        // strip_tags() на чтении — форматирование, введённое через WYSIWYG,
        // всё равно стёрлось бы. Обычная Textarea рендерится без JS-виджета,
        // поэтому работает внутри вложенной формы так же надёжно, как и
        // на самостоятельной странице.
        yield TextareaField::new('description', 'Описание')
            ->setColumns(12)
            ->setRequired(false);

        yield from $this->timestampFields();
    }
}
