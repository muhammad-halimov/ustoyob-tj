<?php

namespace App\Service;

use App\Entity\User;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Symfony\Component\Security\Core\Exception\TokenNotFoundException;

readonly class AccessService
{
    private const TRIPLE_ALLOWED_ROLES = ['ROLE_ADMIN', 'ROLE_CLIENT', 'ROLE_MASTER'];
    private const DOUBLE_ALLOWED_ROLES = ['ROLE_CLIENT', 'ROLE_MASTER'];

    public function __construct(private Security $security){}

    public function check(User|null $user, string $grade = 'triple') : bool
    {
        if (!$user)
            throw new TokenNotFoundException('Authentication required');
        elseif (!$this->security->isGranted('IS_AUTHENTICATED_FULLY'))
            throw new AccessDeniedHttpException('Authentication required');
        elseif (!$this->security->getUser())
            throw new TokenNotFoundException('Authentication required');
        elseif (!$user->getActive())
            throw new TokenNotFoundException('User is not active');
        elseif (!$user->getApproved())
            throw new TokenNotFoundException('User is not approved');

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
}
