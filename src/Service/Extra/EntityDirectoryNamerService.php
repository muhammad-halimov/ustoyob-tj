<?php

namespace App\Service\Extra;

use App\Entity\Extra\MultipleImage;
use App\Entity\Geography\City\City;
use App\Entity\Geography\City\Suburb;
use App\Entity\Geography\District\Community;
use App\Entity\Geography\District\District;
use App\Entity\Geography\District\Settlement;
use App\Entity\Geography\District\Village;
use App\Entity\Ticket\Category;
use App\Entity\User;
use App\Entity\User\Occupation;
use Vich\UploaderBundle\Mapping\PropertyMapping;
use Vich\UploaderBundle\Naming\DirectoryNamerInterface;

readonly class EntityDirectoryNamerService implements DirectoryNamerInterface
{
    public function directoryName(object|array $object, PropertyMapping $mapping): string
    {
        // MultipleImage — универсальная сущность; определяем папку по заполненной связи
        if ($object instanceof MultipleImage) {
            return match (true) {
                $object->getGallery()            !== null => 'galleries',
                $object->getTicket()             !== null => 'tickets',
                $object->getChatMessage()        !== null => 'chat_messages',
                $object->getTechSupportMessage() !== null => 'tech_support_messages',
                $object->getReview()             !== null => 'reviews',
                $object->getAppeal()             !== null => 'appeals',
                default                                   => 'misc',
            };
        }

        return match (true) {
            $object instanceof Settlement => 'settlements',
            $object instanceof Community  => 'communities',
            $object instanceof District   => 'districts',
            $object instanceof Suburb     => 'suburbs',
            $object instanceof Village    => 'villages',
            $object instanceof City       => 'cities',

            $object instanceof Category   => 'categories',
            $object instanceof Occupation => 'occupations',
            $object instanceof User       => 'users',

            default => 'misc',
        };
    }
}
