import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { IoInformationCircleOutline } from 'react-icons/io5';
import { InstagramLinkNotice } from '../InstagramLinkNotice';
import { SelectRoleModal } from '../SelectRoleModal';
import { InfoBanner } from '../../../../widgets/Banners/InfoBanner/InfoBanner';
import { useLanguageChange } from '../../../../hooks';
import styles from './Auth.module.scss';
import {
    getAuthToken,
    getUserData,
    getUserRole,
    setAuthToken,
    setAuthTokenExpiry,
    setUserData,
    setUserEmail,
    setUserRole,
    setUserOccupation,
    isAdmin,
    fetchCurrentUser,
} from '../../../../utils/authUtils';
import { openOAuthPopup, navigateOAuthPopup, waitForOAuthPopupResult, markOAuthPopupFlow } from '../../../../utils/oauthPopup';
import { isNativePlatform, startNativeOAuth } from '../../../../utils/mobileOAuth';
import { getOccupations } from '../../../../utils/dataCacheUtils';
import { DateWidget } from '../../../../widgets/DateWidget/DateWidget';
import { Marquee } from '../../Text/Marquee';
import Status from '../Status';
import { PageLoader } from '../../../../widgets/PageLoader';
import { Clear } from '../../Button/Clear/Clear';
import { SelectSearch } from '../../SelectSearch';
import type { OAuthProviderName, Occupation, Category } from '../../../../entities';
import { ROUTES, API_ROUTES } from '../../../../app/routers/routes';
import { universalApiRequest } from '../../../../utils/apiUtils';
import { resolveApiError, ApiError } from '../../../../utils/appMessagesUtils';
import { setSessionItem, removeSessionItem, removeSessionItems, removeStorageItems } from '../../../../utils/storageUtils';

const AuthModalState = {
    WELCOME: 'welcome',
    LOGIN: 'login',
    REGISTER: 'register',
    FORGOT_PASSWORD: 'forgot_password',
    VERIFY_CODE: 'verify_code',
    NEW_PASSWORD: 'new_password',
    CONFIRM_EMAIL: 'confirm_email',
} as const;

type AuthModalStateType = typeof AuthModalState[keyof typeof AuthModalState];

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
    onLoginSuccess?: (token: string, email?: string) => void;
}

interface FormData {
    email: string;
    password: string;
    confirmPassword: string;
    firstName: string;
    lastName: string;
    specialty: string;
    newPassword: string;
    phoneOrEmail: string;
    role: 'master' | 'client';
    code: string;
    dateOfBirth: string;
}

interface LoginResponse {
    token: string;
}

interface OAuthUrlResponse {
    url: string;
}

// Регулярное выражение для проверки пароля
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*]).+$/;

// Функция для проверки сложности пароля
const validatePassword = (password: string, t: any): { isValid: boolean; message: string } => {
    if (password.length < 8) {
        return {
            isValid: false,
            message: t('auth.passwordMinLength')
        };
    }

    if (!PASSWORD_REGEX.test(password)) {
        return {
            isValid: false,
            message: t('auth.passwordValidation')
        };
    }

    return {
        isValid: true,
        message: ''
    };
};

/**
 * Authentication modal.
 * Handles: login (email+password), registration, password reset,
 * and OAuth (Google, Telegram) flows within a single modal.
 * After a successful login stores the JWT and user data via auth.ts helpers
 * and calls `onLoginSuccess` to notify the parent.
 */
const Auth: React.FC<AuthModalProps> = ({ isOpen, onClose, onLoginSuccess }) => {
    const { t } = useTranslation(['components', 'common', 'profile']);
    useLanguageChange(); // Для обновления категорий при смене языка
    const [currentState, setCurrentState] = useState<AuthModalStateType>(AuthModalState.WELCOME);
    // Instagram-заглушка теперь отдельная модалка (shared/ui/Modal/InstagramLinkNotice)
    // поверх текущего экрана (LOGIN/REGISTER) — не отдельный currentState, так что
    // возвращаться никуда не нужно, экран под ней просто остаётся как был. Значение — с какого
    // экрана её открыли ('login'/'register'): нужно, чтобы после "продолжить" запустить OAuth
    // ТЕМ же способом, что и остальные кнопки на этом экране (см. renderLoginScreen/
    // renderRegisterScreen — только REGISTER спрашивает роль заранее, см. beginOAuth ниже).
    const [instagramNoticeMode, setInstagramNoticeMode] = useState<null | 'login' | 'register'>(null);
    // "Выберите тип аккаунта" (см. SelectRoleModal) — тот же паттерн overlay-поверх-текущего-экрана,
    // что и showInstagramNotice, независимо от isOpen (см. финальный return). Два независимых повода:
    // 'pre' — сразу по клику на кнопку провайдера, ДО начала OAuth (см. beginOAuth ниже); 'post' —
    // самостраховка, если аккаунт всё же оказался без роли ПОСЛЕ (см. handleSuccessfulAuth) —
    // например, Telegram вернул колбэк в НОВУЮ вкладку и выбор из 'pre' не долетел (sessionStorage
    // не шарится между вкладками), см. storage-листенер ниже.
    const [roleSelectMode, setRoleSelectMode] = useState<
        null | { type: 'pre'; provider: OAuthProviderName } | { type: 'post' }
    >(null);
    const [isGrantingRole, setIsGrantingRole] = useState(false);
    const [categories, setCategories] = useState<Category[]>([]);
    const [formData, setFormData] = useState<FormData>({
        email: '',
        password: '',
        confirmPassword: '',
        firstName: '',
        lastName: '',
        specialty: '',
        newPassword: '',
        phoneOrEmail: '',
        role: 'client', // Безопасный дефолт (client вместо master)
        code: '',
        dateOfBirth: ''
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string>('');
    const [registeredEmail, setRegisteredEmail] = useState<string>('');
    const [passwordValidation, setPasswordValidation] = useState<{ isValid: boolean; message: string }>({
        isValid: false,
        message: ''
    });
    const [showPasswordRequirements, setShowPasswordRequirements] = useState(false);

    // Эффект для валидации пароля при изменении
    useEffect(() => {
        if (formData.password) {
            const validation = validatePassword(formData.password, t);
            setPasswordValidation(validation);

            // Автоматически показываем требования, если пароль невалидный
            if (!validation.isValid && formData.password.length > 0) {
                setShowPasswordRequirements(true);
            } else if (validation.isValid) {
                setShowPasswordRequirements(false);
            }
        } else {
            setPasswordValidation({ isValid: false, message: '' });
            setShowPasswordRequirements(false);
        }
    }, [formData.password, t]);

    // Эффект для загрузки категорий и настройки Telegram
    useEffect(() => {
        const loadCategories = async () => {
            try {
                const data = await getOccupations();
                // Преобразуем Occupation в Category
                const categories: Category[] = data.map(occ => ({
                    id: occ.id,
                    title: occ.title,
                    description: occ.description || '',
                    image: occ.image || ''
                }));
                setCategories(categories);
            } catch (err) {
                console.error('Error loading categories:', err);
            }
        };

        loadCategories();

        // Слушаем смену языка для перезагрузки категорий
        window.addEventListener('languageChanged', loadCategories);

        return () => {
            window.removeEventListener('languageChanged', loadCategories);
        };
    }, []);

    // Модалка открылась (обычный клик "Войти", или Header.tsx открыл её сам, заметив на
    // /users/me, что роль не назначена — см. Header.tsx) — если пользователь уже авторизован,
    // но роли ещё нет, сразу показываем выбор роли вместо экрана WELCOME.
    useEffect(() => {
        if (isOpen && getAuthToken() && !getUserRole()) {
            setRoleSelectMode({ type: 'post' });
        }
    }, [isOpen]);

    // В пакетном (Capacitor) приложении window.open() не даёт настоящий popup — ОС молча
    // передаёт навигацию во внешний, никак не связанный с нами Chrome (проверено вживую
    // через Chrome DevTools Protocol), так что вся popup-механика ниже там бессмысленна.
    // См. utils/mobileOAuth.ts — там же объяснение, почему in-app browser открывается на
    // РЕАЛЬНОМ домене сайта, а не на localhost внутри собранного приложения.
    const applyNativeAuthToken = async (token: string) => {
        setAuthToken(token);
        setTokenExpiry();

        const user = await fetchCurrentUser();
        if (user) {
            // Роль уже была выбрана ДО этого флоу (SelectRoleModal, см. handleNativeOAuthStart/
            // handleNativeTelegramAuthClick) и передана через query-параметр в OAuthMobileStartPage/
            // TelegramMobileStartPage → sessionStorage → OAuthCallbackPage/TelegramCallbackPage,
            // которые сами гранты её сразу после создания аккаунта — так что роль здесь обычно уже
            // есть. Если её всё-таки нет (edge-кейс — выбор потерялся где-то по пути), не угадываем —
            // handleSuccessfulAuth сам покажет SelectRoleModal ещё раз.
            const roles = (user.roles || []).map(r => r.toLowerCase());
            if (roles.includes('role_master') || roles.includes('master')) setUserRole('master');
            else if (roles.includes('role_client') || roles.includes('client')) setUserRole('client');
            if (user.occupation) setUserOccupation(user.occupation as Occupation[]);
        }

        handleSuccessfulAuth(token, user?.email);
    };

    // role отсутствует — вход с экрана LOGIN (см. renderLoginScreen): существующему аккаунту
    // выбирать нечего, а если он всё же окажется новым — роль спросит полноэкранный пикер на
    // самой странице колбэка (см. OAuthCallbackPage/TelegramCallbackPage: savedRole пуст → showRoleSelect).
    const handleNativeOAuthStart = async (provider: OAuthProviderName, role?: 'master' | 'client') => {
        const providerLabel = provider.charAt(0).toUpperCase() + provider.slice(1);
        const startPath = provider === 'google' ? ROUTES.AUTH_GOOGLE_MOBILE_START
            : provider === 'facebook' ? ROUTES.AUTH_FACEBOOK_MOBILE_START
            : ROUTES.AUTH_INSTAGRAM_MOBILE_START;

        setIsLoading(true);
        try {
            const { token } = await startNativeOAuth(role ? `${startPath}?role=${role}` : startPath);
            await applyNativeAuthToken(token);
        } catch (err) {
            // Пользователь сам закрыл in-app browser, не дойдя до конца — не ошибка.
            if (!(err instanceof Error && err.message === 'popup_closed')) {
                setError(resolveApiError(err, `Ошибка при авторизации через ${providerLabel}`));
            }
        } finally {
            setIsLoading(false);
        }
    };

    // Общая функция для начала OAuth авторизации (Google/Facebook/Instagram).
    // Открываем popup, а не window.location.href — полный переход вкладки на
    // домен провайдера как раз и даёт ОС повод перехватить навигацию и увести
    // в нативное приложение вместо страницы в браузере. Popup эту вероятность
    // не убирает целиком (это по-прежнему решение ОС/провайдера), но не отдаёт
    // саму нашу вкладку — OAuthCallbackPage внутри popup'а сам сообщает
    // результат через postMessage и закрывается (см. utils/oauthPopup).
    // role отсутствует — вход с экрана LOGIN (renderLoginScreen вызывает без роли; renderRegisterScreen
    // — через beginOAuth, роль уже выбрана в SelectRoleModal). Существующему аккаунту роль не нужна;
    // если он всё же окажется новым — спросит полноэкранный пикер на странице колбэка (см.
    // OAuthCallbackPage: savedRole пуст → showRoleSelect), а не эта функция.
    const handleOAuthStart = (provider: OAuthProviderName, role?: 'master' | 'client') => {
        if (isNativePlatform()) {
            handleNativeOAuthStart(provider, role);
            return;
        }

        const roleKey = `pending${provider.charAt(0).toUpperCase() + provider.slice(1)}Role`;
        const csrfKey = `${provider}CsrfState`;
        const providerLabel = provider.charAt(0).toUpperCase() + provider.slice(1);

        // Открываем popup синхронно, ДО await/.then() — иначе к моменту, когда
        // придёт ответ с реальным URL, жест пользователя (клик) уже "остынет" и
        // блокировщик попапов (особенно Safari) молча зарубит window.open.
        // Как только URL известен — просто донавигируем это же окно.
        const popup = openOAuthPopup(`oauth_${provider}`);
        if (!popup) {
            setError(t('common:oauth.popupBlocked', { provider: providerLabel }));
            return;
        }

        try {
            // Роль уже выбрана (SelectRoleModal, см. beginOAuth) — сохраняем, чтобы
            // OAuthCallbackPage (тот же origin, popup или прямой заход) мог прислать её вместе
            // с code/state и получить аккаунт с готовой ролью за один шаг, без второго вопроса.
            // С экрана LOGIN роли нет вовсе — просто не сохраняем ничего.
            if (role) setSessionItem(roleKey, role);

            // Получаем URL для OAuth
            universalApiRequest(API_ROUTES.AUTH_PROVIDER_URL(provider), {
                requiresAuth: false,
                locale: false,
            })
                .then((data: any) => {
                    const redirectUrl = (data as OAuthUrlResponse).url;
                    let parsed: URL;
                    try {
                        parsed = new URL(redirectUrl);
                    } catch {
                        popup.close();
                        setError('Получен некорректный URL для авторизации');
                        return;
                    }
                    if (!['https:', 'http:'].includes(parsed.protocol)) {
                        popup.close();
                        setError('Получен некорректный URL для авторизации');
                        return;
                    }
                    // Сохраняем state из реального redirect URL для CSRF-проверки на callback
                    const stateFromUrl = parsed.searchParams.get('state');
                    if (stateFromUrl) {
                        setSessionItem(csrfKey, stateFromUrl);
                        // Помечаем именно этот state как popup-флоу — OAuthCallbackPage
                        // сверится с этим по своему state и поймёт, что надо не
                        // navigate(), а отчитаться нам и закрыться (см. utils/oauthPopup).
                        markOAuthPopupFlow(stateFromUrl);
                    }

                    navigateOAuthPopup(popup, redirectUrl);
                    setIsLoading(true);
                    waitForOAuthPopupResult(popup)
                        .then(() => {
                            // OAuthCallbackPage внутри popup'а уже сохранил токен/юзера/роль
                            // в localStorage (тот же origin) — просто подхватываем их здесь.
                            const token = getAuthToken();
                            if (token) {
                                handleSuccessfulAuth(token, getUserData()?.email);
                            }
                        })
                        .catch((popupErr: Error) => {
                            if (popupErr.message === 'popup_closed') {
                                // Popup закрылся без сигнала (postMessage/localStorage до нас
                                // не долетели — например Facebook: обрубает и то, и другое)
                                // — прежде чем считать это отменой, проверяем реальный
                                // результат: OAuthCallbackPage внутри popup'а уже успел бы
                                // записать токен в тот же localStorage, если авторизация
                                // прошла. Так мы не зависим от того, дошло ли уведомление.
                                const token = getAuthToken();
                                if (token) {
                                    handleSuccessfulAuth(token, getUserData()?.email);
                                }
                                return;
                            }
                            setError(resolveApiError(popupErr, `Ошибка при авторизации через ${providerLabel}`));
                        })
                        .finally(() => {
                            setIsLoading(false);
                            removeSessionItems(roleKey, csrfKey);
                        });
                })
                .catch(err => {
                    popup.close();
                    console.error(`${provider.toUpperCase()} auth error:`, err);
                    setError(resolveApiError(err, `Ошибка при авторизации через ${providerLabel}`));
                    removeSessionItems(roleKey, csrfKey);
                });

        } catch (err) {
            popup.close();
            console.error(`${provider.toUpperCase()} auth error:`, err);
            setError(resolveApiError(err, `Ошибка при авторизации через ${providerLabel}`));

            // Очищаем сохраненные данные при ошибке
            removeSessionItems(roleKey, csrfKey);
        }
    };

    // Приложение: тот же in-app browser + deep link, что и для Google/Facebook/Instagram
    // (см. handleNativeOAuthStart выше). Для Telegram это не просто удобнее, а необходимо:
    // виджет проверяет data-auth-url против домена, зарегистрированного в BotFather —
    // внутри пакетного приложения это https://localhost ("Bot domain invalid"), а на
    // реальном сайте, куда открывается in-app browser — настоящий домен.
    const handleNativeTelegramAuthClick = async (role?: 'master' | 'client') => {
        setIsLoading(true);
        try {
            const { token } = await startNativeOAuth(role ? `${ROUTES.AUTH_TELEGRAM_MOBILE_START}?role=${role}` : ROUTES.AUTH_TELEGRAM_MOBILE_START);
            await applyNativeAuthToken(token);
        } catch (err) {
            if (!(err instanceof Error && err.message === 'popup_closed')) {
                setError(resolveApiError(err, 'Ошибка при авторизации через Telegram'));
            }
        } finally {
            setIsLoading(false);
        }
    };

    // Функция для Telegram Widget. role отсутствует — вход с экрана LOGIN (см. handleOAuthStart).
    // Виджет Telegram рендерится ВНУТРИ настоящего popup'а (тот же openOAuthPopup/
    // waitForOAuthPopupResult, что и у Google/Facebook/Instagram), а не поверх текущей
    // страницы, как раньше. Раньше data-auth-url уводил редиректом ЭТУ ЖЕ вкладку (закрыть
    // было нечего — окно ведь не было открыто скриптом), так что после выбора роли страница
    // просто зависала на пару секунд и потом SPA-навигировала на главную в этой же вкладке —
    // заметно отличалось от Google/Facebook/Instagram, которые закрывают popup сразу.
    // Роль передаём через query-параметр в /auth/telegram/start (см. TelegramMobileStartPage.tsx,
    // тот же приём, что и у нативного флоу) — та страница сама сохранит её в sessionStorage
    // ВНУТРИ этого popup'а, откуда её без проблем прочитает TelegramCallbackPage (та же вкладка,
    // просто следующая навигация).
    const handleTelegramAuthClick = (role?: 'master' | 'client') => {
        if (isNativePlatform()) {
            handleNativeTelegramAuthClick(role);
            return;
        }

        const popup = openOAuthPopup('oauth_telegram');
        if (!popup) {
            setError(t('common:oauth.popupBlocked', { provider: 'Telegram' }));
            return;
        }

        const state = `tg_${Date.now()}_${Math.random().toString(36).slice(2)}`;
        markOAuthPopupFlow(state);

        const params = new URLSearchParams({ state });
        if (role) params.set('role', role);
        navigateOAuthPopup(popup, `${window.location.origin}${ROUTES.AUTH_TELEGRAM_MOBILE_START}?${params.toString()}`);

        // Закрываем основную модалку — как и раньше, сразу после открытия popup'а.
        handleClose();

        setIsLoading(true);
        waitForOAuthPopupResult(popup)
            .then(() => {
                const token = getAuthToken();
                if (token) handleSuccessfulAuth(token, getUserData()?.email);
            })
            .catch((popupErr: Error) => {
                if (popupErr.message === 'popup_closed') {
                    // Popup закрылся без сигнала — Telegram иногда возвращает подтверждение в
                    // НОВУЮ вкладку вместо этого popup'а (см. README, известный мобильно-веб
                    // кейс) — тогда сигнал/закрытие приходят не сюда. Проверяем реальный
                    // результат по localStorage напрямую, как и у остальных провайдеров.
                    const token = getAuthToken();
                    if (token) handleSuccessfulAuth(token, getUserData()?.email);
                    return;
                }
                setError(resolveApiError(popupErr, 'Ошибка при авторизации через Telegram'));
            })
            .finally(() => setIsLoading(false));
    };

    // Обновляет одно поле formData — используется вместо onChange-события, так как
    // SelectSearch (altMode) отдаёт в onChange готовое значение, а не e.target.name/value.
    const handleFieldChange = (name: keyof FormData) => (value: string) => {
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        if (error) setError('');
    };

    const handleRoleChange = (role: 'master' | 'client') => {
        setFormData(prev => ({
            ...prev,
            role
        }));
    };

    const setTokenExpiry = () => {
        const expiryTime = new Date();
        expiryTime.setHours(expiryTime.getHours() + 1);
        setAuthTokenExpiry(expiryTime.toISOString());
    };

    const fetchUserData = async (): Promise<void> => {
        try {
            const userData: any = await universalApiRequest(API_ROUTES.USERS_ME, { locale: false });
            console.log('🔥🔥🔥 User data from /me endpoint:', userData);

                // Сохраняем данные пользователя
                setUserData(userData);

                if (userData.email) {
                    setUserEmail(userData.email);
                }

                // Определяем роль из данных пользователя (ТОЛЬКО ОТ API, НЕ ИЗ ФОРМЫ!)
                let userRole: 'client' | 'master' | null;

                console.log('🔥🔥🔥 LOGIN - userData.roles from API:', userData.roles);
                console.log('🔥 userData.roles type:', typeof userData.roles, 'isArray:', Array.isArray(userData.roles));

                if (userData.roles && userData.roles.length > 0) {
                    const roles = userData.roles.map((r: string) => r.toLowerCase());
                    console.log('🔥 roles after toLowerCase():', roles);

                    if (roles.includes('role_master') || roles.includes('master')) {
                        userRole = 'master';
                        console.log('✅ LOGIN MATCHED: role_master or master → userRole = "master"');
                    } else if (roles.includes('role_client') || roles.includes('client')) {
                        userRole = 'client';
                        console.log('✅ LOGIN MATCHED: role_client or client → userRole = "client"');
                    } else {
                        // API вернул роли, но они не распознаны - используем client как безопасный дефолт
                        userRole = 'client';
                        console.log('⚠️ LOGIN NO MATCH in roles:', roles, '→ Using safe default: "client"');
                    }

                    console.log('🔥 Final detected role from API:', userRole);
                } else {
                    // API вообще не вернул роли - используем client как безопасный дефолт
                    userRole = 'client';
                    console.log('⚠️ LOGIN No roles in API response → Using safe default: "client"');
                }

                console.log('💾💾💾 LOGIN Calling setUserRole with:', userRole);
                // Устанавливаем роль (должна быть client или master, не null)
                if (userRole) {
                    setUserRole(userRole);
                } else {
                    console.error('❌ LOGIN userRole is null! This should never happen!');
                    setUserRole('client'); // Крайний fallback
                }

                // Сохраняем occupation если есть
                if (userData.occupation) {
                    console.log('User occupation from API:', userData.occupation);
                    setUserOccupation(userData.occupation as Occupation[]);
                }
        } catch (err) {
            console.error('Error fetching user data:', err);
        }
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            const loginData = {
                email: formData.email.trim(),
                password: formData.password
            };

            console.log('Login attempt with:', loginData);

            const data: LoginResponse = await universalApiRequest(API_ROUTES.AUTHENTICATION_TOKEN, {
                method: 'POST',
                body: loginData,
                requiresAuth: false,
                locale: false,
            });
            console.log('Login response token received');

            if (!data.token) {
                setError(t('auth.invalidCredentials'));
                return;
            }

            // Сохраняем токен
            setAuthToken(data.token);
            setTokenExpiry();

            // ПОЛУЧАЕМ И СОХРАНЯЕМ ДАННЫЕ ПОЛЬЗОВАТЕЛЯ С OCCUPATION
            await fetchUserData();

            handleSuccessfulAuth(data.token, formData.email);

        } catch (err) {
            console.error('Login error:', err);
            if (err instanceof ApiError && err.http === 401) {
                setError(t('auth.invalidCredentials'));
                return;
            }
            setError(resolveApiError(err, 'Произошла ошибка при авторизации'));
        } finally {
            setIsLoading(false);
        }
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        // Проверка паролей
        if (formData.password !== formData.confirmPassword) {
            setError('Пароли не совпадают');
            setIsLoading(false);
            return;
        }

        // Валидация пароля
        const passwordValidationResult = validatePassword(formData.password, t);
        if (!passwordValidationResult.isValid) {
            setError(passwordValidationResult.message);
            setIsLoading(false);
            return;
        }

        const email = formData.phoneOrEmail.includes('@') ? formData.phoneOrEmail : '';

        if (!email) {
            setError('Для регистрации требуется email. Телефон не поддерживается для входа.');
            setIsLoading(false);
            return;
        }

        // SelectSearch (в отличие от нативного <select>) не поддерживает атрибут
        // required — раньше это ограничение навешивал браузер, теперь проверяем сами.
        if (formData.role === 'master' && !formData.specialty) {
            setError(t('auth.selectSpecialty'));
            setIsLoading(false);
            return;
        }

        // Подготавливаем данные пользователя
        const userData: {
            email: string;
            name: string;
            surname: string;
            password: string;
            roles?: string[];
            occupation?: string[];
            dateOfBirth?: string;
        } = {
            email,
            name: formData.firstName,
            surname: formData.lastName,
            password: formData.password,
        };

        if (formData.dateOfBirth) {
            userData.dateOfBirth = new Date(formData.dateOfBirth).toISOString();
        }

        // Формируем массив ролей - пробуем разные форматы
        const rolesArray = [];

        // ВАРИАНТ 1: Только основная роль без ROLE_USER
        if (formData.role === 'master') {
            rolesArray.push('ROLE_MASTER');
        } else {
            rolesArray.push('ROLE_CLIENT');
        }

        userData.roles = rolesArray;

        // Добавляем occupation для специальности специалиста, если выбрана
        if (formData.role === 'master' && formData.specialty) {
            userData.occupation = [API_ROUTES.OCCUPATION_BY_ID(formData.specialty)];
            console.log('Adding occupation for specialist:', userData.occupation);
        }

        console.log('Sending registration data:', userData);

        try {
            // 1. Регистрируем пользователя
            await universalApiRequest(API_ROUTES.USERS, {
                method: 'POST',
                body: userData,
                requiresAuth: false,
                locale: false,
            });

            // 2. Логинимся после регистрации
            const loginData: LoginResponse = await universalApiRequest(API_ROUTES.AUTHENTICATION_TOKEN, {
                method: 'POST',
                body: { email, password: formData.password },
                requiresAuth: false,
                locale: false,
            });

            if (!loginData.token) {
                setError(t('auth.invalidCredentials'));
                return;
            }

            // 3. Сохраняем токен
            setAuthToken(loginData.token);
            setTokenExpiry();

            // 4. Сохраняем роль из формы регистрации в localStorage
            // Это делаем сразу, потому что сервер может не сразу вернуть роли
            setUserRole(formData.role);
            console.log('Setting user role from registration form:', formData.role);

            // 5. Попробуем назначить роль через grant-role (но не блокируемся на ошибке)
            try {
                await grantUserRole(loginData.token, formData.role);
            } catch (grantErr) {
                console.warn('Could not grant role via API, using role from form:', grantErr);
            }

            // 6. Пытаемся получить данные пользователя (может вернуть 403 до подтверждения)
            try {
                const userData: any = await universalApiRequest(API_ROUTES.USERS_ME, { locale: false });
                console.log('User data after registration:', userData);

                setUserData(userData);

                if (userData.email) {
                    setUserEmail(userData.email);
                }

                if (userData.roles && userData.roles.length > 0) {
                    console.log('🔥🔥🔥 Registration - User roles from API:', userData.roles);
                    const roles = userData.roles.map((r: string) => r.toLowerCase());
                    if (roles.includes('role_master') || roles.includes('master')) {
                        setUserRole('master');
                    } else if (roles.includes('role_client') || roles.includes('client')) {
                        setUserRole('client');
                    }
                }
            } catch (userErr) {
                console.warn('Could not fetch user data from /me endpoint (expected for new users)', userErr);
            }

            // 7. Отправляем пользователя на подтверждение email
            setRegisteredEmail(email);
            setCurrentState(AuthModalState.CONFIRM_EMAIL);

            // 8. Отправляем успешный auth с токеном
            handleSuccessfulAuth(loginData.token, email);

        } catch (err) {
            console.error('Registration error:', err);
            setError(resolveApiError(err, 'Произошла ошибка при регистрации'));
        } finally {
            setIsLoading(false);
        }
    };

    const grantUserRole = async (_token: string, role: 'master' | 'client'): Promise<boolean> => {
        try {
            console.log('Granting role:', role);

            // Возможно, нужно использовать другие значения ролей
            // Попробуем разные варианты
            const roleValue = role === 'master' ? 'MASTER' : 'CLIENT';

            console.log('Trying to grant role:', roleValue);

            try {
                await universalApiRequest(API_ROUTES.USERS_GRANT_ROLE, {
                    method: 'POST',
                    body: { role: roleValue },
                    locale: false,
                });
                console.log('Role granted successfully');
                return true;
            } catch (grantErr: any) {
                console.warn('Failed to grant role:', roleValue, grantErr?.message);

                // Попробуем другие форматы ролей
                const alternativeRoleValues = [
                    role === 'master' ? 'ROLE_MASTER' : 'ROLE_CLIENT',
                    role === 'master' ? 'master' : 'client',
                    role === 'master' ? 'RoleMaster' : 'RoleClient'
                ];

                for (const altRole of alternativeRoleValues) {
                    console.log('Trying alternative role:', altRole);
                    try {
                        await universalApiRequest(API_ROUTES.USERS_GRANT_ROLE, {
                            method: 'POST',
                            body: { role: altRole },
                            locale: false,
                        });
                        console.log('Role granted successfully with alternative value:', altRole);
                        return true;
                    } catch (err) {
                        console.log('Failed with alternative role:', altRole, 'Error:', err);
                    }
                }

                return false;
            }
        } catch (err) {
            console.error('Error granting role:', err);
            return false;
        }
    };

    // Клик по кнопке провайдера (Google/Facebook/Telegram напрямую; Instagram — из onContinue
    // InstagramLinkNotice) — сперва спрашиваем роль (SelectRoleModal, 'pre'), и только после выбора
    // реально стартуем OAuth. Так пользователь всегда явно выбирает роль ДО провайдера, а не
    // получает её угаданной/дефолтной, и она передаётся дальше без второго вопроса (см.
    // handleOAuthStart/handleTelegramAuthClick — читает её OAuthCallbackPage/TelegramCallbackPage).
    const beginOAuth = (provider: OAuthProviderName) => {
        setRoleSelectMode({ type: 'pre', provider });
    };

    // Роль выбрана в SelectRoleModal — либо ДО OAuth (запускаем сам флоу с этой ролью), либо ПОСЛЕ,
    // самостраховкой (грантим роль уже существующему аккаунту и завершаем вход, как раньше).
    const handleRoleModalSelect = (role: 'master' | 'client') => {
        if (roleSelectMode?.type === 'pre') {
            const { provider } = roleSelectMode;
            setRoleSelectMode(null);
            if (provider === 'telegram') handleTelegramAuthClick(role);
            else handleOAuthStart(provider, role);
            return;
        }
        void grantRoleAndFinish(role);
    };

    // POST /users/grant-role + завершение входа — тот же формат роли (`ROLE_MASTER`/`ROLE_CLIENT`),
    // что уже использует OAuthCallbackPage/TelegramCallbackPage для авто-гранта уже выбранной роли.
    // Нужен только для самостраховки (roleSelectMode.type === 'post') — обычный путь (роль выбрана
    // ДО OAuth) уже приходит с готовой ролью в ответе колбэка, гранта здесь не требует.
    const grantRoleAndFinish = async (role: 'master' | 'client') => {
        setIsGrantingRole(true);
        try {
            await universalApiRequest(API_ROUTES.USERS_GRANT_ROLE, {
                method: 'POST',
                body: { role: role === 'master' ? 'ROLE_MASTER' : 'ROLE_CLIENT' },
                locale: false,
            });
            setUserRole(role);
            setRoleSelectMode(null);
            const token = getAuthToken();
            if (token) handleSuccessfulAuth(token, getUserData()?.email);
        } catch (err) {
            setError(resolveApiError(err));
        } finally {
            setIsGrantingRole(false);
        }
    };

    const handleSuccessfulAuth = (token: string, email?: string) => {
        if (email) {
            setUserEmail(email);
        }

        // НЕ перезаписываем роль здесь! Роль уже установлена в fetchUserData (email-вход) или
        // сразу после OAuth (см. applyNativeAuthToken/OAuthCallbackPage/TelegramCallbackPage — роль
        // была выбрана ДО начала флоу, см. beginOAuth, и применена там). Для email-флоу роль всегда
        // есть к этому моменту; для OAuth её отсутствие означает "аккаунт всё же создан без роли"
        // (напр. Telegram открыл подтверждение в новой вкладке и выбор из beginOAuth не долетел,
        // см. handleTelegramAuthClick) — вместо того чтобы тихо угадывать client, спрашиваем ещё раз
        // (SelectRoleModal, 'post') и НЕ закрываем/перезагружаем модалку, пока роль не выбрана.
        const existingRole = getUserRole();
        if (!existingRole) {
            setRoleSelectMode({ type: 'post' });
            return;
        }

        resetForm();
        if (onLoginSuccess) {
            onLoginSuccess(token, email);
        }
        handleClose();
        window.dispatchEvent(new Event('login'));

        // Админ попадает сразу на очередь заявок ТП (там же сам решает вкладку "Все заявки"
        // по роли), а не туда, где он листал сайт до входа — обычные пользователи как и раньше
        // просто перезагружают текущую страницу.
        const adminRedirect = isAdmin() ? ROUTES.TECH_SUPPORT : null;

        setTimeout(() => {
            if (adminRedirect) {
                window.location.href = adminRedirect;
            } else {
                window.location.reload();
            }
        }, 100);
    };

    const resetForm = () => {
        setFormData({
            email: '',
            password: '',
            confirmPassword: '',
            firstName: '',
            lastName: '',
            specialty: '',
            newPassword: '',
            phoneOrEmail: '',
            role: 'client', // Безопасный дефолт (client вместо master)
            code: '',
            dateOfBirth: ''
        });
        setError('');
        setCurrentState(AuthModalState.WELCOME);
        setPasswordValidation({ isValid: false, message: '' });
        setShowPasswordRequirements(false);

        // Очищаем все временные данные
        ['google', 'instagram', 'facebook', 'telegram'].forEach(provider => {
            removeSessionItem(`pending${provider.charAt(0).toUpperCase() + provider.slice(1)}Role`);
            removeSessionItem(`pending${provider.charAt(0).toUpperCase() + provider.slice(1)}Specialty`);
            removeSessionItem(`${provider}CsrfState`);
        });
        removeStorageItems('tempGoogleToken', 'tempGoogleUserData', 'telegramUserData');
    };

    const handleClose = () => {
        setCurrentState(AuthModalState.WELCOME);
        onClose();
    };

    const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget) {
            handleClose();
        }
    };

    // ===== Password recovery handlers =====

    const handleForgotPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        try {
            await universalApiRequest(API_ROUTES.CHANGE_PASSWORD_SEND_OTP, {
                method: 'POST',
                body: { email: formData.email },
                requiresAuth: false,
                locale: false,
            });
            // Always move to next step (don't reveal if email exists)
            setCurrentState(AuthModalState.VERIFY_CODE);
        } catch {
            setError(t('auth.errorOccurred'));
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifyCode = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setCurrentState(AuthModalState.NEW_PASSWORD);
    };

    const handleNewPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (formData.newPassword !== formData.confirmPassword) {
            setError(t('auth.passwordMismatch'));
            return;
        }
        setIsLoading(true);
        setError('');
        try {
            await universalApiRequest(API_ROUTES.CHANGE_PASSWORD, {
                method: 'POST',
                body: { email: formData.email, code: formData.code, newPassword: formData.newPassword },
                requiresAuth: false,
                locale: false,
            });
            setCurrentState(AuthModalState.LOGIN);
        } catch {
            setError(t('auth.errorOccurred'));
        } finally {
            setIsLoading(false);
        }
    };

    // ===== Password recovery screens =====

    const renderForgotPasswordScreen = () => {
        return (
            <form onSubmit={handleForgotPassword} className={styles.form}>
                <h2>{t('auth.forgotPasswordTitle')}</h2>

                <div className={styles.inputGroup}>
                    <SelectSearch
                        altMode
                        options={[]}
                        hideIcon
                        inputType="email"
                        name="email"
                        value={formData.email}
                        onChange={handleFieldChange('email')}
                        required
                        disabled={isLoading}
                        placeholder={t('auth.enterEmail')}
                    />
                </div>

                <button type="submit" className={styles.primaryButton} disabled={isLoading}>
                    {isLoading ? <PageLoader fullPage={false} compact /> : t('auth.sendCode')}
                </button>

                <div className={styles.links}>
                    <button
                        type="button"
                        className={styles.linkButton}
                        onClick={() => setCurrentState(AuthModalState.LOGIN)}
                        disabled={isLoading}
                    >
                        {t('auth.backToLogin')}
                    </button>
                </div>
            </form>
        );
    };

    const renderVerifyCodeScreen = () => {
        return (
            <form onSubmit={handleVerifyCode} className={styles.form}>
                <h2>{t('auth.enterCode')}</h2>

                <p className={styles.infoText}>{t('auth.codeSentTo')} <strong>{formData.email}</strong></p>

                <div className={styles.inputGroup}>
                    <SelectSearch
                        altMode
                        options={[]}
                        hideIcon
                        name="code"
                        value={formData.code}
                        onChange={handleFieldChange('code')}
                        required
                        maxLength={6}
                        disabled={isLoading}
                        placeholder={t('auth.enterOtpCode')}
                    />
                </div>

                <button type="submit" className={styles.primaryButton} disabled={isLoading}>
                    {t('auth.continue')}
                </button>

                <div className={styles.links}>
                    <button
                        type="button"
                        className={styles.linkButton}
                        onClick={() => setCurrentState(AuthModalState.FORGOT_PASSWORD)}
                        disabled={isLoading}
                    >
                        {t('common:app.back')}
                    </button>
                </div>
            </form>
        );
    };

    const renderNewPasswordScreen = () => {
        return (
            <form onSubmit={handleNewPassword} className={styles.form}>
                <h2>{t('auth.newPasswordTitle')}</h2>

                <div className={styles.inputGroup}>
                    <SelectSearch
                        altMode
                        options={[]}
                        hideIcon
                        isPassword
                        name="newPassword"
                        autoComplete="new-password"
                        value={formData.newPassword}
                        onChange={handleFieldChange('newPassword')}
                        required
                        minLength={8}
                        disabled={isLoading}
                        placeholder={t('auth.enterNewPassword')}
                    />
                </div>

                <div className={styles.inputGroup}>
                    <SelectSearch
                        altMode
                        options={[]}
                        hideIcon
                        isPassword
                        name="confirmPassword"
                        autoComplete="new-password"
                        value={formData.confirmPassword}
                        onChange={handleFieldChange('confirmPassword')}
                        required
                        minLength={8}
                        disabled={isLoading}
                        placeholder={t('auth.confirmPassword')}
                    />
                </div>

                <button type="submit" className={styles.primaryButton} disabled={isLoading}>
                    {isLoading ? <PageLoader fullPage={false} compact /> : t('auth.savePassword')}
                </button>

                <div className={styles.links}>
                    <button
                        type="button"
                        className={styles.linkButton}
                        onClick={() => setCurrentState(AuthModalState.VERIFY_CODE)}
                        disabled={isLoading}
                    >
                        {t('common:app.back')}
                    </button>
                </div>
            </form>
        );
    };

    // Подсказка под OAuth-иконками: у кого уже есть аккаунт на сайте (email+пароль), вход через
    // соцсеть с тем же email упирается в oauth.emailTaken — нужно сначала войти в исходный
    // аккаунт и привязать провайдера в профиле. Название раздела берём из profile.json, чтобы
    // текст не расходился с тем, как раздел реально называется в профиле.
    const renderSocialLinkBanner = () => (
        <InfoBanner
            icon={<IoInformationCircleOutline />}
            message={t('auth.socialLinkBanner', { section: t('profile:oauth.sectionTitle') })}
            className={styles.socialLinkBanner}
        />
    );

    const renderWelcomeScreen = () => {
        return (
            <div className={styles.welcomeScreen}>
                <div className={styles.welcomeButtons}>
                    <img className={styles.enterPic} src="/img/icons/logos/Logo.svg" alt="enter" width="120"/>
                    <h2>{t('auth.entrance')}</h2>
                    <button
                        className={styles.primaryButton}
                        onClick={() => setCurrentState(AuthModalState.LOGIN)}
                        type="button"
                    >
                        {t('auth.login')}
                    </button>
                    <button
                        className={styles.secondaryButton}
                        onClick={() => setCurrentState(AuthModalState.REGISTER)}
                        type="button"
                    >
                        {t('auth.registerButton')}
                    </button>
                </div>
            </div>
        );
    };

    const renderLoginScreen = () => {
        return (
            <form onSubmit={handleLogin} className={styles.form}>
                <h2>{t('auth.entrance')}</h2>

                <div className={styles.inputGroup}>
                    <SelectSearch
                        altMode
                        options={[]}
                        hideIcon
                        inputType="email"
                        name="email"
                        autoComplete="email"
                        value={formData.email}
                        onChange={handleFieldChange('email')}
                        required
                        disabled={isLoading}
                        placeholder={t('auth.enterEmail')}
                    />
                </div>
                <div className={styles.inputGroup}>
                    <SelectSearch
                        altMode
                        options={[]}
                        hideIcon
                        isPassword
                        name="password"
                        autoComplete="current-password"
                        value={formData.password}
                        onChange={handleFieldChange('password')}
                        required
                        disabled={isLoading}
                        placeholder={t('auth.enterPassword')}
                    />
                </div>

                <button
                    type="submit"
                    className={styles.primaryButton}
                    disabled={isLoading}
                >
                    {isLoading ? <PageLoader fullPage={false} compact /> : t('auth.login')}
                </button>

                <div className={styles.socialTitle}>{t('auth.loginWith')}</div>

                <div className={styles.socialButtons}>
                    <button
                        type="button"
                        className={styles.googleButton}
                        onClick={() => handleOAuthStart('google')}
                        disabled={isLoading}
                        title={t('auth.loginViaGoogle')}
                    >
                        <img src="/img/icons/oauth/chrome.png" alt="Google" />
                    </button>
                    <button
                        type="button"
                        className={styles.facebookButton}
                        onClick={() => handleOAuthStart('facebook')}
                        disabled={isLoading}
                        title={t('auth.loginViaFacebook')}
                    >
                        <img src="/img/icons/oauth/facebook.png" alt="Facebook" />
                    </button>
                    <button
                        type="button"
                        className={styles.instagramButton}
                        onClick={() => setInstagramNoticeMode('login')}
                        disabled={isLoading}
                        title={t('auth.loginViaInstagram')}
                    >
                        <img src="/img/icons/oauth/instagram.png" alt="Instagram" />
                    </button>
                    <button
                        type="button"
                        className={styles.telegramButton}
                        onClick={() => handleTelegramAuthClick()}
                        disabled={isLoading}
                        title={t('auth.loginViaTelegram')}
                    >
                        <img src="/img/icons/oauth/telegram.png" alt="Telegram" />
                    </button>
                </div>

                {renderSocialLinkBanner()}

                <div className={styles.links}>
                    <div className={styles.registerPrompt}>
                        <span className={styles.promptText}>{t('auth.noAccount')} </span>
                        <button
                            type="button"
                            className={styles.linkButton}
                            onClick={() => setCurrentState(AuthModalState.REGISTER)}
                            disabled={isLoading}
                        >
                            {t('auth.signUpLink')}
                        </button>
                    </div>
                    <button
                        type="button"
                        className={styles.linkButton}
                        onClick={() => setCurrentState(AuthModalState.FORGOT_PASSWORD)}
                        disabled={isLoading}
                    >
                        {t('auth.forgotPassword')}
                    </button>
                </div>
            </form>
        );
    };

    const renderRegisterScreen = () => {
        return (
            <form onSubmit={handleRegister} className={styles.form}>
                <h2>{t('auth.register')}</h2>

                <div className={styles.roleSelector}>
                    <button
                        type="button"
                        className={formData.role === 'master' ? styles.roleButtonActive : styles.roleButton}
                        onClick={() => handleRoleChange('master')}
                    >
                        <Marquee text={t('auth.iAmSpecialist')} />
                    </button>
                    <button
                        type="button"
                        className={formData.role === 'client' ? styles.roleButtonActive : styles.roleButton}
                        onClick={() => handleRoleChange('client')}
                    >
                        <Marquee text={t('auth.iAmClient')} />
                    </button>
                </div>

                <div className={styles.nameRow}>
                    <div className={styles.inputGroup}>
                        <SelectSearch
                            altMode
                            options={[]}
                            hideIcon
                            name="firstName"
                            autoComplete="given-name"
                            value={formData.firstName}
                            onChange={handleFieldChange('firstName')}
                            required
                            disabled={isLoading}
                            placeholder={t('auth.enterFirstName')}
                        />
                    </div>
                    <div className={styles.inputGroup}>
                        <SelectSearch
                            altMode
                            options={[]}
                            hideIcon
                            name="lastName"
                            autoComplete="family-name"
                            value={formData.lastName}
                            onChange={handleFieldChange('lastName')}
                            required
                            disabled={isLoading}
                            placeholder={t('auth.enterLastName')}
                        />
                    </div>
                </div>

                <div className={styles.inputGroup}>
                    <DateWidget
                        name="dateOfBirth"
                        value={formData.dateOfBirth}
                        onChange={(val) => setFormData(prev => ({ ...prev, dateOfBirth: val }))}
                        disabled={isLoading}
                    />
                </div>

                {formData.role === 'master' && (
                    <div className={styles.inputGroup}>
                        <SelectSearch
                            value={formData.specialty}
                            onChange={handleFieldChange('specialty')}
                            placeholder={t('auth.selectSpecialty')}
                            options={categories.map(category => ({
                                value: String(category.id),
                                label: category.title,
                            }))}
                            disabled={isLoading}
                        />
                    </div>
                )}

                <div className={styles.inputGroup}>
                    <SelectSearch
                        altMode
                        options={[]}
                        hideIcon
                        inputType="email"
                        name="phoneOrEmail"
                        autoComplete="email"
                        value={formData.phoneOrEmail}
                        onChange={handleFieldChange('phoneOrEmail')}
                        required
                        disabled={isLoading}
                        placeholder="example@mail.com"
                    />
                </div>

                <div className={styles.inputGroup}>
                    <SelectSearch
                        altMode
                        options={[]}
                        hideIcon
                        isPassword
                        name="password"
                        autoComplete="new-password"
                        value={formData.password}
                        onChange={handleFieldChange('password')}
                        required
                        disabled={isLoading}
                        placeholder={t('auth.createPassword')}
                        onFocus={() => setShowPasswordRequirements(true)}
                        onBlur={() => {
                            if (passwordValidation.isValid) {
                                setShowPasswordRequirements(false);
                            }
                        }}
                    />
                    {showPasswordRequirements && (
                        <div className={styles.passwordRequirements}>
                            <p>{t('auth.passwordRequirements')}</p>
                            <ul>
                                <li className={formData.password.length >= 8 ? styles.requirementMet : ''}>
                                    {t('auth.minLength')}
                                </li>
                                <li className={/[a-z]/.test(formData.password) ? styles.requirementMet : ''}>
                                    {t('auth.lowercase')}
                                </li>
                                <li className={/[A-Z]/.test(formData.password) ? styles.requirementMet : ''}>
                                    {t('auth.uppercase')}
                                </li>
                                <li className={/\d/.test(formData.password) ? styles.requirementMet : ''}>
                                    {t('auth.number')}
                                </li>
                                <li className={/[!@#$%^&*]/.test(formData.password) ? styles.requirementMet : ''}>
                                    {t('auth.special')}
                                </li>
                            </ul>
                        </div>
                    )}
                </div>

                <div className={styles.inputGroup}>
                    <SelectSearch
                        altMode
                        options={[]}
                        hideIcon
                        isPassword
                        name="confirmPassword"
                        autoComplete="new-password"
                        value={formData.confirmPassword}
                        onChange={handleFieldChange('confirmPassword')}
                        required
                        disabled={isLoading}
                        placeholder={t('auth.confirmPassword')}
                    />
                    {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                        <div className={styles.passwordError}>
                            Пароли не совпадают
                        </div>
                    )}
                </div>

                <p className={styles.legalNote}>
                    {t('auth.agreeToTerms')}{' '}
                    <Link to={ROUTES.TERMS_OF_USE} className={styles.legalLink} onClick={handleClose}>
                        {t('common:footer.termsOfUse')}
                    </Link>
                    {' '}{t('auth.and')}{' '}
                    <Link to={ROUTES.PRIVACY_POLICY} className={styles.legalLink} onClick={handleClose}>
                        {t('common:footer.privacyPolicy')}
                    </Link>
                </p>

                <button
                    type="submit"
                    className={styles.primaryButton}
                    disabled={isLoading || !passwordValidation.isValid}
                >
                    {isLoading ? <PageLoader fullPage={false} compact /> : t('auth.registerButton')}
                </button>

                <div className={styles.socialTitle}>{t('auth.orRegisterWith')}</div>

                <div className={styles.socialButtons}>
                    <button
                        type="button"
                        className={styles.googleButton}
                        onClick={() => beginOAuth('google')}
                        disabled={isLoading}
                        title={t('auth.registerViaGoogle')}
                    >
                        <img src="/img/icons/oauth/chrome.png" alt="Google" />
                    </button>
                    <button
                        type="button"
                        className={styles.facebookButton}
                        onClick={() => beginOAuth('facebook')}
                        disabled={isLoading}
                        title={t('auth.registerViaFacebook')}
                    >
                        <img src="/img/icons/oauth/facebook.png" alt="Facebook" />
                    </button>
                    <button
                        type="button"
                        className={styles.instagramButton}
                        onClick={() => setInstagramNoticeMode('register')}
                        disabled={isLoading}
                        title={t('auth.registerViaInstagram')}
                    >
                        <img src="/img/icons/oauth/instagram.png" alt="Instagram" />
                    </button>
                    <button
                        type="button"
                        className={styles.telegramButton}
                        onClick={() => beginOAuth('telegram')}
                        disabled={isLoading}
                        title={t('auth.registerViaTelegram')}
                    >
                        <img src="/img/icons/oauth/telegram.png" alt="Telegram" />
                    </button>
                </div>

                {renderSocialLinkBanner()}

                <div id="telegram-widget-container-register" className={styles.telegramWidgetContainer}>
                    {/* Widget будет добавлен динамически */}
                </div>

                <div className={styles.links}>
                    <button
                        type="button"
                        className={styles.linkButton}
                        onClick={() => setCurrentState(AuthModalState.LOGIN)}
                        disabled={isLoading}
                    >
                        {t('auth.alreadyHaveAccount')} {t('auth.loginLink')}
                    </button>
                </div>
            </form>
        );
    };

    const renderConfirmEmailScreen = () => {
        return (
            <div className={styles.form}>
                <h2>{t('auth.accountConfirmation')}</h2>

                <div className={styles.successMessage}>
                    <p>{t('auth.registrationSuccess')}</p>
                    <p>На вашу почту <strong>{registeredEmail}</strong> отправлено письмо с ссылкой для подтверждения аккаунта.</p>
                    <p>Пожалуйста, проверьте вашу почту и перейдите по ссылке для завершения регистрации.</p>
                </div>

                <div className={styles.links}>
                    <button
                        type="button"
                        className={styles.linkButton}
                        onClick={() => setCurrentState(AuthModalState.LOGIN)}
                        disabled={isLoading}
                    >
                        {t('auth.goToLogin')}
                    </button>
                </div>
            </div>
        );
    };

    const renderContent = () => {
        switch (currentState) {
            case AuthModalState.WELCOME:
                return renderWelcomeScreen();
            case AuthModalState.LOGIN:
                return renderLoginScreen();
            case AuthModalState.REGISTER:
                return renderRegisterScreen();
            case AuthModalState.CONFIRM_EMAIL:
                return renderConfirmEmailScreen();
            case AuthModalState.FORGOT_PASSWORD:
                return renderForgotPasswordScreen();
            case AuthModalState.VERIFY_CODE:
                return renderVerifyCodeScreen();
            case AuthModalState.NEW_PASSWORD:
                return renderNewPasswordScreen();
            default:
                return renderWelcomeScreen();
        }
    };

    return (
        <>
            {isOpen && (
                <div className={styles.modalOverlay} onClick={handleOverlayClick}>
                    <div
                        className={`${styles.modalContent} ${styles[`modal_${currentState}`]}`}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <Clear className={styles.closeButton} onClick={handleClose} />
                        {renderContent()}
                    </div>
                    <Status
                        type="error"
                        isOpen={!!error}
                        onClose={() => setError('')}
                        message={error}
                    />
                </div>
            )}
            <InstagramLinkNotice
                isOpen={!!instagramNoticeMode}
                onClose={() => setInstagramNoticeMode(null)}
                onContinue={() => {
                    const mode = instagramNoticeMode;
                    setInstagramNoticeMode(null);
                    if (mode === 'register') beginOAuth('instagram');
                    else handleOAuthStart('instagram');
                }}
                isLoading={isLoading}
            />
            {/*
              Не гейтится через isOpen: в режиме 'post' пользователь мог оказаться "авторизован, но
              без роли" уже после того, как основная модалка закрылась (напр. Telegram вернул
              колбэк в исходную вкладку через storage-событие, пока сама модалка визуально закрыта,
              см. useEffect выше) — тогда это единственное, что должно быть видно на экране.
            */}
            <SelectRoleModal
                isOpen={!!roleSelectMode}
                onClose={() => setRoleSelectMode(null)}
                onSelectRole={handleRoleModalSelect}
                isLoading={roleSelectMode?.type === 'post' && isGrantingRole}
                hint={roleSelectMode?.type === 'pre'
                    ? t('components:auth.selectRoleForProvider', {
                        provider: roleSelectMode.provider.charAt(0).toUpperCase() + roleSelectMode.provider.slice(1),
                    })
                    : undefined}
            />
        </>
    );
};

export default Auth;
export { AuthModalState };