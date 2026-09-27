import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ROUTES, API_ROUTES } from '../../app/routers/routes';
import Status from '../../shared/ui/Modal/Status';
import { InstagramProfessionalNotice } from '../../shared/ui/InstagramProfessionalNotice';
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
import type { OAuthProviderName, BackendAuthCallbackResponse } from '../../entities';
import { universalApiRequest } from '../../utils/apiUtils';
import { resolveApiError } from '../../utils/appMessagesUtils';
import { getStorageItem, removeStorageItem, getSessionItem, removeSessionItem } from '../../utils/storageUtils';
import { finishOAuthPopup } from '../../utils/oauthPopup';
import { finishMobileOAuthFlow } from '../../utils/mobileOAuth';

// Определяем провайдер по URL
const getProviderFromUrl = (pathname: string): OAuthProviderName | null => {
    if (pathname.includes('/auth/google')) return 'google';
    if (pathname.includes('/auth/instagram')) return 'instagram';
    if (pathname.includes('/auth/facebook')) return 'facebook';
    return null;
};

/**
 * Handles the OAuth callback for Google / Instagram / Facebook.
 * Reads the `code` query parameter from the URL, exchanges it for a
 * backend JWT via the provider-specific endpoint, stores auth data,
 * and redirects the user to their destination or the home page.
 */
const OAuthCallbackPage = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [error, setError] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [success, setSuccess] = useState(false);
    // Новый пользователь БЕЗ заранее выбранной роли (savedRole пуст, см. processCallback ниже) —
    // либо вход с экрана LOGIN (там роль не спрашивают заранее, см. Auth.tsx), либо мобильное
    // приложение (роль там ВСЕГДА приходит этим путём — полноэкранного пикера в самой модалке нет),
    // либо cross-tab случай, когда выбор из SelectRoleModal потерялся. Полноэкранный (не модалка —
    // так и было задумано пользователем: см. Auth.tsx/SelectRoleModal) пикер здесь, на своей
    // родной full-page территории, а не втиснутый в модалку — там (см. историю правок) он ломался.
    const [showRoleSelect, setShowRoleSelect] = useState(false);
    const [pendingToken, setPendingToken] = useState<string | null>(null);
    const [grantingRole, setGrantingRole] = useState(false);
    const [cancelling, setCancelling] = useState(false);
    // Экран подтверждения отмены (вместо window.confirm) — обратный отсчёт: по истечении
    // автоматически удаляет аккаунт, как и явный клик "Далее"; "Отмена" просто возвращает
    // к выбору роли, ничего не трогая.
    const CANCEL_COUNTDOWN_SECONDS = 5;
    const [confirmingCancel, setConfirmingCancel] = useState(false);
    const [cancelSecondsLeft, setCancelSecondsLeft] = useState(CANCEL_COUNTDOWN_SECONDS);
    const [provider, setProvider] = useState<OAuthProviderName | null>(null);
    const [isLinkMode, setIsLinkMode] = useState(false);
    // Meta закрыла Basic Display API (04.12.2024) — у Personal-аккаунтов нет официального
    // способа авторизоваться через Instagram API with Instagram Login, конвертация кодом
    // невозможна. Бэкенд ловит это на попытке забрать профиль и возвращает отдельный код
    // AppMessages::OAUTH_INSTAGRAM_PROFESSIONAL_REQUIRED (см. InstagramOAuthService)
    // вместо generic "не удалось обменять код" — показываем те же шаги переключения, что
    // и в Auth.tsx до старта флоу, а не голый текст ошибки.
    const [instagramProfessionalRequired, setInstagramProfessionalRequired] = useState(false);
    const { t } = useTranslation(['common', 'components']);
    // state из URL, сохранённый как только распознан — finishOAuthPopup сверяет
    // его с тем, что Auth.tsx/Profile.tsx пометили перед открытием popup'а (см.
    // utils/oauthPopup), чтобы понять: это popup-флоу (тогда — отчитаться
    // опенеру и закрыться) или обычный прямой заход (тогда — navigate() как раньше).
    // Ref, не state — нужен синхронно внутри колбэков, без лишнего ре-рендера.
    const oauthStateRef = useRef<string | null>(null);

    const finishOrNavigate = useCallback((
        result: { status: 'success' } | { status: 'error'; message?: string },
        fallbackRoute: string,
        fallbackOptions?: { replace?: boolean },
    ) => {
        // Мобильное приложение проверяем первым: у него нет ни window.opener, ни
        // реального popup'а (см. utils/mobileOAuth.ts) — finishOAuthPopup для него
        // всегда вернёт false и просто уведёт на fallbackRoute ВНУТРИ in-app browser'а,
        // а не обратно в приложение.
        if (result.status === 'success') {
            const token = getAuthToken();
            if (token && finishMobileOAuthFlow({ status: 'success', token })) return;
        } else if (finishMobileOAuthFlow({ status: 'error', message: result.message })) {
            return;
        }

        if (!finishOAuthPopup(oauthStateRef.current, result)) {
            navigate(fallbackRoute, fallbackOptions);
            return;
        }
        // finishOAuthPopup сам пытается отчитаться опенеру и закрыться, но это не
        // гарантия: на мобильном при возврате из приложения Instagram/Facebook ОС
        // иногда открывает СОВСЕМ ДРУГУЮ вкладку, никак не связанную с той, что мы
        // открывали (window.opener пуст) — а исходная вкладка тем временем могла
        // быть выгружена системой из памяти на время визита в приложение вместе со
        // всем JS-состоянием, так что сигнал слушать некому, и window.close() эту
        // (постороннюю для script) вкладку не закроет. Раз мы всё ещё живы через
        // 1.5 секунды — значит ни то, ни другое не сработало, и продолжаем сами,
        // тут же: токен уже в localStorage этой вкладки, так что попадём на
        // залогиненную страницу вместо вечного экрана "успешно".
        window.setTimeout(() => navigate(fallbackRoute, fallbackOptions), 1500);
    }, [navigate]);

    // Аккаунт на экране showRoleSelect уже реально создан на бэкенде (status:204 — см. ниже),
    // просто без роли. Отмена удаляет этот незавершённый аккаунт (DELETE /users/{id}, ещё
    // валидным токеном-владельцем), разлогинивает и закрывает popup тем же путём, что
    // "пользователь сам закрыл popup" (сообщение 'popup_closed' — тот же сентинел, что уже
    // НЕ считается ошибкой в Auth.tsx). Вызывается и явным кликом "Далее", и по истечении
    // таймера на экране подтверждения (см. useEffect ниже) — поэтому вынесена на верхний
    // уровень компонента, а не внутрь showRoleSelect-блока.
    const performCancel = useCallback(async () => {
        setCancelling(true);
        // finally, не последовательно после двух await — если DELETE/logout вдруг упадут
        // с чем-то неожиданным (не пойманным их же внутренними try/catch), popup/страница
        // всё равно должны закрыться/уйти, а не зависнуть на спиннере навсегда.
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

    // Обратный отсчёт на экране подтверждения отмены — тикает, только пока он открыт;
    // по достижении нуля отменяет регистрацию автоматически, как и явный клик "Далее".
    useEffect(() => {
        if (!confirmingCancel) return;
        if (cancelSecondsLeft <= 0) {
            performCancel();
            return;
        }
        const timer = window.setTimeout(() => setCancelSecondsLeft(s => s - 1), 1000);
        return () => window.clearTimeout(timer);
    }, [confirmingCancel, cancelSecondsLeft, performCancel]);

    useEffect(() => {
        // Определяем провайдер по URL
        const detectedProvider = getProviderFromUrl(window.location.pathname);
        setProvider(detectedProvider);

        if (!detectedProvider) {
            setError(t('oauth.unknownProvider'));
            setLoading(false);
            setTimeout(() => finishOrNavigate({ status: 'error', message: t('oauth.unknownProvider') }, ROUTES.HOME), 1500);
            return;
        }

        const processCallback = async () => {

            // Для Instagram и Facebook
            const code = searchParams.get('code');
            const state = searchParams.get('state');
            oauthStateRef.current = state;
            const errorParam = searchParams.get('error');
            const errorDescription = searchParams.get('error_description');

            // Обработка ошибок от провайдера
            if (errorParam) {
                const errorMsg = errorDescription || errorParam;
                const message = `${t('oauth.errorTitle')} (${detectedProvider}): ${decodeURIComponent(errorMsg)}`;
                setError(message);
                setLoading(false);
                setTimeout(() => finishOrNavigate({ status: 'error', message }, ROUTES.HOME), 1500);
                return;
            }

            if (!code || !state) {
                setError(t('oauth.noAuthData'));
                setLoading(false);
                setTimeout(() => finishOrNavigate({ status: 'error', message: t('oauth.noAuthData') }, ROUTES.HOME), 1500);
                return;
            }

            try {
                // Режим привязки провайдера к существующему аккаунту
                // Проверяем sessionStorage (обычный браузер) и localStorage по state (мобильный: новая вкладка)
                const sessionMode = getSessionItem('oauthMode');
                const localMode = state ? getStorageItem(`oauth_mode_${state}`) : null;
                const oauthMode = sessionMode || localMode;
                if (oauthMode === 'link') {
                    removeSessionItem('oauthMode');
                    if (state) removeStorageItem(`oauth_mode_${state}`);
                    setIsLinkMode(true);
                    const jwtToken = getAuthToken();
                    if (!jwtToken) {
                        setError(t('oauth.notAuthenticated', 'Not authenticated'));
                        setLoading(false);
                        return;
                    }
                    const linkData = await universalApiRequest(API_ROUTES.PROFILE_OAUTH_LINK, {
                        method: 'POST',
                        body: { provider: detectedProvider, code, state },
                        locale: false,
                    });
                    if (linkData.error === 'provider_taken' || linkData.error === 'oauth_provider_taken') {
                        setError(linkData.message || t('oauth.providerTaken', 'This account is already linked to another user'));
                        setLoading(false);
                        return;
                    }
                    if (linkData.error === 'already_linked') {
                        setError(linkData.message || t('oauth.alreadyLinked', 'This provider is already linked to your account'));
                        setLoading(false);
                        return;
                    }
                    if (linkData.error) {
                        setError(linkData.message || t('oauth.tryLater'));
                        setLoading(false);
                        return;
                    }
                    if (linkData.new_token) {
                        setAuthToken(linkData.new_token);
                        const expiryTime = new Date();
                        expiryTime.setHours(expiryTime.getHours() + 1);
                        setAuthTokenExpiry(expiryTime.toISOString());
                    }
                    if (linkData.new_email) {
                        setUserEmail(linkData.new_email);
                    }
                    setSuccess(true);
                    setTimeout(() => finishOrNavigate({ status: 'success' }, ROUTES.PROFILE, { replace: true }), 900);
                    return;
                }

                // Валидируем CSRF state — localStorage, не sessionStorage: popup, открытый через
                // window.open(), в реальном Chrome не наследует sessionStorage опенера надёжно
                // (проверено вживую), так что эта проверка молча no-op'илась (savedCsrfState всегда
                // пуст) и роль из REGISTER-модалки той же дорогой терялась (см. roleKey ниже).
                const savedCsrfState = getStorageItem(`${detectedProvider}CsrfState`);
                if (savedCsrfState && state !== savedCsrfState) {
                    removeStorageItem(`${detectedProvider}CsrfState`);
                    const message = t('oauth.invalidState', 'Invalid OAuth state. Possible CSRF attack.');
                    setError(message);
                    setLoading(false);
                    setTimeout(() => finishOrNavigate({ status: 'error', message }, ROUTES.HOME), 1500);
                    return;
                }
                removeStorageItem(`${detectedProvider}CsrfState`);

                // Роль, выбранную в SelectRoleModal ДО начала этого флоу (см. Auth.tsx: beginOAuth/
                // handleOAuthStart) — localStorage, по той же причине, что и CSRF-state выше.
                // Отправляем её вместе с code/state: бэкенд создаёт аккаунт сразу с этой ролью.
                const roleKey = `pending${detectedProvider.charAt(0).toUpperCase() + detectedProvider.slice(1)}Role`;
                const savedRole = getStorageItem(roleKey) as 'master' | 'client' | null;
                removeStorageItem(roleKey);

                const callbackData: BackendAuthCallbackResponse = await universalApiRequest(API_ROUTES.AUTH_PROVIDER_CALLBACK(detectedProvider), {
                    method: 'POST',
                    body: savedRole ? { code, state, role: savedRole } : { code, state },
                    requiresAuth: false,
                    locale: false,
                });

                const data: BackendAuthCallbackResponse = callbackData;

                if (data.error === 'email_taken') {
                    setError(t('oauth.emailTaken'));
                    setLoading(false);
                    return;
                }

                if (data.token && data.user) {
                    const token = data.token;
                    setAuthToken(token);
                    const expiryTime = new Date();
                    expiryTime.setHours(expiryTime.getHours() + 1);
                    setAuthTokenExpiry(expiryTime.toISOString());

                    setUserData(data.user);
                    if (data.user.email) setUserEmail(data.user.email);

                    if ((data as any).status === 204) {
                        // Новый пользователь. Если роль уже была выбрана ДО этого флоу (savedRole,
                        // экран REGISTER, см. Auth.tsx: beginOAuth/SelectRoleModal) — она была отправлена
                        // вместе с code/state выше, и бэкенд УЖЕ назначил её при создании аккаунта
                        // (TelegramOAuthService/GoogleOAuthService и т.д. — match($role) на самом
                        // создании User). Отдельный POST /users/grant-role здесь не нужен и даже вреден:
                        // роль уже есть, и повторный грант той же ролью падает 403
                        // (ROLE_ALREADY_CLIENT/ROLE_ALREADY_MASTER — см. ApiPostGrantRoleController).
                        // Просто отражаем в локальном стейте то, что бэкенд уже сделал. Если savedRole
                        // пуст — экран LOGIN (там роль заранее не спрашивают, см. handleOAuthStart)
                        // неожиданно оказался новым аккаунтом, либо мобильное приложение (спрашивает
                        // всегда так), либо cross-tab случай (выбор из REGISTER потерялся) — тогда роли
                        // ДЕЙСТВИТЕЛЬНО нет, спрашиваем здесь же, полноэкранным пикером (который сам
                        // вызовет grant-role — там она пока правда не назначена).
                        if (savedRole) {
                            setUserRole(savedRole);
                        } else {
                            setPendingToken(token);
                            setLoading(false);
                            setShowRoleSelect(true);
                            return;
                        }
                    } else {
                        // Существующий пользователь — определяем роль из ответа
                        if (data.user.roles && data.user.roles.length > 0) {
                            const roles = data.user.roles.map(r => r.toLowerCase());
                            if (roles.includes('role_master') || roles.includes('master')) {
                                setUserRole('master');
                            } else if (roles.includes('role_client') || roles.includes('client')) {
                                setUserRole('client');
                            }
                        }
                        if (data.user.occupation) setUserOccupation(data.user.occupation);
                    }

                    setSuccess(true);
                    setTimeout(() => {
                        if (finishMobileOAuthFlow({ status: 'success', token })) return;
                        // dispatchEvent('login') нужен только когда мы реально живём на
                        // этой же вкладке (fallback-ветка) — в popup'е это событие никто
                        // не услышит, опенер сам разберётся по своему собственному
                        // getAuthToken() после finishOAuthPopup.
                        if (!finishOAuthPopup(oauthStateRef.current, { status: 'success' })) {
                            navigate(ROUTES.HOME);
                            window.dispatchEvent(new Event('login'));
                            return;
                        }
                        // На случай мобильного app-switch в другую вкладку, которую
                        // некому слушать (см. комментарий в finishOrNavigate) — если
                        // за 1.5 секунды эта вкладка не закрылась, продолжаем сами.
                        window.setTimeout(() => navigate(ROUTES.HOME), 1500);
                    }, 900);
                } else {
                    const message = resolveApiError(null, t('oauth.tokenNotReceived'));
                    setError(message);
                    setTimeout(() => finishOrNavigate({ status: 'error', message }, ROUTES.HOME), 1500);
                }

            } catch (err) {
                console.error(`${detectedProvider} OAuth error:`, err);
                const message = resolveApiError(err);
                // Ответ приходит как сырой BadRequestHttpException (RFC7807 detail, без
                // отдельного machine-readable code) — "Professional" остаётся нетронутым
                // латиницей во всех трёх локалях сообщения, надёжный маркер именно этого кейса.
                if (detectedProvider === 'instagram' && message.includes('Professional')) {
                    setInstagramProfessionalRequired(true);
                    // Не показываем как error-баннер (есть отдельный экран ниже), но
                    // держим текст под рукой — на случай popup'а он же уйдёт в сообщение
                    // finishOAuthPopup, чтобы Auth.tsx мог показать его пользователю.
                    setError(message);
                } else {
                    setError(message);
                    setTimeout(() => finishOrNavigate({ status: 'error', message }, ROUTES.HOME), 1500);
                }
            } finally {
                setLoading(false);
            }
        };

        processCallback();
    }, [searchParams, navigate, t, finishOrNavigate]);

    if (loading) {
        return <PageLoader text={t('oauth.processingVia', { provider: provider === 'google' ? 'Google' : provider === 'instagram' ? 'Instagram' : 'Facebook' })} />;
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
                const token = pendingToken ?? getAuthToken();
                if (token && finishMobileOAuthFlow({ status: 'success', token })) return;
                if (!finishOAuthPopup(oauthStateRef.current, { status: 'success' })) {
                    navigate(ROUTES.HOME);
                    window.dispatchEvent(new Event('login'));
                } else {
                    // На случай мобильного app-switch в другую вкладку, которую некому
                    // слушать (см. комментарий в finishOrNavigate) — если за 1.5 секунды
                    // эта вкладка не закрылась, продолжаем сами.
                    window.setTimeout(() => navigate(ROUTES.HOME), 1500);
                }
            } catch (err) {
                setError(resolveApiError(err));
                setShowRoleSelect(false);
            } finally {
                setGrantingRole(false);
            }
        };

        // Открывает экран подтверждения с обратным отсчётом вместо немедленного удаления —
        // сам performCancel (наверху компонента) запускается либо явным "Далее" на этом
        // экране, либо истечением таймера (см. useEffect наверху).
        const handleCancelClick = () => {
            setCancelSecondsLeft(CANCEL_COUNTDOWN_SECONDS);
            setConfirmingCancel(true);
        };
        const handleAbortCancel = () => setConfirmingCancel(false);

        const roleItems: PerformerItem[] = [
            { id: 1, name: t('components:roles.customers'), title: t('components:roles.customersDesc'), img: '/img/misc/clientTest.jpg' },
            { id: 2, name: t('components:roles.masters'), title: t('components:roles.mastersDesc'), img: '/img/misc/master.jpg' },
        ];

        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--color-background-all)', gap: '20px', padding: '20px' }}>
                {confirmingCancel ? (
                    <>
                        <p style={{ fontWeight: 'bold', fontSize: '18px', color: 'var(--color-text-primary)', margin: 0 }}>
                            {t('common:oauth.cancelCountdownTitle')}
                        </p>
                        <p style={{ color: 'var(--color-text-primary)', margin: 0, fontSize: '36px', fontWeight: 'bold' }}>
                            {cancelSecondsLeft}
                        </p>
                        <p style={{ color: 'var(--color-text-secondary)', margin: 0 }}>
                            {t('common:oauth.cancelCountdownMessage', { seconds: cancelSecondsLeft })}
                        </p>
                        {cancelling ? <PageLoader fullPage={false} compact /> : (
                            <div style={{ display: 'flex', gap: '12px', width: '100%', maxWidth: '286px' }}>
                                <button
                                    type="button"
                                    onClick={handleAbortCancel}
                                    style={{
                                        flex: 1,
                                        background: 'transparent',
                                        border: '1px solid var(--color-stroke, #444)',
                                        borderRadius: '10px',
                                        color: 'var(--color-text-secondary)',
                                        cursor: 'pointer',
                                        fontSize: '14px',
                                        padding: '12px 16px',
                                    }}
                                >
                                    {t('common:app.cancel')}
                                </button>
                                <button
                                    type="button"
                                    onClick={performCancel}
                                    style={{
                                        flex: 1,
                                        background: 'var(--color-actual-blue, #3A54DA)',
                                        border: 'none',
                                        borderRadius: '10px',
                                        color: '#fff',
                                        cursor: 'pointer',
                                        fontSize: '14px',
                                        padding: '12px 16px',
                                    }}
                                >
                                    {t('common:app.next')}
                                </button>
                            </div>
                        )}
                    </>
                ) : (
                    <>
                        <svg width="52" height="52" viewBox="0 0 52 52" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="26" cy="26" r="25" stroke="#4caf50" strokeWidth="2" />
                            <path d="M14 27l8 8 16-16" stroke="#4caf50" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <p style={{ fontWeight: 'bold', fontSize: '18px', color: '#2e7d32', margin: 0 }}>{t('oauth.success')}</p>
                        <p style={{ color: 'var(--color-text-secondary)', margin: 0 }}>{t('oauth.selectAccountType')}</p>
                        {grantingRole ? <PageLoader fullPage={false} compact /> : (
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
                    </>
                )}
            </div>
        );
    }

    if (success) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--color-background-all)', gap: '16px' }}>
                <svg width="52" height="52" viewBox="0 0 52 52" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="26" cy="26" r="25" stroke="#4caf50" strokeWidth="2" />
                    <path d="M14 27l8 8 16-16" stroke="#4caf50" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <p style={{ fontWeight: 'bold', fontSize: '18px', color: '#2e7d32', margin: 0 }}>{t('oauth.success')}</p>
            </div>
        );
    }

    if (instagramProfessionalRequired) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--color-background-all)', padding: '20px' }}>
                <div style={{ width: '100%', maxWidth: '420px', background: 'var(--color-background-primary)', borderRadius: '16px', padding: '32px 24px', boxShadow: '0 8px 32px var(--color-shadow)' }}>
                    <InstagramProfessionalNotice>
                        <button
                            type="button"
                            onClick={() => finishOrNavigate({ status: 'error', message: error }, ROUTES.HOME)}
                            style={{ width: '100%', minHeight: '48px', padding: '12px 16px', background: 'var(--color-actual-blue)', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: 600, cursor: 'pointer' }}
                        >
                            {t('oauth.backToHome')}
                        </button>
                    </InstagramProfessionalNotice>
                </div>
            </div>
        );
    }

    return (
        <Status
            type="error"
            isOpen={!!error}
            onClose={() => finishOrNavigate({ status: 'error', message: error }, isLinkMode ? ROUTES.PROFILE : ROUTES.HOME)}
            message={error}
        />
    );
};

export default OAuthCallbackPage;