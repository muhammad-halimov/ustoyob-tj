<?php

namespace App\Entity\User;

use ApiPlatform\Metadata\ApiFilter;
use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Delete;
use ApiPlatform\Metadata\GetCollection;
use ApiPlatform\Metadata\Post;
use App\Controller\Api\CRUD\POST\User\CollectionEntry\ApiPostBlackListController;
use App\Controller\Api\Filter\Extra\CollectionEntryTypeFilter;
use App\Entity\Extra\AbstractCollectionEntry;
use App\Entity\Trait\Readable\G;
use App\Repository\User\BlackListRepository;
use App\State\CollectionEntry\BlackListStateProvider;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: BlackListRepository::class)]
#[ORM\HasLifecycleCallbacks]
#[ApiResource(
    operations: [
        new GetCollection(
            uriTemplate: '/black-lists/me',
            normalizationContext: ['groups' => G::OPS_BLACK_LISTS],
            provider: BlackListStateProvider::class,
        ),
        new Post(
            uriTemplate: '/black-lists',
            controller: ApiPostBlackListController::class,
            normalizationContext: ['groups' => G::OPS_BLACK_LISTS],
        ),
        new Delete(
            uriTemplate: '/black-lists/{id}',
            requirements: ['id' => '\d+'],
            normalizationContext: ['groups' => G::OPS_BLACK_LISTS],
            security:
                "is_granted('ROLE_ADMIN')
                            or
                 object.getOwner() == user",
        ),
    ],
    paginationClientItemsPerPage: true,
    paginationEnabled: true,
    paginationItemsPerPage: 25,
    paginationMaximumItemsPerPage: 50,
)]
#[ApiFilter(CollectionEntryTypeFilter::class)]
class BlackList extends AbstractCollectionEntry
{
    public function __toString(): string
    {
        return "BlackList #{$this->id}";
    }
}
