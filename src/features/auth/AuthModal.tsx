import React, { useState, useEffect } from 'react';
import styles from './AuthModal.module.scss';
import {
    setAuthToken,
    setAuthTokenExpiry,
    setUserData,
    setUserEmail,
    setUserRole
} from '../../utils/auth';

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
        oauthType?: {
            googleId: string;
            [key: string]: unknown;
        };
        [key: string]: unknown;
    };
    token: string;
    message: string;
}

interface TelegramAuthResponse {
    user: any;
    token: string;
}

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

    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;



    // Эффект для загрузки категорий и настройки Telegram
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

        return () => {
            window.removeEventListener('message', handleTelegramAuth);
        };
    }, [API_BASE_URL]); // Исправлено: добавлена зависимость

    // Отдельный эффект для проверки сохраненного токена
    useEffect(() => {
        const token = localStorage.getItem('token');
        const userStr = localStorage.getItem('user');

        if (token && userStr) {
            const user = JSON.parse(userStr);
            setUserData(user);
            setAuthToken(token);

            if (user.roles && user.roles.length > 0) {
                handleSuccessfulAuth(token, user.email);
            } else {
                setCurrentState(AuthModalState.GOOGLE_ROLE_SELECT);
            }
        }
    }, []); // Этот эффект должен быть отдельным



    // Отдельный эффект для обработки Google OAuth callback из URL
    useEffect(() => {
        const handleGoogleCallback = async () => {
            const urlParams = new URLSearchParams(window.location.search);
            const code = urlParams.get('code');
            const state = urlParams.get('state');
            const errorParam = urlParams.get('error');

            console.log('Checking Google OAuth callback:', { code, state, error: errorParam });

            if (errorParam) {
                setError(`Ошибка авторизации Google: ${decodeURIComponent(errorParam)}`);
                window.history.replaceState({}, document.title, window.location.pathname);
                return;
            }

            if (code && state) {
                setIsLoading(true);
                setError('');

                try {
                    console.log('Processing Google OAuth callback with fresh code/state...');

                    // ВАЖНО: Не сохраняем код/state в localStorage
                    // Сразу отправляем запрос с этими свежими данными

                    // 1. Пробуем получить пользователя без роли
                    const response = await fetch(`${API_BASE_URL}/api/auth/google/callback`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Accept': 'application/json',
                        },
                        body: JSON.stringify({
                            code,
                            state
                            // Не отправляем роль - сервер вернет существующего пользователя
                        })
                    });

                    const responseText = await response.text();
                    console.log('Google callback response status:', response.status);

                    if (!response.ok) {
                        let errorMessage = 'Ошибка авторизации через Google';
                        try {
                            const errorData = JSON.parse(responseText);
                            errorMessage = errorData.detail || errorData.message || errorMessage;
                        } catch {
                            errorMessage = responseText || `HTTP error! status: ${response.status}`;
                        }

                        // Если ошибка "Invalid state" или "code already used"
                        if (errorMessage.includes('state') || errorMessage.includes('code already used') || errorMessage.includes('invalid')) {
                            console.log('Google auth code invalid or already used');
                            // Просто очищаем URL и показываем ошибку
                            setError('Сессия истекла. Пожалуйста, войдите снова через Google.');
                            window.history.replaceState({}, document.title, window.location.pathname);
                            setIsLoading(false);
                            return;
                        }

                        throw new Error(errorMessage);
                    }

                    const data: GoogleUserResponse = JSON.parse(responseText);
                    console.log('Google auth successful, user data:', data.user);

                    // Проверяем наличие роли у пользователя
                    const hasRole = data.user.roles && data.user.roles.length > 0;
                    const isGoogleAuth = data.user.oauthType?.googleId;

                    if (hasRole) {
                        // У пользователя уже есть роль - сохраняем данные и авторизуем
                        console.log('User already has role, auto-login:', data.user.roles);
                        saveUserData(data);
                        handleSuccessfulAuth(data.token, data.user?.email);

                        // Очищаем URL
                        window.history.replaceState({}, document.title, window.location.pathname);
                    } else if (isGoogleAuth) {
                        // Это Google пользователь без роли - показываем выбор роли
                        console.log('Google user needs role selection (new user)');

                        // Сохраняем данные Google авторизации для последующего использования
                        localStorage.setItem('googleAuthCode', code);
                        localStorage.setItem('googleAuthState', state);
                        localStorage.setItem('googleUserData', JSON.stringify(data.user));

                        // Переходим на экран выбора роли
                        setCurrentState(AuthModalState.GOOGLE_ROLE_SELECT);

                        // Очищаем URL
                        window.history.replaceState({}, document.title, window.location.pathname);
                    } else {
                        // Обычный пользователь
                        console.log('Regular user without Google OAuth');
                        saveUserData(data);
                        handleSuccessfulAuth(data.token, data.user?.email);

                        // Очищаем URL
                        window.history.replaceState({}, document.title, window.location.pathname);
                    }

                } catch (err) {
                    console.error('Google auth error:', err);
                    setError(err instanceof Error ? err.message : 'Ошибка при авторизации через Google');
                    // Очищаем URL в случае ошибки
                    window.history.replaceState({}, document.title, window.location.pathname);
                } finally {
                    setIsLoading(false);
                }
            }
        };

        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const state = urlParams.get('state');

        if (code && state) {
            console.log('Found Google OAuth params in URL, processing immediately...');
            handleGoogleCallback();

            // Если модалка не открыта, нужно её открыть для отображения процесса
            if (!isOpen) {
                // Здесь можно вызвать callback для открытия модалки
                console.log('Modal should be opened for auth process');
            }
        }
    }, [isOpen, API_BASE_URL]); // Этот эффект также должен быть отдельным

    // Функция для сохранения данных пользователя
    const saveUserData = (data: GoogleUserResponse | TelegramAuthResponse) => {
        if (data.token) {
            setAuthToken(data.token);
            setTokenExpiry();
        }

        if (data.user) {
            setUserData(data.user);

            if (data.user.email) {
                setUserEmail(data.user.email);
            }

            if (data.user.roles && data.user.roles.length > 0) {
                const role = data.user.roles[0];
                // Преобразуем роль в формат 'client' или 'master'
                if (role.includes('MASTER') || role.includes('master')) {
                    setUserRole('master');
                } else if (role.includes('CLIENT') || role.includes('client')) {
                    setUserRole('client');
                }
            }
        }

        // Всегда очищаем временные данные Google OAuth
        localStorage.removeItem('googleAuthCode');
        localStorage.removeItem('googleAuthState');
        localStorage.removeItem('googleUserData');
        sessionStorage.removeItem('googleAuthCode');
        sessionStorage.removeItem('googleAuthState');
    };

    const handleTelegramCallback = async (authData: any) => {
        try {
            setIsLoading(true);
            setError('');

            console.log('Processing Telegram auth data:', authData);

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

            const data: TelegramAuthResponse = await response.json();
            console.log('Telegram auth successful, data:', data);

            if (data.token) {
                saveUserData(data);
                handleSuccessfulAuth(data.token, data.user?.email);
            } else {
                if (data.user) {
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

            const data: TelegramAuthResponse = await response.json();
            console.log('Telegram auth completed, data:', data);

            if (data.token) {
                saveUserData(data);
                handleSuccessfulAuth(data.token, data.user?.email);
                localStorage.removeItem('telegramUserData');
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
        expiryTime.setHours(expiryTime.getHours() + 1);
        setAuthTokenExpiry(expiryTime.toISOString());
    };

    const handleGoogleAuth = async () => {
        try {
            setIsLoading(true);
            setError('');

            console.log('Initiating Google OAuth...');

            // Очищаем все старые данные перед началом нового процесса
            localStorage.removeItem('googleAuthCode');
            localStorage.removeItem('googleAuthState');
            sessionStorage.removeItem('googleAuthCode');
            sessionStorage.removeItem('googleAuthState');
            localStorage.removeItem('googleAuthCode');
            localStorage.removeItem('googleAuthState');
            localStorage.removeItem('googleRole');

            // Получаем URL для Google OAuth
            const response = await fetch(`${API_BASE_URL}/api/auth/google/url`, {
                method: 'GET',
                headers: { 'Accept': 'application/json' },
            });

            if (!response.ok) {
                throw new Error('Не удалось получить URL для авторизации через Google');
            }

            const data: GoogleAuthUrlResponse = await response.json();
            console.log('Google auth URL received:', data.url);

            // Закрываем модалку и перенаправляем на Google
            onClose();
            window.location.href = data.url;

        } catch (err) {
            console.error('Google auth error:', err);
            setError(err instanceof Error ? err.message : 'Ошибка при авторизации через Google');
            setIsLoading(false);
        }
    };

    const completeGoogleAuth = async (selectedRole: 'master' | 'client') => {
        try {
            setIsLoading(true);
            setError('');

            const code = localStorage.getItem('googleAuthCode');
            const state = localStorage.getItem('googleAuthState');

            if (!code || !state) throw new Error('Нет данных Google OAuth');

            const res = await fetch(`${API_BASE_URL}/api/auth/google/callback`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify({ code, state, role: selectedRole })
            });

            if (!res.ok) {
                const errorText = await res.text();
                throw new Error(`Ошибка назначения роли: ${errorText}`);
            }

            const data: GoogleUserResponse = await res.json();

            // Сохраняем данные пользователя
            saveUserData(data);
            handleSuccessfulAuth(data.token, data.user.email);

            // Чистим временные данные
            localStorage.removeItem('googleAuthCode');
            localStorage.removeItem('googleAuthState');
            localStorage.removeItem('googleUserData');

        } catch (err) {
            console.error(err);
            setError(err instanceof Error ? err.message : 'Ошибка авторизации Google');
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

            const responseText = await response.text();
            console.log('Login response:', response.status, responseText);

            if (!response.ok) {
                let errorMessage = 'Ошибка авторизации';

                try {
                    const errorData = JSON.parse(responseText);
                    errorMessage = errorData.message || errorData.detail || errorMessage;
                } catch {
                    errorMessage = responseText || `HTTP error! status: ${response.status}`;
                }

                if (response.status === 401) {
                    errorMessage += '. Проверьте email и пароль.';
                }

                throw new Error(errorMessage);
            }

            const data: LoginResponse = JSON.parse(responseText);

            if (!data.token) {
                throw new Error('Токен не получен в ответе');
            }

            const userResponse = await fetch(`${API_BASE_URL}/api/users/me`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${data.token}`,
                    'Accept': 'application/json',
                },
            });

            if (userResponse.ok) {
                const userData = await userResponse.json();
                saveUserData({ token: data.token, user: userData } as any);
            }

            handleSuccessfulAuth(data.token, formData.email);

        } catch (err) {
            console.error('Login error:', err);
            setError(err instanceof Error ? err.message : 'Произошла ошибка при авторизации');
        } finally {
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

            const loginResponse = await fetch(`${API_BASE_URL}/api/authentication_token`, {
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

            if (!loginResponse.ok) {
                throw new Error('Не удалось авторизоваться после регистрации');
            }

            const loginData: LoginResponse = await loginResponse.json();

            const userResponse = await fetch(`${API_BASE_URL}/api/users/me`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${loginData.token}`,
                    'Accept': 'application/json',
                },
            });

            if (userResponse.ok) {
                const userData = await userResponse.json();
                saveUserData({ token: loginData.token, user: userData } as any);
            }

            setRegisteredEmail(email);
            setCurrentState(AuthModalState.CONFIRM_EMAIL);

        } catch (err) {
            console.error('Registration error:', err);
            setError(err instanceof Error ? err.message : 'Произошла ошибка при регистрации');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSuccessfulAuth = (token: string, email?: string) => {
        setAuthToken(token);
        setTokenExpiry();

        if (email) {
            setUserEmail(email);
        }

        resetForm();
        if (onLoginSuccess) {
            onLoginSuccess(token, email);
        }
        onClose();
        window.dispatchEvent(new Event('login'));
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

        // Очищаем все временные данные
        localStorage.removeItem('googleAuthCode');
        localStorage.removeItem('googleAuthState');
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

    // Остальные функции без изменений...

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

    // Убираем экран выбора роли для Google, т.к. теперь это автоматически
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
                        Назначение роли...
                    </div>
                )}

                <div className={styles.links}>
                    <button
                        type="button"
                        className={styles.linkButton}
                        onClick={() => {
                            setCurrentState(AuthModalState.LOGIN);
                            // Очищаем временные данные
                            localStorage.removeItem('googleAuthCode');
                            localStorage.removeItem('googleAuthState');
                            localStorage.removeItem('googleUserData');
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

    // Остальные функции рендеринга...

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
                // return renderForgotPasswordScreen();
            case AuthModalState.VERIFY_CODE:
                // return renderVerifyCodeScreen();
            case AuthModalState.NEW_PASSWORD:
                // return renderNewPasswordScreen();
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