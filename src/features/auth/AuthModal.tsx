import React, { useState, useEffect } from 'react';
import styles from './AuthModal.module.scss';
import { setAuthToken, getAuthTokenExpiry, setAuthTokenExpiry, clearAuthData, getAuthToken } from '../../utils/auth';

const AuthModalState = {
    WELCOME: 'welcome',
    LOGIN: 'login',
    REGISTER: 'register',
    FORGOT_PASSWORD: 'forgot_password',
    VERIFY_CODE: 'verify_code',
    NEW_PASSWORD: 'new_password',
    CONFIRM_EMAIL: 'confirm_email',
    GOOGLE_ROLE_SELECT: 'google_role_select',
    TELEGRAM_ROLE_SELECT: 'telegram_role_select'
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
}

interface Category {
    id: number;
    title: string;
    description: string;
    imageFile: string;
}

interface LoginResponse {
    token: string;
}

interface GoogleAuthUrlResponse {
    url: string;
}

interface GoogleUserResponse {
    user: {
        id: number;
        email: string;
        name: string;
        surname: string;
        roles: string[];
        [key: string]: unknown;
    };
    token: string;
    message: string;
}

// Константы для времени жизни токена (обновление каждые 50 минут)
const TOKEN_LIFETIME_HOURS = 1;
const TOKEN_REFRESH_BUFFER_MINUTES = 10; // Обновлять за 10 минут до истечения
const REFRESH_INTERVAL_MS = 50 * 60 * 1000; // 50 минут в миллисекундах

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onLoginSuccess }) => {
    const [currentState, setCurrentState] = useState<AuthModalStateType>(AuthModalState.WELCOME);
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
        role: 'master',
        code: ''
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string>('');
    const [registeredEmail, setRegisteredEmail] = useState<string>('');
    const [googleAuthCode, setGoogleAuthCode] = useState<string>('');
    const [googleAuthState, setGoogleAuthState] = useState<string>('');
    const [refreshIntervalId, setRefreshIntervalId] = useState<NodeJS.Timeout | null>(null);
    // const [needsRoleSelection, setNeedsRoleSelection] = useState(false);

    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

    // Функция проверки необходимости выбора роли
    const checkRoleSelectionNeeded = async (token: string): Promise<boolean> => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/users/me`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token.trim()}`,
                    'Accept': 'application/json',
                },
            });

            if (response.ok) {
                const userData = await response.json();
                // Проверяем наличие Google ID и отсутствие ролей
                const isGoogleAuth = userData.oauthType?.googleId;
                const hasRole = userData.roles && userData.roles.length > 0;
                return isGoogleAuth && !hasRole;
            }
            return false;
        } catch (error) {
            console.error('Error checking role selection:', error);
            return false;
        }
    };

    useEffect(() => {
        const loadCategories = async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/api/occupations`);
                if (response.ok) {
                    const data = await response.json();
                    setCategories(data);
                }
            } catch (err) {
                console.error('Error loading categories:', err);
            }
        };

        loadCategories();

        // Проверяем URL параметры ТОЛЬКО для открытия модалки
        const urlParams = new URLSearchParams(window.location.search);
        const showAuthModal = urlParams.get('showAuthModal');
        const oauth = urlParams.get('oauth');
        const oauthError = urlParams.get('oauth_error');

        console.log('AuthModal - URL params:', { showAuthModal, oauth, oauthError });

        // 1. Обработка ошибок OAuth
        if (oauthError) {
            console.error('OAuth error from URL:', oauthError);
            setError(`Ошибка авторизации: ${decodeURIComponent(oauthError)}`);
            // Очищаем URL
            window.history.replaceState({}, document.title, window.location.pathname);

            // Если модалка закрыта, открываем её для показа ошибки
            if (!isOpen && showAuthModal === 'true') {
                console.log('Should open modal for error display');
            }
        }

        // 2. Проверяем флаг из URL для открытия модалки после OAuth
        if (showAuthModal === 'true' && oauth === 'google') {
            console.log('URL flag: should process Google OAuth in modal');

            // Проверяем, есть ли данные в localStorage
            const savedCode = localStorage.getItem('googleAuthCode');
            const savedState = localStorage.getItem('googleAuthState');

            if (savedCode && savedState) {
                console.log('Found Google auth data in localStorage');
                setGoogleAuthCode(savedCode);
                setGoogleAuthState(savedState);
                setCurrentState(AuthModalState.GOOGLE_ROLE_SELECT);

                // Если модалка закрыта - нужно её открыть
                if (!isOpen) {
                    console.log('Modal is closed, should open it for role selection');
                }

                // Очищаем URL параметры
                window.history.replaceState({}, document.title, window.location.pathname);
            } else {
                console.log('No Google auth data found in localStorage, checking sessionStorage');
                // Проверяем sessionStorage как запасной вариант
                const sessionCode = sessionStorage.getItem('googleAuthCode');
                const sessionState = sessionStorage.getItem('googleAuthState');

                if (sessionCode && sessionState) {
                    console.log('Found Google auth data in sessionStorage');
                    // Переносим в localStorage
                    localStorage.setItem('googleAuthCode', sessionCode);
                    localStorage.setItem('googleAuthState', sessionState);
                    setGoogleAuthCode(sessionCode);
                    setGoogleAuthState(sessionState);
                    setCurrentState(AuthModalState.GOOGLE_ROLE_SELECT);

                    // Очищаем sessionStorage
                    sessionStorage.removeItem('googleAuthCode');
                    sessionStorage.removeItem('googleAuthState');

                    // Если модалка закрыта - нужно её открыть
                    if (!isOpen) {
                        console.log('Modal is closed, should open it for role selection');
                    }

                    // Очищаем URL параметры
                    window.history.replaceState({}, document.title, window.location.pathname);
                }
            }
        }

        // 3. Проверяем localStorage на наличие данных Google (если модалка уже открыта)
        if (isOpen && currentState !== AuthModalState.GOOGLE_ROLE_SELECT) {
            const savedCode = localStorage.getItem('googleAuthCode');
            const savedState = localStorage.getItem('googleAuthState');

            if (savedCode && savedState && !googleAuthCode && !googleAuthState) {
                console.log('Found saved Google auth data while modal is open, switching to role selection');
                setGoogleAuthCode(savedCode);
                setGoogleAuthState(savedState);
                setCurrentState(AuthModalState.GOOGLE_ROLE_SELECT);
            }
        }

        // Загружаем скрипт Telegram Widget
        const loadTelegramWidget = () => {
            if (document.querySelector('script[src*="telegram-widget"]')) {
                return;
            }

            const script = document.createElement('script');
            script.src = 'https://telegram.org/js/telegram-widget.js?22';
            script.async = true;
            script.onload = () => {
                console.log('Telegram Widget script loaded');
            };
            document.body.appendChild(script);
        };

        loadTelegramWidget();

        // Обработка сообщений от Telegram Widget
        const handleTelegramAuth = (event: MessageEvent) => {
            if (event.origin !== 'https://oauth.telegram.org') {
                return;
            }

            try {
                const data = event.data;
                console.log('Telegram auth data received:', data);

                if (data.event === 'auth_callback') {
                    const authData = data.auth;
                    handleTelegramCallback(authData);
                }
            } catch (err) {
                console.error('Error processing Telegram auth:', err);
                setError('Ошибка авторизации через Telegram');
            }
        };

        window.addEventListener('message', handleTelegramAuth);

        // Запускаем периодическое обновление токена
        startPeriodicTokenRefresh();

        return () => {
            window.removeEventListener('message', handleTelegramAuth);
            if (refreshIntervalId) {
                clearInterval(refreshIntervalId);
            }
        };
    }, [isOpen]);

    // Отдельный useEffect для проверки необходимости выбора роли при открытии модалки
    useEffect(() => {
        const checkForPendingGoogleAuth = async () => {
            if (isOpen) {
                const token = getAuthToken();
                if (token) {
                    const needsRoleSelect = await checkRoleSelectionNeeded(token);
                    if (needsRoleSelect) {
                        setCurrentState(AuthModalState.GOOGLE_ROLE_SELECT);
                    }
                }
            }
        };

        checkForPendingGoogleAuth();
    }, [isOpen]);

    // Функция для периодического обновления токена
    const startPeriodicTokenRefresh = () => {
        if (refreshIntervalId) {
            clearInterval(refreshIntervalId);
        }

        const intervalId = setInterval(() => {
            refreshToken().then(success => {
                if (success) {
                    console.log('Token refreshed successfully (periodic refresh)');
                } else {
                    console.log('Periodic token refresh failed');
                }
            });
        }, REFRESH_INTERVAL_MS); // Каждые 50 минут

        setRefreshIntervalId(intervalId);
    };

    const handleTelegramCallback = async (authData: any) => {
        try {
            setIsLoading(true);
            setError('');

            console.log('Processing Telegram auth data:', authData);

            // Отправляем данные на ваш сервер
            const response = await fetch(`${API_BASE_URL}/api/auth/telegram/callback`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify(authData)
            });

            if (!response.ok) {
                let errorMessage = 'Ошибка авторизации через Telegram';
                const responseText = await response.text();

                try {
                    const errorData = JSON.parse(responseText);
                    errorMessage = errorData.detail || errorData.message || errorMessage;
                } catch {
                    errorMessage = responseText || `HTTP error! status: ${response.status}`;
                }

                throw new Error(errorMessage);
            }

            const data = await response.json();
            console.log('Telegram auth successful, data:', data);

            // Обработка успешной авторизации
            if (data.token) {
                setAuthToken(data.token);
                setTokenExpiry();

                if (data.user) {
                    localStorage.setItem('userData', JSON.stringify(data.user));
                    if (data.user.email) {
                        localStorage.setItem('userEmail', data.user.email);
                    }
                    if (data.user.roles && data.user.roles.length > 0) {
                        localStorage.setItem('userRole', data.user.roles[0]);
                    }
                }

                handleSuccessfulAuth(data.token, data.user?.email);
            } else {
                // Если нет токена, но есть данные пользователя, возможно нужно выбрать роль
                if (data.user) {
                    // Сохраняем данные пользователя для выбора роли
                    localStorage.setItem('telegramUserData', JSON.stringify(data.user));
                    setCurrentState(AuthModalState.TELEGRAM_ROLE_SELECT);
                } else {
                    throw new Error('Данные пользователя не получены');
                }
            }

        } catch (err) {
            console.error('Telegram auth callback error:', err);
            setError(err instanceof Error ? err.message : 'Ошибка при завершении авторизации через Telegram');
        } finally {
            setIsLoading(false);
        }
    };

    const handleTelegramAuthClick = () => {
        // Создаем Telegram кнопку
        const telegramWidgetContainer = document.getElementById('telegram-widget-container');
        if (telegramWidgetContainer) {
            telegramWidgetContainer.innerHTML = '';

            const script = document.createElement('script');
            script.src = 'https://telegram.org/js/telegram-widget.js?22';
            script.async = true;
            script.setAttribute('data-telegram-login', 'ustoyobtj_auth_bot');
            script.setAttribute('data-size', 'large');
            script.setAttribute('data-userpic', 'false');
            script.setAttribute('data-radius', '20');
            script.setAttribute('data-auth-url', 'https://ustoyob.tj/auth/telegram');
            script.setAttribute('data-request-access', 'write');

            telegramWidgetContainer.appendChild(script);
        }
    };

    const completeTelegramAuth = async (selectedRole: 'master' | 'client' = 'client') => {
        try {
            setIsLoading(true);
            setError('');

            const telegramUserDataStr = localStorage.getItem('telegramUserData');
            if (!telegramUserDataStr) {
                throw new Error('Данные пользователя Telegram не найдены');
            }

            const telegramUserData = JSON.parse(telegramUserDataStr);
            console.log('Completing Telegram auth for role:', selectedRole);

            // Завершаем авторизацию с выбранной ролью
            const response = await fetch(`${API_BASE_URL}/api/auth/telegram/complete`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify({
                    userData: telegramUserData,
                    role: selectedRole
                })
            });

            if (!response.ok) {
                let errorMessage = 'Ошибка завершения авторизации через Telegram';
                const responseText = await response.text();

                try {
                    const errorData = JSON.parse(responseText);
                    errorMessage = errorData.detail || errorData.message || errorMessage;
                } catch {
                    errorMessage = responseText || `HTTP error! status: ${response.status}`;
                }

                throw new Error(errorMessage);
            }

            const data = await response.json();
            console.log('Telegram auth completed, data:', data);

            if (data.token) {
                setAuthToken(data.token);
                setTokenExpiry();

                if (data.user) {
                    localStorage.setItem('userData', JSON.stringify(data.user));
                    if (data.user.email) {
                        localStorage.setItem('userEmail', data.user.email);
                    }
                    if (data.user.roles && data.user.roles.length > 0) {
                        localStorage.setItem('userRole', data.user.roles[0]);
                    }
                }

                // Удаляем временные данные
                localStorage.removeItem('telegramUserData');

                handleSuccessfulAuth(data.token, data.user?.email);
            } else {
                throw new Error('Токен не получен в ответе');
            }

        } catch (err) {
            console.error('Telegram auth completion error:', err);
            setError(err instanceof Error ? err.message : 'Ошибка при завершении авторизации через Telegram');
        } finally {
            setIsLoading(false);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const name = e.target.name as keyof FormData;
        const value = e.target.value;
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
        expiryTime.setHours(expiryTime.getHours() + TOKEN_LIFETIME_HOURS);
        setAuthTokenExpiry(expiryTime.toISOString());
        startTokenExpiryCheck();
        startPeriodicTokenRefresh(); // Перезапускаем периодическое обновление
    };

    const checkTokenExpiry = (): boolean => {
        const expiry = getAuthTokenExpiry();
        if (!expiry) return true;

        const now = new Date();
        const expiryDate = new Date(expiry);

        const bufferTime = TOKEN_REFRESH_BUFFER_MINUTES * 60 * 1000;
        return expiryDate.getTime() - now.getTime() < bufferTime;
    };

    const refreshToken = async (): Promise<boolean> => {
        const token = localStorage.getItem('authToken');
        if (!token) {
            console.log('No token to refresh');
            return false;
        }

        try {
            console.log('Refreshing token...');
            const response = await fetch(`${API_BASE_URL}/api/refresh-token`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json',
                },
            });

            if (response.ok) {
                const newTokenData: LoginResponse = await response.json();
                if (newTokenData.token) {
                    console.log('Token refreshed successfully');
                    setAuthToken(newTokenData.token);
                    setTokenExpiry();

                    // Уведомляем об успешном обновлении
                    if (onLoginSuccess) {
                        onLoginSuccess(newTokenData.token);
                    }

                    return true;
                }
            } else {
                console.log('Token refresh failed with status:', response.status);
                // Если токен недействителен, очищаем данные
                if (response.status === 401) {
                    clearAuthData();
                }
            }
        } catch (err) {
            console.error('Error refreshing token:', err);
        }

        return false;
    };

    const startTokenExpiryCheck = () => {
        setInterval(() => {
            if (checkTokenExpiry()) {
                console.log('Token is about to expire, attempting to refresh...');
                refreshToken().then(success => {
                    if (!success) {
                        console.log('Token refresh failed, clearing auth data');
                        clearAuthData();
                    }
                });
            }
        }, 60000); // Проверка каждую минуту
    };

    useEffect(() => {
        if (localStorage.getItem('authToken') && checkTokenExpiry()) {
            console.log('Token expired on page load');
            clearAuthData();
        }
    }, []);

    const handleGoogleAuth = async () => {
        try {
            setIsLoading(true);
            setError('');

            console.log('Initiating Google OAuth from modal...');

            // URL для редиректа после авторизации (отдельная страница)
            const redirectUri = `${window.location.origin}/auth/google`;
            console.log('Redirect URI:', redirectUri);

            // Получаем URL от бэкенда
            const response = await fetch(`${API_BASE_URL}/api/auth/google/url?redirect_uri=${encodeURIComponent(redirectUri)}`, {
                method: 'GET',
                headers: { 'Accept': 'application/json' },
            });

            if (!response.ok) {
                // Если не поддерживает параметр, получаем без него
                const fallbackResponse = await fetch(`${API_BASE_URL}/api/auth/google/url`, {
                    method: 'GET',
                    headers: { 'Accept': 'application/json' },
                });

                if (!fallbackResponse.ok) {
                    throw new Error('Не удалось получить URL для авторизации через Google');
                }

                const data: GoogleAuthUrlResponse = await fallbackResponse.json();
                console.log('Google auth URL received (fallback):', data.url);

                // Закрываем модалку и перенаправляем
                onClose();
                window.location.href = data.url;
            } else {
                const data: GoogleAuthUrlResponse = await response.json();
                console.log('Google auth URL received:', data.url);

                // Закрываем модалку и перенаправляем
                onClose();
                window.location.href = data.url;
            }

        } catch (err) {
            console.error('Google auth error:', err);
            setError(err instanceof Error ? err.message : 'Ошибка при авторизации через Google');
            setIsLoading(false);
        }
    };

    const completeGoogleAuth = async (selectedRole: 'master' | 'client' = 'client') => {
        try {
            setIsLoading(true);
            setError('');

            console.log('Completing Google auth with role:', selectedRole);

            // Проверяем наличие данных
            const savedCode = localStorage.getItem('googleAuthCode');
            const savedState = localStorage.getItem('googleAuthState');

            let response;

            if (savedCode && savedState) {
                // ВСЕГДА отправляем запрос с кодом авторизации
                response = await fetch(`${API_BASE_URL}/api/auth/google/callback`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                    },
                    body: JSON.stringify({
                        code: savedCode,
                        state: savedState,
                        role: selectedRole
                    })
                });

                const responseText = await response.text();
                console.log('Google auth response status:', response.status);

                if (!response.ok) {
                    let errorMessage = 'Ошибка авторизации через Google';
                    try {
                        const errorData = JSON.parse(responseText);
                        errorMessage = errorData.detail || errorData.message || errorMessage;
                    } catch {
                        errorMessage = responseText || `HTTP error! status: ${response.status}`;
                    }
                    throw new Error(errorMessage);
                }

                const data: GoogleUserResponse = JSON.parse(responseText);
                console.log('Google auth successful, user data:', data.user);

                if (data.token) {
                    // Сохраняем токен и данные пользователя
                    setAuthToken(data.token);
                    setTokenExpiry();

                    if (data.user) {
                        localStorage.setItem('userData', JSON.stringify(data.user));
                        if (data.user.email) {
                            localStorage.setItem('userEmail', data.user.email);
                        }
                        if (data.user.roles && data.user.roles.length > 0) {
                            localStorage.setItem('userRole', data.user.roles[0]);
                        }
                    }

                    // Очищаем временные данные
                    localStorage.removeItem('googleAuthCode');
                    localStorage.removeItem('googleAuthState');
                    sessionStorage.removeItem('googleAuthCode');
                    sessionStorage.removeItem('googleAuthState');
                    localStorage.removeItem('pendingGoogleToken'); // Удаляем на всякий случай

                    handleSuccessfulAuth(data.token, data.user?.email);
                }
            } else {
                throw new Error('Данные авторизации не найдены');
            }

        } catch (err) {
            console.error('Google auth completion error:', err);
            setError(err instanceof Error ? err.message : 'Ошибка при завершении авторизации через Google');
            setIsLoading(false);
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

            const response = await fetch(`${API_BASE_URL}/api/authentication_token`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify(loginData)
            });

            console.log('Response status:', response.status);

            const responseText = await response.text();
            console.log('Raw response:', responseText);

            if (!response.ok) {
                let errorMessage = 'Ошибка авторизации';

                try {
                    const errorData = JSON.parse(responseText);
                    console.log('Parsed error data:', errorData);

                    errorMessage = errorData.message || errorData.detail || errorMessage;

                    if (errorData.code) {
                        errorMessage += ` (Код: ${errorData.code})`;
                    }
                } catch {
                    console.log('Cannot parse error response as JSON, using raw text');
                    errorMessage = responseText || `HTTP error! status: ${response.status}`;
                }

                if (response.status === 401) {
                    errorMessage += '. Проверьте email и пароль.';
                }

                throw new Error(errorMessage);
            }

            const data: LoginResponse = JSON.parse(responseText);
            console.log('Login successful, token received:', data);

            if (!data.token) {
                throw new Error('Токен не получен в ответе');
            }

            setAuthToken(data.token);
            setTokenExpiry();
            localStorage.setItem('userEmail', formData.email);

            // Получаем данные пользователя
            const userResponse = await fetch(`${API_BASE_URL}/api/users/me`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${data.token}`,
                    'Accept': 'application/json',
                },
            });

            if (userResponse.ok) {
                const userData = await userResponse.json();
                console.log('User data:', userData);
                localStorage.setItem('userData', JSON.stringify(userData));

                // Проверяем, нужен ли выбор роли для Google авторизации
                const isGoogleAuth = userData.oauthType?.googleId;
                const hasRole = userData.roles && userData.roles.length > 0;

                if (isGoogleAuth && !hasRole) {
                    // Показываем выбор роли
                    setCurrentState(AuthModalState.GOOGLE_ROLE_SELECT);
                    setIsLoading(false);
                    return;
                }

                if (userData.roles && userData.roles.length > 0) {
                    const roles = userData.roles;
                    console.log('User roles:', roles);

                    let userRole: 'client' | 'master' = 'client';

                    const isMaster = roles.some((role: string) =>
                        role.includes('MASTER') || role.includes('master'));
                    const isClient = roles.some((role: string) =>
                        role.includes('CLIENT') || role.includes('client'));

                    if (isMaster) {
                        userRole = 'master';
                    } else if (isClient) {
                        userRole = 'client';
                    }

                    localStorage.setItem('userRole', userRole === 'master' ? 'ROLE_MASTER' : 'ROLE_CLIENT');
                    console.log('User role determined:', userRole);
                }
            } else {
                console.warn('Failed to fetch user data, but login successful');
            }

            handleSuccessfulAuth(data.token, formData.email);

        } catch (err) {
            console.error('Login error:', err);
            setError(err instanceof Error ? err.message : 'Произошла ошибка при авторизации');
            setIsLoading(false);
        }
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        if (formData.password !== formData.confirmPassword) {
            setError('Пароли не совпадают');
            setIsLoading(false);
            return;
        }

        if (formData.password.length < 6) {
            setError('Пароль должен содержать не менее 6 символов');
            setIsLoading(false);
            return;
        }

        const email = formData.phoneOrEmail.includes('@') ? formData.phoneOrEmail : '';

        if (!email) {
            setError('Для регистрации требуется email. Телефон не поддерживается для входа.');
            setIsLoading(false);
            return;
        }

        const baseUserData: {
            email: string;
            name: string;
            surname: string;
            password: string;
            occupation?: string[];
        } = {
            email,
            name: formData.firstName,
            surname: formData.lastName,
            password: formData.password,
        };

        if (formData.role === 'master' && formData.specialty) {
            baseUserData.occupation = [`${API_BASE_URL}/api/occupations/${formData.specialty}`];
        }

        console.log('Step 1: Creating user with data:', baseUserData);

        try {
            const createResponse = await fetch(`${API_BASE_URL}/api/users`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify(baseUserData)
            });

            const createResponseText = await createResponse.text();
            console.log('Create user response status:', createResponse.status);
            console.log('Create user response:', createResponseText);

            if (!createResponse.ok) {
                let errorMessage = 'Ошибка регистрации';
                try {
                    const errorData = JSON.parse(createResponseText);
                    errorMessage = errorData.detail || errorData.message || errorMessage;
                    if (errorData.violations) {
                        errorMessage = errorData.violations.map((v: { message: string }) => v.message).join(', ');
                    }
                } catch {
                    errorMessage = `HTTP error! status: ${createResponse.status}`;
                }
                throw new Error(errorMessage);
            }

            const userData = JSON.parse(createResponseText);
            console.log('User created successfully:', userData);

            const userId = userData.id;
            console.log('Created user ID:', userId);

            await new Promise(resolve => setTimeout(resolve, 1000));

            console.log('Step 2: Getting initial token for role assignment');

            const initialLoginResponse = await fetch(`${API_BASE_URL}/api/authentication_token`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify({
                    email,
                    password: formData.password
                })
            });

            const initialLoginResponseText = await initialLoginResponse.text();
            console.log('Initial login response status:', initialLoginResponse.status);

            if (!initialLoginResponse.ok) {
                let loginError = 'Не удалось получить токен для назначения роли';
                try {
                    const errorData = JSON.parse(initialLoginResponseText);
                    loginError = errorData.message || errorData.detail || loginError;
                } catch {
                    loginError = `HTTP error! status: ${initialLoginResponse.status}`;
                }
                throw new Error(loginError);
            }

            const initialLoginData: LoginResponse = JSON.parse(initialLoginResponseText);
            console.log('Initial token received:', initialLoginData.token.substring(0, 20) + '...');

            console.log('Step 3: Assigning role via grant-role');

            const roleToAssign = formData.role;

            const grantRoleData = {
                role: roleToAssign
            };

            console.log('Grant role request data:', grantRoleData);

            const grantRoleResponse = await fetch(`${API_BASE_URL}/api/users/grant-role`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${initialLoginData.token}`
                },
                body: JSON.stringify(grantRoleData)
            });

            const grantRoleResponseText = await grantRoleResponse.text();
            console.log('Grant role response status:', grantRoleResponse.status);
            console.log('Grant role response:', grantRoleResponseText);

            if (!grantRoleResponse.ok) {
                let grantRoleError = 'Не удалось назначить роль';
                try {
                    const errorData = JSON.parse(grantRoleResponseText);
                    grantRoleError = errorData.message || errorData.detail || grantRoleError;
                } catch {
                    grantRoleError = `HTTP error! status: ${grantRoleResponse.status}`;
                }
                console.warn('Role assignment failed:', grantRoleError);
            } else {
                console.log('Role assigned successfully:', grantRoleResponseText);
            }

            await new Promise(resolve => setTimeout(resolve, 1000));

            console.log('Step 4: Getting new token after role assignment');

            const newLoginResponse = await fetch(`${API_BASE_URL}/api/authentication_token`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify({
                    email,
                    password: formData.password
                })
            });

            const newLoginResponseText = await newLoginResponse.text();
            console.log('New login response status:', newLoginResponse.status);

            let finalToken: string;

            if (!newLoginResponse.ok) {
                console.warn('Failed to get new token after role assignment, trying one more time...');

                await new Promise(resolve => setTimeout(resolve, 2000));

                const retryLoginResponse = await fetch(`${API_BASE_URL}/api/authentication_token`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                    },
                    body: JSON.stringify({
                        email,
                        password: formData.password
                    })
                });

                if (retryLoginResponse.ok) {
                    const retryLoginData: LoginResponse = await retryLoginResponse.json();
                    console.log('New token received on retry:', retryLoginData.token.substring(0, 20) + '...');
                    finalToken = retryLoginData.token;
                } else {
                    console.warn('Failed to get new token even on retry');
                    finalToken = initialLoginData.token;
                }
            } else {
                const newLoginData: LoginResponse = JSON.parse(newLoginResponseText);
                console.log('New token received:', newLoginData.token.substring(0, 20) + '...');
                finalToken = newLoginData.token;
            }

            setAuthToken(finalToken);
            setTokenExpiry();
            localStorage.setItem('userEmail', email);

            const roleForLocalStorage = formData.role === 'master' ? 'ROLE_MASTER' : 'ROLE_CLIENT';
            localStorage.setItem('userRole', roleForLocalStorage);
            console.log('User role saved to localStorage:', roleForLocalStorage);

            setRegisteredEmail(email);
            setCurrentState(AuthModalState.CONFIRM_EMAIL);

        } catch (err) {
            console.error('Registration error:', err);
            setError(err instanceof Error ? err.message : 'Произошла ошибка при регистрации');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSuccessfulAuth = async (token: string, email?: string) => {
        // Сначала сохраняем токен и данные
        setAuthToken(token);
        setTokenExpiry();

        if (email) {
            localStorage.setItem('userEmail', email);
        }

        // Получаем свежие данные пользователя
        try {
            const userResponse = await fetch(`${API_BASE_URL}/api/users/me`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json',
                },
            });

            if (userResponse.ok) {
                const userData = await userResponse.json();
                localStorage.setItem('userData', JSON.stringify(userData));

                // Проверяем, нужен ли выбор роли для Google авторизации
                const isGoogleAuth = !!userData.oauthType?.googleId;
                const hasRole = userData.roles && userData.roles.length > 0;

                console.log('User data after Google auth:', {
                    isGoogleAuth,
                    hasRole,
                    roles: userData.roles,
                    oauthType: userData.oauthType
                });

                // Если это Google авторизация И НЕТ ролей - показываем выбор роли
                if (isGoogleAuth && !hasRole) {
                    console.log('Google user needs role selection');
                    setCurrentState(AuthModalState.GOOGLE_ROLE_SELECT);

                    // Очищаем временные данные Google авторизации
                    localStorage.removeItem('googleAuthCode');
                    localStorage.removeItem('googleAuthState');
                    sessionStorage.removeItem('googleAuthCode');
                    sessionStorage.removeItem('googleAuthState');

                    // НЕ закрываем модалку - остаемся на экране выбора роли
                    if (onLoginSuccess) {
                        onLoginSuccess(token, email);
                    }
                    return;
                } else {
                    console.log('Google user already has role or not Google auth');
                    // Если роли уже есть или это не Google авторизация, закрываем модалку
                    resetForm();
                    if (onLoginSuccess) {
                        onLoginSuccess(token, email);
                    }
                    onClose();

                    // Уведомляем приложение об авторизации
                    window.dispatchEvent(new Event('login'));
                }
            }
        } catch (error) {
            console.error('Error fetching user data:', error);
            // В случае ошибки все равно закрываем модалку
            resetForm();
            if (onLoginSuccess) {
                onLoginSuccess(token, email);
            }
            onClose();
        }
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
            role: 'master',
            code: ''
        });
        setError('');
        setCurrentState(AuthModalState.WELCOME);

        // Очищаем временные данные Google авторизации
        localStorage.removeItem('googleAuthCode');
        localStorage.removeItem('googleAuthState');
        localStorage.removeItem('pendingGoogleToken');
        sessionStorage.removeItem('googleAuthCode');
        sessionStorage.removeItem('googleAuthState');
    };

    const handleClose = () => {
        onClose();
    };

    const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget) {
            handleClose();
        }
    };

    // Обработчики для остальных экранов
    const handleForgotPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            console.log('Forgot password for:', formData.email);
            setError('Восстановление пароля временно недоступно');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Произошла ошибка');
        } finally {
            setIsLoading(false);
        }
    };

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        if (formData.newPassword !== formData.confirmPassword) {
            setError('Пароли не совпадают');
            setIsLoading(false);
            return;
        }

        try {
            setError('Сброс пароля временно недоступен');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Произошла ошибка');
        } finally {
            setIsLoading(false);
        }
    };

    const renderWelcomeScreen = () => {
        return (
            <div className={styles.welcomeScreen}>
                <div className={styles.welcomeButtons}>
                    <img className={styles.enterPic} src="../Logo.svg" alt="enter" width="120"/>
                    <h2>Вход</h2>
                    <button
                        className={styles.primaryButton}
                        onClick={() => setCurrentState(AuthModalState.LOGIN)}
                        type="button"
                    >
                        Войти
                    </button>
                    <button
                        className={styles.secondaryButton}
                        onClick={() => setCurrentState(AuthModalState.REGISTER)}
                        type="button"
                    >
                        Зарегистрироваться
                    </button>
                </div>
            </div>
        );
    };

    const renderLoginScreen = () => {
        return (
            <form onSubmit={handleLogin} className={styles.form}>
                <h2>Вход</h2>

                {error && <div className={styles.error}>{error}</div>}
                <div className={styles.inputGroup}>
                    <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                        disabled={isLoading}
                        placeholder="Введите email"
                    />
                </div>
                <div className={styles.inputGroup}>
                    <input
                        type="password"
                        name="password"
                        value={formData.password}
                        onChange={handleInputChange}
                        required
                        disabled={isLoading}
                        placeholder="Введите пароль"
                    />
                </div>
                <button
                    type="submit"
                    className={styles.primaryButton}
                    disabled={isLoading}
                >
                    {isLoading ? 'Вход...' : 'Войти'}
                </button>

                <div className={styles.socialTitle}>Войти с помощью</div>

                <div className={styles.socialButtons}>
                    <a className={styles.facebookButton}>
                        <img src="../facebook.png" alt="Facebook" />
                    </a>
                    <button
                        type="button"
                        className={styles.googleButton}
                        onClick={handleGoogleAuth}
                        disabled={isLoading}
                    >
                        <img src="../google.png" alt="Google" />
                    </button>
                    <button
                        type="button"
                        className={styles.telegramButton}
                        onClick={handleTelegramAuthClick}
                        disabled={isLoading}
                    >
                        <img src="../telegram.png" alt="Telegram" />
                    </button>
                </div>

                {/* Контейнер для Telegram Widget */}
                <div id="telegram-widget-container" className={styles.telegramWidgetContainer}>
                    {/* Widget будет добавлен динамически */}
                </div>

                <div className={styles.links}>
                    <div className={styles.registerPrompt}>
                        <span className={styles.promptText}>Нет аккаунта? </span>
                        <button
                            type="button"
                            className={styles.linkButton}
                            onClick={() => setCurrentState(AuthModalState.REGISTER)}
                            disabled={isLoading}
                        >
                            Зарегистрируйтесь!
                        </button>
                    </div>
                    <button
                        type="button"
                        className={styles.linkButton}
                        onClick={() => setCurrentState(AuthModalState.FORGOT_PASSWORD)}
                        disabled={isLoading}
                    >
                        Не помню пароль
                    </button>
                </div>
            </form>
        );
    };

    const renderRegisterScreen = () => {
        return (
            <form onSubmit={handleRegister} className={styles.form}>
                <h2>Регистрация</h2>

                {error && <div className={styles.error}>{error}</div>}

                <div className={styles.roleSelector}>
                    <button
                        type="button"
                        className={formData.role === 'master' ? styles.roleButtonActive : styles.roleButton}
                        onClick={() => handleRoleChange('master')}
                    >
                        Я специалист
                    </button>
                    <button
                        type="button"
                        className={formData.role === 'client' ? styles.roleButtonActive : styles.roleButton}
                        onClick={() => handleRoleChange('client')}
                    >
                        Я ищу специалиста
                    </button>
                </div>

                <div className={styles.nameRow}>
                    <div className={styles.inputGroup}>
                        <input
                            type="text"
                            name="firstName"
                            value={formData.firstName}
                            onChange={handleInputChange}
                            required
                            disabled={isLoading}
                            placeholder="Введите имя"
                        />
                    </div>
                    <div className={styles.inputGroup}>
                        <input
                            type="text"
                            name="lastName"
                            value={formData.lastName}
                            onChange={handleInputChange}
                            required
                            disabled={isLoading}
                            placeholder="Введите фамилию"
                        />
                    </div>
                </div>

                {formData.role === 'master' && (
                    <div className={styles.inputGroup}>
                        <div className={styles.selectWrapper}>
                            <select
                                name="specialty"
                                value={formData.specialty}
                                onChange={handleInputChange}
                                required={formData.role === 'master'}
                                disabled={isLoading}
                            >
                                <option value="">Выберите специальность</option>
                                {categories.map(category => (
                                    <option key={category.id} value={category.id}>
                                        {category.title}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                )}

                <div className={styles.inputGroup}>
                    <input
                        type="email"
                        name="phoneOrEmail"
                        value={formData.phoneOrEmail}
                        onChange={handleInputChange}
                        required
                        disabled={isLoading}
                        placeholder="example@mail.com"
                    />
                </div>

                <div className={styles.inputGroup}>
                    <input
                        type="password"
                        name="password"
                        value={formData.password}
                        onChange={handleInputChange}
                        required
                        disabled={isLoading}
                        placeholder="Придумайте пароль (Минимум 6 символов)"
                    />
                </div>

                <div className={styles.inputGroup}>
                    <input
                        type="password"
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleInputChange}
                        required
                        disabled={isLoading}
                        placeholder="Повторите пароль"
                    />
                </div>

                <button
                    type="submit"
                    className={styles.primaryButton}
                    disabled={isLoading}
                >
                    {isLoading ? 'Регистрация...' : 'Зарегистрироваться'}
                </button>

                <div className={styles.socialTitle}>Или зарегистрироваться с помощью</div>

                <div className={styles.socialButtons}>
                    <a className={styles.facebookButton}>
                        <img src="../facebook.png" alt="Facebook" />
                    </a>
                    <button
                        type="button"
                        className={styles.googleButton}
                        onClick={handleGoogleAuth}
                        disabled={isLoading}
                    >
                        <img src="../google.png" alt="Google" />
                    </button>
                    <button
                        type="button"
                        className={styles.telegramButton}
                        onClick={handleTelegramAuthClick}
                        disabled={isLoading}
                    >
                        <img src="../telegram.png" alt="Telegram" />
                    </button>
                </div>

                {/* Контейнер для Telegram Widget в регистрации */}
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
                        Уже есть аккаунт? Войдите!
                    </button>
                </div>
            </form>
        );
    };

    const renderConfirmEmailScreen = () => {
        return (
            <div className={styles.form}>
                <h2>Подтверждение аккаунта</h2>

                <div className={styles.successMessage}>
                    <p>Регистрация успешна!</p>
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
                        Перейти ко входу
                    </button>
                </div>
            </div>
        );
    };

    const renderGoogleRoleSelectScreen = () => {
        return (
            <div className={styles.form}>
                <h2>Выберите тип аккаунта</h2>

                <div className={styles.successMessage}>
                    <p>Вы успешно авторизовались через Google!</p>
                    <p>Пожалуйста, выберите тип аккаунта:</p>
                </div>

                <div className={styles.roleSelector}>
                    <button
                        type="button"
                        className={styles.roleButton}
                        onClick={() => completeGoogleAuth('master')}
                        disabled={isLoading}
                    >
                        Я специалист
                    </button>
                    <button
                        type="button"
                        className={styles.roleButton}
                        onClick={() => completeGoogleAuth('client')}
                        disabled={isLoading}
                    >
                        Я ищу специалиста
                    </button>
                </div>

                {error && <div className={styles.error}>{error}</div>}

                {isLoading && (
                    <div className={styles.loadingMessage}>
                        Завершение авторизации...
                    </div>
                )}

                <div className={styles.links}>
                    <button
                        type="button"
                        className={styles.linkButton}
                        onClick={() => {
                            setCurrentState(AuthModalState.LOGIN);
                            // Очищаем данные Google авторизации при возврате
                            setGoogleAuthCode('');
                            setGoogleAuthState('');
                        }}
                        disabled={isLoading}
                    >
                        Вернуться ко входу
                    </button>
                </div>
            </div>
        );
    };

    const renderTelegramRoleSelectScreen = () => {
        return (
            <div className={styles.form}>
                <h2>Выберите тип аккаунта</h2>

                <div className={styles.successMessage}>
                    <p>Вы успешно авторизовались через Telegram!</p>
                    <p>Пожалуйста, выберите тип аккаунта:</p>
                </div>

                <div className={styles.roleSelector}>
                    <button
                        type="button"
                        className={styles.roleButton}
                        onClick={() => completeTelegramAuth('master')}
                        disabled={isLoading}
                    >
                        Я специалист
                    </button>
                    <button
                        type="button"
                        className={styles.roleButton}
                        onClick={() => completeTelegramAuth('client')}
                        disabled={isLoading}
                    >
                        Я ищу специалиста
                    </button>
                </div>

                {error && <div className={styles.error}>{error}</div>}

                <div className={styles.links}>
                    <button
                        type="button"
                        className={styles.linkButton}
                        onClick={() => setCurrentState(AuthModalState.LOGIN)}
                        disabled={isLoading}
                    >
                        Вернуться ко входу
                    </button>
                </div>
            </div>
        );
    };

    const renderForgotPasswordScreen = () => {
        return (
            <form onSubmit={handleForgotPassword} className={styles.form}>
                <h2>Восстановление пароля</h2>

                {error && <div className={styles.error}>{error}</div>}

                <div className={styles.inputGroup}>
                    <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                        disabled={isLoading}
                        placeholder="Почта"
                    />
                </div>
                <button
                    type="submit"
                    className={styles.primaryButton}
                    disabled={isLoading}
                >
                    {isLoading ? 'Отправка...' : 'Получить код'}
                </button>
            </form>
        );
    };

    const renderVerifyCodeScreen = () => {
        return (
            <form onSubmit={(e) => {
                e.preventDefault();
                // Логика для подтверждения кода
            }} className={styles.form}>
                <h2>Введите код подтверждения</h2>

                {error && <div className={styles.error}>{error}</div>}

                <div className={styles.inputGroup}>
                    <label>Код подтверждения</label>
                    <input
                        type="text"
                        name="code"
                        value={formData.code}
                        onChange={handleInputChange}
                        required
                        disabled={isLoading}
                        placeholder="Введите код из письма"
                    />
                </div>
                <button
                    type="submit"
                    className={styles.primaryButton}
                    disabled={isLoading}
                >
                    {isLoading ? 'Подтверждение...' : 'Подтвердить'}
                </button>
            </form>
        );
    };

    const renderNewPasswordScreen = () => {
        return (
            <form onSubmit={handleResetPassword} className={styles.form}>
                <h2>Придумайте новый пароль</h2>

                {error && <div className={styles.error}>{error}</div>}

                <div className={styles.inputGroup}>
                    <label>Новый пароль</label>
                    <input
                        type="password"
                        name="newPassword"
                        value={formData.newPassword}
                        onChange={handleInputChange}
                        required
                        disabled={isLoading}
                        placeholder="Введите новый пароль"
                    />
                </div>
                <div className={styles.inputGroup}>
                    <label>Повторите пароль</label>
                    <input
                        type="password"
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleInputChange}
                        required
                        disabled={isLoading}
                        placeholder="Повторите новый пароль"
                    />
                </div>
                <button
                    type="submit"
                    className={styles.primaryButton}
                    disabled={isLoading}
                >
                    {isLoading ? 'Сохранение...' : 'Подтвердить'}
                </button>
            </form>
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
            case AuthModalState.GOOGLE_ROLE_SELECT:
                return renderGoogleRoleSelectScreen();
            case AuthModalState.TELEGRAM_ROLE_SELECT:
                return renderTelegramRoleSelectScreen();
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

    if (!isOpen) {
        return null;
    }

    return (
        <div className={styles.modalOverlay} onClick={handleOverlayClick}>
            <div
                className={`${styles.modalContent} ${styles[`modal_${currentState}`]}`}
                onClick={(e) => e.stopPropagation()}
            >
                <button className={styles.closeButton} onClick={handleClose} type="button">
                    ×
                </button>
                {renderContent()}
            </div>
        </div>
    );
};

export default AuthModal;
export { AuthModalState };