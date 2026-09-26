<?php

namespace App\Service\OAuth\Telegram;

use App\ApiResource\AppMessages;
use App\Dto\OAuth\TelegramCallbackInput;
use App\Entity\Extra\OAuthProvider;
use App\Entity\User;
use App\Exception\AppMessageException;
use App\Repository\User\UserRepository;
use Doctrine\ORM\EntityManagerInterface;
use Lexik\Bundle\JWTAuthenticationBundle\Services\JWTTokenManagerInterface;
use Symfony\Bundle\SecurityBundle\Security;

/**
 * Telegram-логин — СТРУКТУРНО другой флоу, чем у Google/Facebook/
 * Instagram (см. код-флоу в GeneralOAuth): нет code/state, нет /url
 * эндпоинта, нет обмена authorization code. Вместо этого Telegram Login
 * Widget (JS-виджет на фронте) сам получает подписанные данные
 * пользователя и напрямую отдаёт их в JS-колбэк — фронтенд просто
 * пересылает эти поля сюда, в /auth/telegram/callback
 * (TelegramOAuthCallbackController → handleCallback() ниже).
 *
 * Этот класс НЕ наследует AbstractOAuthService и не реализует ни один из
 * OAuth*Interface — он самодостаточен, т.к. флоу принципиально не
 * укладывается в схему "code+state" (нет этих двух сущностей вовсе).
 *
 * БАГФИКС (27.08.2026, найден по жалобе "нету такого пользователя" при
 * логине через Telegram): до этого фикса подлинность запроса вообще не
 * проверялась — единственной "защитой" был живой запрос к Bot API
 * (checkTelegramUserExists() → getChat), который (а) не доказывал, что
 * запрос пришёл от реального владельца id (можно было залогиниться под
 * чужим Telegram id, зная/подобрав его — см. историю в git), и (б) что
 * гораздо хуже как баг — getChat для приватного чата с ботом НЕ
 * срабатывает, пока пользователь сам не написал боту хотя бы раз
 * ("Bad Request: chat not found", задокументированное поведение Telegram
 * Bot API) — то есть ЛЮБОЙ новый пользователь, никогда не писавший боту,
 * получал "USER_NOT_FOUND" при попытке зарегистрироваться/залогиниться
 * через виджет, хотя сам виджет его уже успешно авторизовал. Теперь
 * вместо этого проверяется HMAC-подпись (hash/authDate), которую виджет
 * обязан присылать — тот же алгоритм и код, что уже использовал
 * LinkOAuthProviderController для флоу привязки, вынесенный в
 * TelegramHashVerifierService, чтобы не дублировать. Живой запрос к
 * Telegram больше не нужен вовсе — подпись самодостаточна.
 */
readonly class TelegramOAuthService
{
    public function __construct(
        private UserRepository              $userRepository,
        private EntityManagerInterface      $entityManager,
        private JWTTokenManagerInterface    $jwtManager,
        private TelegramHashVerifierService $hashVerifier,
        // БАГФИКС (26.09.2026) — см. докблок $security в AbstractOAuthService,
        // та же логика здесь: Telegram не наследует AbstractOAuthService (свой
        // флоу без code/state), поэтому Security внедряется отдельно.
        private Security                    $security,
    ){}

    /**
     * Точка входа флоу логина через Telegram. Проверяет подпись
     * (hash/authDate) ПЕРЕД тем, как доверять любым другим полям —
     * см. докблок класса и TelegramHashVerifierService.
     */
    public function handleCallback(int $id, ?string $username, ?string $firstName, ?string $lastName, ?string $photoUrl, ?string $role, string $hash, int $authDate): array
    {
        if (time() - $authDate > 600) {
            throw new AppMessageException(AppMessages::OAUTH_TELEGRAM_EXPIRED);
        }

        $verifiedFields = [
            'id'         => $id,
            'first_name' => $firstName,
            'last_name'  => $lastName,
            'username'   => $username,
            'photo_url'  => $photoUrl,
            'auth_date'  => $authDate,
        ];

        if (!$this->hashVerifier->verify($verifiedFields, $hash)) {
            throw new AppMessageException(AppMessages::OAUTH_INVALID_SIGNATURE);
        }

        $input            = new TelegramCallbackInput();
        $input->id        = $id;
        $input->username  = $username;
        $input->firstName = $firstName;
        $input->lastName  = $lastName;
        $input->photoUrl  = $photoUrl;

        return $this->findOrCreateUser($input, $role ?? 'user');
    }

    /**
     * Двухступенчатый find-or-create (как у Instagram — Telegram тоже не
     * даёт email, только id/username/имя/фамилию/аватар).
     */
    private function findOrCreateUser(TelegramCallbackInput $telegramData, string $role): array
    {
        $telegramId = (string) $telegramData->id;

        // 1. Already linked — log in directly
        if ($user = $this->userRepository->findByOAuthProvider('telegram', $telegramId)) {
            $this->updateUserFromTelegramData($user, $telegramData);
            $this->entityManager->flush();
            return ['user' => $user, 'token' => $this->jwtManager->create($user), 'isNew' => false];
        }

        // 2. Пользователь уже авторизован (валидный Bearer уже открытой сессии,
        // например через Google) и этот Telegram-аккаунт свободен — привязываем
        // к текущей сессии вместо создания несвязанного дубля. См. докблок
        // $security в AbstractOAuthService — тот же случай, только зеркально
        // (там: "TG первый, потом по ошибке логин вместо линковки Google",
        // здесь — наоборот).
        $currentUser = $this->security->getUser();
        if ($currentUser instanceof User) {
            $op = (new OAuthProvider())
                ->setProvider('telegram')
                ->setProviderId($telegramId)
                ->setUser($currentUser);
            $this->entityManager->persist($op);
            $this->updateUserFromTelegramData($currentUser, $telegramData);
            $this->entityManager->flush();

            return ['user' => $currentUser, 'token' => $this->jwtManager->create($currentUser), 'isNew' => false];
        }

        // 3. New user — create immediately with a local placeholder email
        $user = (new User())
            ->setEmail("oauth+telegram_{$telegramId}@internal.local")
            ->setName($telegramData->firstName ?? '')
            ->setSurname($telegramData->lastName ?? '')
            ->setLogin($telegramData->username ?? null)
            ->setImageExternalUrl($telegramData->photoUrl ?? '')
            ->setPassword('')
            ->setActive(true)
            ->setApproved(true)
            ->setGender('gender_neutral')
            ->setRoles(match($role) {
                'master' => ['ROLE_MASTER'],
                'client' => ['ROLE_CLIENT'],
                default  => ['ROLE_USER'],
            });

        $op = (new OAuthProvider())
            ->setProvider('telegram')
            ->setProviderId($telegramId)
            ->setUser($user);

        $this->entityManager->persist($user);
        $this->entityManager->persist($op);
        $this->entityManager->flush();

        return ['user' => $user, 'token' => $this->jwtManager->create($user), 'isNew' => true];
    }

    private function updateUserFromTelegramData(User $user, TelegramCallbackInput $telegramData): void
    {
        if ($telegramData->username !== null && empty($user->getLogin())) {
            $user->setLogin($telegramData->username);
        }
        if ($telegramData->firstName !== null && empty($user->getName())) {
            $user->setName($telegramData->firstName);
        }
        if ($telegramData->lastName !== null && empty($user->getSurname())) {
            $user->setSurname($telegramData->lastName);
        }
        if ($telegramData->photoUrl !== null && empty($user->getImageExternalUrl())) {
            $user->setImageExternalUrl($telegramData->photoUrl);
        }
    }

}
