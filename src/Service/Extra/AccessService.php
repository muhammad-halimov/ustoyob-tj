<?php

namespace App\Service\Extra;

use App\Entity\Ticket\Ticket;
use App\Entity\User;
use App\Repository\User\BlackListRepository;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Symfony\Component\Security\Core\Exception\TokenNotFoundException;

readonly class AccessService
{
    private const array TRIPLE_ALLOWED_ROLES = ['ROLE_ADMIN', 'ROLE_CLIENT', 'ROLE_MASTER'];
    private const array DOUBLE_ALLOWED_ROLES = ['ROLE_CLIENT', 'ROLE_MASTER'];

    public function __construct(
        private Security            $security,
        private BlackListRepository $blackListRepository,
    ){}

    public function check(User|null $user, string $grade = 'triple', bool $activeAndApproved = true) : bool
    {
        if (!$user)
            throw new TokenNotFoundException("Authentication required");
        elseif (!$this->security->isGranted('IS_AUTHENTICATED_FULLY'))
            throw new AccessDeniedHttpException("Authentication required. User #{$user->getId()} - {$user->getEmail()}");
        elseif (!$this->security->getUser())
            throw new TokenNotFoundException('Authentication required');

        if ($activeAndApproved) {
            if (!$user->getActive())
                throw new AccessDeniedHttpException("User is not active. User #{$user->getId()} - {$user->getEmail()}");
            elseif (!$user->getApproved())
                throw new AccessDeniedHttpException("User is not approved. User #{$user->getId()} - {$user->getEmail()}");
        }

        switch ($grade) {
            case 'triple':
                if (!array_intersect(self::TRIPLE_ALLOWED_ROLES, $user->getRoles()))
                    throw new AccessDeniedHttpException('Extra denied');
                break;
            case 'double':
                if (!array_intersect(self::DOUBLE_ALLOWED_ROLES, $user->getRoles()))
                    throw new AccessDeniedHttpException('Extra denied');
                break;
            case 'client':
                if (!in_array("ROLE_CLIENT", $user->getRoles()))
                    throw new AccessDeniedHttpException('Extra denied');
                break;
            case 'master':
                if (!in_array("ROLE_MASTER", $user->getRoles()))
                    throw new AccessDeniedHttpException('Extra denied');
                break;
            case 'admin':
                if (!in_array("ROLE_ADMIN", $user->getRoles()))
                    throw new AccessDeniedHttpException('Extra denied');
                break;
            default:
                throw new AccessDeniedHttpException('Role not allowed');
        }

        return true;
    }

    public function checkBlackList(User|null $author, User|null $assumedUser = null, Ticket|null $ticket = null): bool
    {
        if ($ticket && $author) {
            $this->check($author);

            if ($this->blackListRepository->findDuplicate($author, null, $ticket)) {
                throw new AccessDeniedHttpException('You blacklisted this ticket');
            }
        }

        if ($assumedUser) {
            $this->check($assumedUser);

            if ($this->blackListRepository->findDuplicate($author, $assumedUser)) {
                throw new AccessDeniedHttpException('You blacklisted this user');
            }

            if ($this->blackListRepository->findDuplicate($assumedUser, $author)) {
                throw new AccessDeniedHttpException('You are blacklisted by this user');
            }
        }

        return true;
    }
}
