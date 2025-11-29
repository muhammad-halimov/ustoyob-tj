<?php

namespace App\Security\Voter;

use App\Entity\User;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;
use Symfony\Component\Security\Core\Authorization\Voter\Voter;

class UserVoter extends Voter
{
    public const VIEW = 'view';
    public const EDIT = 'edit';
    public const DELETE = 'delete';
    public const CREATE = 'create';

    protected function supports(string $attribute, mixed $subject): bool
    {
        return in_array($attribute, [self::VIEW, self::EDIT, self::DELETE, self::CREATE])
            && $subject instanceof User;
    }

    protected function voteOnAttribute(string $attribute, mixed $subject, TokenInterface $token): bool
    {
        /** @var User $bearerUser */
        $bearerUser = $token->getUser();

        if (!$bearerUser instanceof User) {
            return false;
        }

        /** @var User $user */
        $user = $subject;

        return match($attribute) {
            self::VIEW => $this->canView($user, $bearerUser),
            self::EDIT => $this->canEdit($user, $bearerUser),
            self::DELETE => $this->canDelete($user, $bearerUser),
            self::CREATE => $this->canCreate($user, $bearerUser),
            default => false,
        };
    }

    private function canView(User $user, User $bearerUser): bool
    {
        return false;
    }

    private function canEdit(User $user, User $bearerUser): bool
    {
        // Только админ может редактировать жалобы
        if (in_array('ROLE_ADMIN', $bearerUser->getRoles())) {
            return true;
        }

        return false;
    }

    private function canDelete(User $user, User $bearerUser): bool
    {
        // Только админ может удалять жалобы
        return in_array('ROLE_ADMIN', $bearerUser->getRoles());
    }

    private function canCreate(User $user, User $bearerUser): bool
    {
        // Только админ может удалять жалобы
        return in_array('ROLE_ADMIN', $bearerUser->getRoles());
    }
}
