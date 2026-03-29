<?php

namespace App\Controller\Api\CRUD\POST\User\CollectionEntry;

use App\Entity\Extra\AbstractCollectionEntry;
use App\Entity\Ticket\Ticket;
use App\Entity\Trait\Readable\G;
use App\Entity\User;
use App\Entity\User\Favorite;
use App\Repository\User\FavoriteRepository;
use Exception;

class ApiPostFavoriteController extends AbstractPostCollectionEntryController
{
    public function __construct(private readonly FavoriteRepository $repository) {}

    protected function setSerializationGroups(): array { return G::OPS_FAVORITES; }

    protected function newEntry(): AbstractCollectionEntry { return new Favorite(); }

    protected function findDuplicate(User $owner, ?User $user = null, ?Ticket $ticket = null): ?Favorite
    {
        return $this->repository->findDuplicate($owner, $user, $ticket);
    }

    protected function validateUser(User $bearer, User $target): ?string
    {
        try {
            $this->accessService->checkBlackList($bearer, $target);
            return null;
        } catch (Exception $e) {
            return $e->getMessage();
        }
    }

    protected function validateTicket(User $bearer, Ticket $target): ?string
    {
        try {
            $this->accessService->checkBlackList($bearer, ticket: $target);
            return null;
        } catch (Exception $e) {
            return $e->getMessage();
        }
    }
}
