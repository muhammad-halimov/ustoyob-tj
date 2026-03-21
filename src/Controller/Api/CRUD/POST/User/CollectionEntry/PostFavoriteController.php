<?php

namespace App\Controller\Api\CRUD\POST\User\CollectionEntry;

use App\Entity\Extra\AbstractCollectionEntry;
use App\Entity\Extra\Favorite;
use App\Entity\Ticket\Ticket;
use App\Entity\User;
use App\Repository\User\FavoriteRepository;
use App\Service\Extra\AccessService;
use App\Service\Extra\ExtractIriService;
use Doctrine\ORM\EntityManagerInterface;
use Exception;
use Symfony\Bundle\SecurityBundle\Security;

class PostFavoriteController extends AbstractPostCollectionEntryController
{
    public function __construct(
        EntityManagerInterface          $entityManager,
        ExtractIriService               $extractIriService,
        AccessService                   $accessService,
        Security                        $security,
        private readonly FavoriteRepository $repository,
    ) {
        parent::__construct($entityManager, $extractIriService, $accessService, $security);
    }

    protected function newEntry(): AbstractCollectionEntry
    {
        return new Favorite();
    }

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

    protected function getSerializationGroup(): string
    {
        return 'favorites:read';
    }
}
