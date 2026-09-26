import { useEffect, useState } from 'react';
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
    setUserEmail,
    setUserOccupation,
    getAuthToken,
} from '../../utils/authUtils';
import type { TelegramUserData, BackendAuthCallbackResponse } from '../../entities';
import { universalApiRequest } from '../../utils/apiUtils';
import { resolveApiError } from '../../utils/appMessagesUtils';
import { getStorageItem, setStorageItem, removeStorageItem, getSessionItem, removeSessionItem } from '../../utils/storageUtils';
import { finishMobileOAuthFlow } from '../../utils/mobileOAuth';

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
    const { t } = useTranslation(['common', 'components']);

    // Мобильное приложение (in-app browser) — отдаём ошибку через deep link вместо
    // того, чтобы оставлять пользователя на странице сайта внутри Custom Tab / SFSafari.
    // Возвращает true, если это был как раз такой случай (вызывающий тогда не планирует
    // свой обычный navigate(ROUTES.HOME)).
    const finishMobileOrNull = (message?: string): boolean => finishMobileOAuthFlow({ status: 'error', message });

    // Веб (не мобильное приложение): сигналим оригинальной вкладке и пробуем закрыться — Telegram
    // иногда возвращает колбэк в НОВУЮ вкладку, а не в ту, где была открыта Auth-модалка (см.
    // storage-листенер в Auth.tsx). window.close() сработает только если эта вкладка открыта
    // скриптом; если это та же вкладка (обычный десктоп) — сработает fallback-навигация.
    const finishWebFlow = () => {
        setStorageItem('telegram_login_success', Date.now().toString());
        setTimeout(() => {
            window.close();
            setTimeout(() => {
                navigate(ROUTES.HOME);
                window.dispatchEvent(new Event('login'));
            }, 300);
        }, 2000);
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

                // Проверяем что все необходимые параметры есть
                if (!id || !firstName || !hash || !authDate) {
                    const message = t('oauth.insufficientData');
                    setError(message);
                    setLoading(false);
                    if (!finishMobileOrNull(message)) setTimeout(() => navigate(ROUTES.HOME), 3000);
                    return;
                }

                // Проверяем, что запрос не старше 10 минут (для защиты от replay атак)
                const currentTime = Math.floor(Date.now() / 1000);
                const authTime = parseInt(authDate, 10);
                if (currentTime - authTime > 600) {
                    const message = t('oauth.expiredRequest');
                    setError(message);
                    setLoading(false);
                    if (!finishMobileOrNull(message)) setTimeout(() => navigate(ROUTES.HOME), 3000);
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

                    if ((data as any).status === 204) {
                        // Новый пользователь. Если роль уже была выбрана до этого флоу (savedRole,
                        // экран REGISTER) — она отправлена вместе с данными Telegram выше, но бэкенд
                        // всё равно создаёт аккаунт без роли (`status: 204`) и ждёт отдельного
                        // grant-role, так что назначаем её сейчас же, автоматически, без второго
                        // вопроса. Если savedRole пуст — экран LOGIN неожиданно оказался новым
                        // аккаунтом, либо мобильное приложение (спрашивает всегда так), либо
                        // cross-tab случай (Telegram открыл подтверждение в новой вкладке) — в любом
                        // из этих случаев спрашиваем роль здесь же, полноэкранным пикером.
                        if (savedRole) {
                            try {
                                await universalApiRequest(API_ROUTES.USERS_GRANT_ROLE, {
                                    method: 'POST',
                                    body: { role: savedRole === 'master' ? 'ROLE_MASTER' : 'ROLE_CLIENT' },
                                    locale: false,
                                });
                                setUserRole(savedRole);
                            } catch (grantErr) {
                                console.warn('Could not grant pre-selected role, asking again:', grantErr);
                                setLoading(false);
                                setShowRoleSelect(true);
                                return;
                            }
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

                    setSuccess(true);
                    setLoading(false);

                    // Приложение (in-app browser, см. utils/mobileOAuth.ts) — отдаём токен
                    // через deep link и на этом всё, дальше приложение само разбирается.
                    if (finishMobileOAuthFlow({ status: 'success', token: data.token })) return;

                    finishWebFlow();
                } else {
                    const message = resolveApiError(null, t('oauth.tokenNotReceived'));
                    setError(message);
                    setLoading(false);
                    if (!finishMobileOrNull(message)) setTimeout(() => navigate(ROUTES.HOME), 3000);
                }

            } catch (err) {
                console.error('Telegram OAuth error:', err);
                const message = resolveApiError(err);
                setError(message);
                setLoading(false);
                if (!finishMobileOrNull(message)) setTimeout(() => navigate(ROUTES.HOME), 3000);
            }
        };

        processTelegramCallback();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchParams, navigate, t]);

    if (loading) {
        return <PageLoader text={t('oauth.processingTelegram')} />;
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
                const token = getAuthToken();
                if (token && finishMobileOAuthFlow({ status: 'success', token })) return;
                finishWebFlow();
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
                {grantingRole ? <PageLoader fullPage={false} compact /> : (
                    <Performers
                        items={roleItems}
                        getButtonText={item => item.id === 1 ? t('components:auth.iAmClient') : t('components:auth.iAmSpecialist')}
                        onItemClick={item => handleGrantRole(item.id === 1 ? 'client' : 'master')}
                    />
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
