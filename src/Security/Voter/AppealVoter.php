<?php

namespace App\Security\Voter;

use App\Entity\Appeal\Appeal;
use App\Entity\User;
use App\Service\AccessService;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;
use Symfony\Component\Security\Core\Authorization\Voter\Voter;

class AppealVoter extends Voter
{
    public const VIEW = 'view';
    public const CREATE = 'create';

    public function __construct(private readonly AccessService $accessService){}

    protected function supports(string $attribute, mixed $subject): bool
    {
        return in_array($attribute, [self::VIEW, self::CREATE])
            && $subject instanceof Appeal;
    }

    protected function voteOnAttribute(string $attribute, mixed $subject, TokenInterface $token): bool
    {
        /** @var User $user */
        $user = $token->getUser();

        /** @var Appeal $appeal */
        $appeal = $subject;

        return match($attribute) {
            self::VIEW => $this->canView($appeal, $user),
            self::CREATE => $this->canCreate($appeal, $user),
            default => false,
        };
    }

    private function canView(Appeal $appeal, User $user): bool
    {
        $this->accessService->check($user, 'admin');

        // Проверяем ticket appeals
        if (!$appeal->getAppealTicket()->isEmpty()) {
            foreach ($appeal->getAppealTicket() as $appealTicket) {
                $author = $appealTicket->getAuthor();
                $respondent = $appealTicket->getRespondent();

                if ($author && $author->getId() === $user->getId()) {
                    return true;
                }

                if ($respondent && $respondent->getId() === $user->getId()) {
                    return true;
                }
            }
        }

        // Проверяем chat appeals
        if (!$appeal->getAppealChat()->isEmpty()) {
            foreach ($appeal->getAppealChat() as $appealChat) {
                $author = $appealChat->getAuthor();
                $respondent = $appealChat->getRespondent();

                if ($author && $author->getId() === $user->getId()) {
                    return true;
                }

                if ($respondent && $respondent->getId() === $user->getId()) {
                    return true;
                }
            }
        }

        return false;
    }

    private function canCreate(Appeal $appeal, User $user): bool
    {
        return $this->accessService->check($user);
    }
}
