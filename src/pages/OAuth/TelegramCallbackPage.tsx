import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ROUTES, API_ROUTES } from '../../app/routers/routes';
import Status from '../../shared/ui/Modal/Status';
import { PageLoader } from '../../widgets/PageLoader';
import { useTranslation } from 'react-i18next';
import { Performers } from '../main/performers/Performers';
import type { PerformerItem } from '../main/performers/Performers';
import {
    setAuthToken,
    setAuthTokenExpiry,
    setUserRole,
    setUserData,
    getUserData,
    setUserEmail,
    setUserOccupation,
    getAuthToken,
    logout,
} from '../../utils/authUtils';
import type { TelegramUserData, BackendAuthCallbackResponse } from '../../entities';
import { universalApiRequest } from '../../utils/apiUtils';
import { resolveApiError } from '../../utils/appMessagesUtils';
import { getStorageItem, setStorageItem, removeStorageItem, getSessionItem, removeSessionItem } from '../../utils/storageUtils';
import { finishMobileOAuthFlow } from '../../utils/mobileOAuth';
import { finishOAuthPopup } from '../../utils/oauthPopup';

/**
 * Handles the Telegram login callback.
 * Receives Telegram user data as query params (hash, id, first_name, etc.),
 * verifies it with the backend, stores auth data, and redirects the user.
 * If the Telegram account has no linked email, redirects to TelegramLinkEmailPage.
 */
const TelegramCallbackPage = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string>('');
    const [success, setSuccess] = useState(false);
    // Новый пользователь БЕЗ заранее выбранной роли (savedRole пуст) — вход с экрана LOGIN (там
    // роль не спрашивают заранее, см. Auth.tsx: handleTelegramAuthClick), мобильное приложение
    // (роль там всегда приходит этим же путём) или cross-tab случай (выбор из REGISTER потерялся).
    // Полноэкранный пикер здесь, на своей родной full-page территории, а не в модалке.
    const [showRoleSelect, setShowRoleSelect] = useState(false);
    const [grantingRole, setGrantingRole] = useState(false);
    const [cancelling, setCancelling] = useState(false);
    // См. комментарий у аналогичного места в OAuthCallbackPage.tsx — короткая пауза с обратным
    // отсчётом после успешной регистрации (роль уже назначена), с возможностью передумать.
    const PROCEED_COUNTDOWN_SECONDS = 5;
    const [awaitingProceed, setAwaitingProceed] = useState(false);
    const [proceedSecondsLeft, setProceedSecondsLeft] = useState(PROCEED_COUNTDOWN_SECONDS);
    const { t } = useTranslation(['common', 'components']);

    // state из URL — НЕ от Telegram (у виджета нет такого понятия), а наш собственный,
    // сгенерированный в Auth.tsx перед тем, как открыть popup и увести его на /auth/telegram/start
    // (см. handleTelegramAuthClick). Тот же смысл и механизм, что oauthStateRef в
    // OAuthCallbackPage.tsx: finishOAuthPopup сверяет его с тем, что было помечено через
    // markOAuthPopupFlow — если это popup-флоу, отчитывается опенеру и закрывается сам, вместо
    // того чтобы (как раньше) всегда донавигировать эту же вкладку на HOME.
    const oauthStateRef = useRef<string | null>(null);

    // Мобильное приложение проверяем первым (см. OAuthCallbackPage.tsx — тот же порядок и
    // те же причины). Иначе — тот же popup-механизм, что у Google/Facebook/Instagram:
    // закрывает popup и отчитывается опенеру, либо (не popup-флоу — прямой заход, или
    // Telegram увёл в новую вкладку без сохранившегося state) навигирует эту же вкладку.
    const finishOrNavigate = useCallback((
        result: { status: 'success' } | { status: 'error'; message?: string },
        fallbackRoute: string,
        fallbackOptions?: { replace?: boolean },
    ) => {
        if (result.status === 'success') {
            const token = getAuthToken();
            if (token && finishMobileOAuthFlow({ status: 'success', token })) return;
        } else if (finishMobileOAuthFlow({ status: 'error', message: result.message })) {
            return;
        }

        if (!finishOAuthPopup(oauthStateRef.current, result)) {
            navigate(fallbackRoute, fallbackOptions);
            if (result.status === 'success') window.dispatchEvent(new Event('login'));
            return;
        }
        // См. комментарий у аналогичного места в OAuthCallbackPage.tsx — страховка на
        // случай, если ни postMessage/localStorage, ни window.close() не сработали.
        window.setTimeout(() => navigate(fallbackRoute, fallbackOptions), 1500);
    }, [navigate]);

    // См. комментарий у аналогичного места в OAuthCallbackPage.tsx — вынесено на верхний уровень,
    // т.к. нужно и явному клику "Далее" на экране подтверждения, и таймеру обратного отсчёта.
    const performCancel = useCallback(async () => {
        setCancelling(true);
        try {
            const userId = getUserData()?.id;
            if (userId) {
                try {
                    await universalApiRequest(`${API_ROUTES.USERS}/${userId}`, { method: 'DELETE', locale: false });
                } catch (err) {
                    console.warn('Could not delete cancelled account:', err);
                }
            }
            await logout();
        } finally {
            finishOrNavigate({ status: 'error', message: 'popup_closed' }, ROUTES.HOME);
        }
    }, [finishOrNavigate]);

    // См. комментарий у аналогичного места в OAuthCallbackPage.tsx.
    const proceedNow = useCallback(() => {
        finishOrNavigate({ status: 'success' }, ROUTES.HOME);
    }, [finishOrNavigate]);

    useEffect(() => {
        if (!awaitingProceed) return;
        if (proceedSecondsLeft <= 0) {
            proceedNow();
            return;
        }
        const timer = window.setTimeout(() => setProceedSecondsLeft(s => s - 1), 1000);
        return () => window.clearTimeout(timer);
    }, [awaitingProceed, proceedSecondsLeft, proceedNow]);

    // См. комментарий у аналогичного места в OAuthCallbackPage.tsx — window.confirm вместо
    // отдельного экрана; на отказ даём свежий отсчёт вместо оставшихся секунд.
    const handleCancelClick = () => {
        if (window.confirm(`${t('common:oauth.cancelCountdownTitle')}? ${t('common:oauth.cancelCountdownMessage')}`)) {
            performCancel();
        } else {
            setProceedSecondsLeft(PROCEED_COUNTDOWN_SECONDS);
        }
    };

    useEffect(() => {
        const processTelegramCallback = async () => {
            try {
                // Извлекаем параметры из URL
                const id = searchParams.get('id');
                const firstName = searchParams.get('first_name');
                const lastName = searchParams.get('last_name');
                const username = searchParams.get('username');
                const photoUrl = searchParams.get('photo_url');
                const authDate = searchParams.get('auth_date');
                const hash = searchParams.get('hash');
                // Наш собственный state (см. комментарий у oauthStateRef выше) — Telegram его не
                // трогает, просто дописывает свои id/hash/... следом через '&' (см. /auth/telegram/start).
                oauthStateRef.current = searchParams.get('state');

                // Проверяем что все необходимые параметры есть
                if (!id || !firstName || !hash || !authDate) {
                    const message = t('oauth.insufficientData');
                    setError(message);
                    setLoading(false);
                    finishOrNavigate({ status: 'error', message }, ROUTES.HOME);
                    return;
                }

                // Проверяем, что запрос не старше 10 минут (для защиты от replay атак)
                const currentTime = Math.floor(Date.now() / 1000);
                const authTime = parseInt(authDate, 10);
                if (currentTime - authTime > 600) {
                    const message = t('oauth.expiredRequest');
                    setError(message);
                    setLoading(false);
                    finishOrNavigate({ status: 'error', message }, ROUTES.HOME);
                    return;
                }

                // Валидируем хэш (для дополнительной безопасности)
                const telegramData: TelegramUserData = {
                    id: parseInt(id, 10),
                    first_name: firstName,
                    last_name: lastName || undefined,
                    username: username || undefined,
                    photo_url: photoUrl || undefined,
                    auth_date: authTime,
                    hash
                };

                // Примечание: хэш должен быть валидирован на сервере!
                // Заказчик не должен хранить BOT_TOKEN для валидации хэша

                // Режим привязки — отправляем данные напрямую в link endpoint
                // Проверяем sessionStorage (та же вкладка) и localStorage (новая вкладка на мобильном)
                const sessionMode = getSessionItem('oauthMode');
                const localMode = getStorageItem('oauth_mode_telegram');
                const oauthMode = sessionMode || localMode;
                if (oauthMode === 'link') {
                    const jwtToken = getAuthToken();
                    removeSessionItem('oauthMode');
                    removeStorageItem('oauth_mode_telegram');
                    if (!jwtToken) {
                        navigate(ROUTES.HOME, { replace: true });
                        return;
                    }
                    const linkBody: Record<string, unknown> = {
                        provider: 'telegram',
                        id: telegramData.id,
                        hash: telegramData.hash,
                        auth_date: telegramData.auth_date,
                        first_name: telegramData.first_name,
                    };
                    if (telegramData.last_name) linkBody.last_name = telegramData.last_name;
                    if (telegramData.username)  linkBody.username  = telegramData.username;
                    if (telegramData.photo_url) linkBody.photo_url = telegramData.photo_url;
                    const linkData = await universalApiRequest(API_ROUTES.PROFILE_OAUTH_LINK, {
                        method: 'POST',
                        body: linkBody,
                        locale: false,
                    }) as { new_token?: string };
                    if (linkData.new_token) {
                        setAuthToken(linkData.new_token);
                        const expiryTime = new Date();
                        expiryTime.setHours(expiryTime.getHours() + 1);
                        setAuthTokenExpiry(expiryTime.toISOString());
                    }
                    setSuccess(true);
                    setLoading(false);
                    // Сигналим оригинальной вкладке и закрываем эту (новая вкладка на мобильном)
                    setStorageItem('telegram_link_success', Date.now().toString());
                    setTimeout(() => {
                        window.close();
                        // Если вкладка не закрылась (та же вкладка) — навигируем
                        setTimeout(() => navigate(ROUTES.PROFILE, { replace: true }), 300);
                    }, 1500);
                    return;
                }

                // Роль, выбранную в SelectRoleModal ДО начала этого флоу (см. Auth.tsx:
                // handleTelegramAuthClick) — сохранена в sessionStorage, которая переживает обычную
                // навигацию виджета в ТОЙ ЖЕ вкладке (redirect на data-auth-url — полная перезагрузка
                // страницы, но того же таба). Отправляем её вместе с данными Telegram, чтобы бэкенд
                // мог создать аккаунт сразу с этой ролью. Пусто — если Telegram открыл подтверждение в
                // НОВОЙ вкладке (см. README.md, известный кейс на мобильном вебе): sessionStorage не
                // переживает переход в другую вкладку, тогда просто не отправляем роль вовсе — ничего
                // не гадаем (см. комментарий у 204 ниже).
                const savedRole = getSessionItem('pendingTelegramRole') as 'master' | 'client' | null;
                removeSessionItem('pendingTelegramRole');

                // hash/authDate обязательны с 27.08.2026 — бэкенд проверяет
                // подпись виджета (TelegramHashVerifierService) вместо
                // прежнего живого запроса к Bot API, который ломался для
                // любого пользователя, ни разу не писавшего боту.
                const requestData: {
                    id: number;
                    firstName: string;
                    lastName?: string;
                    username?: string;
                    photoUrl?: string;
                    role?: string;
                    hash: string;
                    authDate: number;
                } = {
                    id: telegramData.id,
                    firstName: telegramData.first_name,
                    lastName: telegramData.last_name,
                    username: telegramData.username,
                    photoUrl: telegramData.photo_url,
                    hash: telegramData.hash!,
                    authDate: telegramData.auth_date!,
                };
                if (savedRole) requestData.role = savedRole;

                const data: BackendAuthCallbackResponse = await universalApiRequest(API_ROUTES.AUTH_PROVIDER_CALLBACK('telegram'), {
                    method: 'POST',
                    body: requestData,
                    requiresAuth: false,
                    locale: false,
                });

                // Сохраняем токен и данные пользователя
                if (data.token && data.user) {
                    setAuthToken(data.token);

                    // Устанавливаем срок действия токена
                    const expiryTime = new Date();
                    expiryTime.setHours(expiryTime.getHours() + 1);
                    setAuthTokenExpiry(expiryTime.toISOString());

                    // Сохраняем данные пользователя
                    setUserData(data.user);

                    if (data.user.email) {
                        setUserEmail(data.user.email);
                    }

                    const justCreated = (data as any).status === 204;
                    if (justCreated) {
                        // Новый пользователь. Если роль уже была выбрана до этого флоу (savedRole,
                        // экран REGISTER) — она была отправлена вместе с данными Telegram выше, и
                        // бэкенд УЖЕ назначил её при создании аккаунта (TelegramOAuthService —
                        // match($role) прямо на создании User). Отдельный POST /users/grant-role здесь
                        // не нужен и даже вреден: роль уже есть, повторный грант той же ролью падает
                        // 403 (ROLE_ALREADY_CLIENT/ROLE_ALREADY_MASTER). Просто отражаем в локальном
                        // стейте то, что бэкенд уже сделал. Если savedRole пуст — экран LOGIN
                        // неожиданно оказался новым аккаунтом, либо мобильное приложение (спрашивает
                        // всегда так), либо cross-tab случай (Telegram открыл подтверждение в новой
                        // вкладке) — тогда роли ДЕЙСТВИТЕЛЬНО нет, спрашиваем здесь же, полноэкранным
                        // пикером (который сам вызовет grant-role — там она пока правда не назначена).
                        if (savedRole) {
                            setUserRole(savedRole);
                        } else {
                            setLoading(false);
                            setShowRoleSelect(true);
                            return;
                        }
                    } else {
                        // Существующий пользователь — определяем роль из ответа. Роль тут есть всегда
                        // (бизнес-инвариант для уже существующего аккаунта); если вдруг нет — не
                        // гадаем, просто не трогаем setUserRole и даём тому же самообнаруживающему
                        // механизму (Header.tsx: authenticated + нет роли → снова открыть Auth)
                        // исправить это, как и для новых аккаунтов.
                        const roles = (data.user.roles ?? []).map(r => r.toLowerCase());
                        if (roles.includes('role_master') || roles.includes('master')) setUserRole('master');
                        else if (roles.includes('role_client') || roles.includes('client')) setUserRole('client');

                        // Сохраняем occupation если есть
                        if (data.user.occupation) {
                            setUserOccupation(data.user.occupation);
                        }
                    }

                    setLoading(false);
                    if (justCreated) {
                        // Новый аккаунт — короткая пауза с обратным отсчётом и возможностью
                        // отменить/удалить, вместо мгновенного исчезновения (см. awaitingProceed).
                        setProceedSecondsLeft(PROCEED_COUNTDOWN_SECONDS);
                        setAwaitingProceed(true);
                    } else {
                        // Существующий пользователь просто вошёл — как и раньше, без паузы и без
                        // возможности "отменить"/удалить (это не регистрация). Даём секунду показать
                        // галочку "успешно", прежде чем закрыть popup/уйти — тот же тайминг, что у
                        // Google/Facebook/Instagram (см. OAuthCallbackPage.tsx).
                        setSuccess(true);
                        setTimeout(() => finishOrNavigate({ status: 'success' }, ROUTES.HOME), 900);
                    }
                } else {
                    const message = resolveApiError(null, t('oauth.tokenNotReceived'));
                    setError(message);
                    setLoading(false);
                    finishOrNavigate({ status: 'error', message }, ROUTES.HOME);
                }

            } catch (err) {
                console.error('Telegram OAuth error:', err);
                const message = resolveApiError(err);
                setError(message);
                setLoading(false);
                finishOrNavigate({ status: 'error', message }, ROUTES.HOME);
            }
        };

        processTelegramCallback();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchParams, navigate, t]);

    if (loading) {
        return <PageLoader text={t('oauth.processingTelegram')} />;
    }

    // Аккаунт только что создан и роль уже назначена — короткая пауза с обратным отсчётом, за
    // время которой можно передумать и удалить аккаунт (handleCancelClick).
    if (awaitingProceed) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--color-background-all)', gap: '20px', padding: '20px' }}>
                <span style={{ fontSize: '52px', color: 'var(--color-actual-blue)' }}>✓</span>
                <p style={{ fontWeight: 'bold', fontSize: '18px', color: 'var(--color-text-primary)', margin: 0 }}>{t('oauth.success')}</p>
                <p style={{ color: 'var(--color-text-secondary)', margin: 0 }}>
                    {t('common:oauth.proceedCountdownMessage', { seconds: proceedSecondsLeft })}
                </p>
                {cancelling ? <PageLoader fullPage={false} compact /> : (
                    <div style={{ display: 'flex', gap: '12px', width: '100%', maxWidth: '400px' }}>
                        <button type="button" onClick={handleCancelClick} style={{ flex: 1, whiteSpace: 'nowrap', background: 'transparent', border: '1px solid var(--color-stroke, #444)', borderRadius: '10px', color: 'var(--color-text-secondary)', cursor: 'pointer', fontSize: '14px', padding: '12px 10px' }}>
                            {t('common:oauth.cancelRegistration')}
                        </button>
                        <button type="button" onClick={proceedNow} style={{ flex: 1, background: 'var(--color-actual-blue, #3A54DA)', border: 'none', borderRadius: '10px', color: '#fff', cursor: 'pointer', fontSize: '14px', padding: '12px 10px' }}>
                            {t('common:app.next')}
                        </button>
                    </div>
                )}
            </div>
        );
    }

    if (showRoleSelect) {
        const handleGrantRole = async (role: 'master' | 'client') => {
            setGrantingRole(true);
            try {
                await universalApiRequest(API_ROUTES.USERS_GRANT_ROLE, {
                    method: 'POST',
                    body: { role: role === 'master' ? 'ROLE_MASTER' : 'ROLE_CLIENT' },
                    locale: false,
                });
                setUserRole(role);
                setShowRoleSelect(false);
                setProceedSecondsLeft(PROCEED_COUNTDOWN_SECONDS);
                setAwaitingProceed(true);
            } catch (err) {
                setError(resolveApiError(err));
                setShowRoleSelect(false);
            } finally {
                setGrantingRole(false);
            }
        };

        const roleItems: PerformerItem[] = [
            { id: 1, name: t('components:roles.customers'), title: t('components:roles.customersDesc'), img: '/img/misc/clientTest.jpg' },
            { id: 2, name: t('components:roles.masters'), title: t('components:roles.mastersDesc'), img: '/img/misc/master.jpg' },
        ];

        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--color-background-all)', gap: '20px', padding: '20px' }}>
                <span style={{ fontSize: '52px', color: 'var(--color-actual-blue)' }}>✓</span>
                <p style={{ fontWeight: 'bold', fontSize: '18px', color: 'var(--color-text-primary)', margin: 0 }}>{t('oauth.success')}</p>
                <p style={{ color: 'var(--color-text-secondary)', margin: 0 }}>{t('oauth.selectAccountType')}</p>
                {grantingRole || cancelling ? <PageLoader fullPage={false} compact /> : (
                    <>
                        <Performers
                            items={roleItems}
                            getButtonText={item => item.id === 1 ? t('components:auth.iAmClient') : t('components:auth.iAmSpecialist')}
                            onItemClick={item => handleGrantRole(item.id === 1 ? 'client' : 'master')}
                        />
                        <button
                            type="button"
                            onClick={handleCancelClick}
                            style={{
                                background: 'transparent',
                                border: '1px solid var(--color-stroke, #444)',
                                borderRadius: '10px',
                                color: 'var(--color-text-secondary)',
                                cursor: 'pointer',
                                fontSize: '14px',
                                padding: '12px 24px',
                                width: '100%',
                                maxWidth: '286px',
                            }}
                        >
                            {t('common:oauth.cancelRegistration')}
                        </button>
                    </>
                )}
            </div>
        );
    }

    if (success) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--color-background-all)', gap: '16px' }}>
                <span style={{ fontSize: '52px', color: 'var(--color-actual-blue)' }}>✓</span>
                <p style={{ color: 'var(--color-text-secondary)', fontSize: '16px', margin: 0 }}>{t('oauth.success')}</p>
            </div>
        );
    }

    return (
        <Status
            type="error"
            isOpen={!!error}
            onClose={() => navigate(ROUTES.HOME)}
            message={error || t('oauth.tryLater')}
        />
    );
};

export default TelegramCallbackPage;
