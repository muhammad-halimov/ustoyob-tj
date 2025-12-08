<?php

namespace App\Service;

use App\Entity\Ticket\Ticket;
use App\Entity\User;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Symfony\Component\Security\Core\Exception\TokenNotFoundException;

readonly class AccessService
{
    private const TRIPLE_ALLOWED_ROLES = ['ROLE_ADMIN', 'ROLE_CLIENT', 'ROLE_MASTER'];
    private const DOUBLE_ALLOWED_ROLES = ['ROLE_CLIENT', 'ROLE_MASTER'];

    public function __construct(private Security $security){}

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
                    throw new AccessDeniedHttpException('Access denied');
                break;
            case 'double':
                if (!array_intersect(self::DOUBLE_ALLOWED_ROLES, $user->getRoles()))
                    throw new AccessDeniedHttpException('Access denied');
                break;
            case 'client':
                if (!in_array("ROLE_CLIENT", $user->getRoles()))
                    throw new AccessDeniedHttpException('Access denied');
                break;
            case 'master':
                if (!in_array("ROLE_MASTER", $user->getRoles()))
                    throw new AccessDeniedHttpException('Access denied');
                break;
            case 'admin':
                if (!in_array("ROLE_ADMIN", $user->getRoles()))
                    throw new AccessDeniedHttpException('Access denied');
                break;
            default:
                throw new AccessDeniedHttpException('Role not allowed');
        }

        return true;
    }

    public function checkBlackList(User|null $author, User|null $assumedUser = null, Ticket|null $ticket = null): bool
    {
        // Проверяем, не заблокировал ли author этот Ticket
        if ($ticket && $author) {
            $this->check($author);

            foreach ($author->getBlackLists() as $blackList) {
                if ($blackList->getTickets()->contains($ticket)) {
                    throw new AccessDeniedHttpException('You blacklisted this ticket');
                }
            }
        }

        if ($assumedUser) {
            $this->check($assumedUser);

            foreach ($author->getBlackLists() as $blackList) { // Проверяем, не заблокировал ли author пользователя assumedUser
                if ($blackList->getClients()->contains($assumedUser) ||
                    $blackList->getMasters()->contains($assumedUser)) {
                    throw new AccessDeniedHttpException('You blacklisted this user');
                }
            }

            foreach ($assumedUser->getBlackLists() as $blackList) { // Проверяем, не заблокировал ли assumedUser пользователя author
                if ($blackList->getClients()->contains($author) ||
                    $blackList->getMasters()->contains($author)) {
                    throw new AccessDeniedHttpException('You are blacklisted by this user');
                }
            }
        }

        return true;
    }
}
