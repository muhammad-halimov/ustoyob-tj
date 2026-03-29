<?php

namespace App\Controller\Api\CRUD\POST\User\CollectionEntry;

use App\Entity\Extra\AbstractCollectionEntry;
use App\Entity\Ticket\Ticket;
use App\Entity\Trait\Readable\G;
use App\Entity\User;
use App\Entity\User\BlackList;
use App\Repository\User\BlackListRepository;

class ApiPostBlackListController extends AbstractPostCollectionEntryController
{
    public function __construct(private readonly BlackListRepository $repository) {}

    protected function setSerializationGroups(): array { return G::OPS_BLACK_LISTS; }

    protected function newEntry(): AbstractCollectionEntry { return new BlackList(); }

    protected function findDuplicate(User $owner, ?User $user = null, ?Ticket $ticket = null): ?BlackList
    {
        return $this->repository->findDuplicate($owner, $user, $ticket);
    }
}
