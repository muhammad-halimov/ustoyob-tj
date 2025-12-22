import React, { useState, useEffect } from 'react';
import styles from './AuthModal.module.scss';
import {
    getUserRole,
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
    user: TelegramUserData;
    token: string;
}

interface TelegramUserData {
    id: number;
    email: string;
    name: string;
    surname: string;
    roles: string[];
    approved?: boolean;
    image?: string;
    occupation?: Array<{id: number; title: string; [key: string]: unknown}>;
    createdAt?: string;
    updatedAt?: string;
    [key: string]: unknown;
}

interface TelegramAuthCallbackData {
    id: number;
    first_name: string;
    last_name?: string;
    username?: string;
    photo_url?: string;
    auth_date: number;
    hash: string;
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
    const [showRoleSelectionBeforeGoogle, setShowRoleSelectionBeforeGoogle] = useState(false);
    const [pendingGoogleAuthRole, setPendingGoogleAuthRole] = useState<'master' | 'client'>('client');
    const [pendingGoogleAuthSpecialty, setPendingGoogleAuthSpecialty] = useState<string>('');
    const [googleCallbackData, setGoogleCallbackData] = useState<{code: string, state: string} | null>(null);

    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

    // Обработка OAuth callback при открытии модалки
    useEffect(() => {
        if (!isOpen) return;

        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const state = urlParams.get('state');
        const oauthError = urlParams.get('error');
        const scope = urlParams.get('scope'); // Google может вернуть scope

        // Очищаем URL от параметров OAuth
        if (code || state || oauthError || scope) {
            window.history.replaceState({}, '', window.location.pathname);
        }

        if (oauthError) {
            console.error('OAuth error from URL:', oauthError);
            setError(`Ошибка авторизации: ${decodeURIComponent(oauthError)}`);
            return;
        }

        // Если есть код авторизации Google
        if (code && state) {
            console.log('Google callback received:', { code, state, scope });

            // Сохраняем данные в правильном формате
            setGoogleCallbackData({
                code,
                state
            });

            // Показываем выбор роли (на всякий случай, если state не удалось декодировать)
            setShowRoleSelectionBeforeGoogle(true);
            setCurrentState(AuthModalState.LOGIN);
        }
    }, [isOpen]);

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
                    const authData: TelegramAuthCallbackData = data.auth;
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
    }, [API_BASE_URL]);

    // Новая функция для начала Google авторизации с выбором роли
    const handleGoogleAuthWithRole = () => {
        try {
            // Сохраняем выбранную роль и специальность
            sessionStorage.setItem('pendingGoogleRole', pendingGoogleAuthRole);
            if (pendingGoogleAuthRole === 'master' && pendingGoogleAuthSpecialty) {
                sessionStorage.setItem('pendingGoogleSpecialty', pendingGoogleAuthSpecialty);
            }

            console.log('Saved role to sessionStorage:', pendingGoogleAuthRole);

            // Получаем URL для Google OAuth
            fetch(`${API_BASE_URL}/api/auth/google/url?state=${encodeURIComponent(pendingGoogleAuthRole)}`, {
                method: 'GET',
                headers: { 'Accept': 'application/json' },
            })
                .then(response => {
                    if (!response.ok) {
                        throw new Error('Не удалось получить URL для авторизации через Google');
                    }
                    return response.json();
                })
                .then((data: GoogleAuthUrlResponse) => {
                    console.log('Redirecting to Google OAuth with role:', pendingGoogleAuthRole);
                    console.log('Redirect URL:', data.url);

                    // Закрываем модалку и перенаправляем на Google
                    onClose();
                    window.location.href = data.url;
                })
                .catch(err => {
                    console.error('Google auth error:', err);
                    setError(err instanceof Error ? err.message : 'Ошибка при авторизации через Google');

                    // Очищаем сохраненные данные при ошибке
                    sessionStorage.removeItem('pendingGoogleRole');
                    sessionStorage.removeItem('pendingGoogleSpecialty');
                });

        } catch (err) {
            console.error('Google auth error:', err);
            setError(err instanceof Error ? err.message : 'Ошибка при авторизации через Google');

            // Очищаем сохраненные данные при ошибке
            sessionStorage.removeItem('pendingGoogleRole');
            sessionStorage.removeItem('pendingGoogleSpecialty');
        }
    };

    // Функция для завершения Google авторизации с выбранной ролью
    const completeGoogleAuthWithRole = async (selectedRole: 'master' | 'client') => {
        try {
            setIsLoading(true);
            setError('');

            if (!googleCallbackData?.code || !googleCallbackData?.state) {
                throw new Error('Нет данных Google OAuth');
            }

            console.log('=== DEBUG Google OAuth ===');
            console.log('1. Callback data:', googleCallbackData);
            console.log('2. Selected role:', selectedRole);
            console.log('3. Specialty:', pendingGoogleAuthSpecialty);

            // Пробуем разные форматы ролей
            const roleFormats = {
                format1: selectedRole === 'master' ? 'ROLE_MASTER' : 'ROLE_CLIENT',
                format2: selectedRole, // "master" или "client"
                format3: selectedRole.toUpperCase(), // "MASTER" или "CLIENT"
                format4: `role_${selectedRole}` // "role_master" или "role_client"
            };

            console.log('4. Role formats to try:', roleFormats);

            // Подготавливаем данные для отправки - сначала пробуем format1
            const requestData: {
                code: string;
                state: string;
                role: string;
                occupation?: string;
            } = {
                code: googleCallbackData.code,
                state: googleCallbackData.state,
                role: selectedRole
            };

            if (selectedRole === 'master' && pendingGoogleAuthSpecialty) {
                requestData.occupation = `${API_BASE_URL}/api/occupations/${pendingGoogleAuthSpecialty}`;
            }

            console.log('5. Sending request:', requestData);

            // Отправляем запрос
            const response = await fetch(`${API_BASE_URL}/api/auth/google/callback`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify(requestData)
            });

            console.log('6. Response status:', response.status);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('7. Server error:', errorText);

                // Если 422 ошибка, возможно неверный формат роли
                if (response.status === 422) {
                    try {
                        const errorData = JSON.parse(errorText);
                        console.error('8. Validation errors:', errorData.violations);
                    } catch (e) {}
                }

                throw new Error(`Ошибка авторизации Google: ${response.status} ${errorText}`);
            }

            const data: GoogleUserResponse = await response.json();
            console.log('9. Success! Server response:', data);
            console.log('10. User roles:', data.user?.roles);
            console.log('=== END DEBUG ===');

            // Проверяем, какая роль пришла от сервера
            if (data.user?.roles) {
                console.log('Actual roles assigned by server:', data.user.roles);
                if (!data.user.roles.includes('ROLE_MASTER') &&
                    !data.user.roles.includes('ROLE_CLIENT')) {
                    console.warn('WARNING: Server assigned only basic ROLE_USER');
                }
            }

            // Сохраняем данные пользователя
            saveUserData(data);
            handleSuccessfulAuth(data.token, data.user.email);

            // Очищаем временные данные
            setGoogleCallbackData(null);

        } catch (err) {
            console.error('Google auth completion error:', err);
            setError(err instanceof Error ? err.message : 'Ошибка завершения авторизации Google');
        } finally {
            setIsLoading(false);
        }
    };

    // Обновленная функция для Google авторизации
    const handleGoogleAuth = () => {
        // Показываем экран выбора роли перед авторизацией
        setShowRoleSelectionBeforeGoogle(true);
        setCurrentState(AuthModalState.LOGIN);
    };

    // Экран выбора роли для Google авторизации
    const renderGoogleRoleSelectionScreen = () => {
        const hasCallbackData = googleCallbackData?.code && googleCallbackData?.state;

        return (
            <div className={styles.form}>
                <h2>Выберите тип аккаунта</h2>

                <div className={styles.successMessage}>
                    {hasCallbackData ? (
                        <>
                            <p>Вы успешно авторизовались через Google!</p>
                            <p>Пожалуйста, выберите тип аккаунта для завершения регистрации:</p>
                        </>
                    ) : (
                        <p>Пожалуйста, выберите тип аккаунта для авторизации через Google:</p>
                    )}
                </div>

                <div className={styles.roleSelector}>
                    <button
                        type="button"
                        className={pendingGoogleAuthRole === 'master' ? styles.roleButtonActive : styles.roleButton}
                        onClick={() => setPendingGoogleAuthRole('master')}
                        disabled={isLoading}
                    >
                        Я специалист
                    </button>
                    <button
                        type="button"
                        className={pendingGoogleAuthRole === 'client' ? styles.roleButtonActive : styles.roleButton}
                        onClick={() => setPendingGoogleAuthRole('client')}
                        disabled={isLoading}
                    >
                        Я ищу специалиста
                    </button>
                </div>

                {pendingGoogleAuthRole === 'master' && (
                    <div className={styles.inputGroup}>
                        <div className={styles.selectWrapper}>
                            <select
                                value={pendingGoogleAuthSpecialty}
                                onChange={(e) => setPendingGoogleAuthSpecialty(e.target.value)}
                                disabled={isLoading}
                            >
                                <option value="">Выберите специальность (опционально)</option>
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
                    <button
                        type="button"
                        className={styles.primaryButton}
                        onClick={() => {
                            if (hasCallbackData) {
                                // Если уже есть code и state (из callback), завершаем авторизацию
                                completeGoogleAuthWithRole(pendingGoogleAuthRole);
                            } else {
                                // Если нет, начинаем процесс OAuth
                                handleGoogleAuthWithRole();
                            }
                        }}
                        disabled={isLoading}
                    >
                        {isLoading ? 'Обработка...' :
                            hasCallbackData ? 'Завершить регистрацию' : 'Продолжить с Google'}
                    </button>
                </div>

                {error && <div className={styles.error}>{error}</div>}

                <div className={styles.links}>
                    <button
                        type="button"
                        className={styles.linkButton}
                        onClick={() => {
                            setShowRoleSelectionBeforeGoogle(false);
                            setGoogleCallbackData(null);
                            setCurrentState(AuthModalState.LOGIN);
                            // Очищаем временные данные
                            sessionStorage.removeItem('googleAuthCode');
                            sessionStorage.removeItem('googleAuthState');
                            sessionStorage.removeItem('pendingGoogleRole');
                            sessionStorage.removeItem('pendingGoogleSpecialty');
                        }}
                        disabled={isLoading}
                    >
                        Вернуться ко входу
                    </button>
                </div>
            </div>
        );
    };

    // Функция для сохранения данных пользователя
    const saveUserData = (data: GoogleUserResponse | TelegramAuthResponse) => {
        console.log('Saving user data:', data);

        if (data.token) {
            setAuthToken(data.token);
            setTokenExpiry();
        }

        if (data.user) {
            setUserData(data.user);

            if (data.user.email) {
                setUserEmail(data.user.email);
            }

            // УПРОЩЕННАЯ ЛОГИКА: Всегда используем роль из сессии
            // Если сервер вернул только ROLE_USER, мы используем роль из pendingGoogleAuthRole
            const pendingRole = sessionStorage.getItem('pendingGoogleRole') as 'master' | 'client' | null;

            if (pendingRole) {
                console.log('Using pending role from session:', pendingRole);
                setUserRole(pendingRole);
                sessionStorage.removeItem('pendingGoogleRole');
            } else if (data.user.roles && data.user.roles.length > 0) {
                // Пытаемся определить роль из ответа сервера
                const roles = data.user.roles.map(r => r.toLowerCase());

                if (roles.includes('role_master') || roles.includes('master')) {
                    setUserRole('master');
                } else if (roles.includes('role_client') || roles.includes('client')) {
                    setUserRole('client');
                } else {
                    // По умолчанию - client
                    console.warn('No specific role found, defaulting to client');
                    setUserRole('client');
                }
            } else {
                // Если ролей нет вообще
                setUserRole('client');
            }

            console.log('Final user role set to:', getUserRole());
        }
    };

    const handleTelegramCallback = async (authData: TelegramAuthCallbackData) => {
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

            const telegramUserData: TelegramUserData = JSON.parse(telegramUserDataStr);
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

            // УПРОЩЕННАЯ ЛОГИКА: Сохраняем только токен
            // Не пытаемся получить данные пользователя, если эндпоинт возвращает 403
            setAuthToken(data.token);
            setTokenExpiry();
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

            setAuthToken(loginData.token);
            setTokenExpiry();
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
        setShowRoleSelectionBeforeGoogle(false);
        setPendingGoogleAuthRole('client');
        setPendingGoogleAuthSpecialty('');
        setGoogleCallbackData(null);

        // Очищаем все временные данные
        localStorage.removeItem('tempGoogleToken');
        localStorage.removeItem('tempGoogleUserData');
        sessionStorage.removeItem('googleUserData');
        sessionStorage.removeItem('googleAuthToken');
        sessionStorage.removeItem('googleAuthCode');
        sessionStorage.removeItem('googleAuthState');
        sessionStorage.removeItem('googleOAuthState');
        sessionStorage.removeItem('pendingGoogleRole');
        sessionStorage.removeItem('pendingGoogleSpecialty');
    };

    const handleClose = () => {
        onClose();
    };

    const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget) {
            handleClose();
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
        // Если нужно показать выбор роли для Google, показываем этот экран
        if (showRoleSelectionBeforeGoogle || googleCallbackData?.code) {
            return renderGoogleRoleSelectionScreen();
        }

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
        // Если нужно показать выбор роли для Google, показываем этот экран
        if (showRoleSelectionBeforeGoogle || googleCallbackData?.code) {
            return renderGoogleRoleSelectionScreen();
        }

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
            case AuthModalState.TELEGRAM_ROLE_SELECT:
                return renderTelegramRoleSelectScreen();
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