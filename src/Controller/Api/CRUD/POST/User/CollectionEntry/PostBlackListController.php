<?php

namespace App\Controller\Api\CRUD\POST\User\CollectionEntry;

use App\Entity\Extra\AbstractCollectionEntry;
use App\Entity\Extra\BlackList;
use App\Entity\Ticket\Ticket;
use App\Entity\User;
use App\Repository\User\BlackListRepository;
use App\Service\Extra\AccessService;
use App\Service\Extra\ExtractIriService;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\SecurityBundle\Security;

class PostBlackListController extends AbstractPostCollectionEntryController
{
    public function __construct(
        EntityManagerInterface           $entityManager,
        ExtractIriService                $extractIriService,
        AccessService                    $accessService,
        Security                         $security,
        private readonly BlackListRepository $repository,
    ) {
        parent::__construct($entityManager, $extractIriService, $accessService, $security);
    }

    protected function newEntry(): AbstractCollectionEntry
    {
        return new BlackList();
    }

    protected function findDuplicate(User $owner, ?User $user = null, ?Ticket $ticket = null): mixed
    {
        return $this->repository->findDuplicate($owner, $user, $ticket);
    }

    protected function getSerializationGroup(): string
    {
        return 'blackLists:read';
    }
}
