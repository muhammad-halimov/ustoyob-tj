<?php

namespace App\Entity\User;

use ApiPlatform\Metadata\ApiFilter;
use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Delete;
use ApiPlatform\Metadata\GetCollection;
use ApiPlatform\Metadata\Post;
use App\Controller\Api\CRUD\POST\User\CollectionEntry\ApiPostFavoriteController;
use App\Controller\Api\Filter\Extra\CollectionEntryTypeFilter;
use App\Entity\Extra\AbstractCollectionEntry;
use App\Entity\Trait\Readable\G;
use App\Repository\User\FavoriteRepository;
use App\State\CollectionEntry\FavoriteStateProvider;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: FavoriteRepository::class)]
#[ORM\HasLifecycleCallbacks]
#[ApiResource(
    operations: [
        new GetCollection(
            uriTemplate: '/favorites/me',
            normalizationContext: ['groups' => G::OPS_FAVORITES],
            provider: FavoriteStateProvider::class,
        ),
        new Post(
            uriTemplate: '/favorites',
            controller: ApiPostFavoriteController::class,
            normalizationContext: ['groups' => G::OPS_FAVORITES],
        ),
        new Delete(
            uriTemplate: '/favorites/{id}',
            requirements: ['id' => '\d+'],
            normalizationContext: ['groups' => G::OPS_FAVORITES],
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
class Favorite extends AbstractCollectionEntry
{
    public function __toString(): string
    {
        return "Favorite #{$this->id}";
    }
}
