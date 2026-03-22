<?php

namespace App\Service\Extra;

use App\Entity\Appeal\Appeal;
use App\Entity\Chat\ChatMessage;
use App\Entity\Gallery\Gallery;
use App\Entity\Geography\City\City;
use App\Entity\Geography\City\Suburb;
use App\Entity\Geography\District\Community;
use App\Entity\Geography\District\District;
use App\Entity\Geography\District\Settlement;
use App\Entity\Geography\District\Village;
use App\Entity\Review\Review;
use App\Entity\TechSupport\TechSupport;
use App\Entity\TechSupport\TechSupportMessage;
use App\Entity\Ticket\Category;
use App\Entity\Ticket\Ticket;
use App\Entity\User;
use App\Entity\User\Occupation;
use Vich\UploaderBundle\Mapping\PropertyMapping;
use Vich\UploaderBundle\Naming\DirectoryNamerInterface;

readonly class EntityDirectoryNamerService implements DirectoryNamerInterface
{
    public function directoryName(object|array $object, PropertyMapping $mapping): string
    {
        return match (true) {
            $object instanceof Category => 'categories',
            $object instanceof Ticket   => 'tickets',

            $object instanceof Settlement => 'settlements',
            $object instanceof Community  => 'communities',
            $object instanceof District   => 'districts',
            $object instanceof Suburb     => 'suburbs',
            $object instanceof Village    => 'villages',
            $object instanceof City       => 'cities',

            $object instanceof ChatMessage => 'chat_messages',
            $object instanceof Occupation  => 'occupations',
            $object instanceof Gallery     => 'galleries',
            $object instanceof User        => 'users',

            $object instanceof TechSupportMessage => 'tech_support_messages',
            $object instanceof TechSupport        => 'tech_support',
            $object instanceof Review             => 'reviews',
            $object instanceof Appeal             => 'appeals',

            default => 'misc',
        };
    }
}
