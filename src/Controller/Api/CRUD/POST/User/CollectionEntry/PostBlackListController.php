<?php

namespace App\Controller\Api\CRUD\POST\User\CollectionEntry;

use App\Entity\Extra\AbstractCollectionEntry;
use App\Entity\Ticket\Ticket;
use App\Entity\User;
use App\Entity\User\BlackList;
use App\Repository\User\BlackListRepository;
use App\Service\Extra\ExtractIriService;

class PostBlackListController extends AbstractPostCollectionEntryController
{
    public function __construct(
        ExtractIriService       $extractIriService,
        private readonly BlackListRepository $repository,
    ) {
        parent::__construct($extractIriService);
    }

    protected function newEntry(): AbstractCollectionEntry
    {
        return new BlackList();
    }

    protected function findDuplicate(User $owner, ?User $user = null, ?Ticket $ticket = null): ?BlackList
    {
        return $this->repository->findDuplicate($owner, $user, $ticket);
    }

    protected function getSerializationGroup(): string
    {
        return 'blackLists:read';
    }
}
