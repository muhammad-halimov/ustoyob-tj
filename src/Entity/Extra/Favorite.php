<?php

namespace App\Entity\Extra;

use App\Controller\Api\Filter\Extra\CollectionEntryTypeFilter;
use ApiPlatform\Metadata\ApiFilter;
use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Delete;
use ApiPlatform\Metadata\GetCollection;
use ApiPlatform\Metadata\Post;
use App\Controller\Api\CRUD\POST\User\CollectionEntry\PostFavoriteController;
use App\State\CollectionEntry\FavoriteStateProvider;
use App\Repository\User\FavoriteRepository;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: FavoriteRepository::class)]
#[ORM\HasLifecycleCallbacks]
#[ApiResource(
    operations: [
        new GetCollection(
            uriTemplate: '/favorites/me',
            normalizationContext: ['groups' => ['favorites:read']],
            provider: FavoriteStateProvider::class,
        ),
        new Post(
            uriTemplate: '/favorites',
            controller: PostFavoriteController::class,
            normalizationContext: ['groups' => ['favorites:read']],
        ),
        new Delete(
            uriTemplate: '/favorites/{id}',
            requirements: ['id' => '\d+'],
            normalizationContext: ['groups' => ['favorites:read']],
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
