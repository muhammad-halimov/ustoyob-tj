<?php

namespace App\EventListener;

use App\Service\Image\BlurhashGenerator;
use Symfony\Component\EventDispatcher\Attribute\AsEventListener;
use Vich\UploaderBundle\Event\Event;
use Vich\UploaderBundle\Event\Events;

/**
 * Считает BlurHash сразу после того, как VichUploader записал файл на диск,
 * и кладёт его в сущность (SingleImageTrait::$imageBlurhash).
 *
 * POST_UPLOAD срабатывает ВНУТРИ Doctrine-хука Vich (prePersist для новой
 * сущности, preUpdate — для существующей, например смена аватара). В обоих
 * случаях значение попадает в тот же INSERT/UPDATE: для preUpdate Vich сам
 * пересчитывает changeset после загрузки (UploadListener), и наше поле
 * входит в него.
 *
 * Работает для всех сущностей с SingleImageTrait (User, Category, Occupation,
 * гео-справочники, MultipleImage) — единая точка, отдельных хуков в
 * контроллерах и админке не нужно: админка тоже грузит через Vich.
 */
final readonly class ImageBlurhashListener
{
    public function __construct(private BlurhashGenerator $generator) {}

    #[AsEventListener(event: Events::POST_UPLOAD)]
    public function __invoke(Event $event): void
    {
        $object = $event->getObject();

        if (!method_exists($object, 'setImageBlurhash')) {
            return;
        }

        $mapping = $event->getMapping();
        $dir     = $mapping->getUploadDir($object);
        $path    = $mapping->getUploadDestination()
            . ($dir !== '' && $dir !== null ? '/' . $dir : '')
            . '/' . $mapping->getFileName($object);

        $object->setImageBlurhash($this->generator->fromFile($path));
    }
}
