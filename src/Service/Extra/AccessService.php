<?php

namespace App\Service\Extra;

use App\ApiResource\AppMessages;
use App\Entity\Ticket\Ticket;
use App\Entity\User;
use App\Repository\User\BlackListRepository;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Symfony\Component\Security\Core\Exception\TokenNotFoundException;

/**
 * Централизованная проверка прав доступа для контроллеров.
 *
 * Уровни проверки ($grade):
 *   'triple' — Admin | Master | Client (по умолчанию)
 *   'double' — Master | Client
 *   'client' — только Client
 *   'master' — только Master
 *   'admin'  — только Admin
 *
 * При ошибке бросаются исключения Symfony,
 * которые API Platform перехватывает и отдаёт соответствующий HTTP-код.
 */
readonly class AccessService
{
    // Роли, которые считаются "полнымии участниками" (см. grade='triple'/'double')
    private const array TRIPLE_ALLOWED_ROLES = ['ROLE_ADMIN', 'ROLE_CLIENT', 'ROLE_MASTER'];
    private const array DOUBLE_ALLOWED_ROLES = ['ROLE_CLIENT', 'ROLE_MASTER'];
    private const array SINGLE_ALLOWED_ROLES = ['ROLE_USER', 'ROLE_ADMIN', 'ROLE_CLIENT', 'ROLE_MASTER'];

    public function __construct(
        private Security            $security,
        private BlackListRepository $blackListRepository,
    ){}

    /**
     * Проверяет аутентификацию, активность и роль пользователя.
     *
     * @param User|null $user            Текущий пользователь из Security
     * @param string    $grade           Уровень проверки роли (triple/double/client/master/admin)
     * @param bool      $activeAndApproved Требовать ли active=true и approved=true
     *                                    (отключается false только в спец. эндпоинтах,
     *                                    например при повторной отправке письма подтверждения)
     */
    public function check(User|null $user, string $grade = 'triple', bool $activeAndApproved = true) : bool
    {
        if (!$user)
            throw new TokenNotFoundException(AppMessages::get(AppMessages::AUTHENTICATION_REQUIRED)->message);
        elseif (!$this->security->isGranted('IS_AUTHENTICATED_FULLY'))
            throw new AccessDeniedHttpException(AppMessages::get(AppMessages::AUTHENTICATION_REQUIRED)->message);
        elseif (!$this->security->getUser())
            throw new TokenNotFoundException(AppMessages::get(AppMessages::AUTHENTICATION_REQUIRED)->message);

        if ($activeAndApproved) {
            if (!$user->getActive())
                throw new AccessDeniedHttpException(AppMessages::get(AppMessages::ACCESS_DENIED)->message);
            elseif (!$user->getApproved())
                throw new AccessDeniedHttpException(AppMessages::get(AppMessages::ACCESS_DENIED)->message);
        }

        switch ($grade) {
            case 'triple':
                if (!array_intersect(self::TRIPLE_ALLOWED_ROLES, $user->getRoles()))
                    throw new AccessDeniedHttpException(AppMessages::get(AppMessages::EXTRA_DENIED)->message);
                break;
            case 'double':
                if (!array_intersect(self::DOUBLE_ALLOWED_ROLES, $user->getRoles()))
                    throw new AccessDeniedHttpException(AppMessages::get(AppMessages::EXTRA_DENIED)->message);
                break;
            case 'single':
                if (!array_intersect(self::SINGLE_ALLOWED_ROLES, $user->getRoles()))
                    throw new AccessDeniedHttpException(AppMessages::get(AppMessages::EXTRA_DENIED)->message);
                break;
            case 'client':
                if (!in_array("ROLE_CLIENT", $user->getRoles()))
                    throw new AccessDeniedHttpException(AppMessages::get(AppMessages::EXTRA_DENIED)->message);
                break;
            case 'master':
                if (!in_array("ROLE_MASTER", $user->getRoles()))
                    throw new AccessDeniedHttpException(AppMessages::get(AppMessages::EXTRA_DENIED)->message);
                break;
            case 'admin':
                if (!in_array("ROLE_ADMIN", $user->getRoles()))
                    throw new AccessDeniedHttpException(AppMessages::get(AppMessages::EXTRA_DENIED)->message);
                break;
            default:
                throw new AccessDeniedHttpException(AppMessages::get(AppMessages::EXTRA_DENIED)->message);
        }

        return true;
    }

    /**
     * Проверяет черный список в обе стороны.
     *
     * Сценарии:
     *   - $ticket: заблокирован ли тикет для $author
     *   - $assumedUser: заблокирован ли $assumedUser пользователем $author?  И наоборот?
     *
     * Проверка symmetrical: если А заблокировал Б ИЛИ Б заблокировал А —
     * взаимодействие заблокировано.
     */
    public function checkBlackList(User|null $author, User|null $assumedUser = null, Ticket|null $ticket = null): bool
    {
        if ($ticket && $author) {
            $this->check($author);

            if ($this->blackListRepository->findDuplicate($author, null, $ticket)) {
                throw new AccessDeniedHttpException(AppMessages::get(AppMessages::ACCESS_DENIED)->message);
            }
        }

        if ($assumedUser) {
            $this->check($assumedUser);

            if ($this->blackListRepository->findDuplicate($author, $assumedUser)) {
                throw new AccessDeniedHttpException(AppMessages::get(AppMessages::ACCESS_DENIED)->message);
            }

            if ($this->blackListRepository->findDuplicate($assumedUser, $author)) {
                throw new AccessDeniedHttpException(AppMessages::get(AppMessages::ACCESS_DENIED)->message);
            }
        }

        return true;
    }
}
