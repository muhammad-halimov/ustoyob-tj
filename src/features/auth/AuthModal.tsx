import React, { useState, useEffect } from 'react';
import styles from './AuthModal.module.scss';
import {
    getUserRole,
    setAuthToken,
    setAuthTokenExpiry,
    setUserData,
    setUserEmail,
    setUserRole,
    setUserOccupation,
} from '../../utils/auth';

const AuthModalState = {
    WELCOME: 'welcome',
    LOGIN: 'login',
    REGISTER: 'register',
    FORGOT_PASSWORD: 'forgot_password',
    VERIFY_CODE: 'verify_code',
    NEW_PASSWORD: 'new_password',
    CONFIRM_EMAIL: 'confirm_email',
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

interface OAuthUrlResponse {
    url: string;
}

interface OAuthUserResponse {
    user: {
        id: number;
        email: string;
        name: string;
        surname: string;
        roles: string[];
        occupation?: Array<{id: number; title: string; [key: string]: unknown}>;
        oauthType?: {
            googleId?: string;
            instagramId?: string;
            facebookId?: string;
            telegramId?: string;
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

// Типы для OAuth провайдеров
type OAuthProvider = 'google' | 'instagram' | 'facebook' | 'telegram';
interface OAuthCallbackData {
    code: string;
    state: string;
    provider: OAuthProvider;
}

// Регулярное выражение для проверки пароля
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*]).+$/;

// Функция для проверки сложности пароля
const validatePassword = (password: string): { isValid: boolean; message: string } => {
    if (password.length < 8) {
        return {
            isValid: false,
            message: 'Пароль должен содержать минимум 8 символов'
        };
    }

    if (!PASSWORD_REGEX.test(password)) {
        return {
            isValid: false,
            message: 'Пароль должен содержать: минимум 1 заглавную букву, 1 строчную букву, 1 цифру и 1 специальный символ (!@#$%^&*)'
        };
    }

    return {
        isValid: true,
        message: ''
    };
};

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
    const [oauthCallbackData, setOAuthCallbackData] = useState<OAuthCallbackData | null>(null);
    const [isCheckingProfile, setIsCheckingProfile] = useState(false);
    const [activeOAuthProvider, setActiveOAuthProvider] = useState<OAuthProvider | null>(null);
    const [passwordValidation, setPasswordValidation] = useState<{ isValid: boolean; message: string }>({
        isValid: false,
        message: ''
    });
    const [showPasswordRequirements, setShowPasswordRequirements] = useState(false);

    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

    // Эффект для валидации пароля при изменении
    useEffect(() => {
        if (formData.password) {
            const validation = validatePassword(formData.password);
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
    }, [formData.password]);

    // Обработка OAuth callback при открытии модалки
    useEffect(() => {
        if (!isOpen) return;

        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const state = urlParams.get('state');
        const oauthError = urlParams.get('error');
        const provider = urlParams.get('provider') as OAuthProvider;

        // Очищаем URL от параметров OAuth
        if (code || state || oauthError || provider) {
            window.history.replaceState({}, '', window.location.pathname);
        }

        if (oauthError) {
            console.error('OAuth error from URL:', oauthError);
            setError(`Ошибка авторизации: ${decodeURIComponent(oauthError)}`);
            return;
        }

        // Если есть код авторизации
        if (code && state && provider) {
            console.log(`${provider.toUpperCase()} callback received:`, { code, state });
            handleOAuthCallback(code, state, provider);
        }
    }, [isOpen]);

    // Функция обработки OAuth callback
    const handleOAuthCallback = async (code: string, state: string, provider: OAuthProvider) => {
        try {
            setIsCheckingProfile(true);

            // Сохраняем callback данные
            setOAuthCallbackData({ code, state, provider });
            setActiveOAuthProvider(provider);

            // Показываем экран логина с выбором роли (если нужно)
            setCurrentState(AuthModalState.LOGIN);

        } catch (err) {
            console.error('Error checking profile:', err);
            setError('Ошибка проверки профиля');
        } finally {
            setIsCheckingProfile(false);
        }
    };

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
                    handleTelegramWidgetCallback(authData);
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

    // Общая функция для начала OAuth авторизации
    const handleOAuthStart = (provider: OAuthProvider) => {
        try {
            // Сохраняем выбранную роль и специальность
            sessionStorage.setItem(`pending${provider.charAt(0).toUpperCase() + provider.slice(1)}Role`, formData.role);
            if (formData.role === 'master' && formData.specialty) {
                sessionStorage.setItem(`pending${provider.charAt(0).toUpperCase() + provider.slice(1)}Specialty`, formData.specialty);
            }

            console.log(`Saved role to sessionStorage for ${provider}:`, formData.role);

            // Генерируем случайный state для CSRF
            const csrfState = Math.random().toString(36).substring(2);
            sessionStorage.setItem(`${provider}CsrfState`, csrfState);

            // Получаем URL для OAuth
            fetch(`${API_BASE_URL}/api/auth/${provider}/url?state=${encodeURIComponent(csrfState)}`, {
                method: 'GET',
                headers: { 'Accept': 'application/json' },
            })
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`Не удалось получить URL для авторизации через ${provider.charAt(0).toUpperCase() + provider.slice(1)}`);
                    }
                    return response.json();
                })
                .then((data: OAuthUrlResponse) => {
                    console.log(`Redirecting to ${provider.toUpperCase()} OAuth with role:`, formData.role);

                    // Закрываем модалку и перенаправляем на OAuth
                    onClose();
                    window.location.href = data.url;
                })
                .catch(err => {
                    console.error(`${provider.toUpperCase()} auth error:`, err);
                    setError(err instanceof Error ? err.message : `Ошибка при авторизации через ${provider.charAt(0).toUpperCase() + provider.slice(1)}`);

                    // Очищаем сохраненные данные при ошибке
                    sessionStorage.removeItem(`pending${provider.charAt(0).toUpperCase() + provider.slice(1)}Role`);
                    sessionStorage.removeItem(`pending${provider.charAt(0).toUpperCase() + provider.slice(1)}Specialty`);
                    sessionStorage.removeItem(`${provider}CsrfState`);
                });

        } catch (err) {
            console.error(`${provider.toUpperCase()} auth error:`, err);
            setError(err instanceof Error ? err.message : `Ошибка при авторизации через ${provider.charAt(0).toUpperCase() + provider.slice(1)}`);

            // Очищаем сохраненные данные при ошибке
            sessionStorage.removeItem(`pending${provider.charAt(0).toUpperCase() + provider.slice(1)}Role`);
            sessionStorage.removeItem(`pending${provider.charAt(0).toUpperCase() + provider.slice(1)}Specialty`);
            sessionStorage.removeItem(`${provider}CsrfState`);
        }
    };

    // Функция для завершения OAuth авторизации
    const completeOAuth = async () => {
        if (!oauthCallbackData?.code || !oauthCallbackData?.state || !oauthCallbackData?.provider) {
            setError('Нет данных OAuth');
            return;
        }

        try {
            setIsLoading(true);
            setError('');

            const { code, state, provider } = oauthCallbackData;

            console.log(`Completing ${provider.toUpperCase()} auth with role:`, formData.role);

            // Подготавливаем запрос
            const requestData: {
                code: string;
                state: string;
                role: string;
                occupation?: string;
            } = {
                code,
                state,
                role: formData.role // "master" или "client"
            };

            // Если выбрана роль мастера и есть специальность
            if (formData.role === 'master' && formData.specialty) {
                requestData.occupation = `${API_BASE_URL}/api/occupations/${formData.specialty}`;
            }

            console.log(`Sending ${provider.toUpperCase()} callback request:`, requestData);

            // Отправляем запрос
            const response = await fetch(`${API_BASE_URL}/api/auth/${provider}/callback`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify(requestData)
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Server error response:', errorText);
                throw new Error(`Ошибка авторизации ${provider.charAt(0).toUpperCase() + provider.slice(1)}: ${errorText}`);
            }

            const data: OAuthUserResponse = await response.json();
            console.log(`${provider.toUpperCase()} auth completed successfully:`, data);

            // Сохраняем данные пользователя
            saveUserData(data);
            handleSuccessfulAuth(data.token, data.user.email);

            // Очищаем временные данные
            setOAuthCallbackData(null);
            setActiveOAuthProvider(null);

        } catch (err) {
            console.error('OAuth completion error:', err);
            setError(err instanceof Error ? err.message : 'Ошибка завершения авторизации');
        } finally {
            setIsLoading(false);
        }
    };

    // Функция для сохранения данных пользователя
    const saveUserData = (data: OAuthUserResponse | TelegramAuthResponse) => {
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

            // Определяем роль из ответа сервера
            if (data.user.roles && data.user.roles.length > 0) {
                const roles = data.user.roles.map(r => r.toLowerCase());

                if (roles.includes('role_master') || roles.includes('master')) {
                    setUserRole('master');
                } else if (roles.includes('role_client') || roles.includes('client')) {
                    setUserRole('client');
                } else {
                    setUserRole(formData.role);
                }
            } else {
                setUserRole(formData.role);
            }

            // Сохраняем occupation если есть
            if (data.user.occupation) {
                console.log('User occupation from OAuth:', data.user.occupation);
                setUserOccupation(data.user.occupation);
            }

            console.log('Final user role set to:', getUserRole());
        }
    };

    // Обработка Telegram Widget callback
    const handleTelegramWidgetCallback = async (authData: TelegramAuthCallbackData) => {
        try {
            setIsLoading(true);
            setError('');

            console.log('Processing Telegram widget auth data:', authData);

            // Получаем сохраненную роль
            const savedRole = sessionStorage.getItem('pendingTelegramRole') || formData.role;
            const savedSpecialty = sessionStorage.getItem('pendingTelegramSpecialty');

            // Подготавливаем данные для отправки
            const requestData: {
                id: number;
                username?: string;
                firstName: string;
                lastName?: string;
                photoUrl?: string;
                role: string;
                occupation?: string;
            } = {
                id: authData.id,
                firstName: authData.first_name,
                role: savedRole
            };

            if (authData.username) {
                requestData.username = authData.username;
            }
            if (authData.last_name) {
                requestData.lastName = authData.last_name;
            }
            if (authData.photo_url) {
                requestData.photoUrl = authData.photo_url;
            }

            // Если выбрана роль мастера и есть специальность
            if (savedRole === 'master' && savedSpecialty) {
                requestData.occupation = `${API_BASE_URL}/api/occupations/${savedSpecialty}`;
            }

            console.log('Sending Telegram widget callback request:', requestData);

            const response = await fetch(`${API_BASE_URL}/api/auth/telegram/callback`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify(requestData)
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Ошибка авторизации Telegram: ${errorText}`);
            }

            const data: OAuthUserResponse = await response.json();
            console.log('Telegram widget auth completed successfully:', data);

            // Сохраняем данные пользователя
            saveUserData(data);
            handleSuccessfulAuth(data.token, data.user.email);

            // Очищаем временные данные
            sessionStorage.removeItem('pendingTelegramRole');
            sessionStorage.removeItem('pendingTelegramSpecialty');
            sessionStorage.removeItem('telegramCsrfState');

        } catch (err) {
            console.error('Telegram widget callback error:', err);
            setError(err instanceof Error ? err.message : 'Ошибка при завершении авторизации через Telegram');
        } finally {
            setIsLoading(false);
        }
    };

    // Функция для Telegram Widget
    const handleTelegramAuthClick = () => {
        // Сохраняем роль перед началом авторизации
        sessionStorage.setItem('pendingTelegramRole', formData.role);
        if (formData.role === 'master' && formData.specialty) {
            sessionStorage.setItem('pendingTelegramSpecialty', formData.specialty);
        }

        // Находим кнопку и ищем скрытый widget iframe в ней
        const telegramButton = document.querySelector('[title="Войти через Telegram"]');
        if (telegramButton) {
            // Проверяем, есть ли уже widget в кнопке
            let widgetContainer = telegramButton.querySelector('[data-telegram-login]') as HTMLElement;
            if (!widgetContainer) {
                widgetContainer = document.createElement('div') as HTMLElement;
                widgetContainer.style.position = 'absolute';
                widgetContainer.style.opacity = '0';
                widgetContainer.style.pointerEvents = 'none';
                widgetContainer.style.width = '0';
                widgetContainer.style.height = '0';
                telegramButton.appendChild(widgetContainer);

                const script = document.createElement('script');
                script.src = 'https://telegram.org/js/telegram-widget.js?22';
                script.async = true;
                script.setAttribute('data-telegram-login', 'ustoyobtj_auth_bot');
                script.setAttribute('data-size', 'large');
                script.setAttribute('data-userpic', 'false');
                script.setAttribute('data-radius', '20');
                script.setAttribute('data-auth-url', `${window.location.origin}/auth/telegram/callback`);
                script.setAttribute('data-request-access', 'write');

                widgetContainer.appendChild(script);
            }

            // Находим iframe widget'a
            const widgetIframe = telegramButton.querySelector('iframe[src*="telegram.org"]') as HTMLElement;
            if (widgetIframe) {
                // Кликаем на iframe для активации
                widgetIframe.click();
            }
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

    // Новая функция для получения данных пользователя
    const fetchUserData = async (token: string): Promise<void> => {
        try {
            const userResponse = await fetch(`${API_BASE_URL}/api/users/me`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json',
                }
            });

            if (userResponse.ok) {
                const userData = await userResponse.json();
                console.log('User data from /me endpoint:', userData);

                // Сохраняем данные пользователя
                setUserData(userData);

                if (userData.email) {
                    setUserEmail(userData.email);
                }

                // Определяем роль из данных пользователя
                let userRole = formData.role; // По умолчанию берем из формы

                if (userData.roles && userData.roles.length > 0) {
                    const roles = userData.roles.map((r: string) => r.toLowerCase());

                    if (roles.includes('role_master') || roles.includes('master')) {
                        userRole = 'master';
                    } else if (roles.includes('role_client') || roles.includes('client')) {
                        userRole = 'client';
                    }

                    console.log('User roles from API:', userData.roles);
                    console.log('Detected role from API:', userRole);
                } else {
                    console.log('No roles in API response, using role from form:', userRole);
                }

                // Устанавливаем роль
                setUserRole(userRole);

                // Сохраняем occupation если есть
                if (userData.occupation) {
                    console.log('User occupation from API:', userData.occupation);
                    setUserOccupation(userData.occupation);
                }
            } else {
                console.warn('Could not fetch user data from /me endpoint');
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

            // Сохраняем токен
            setAuthToken(data.token);
            setTokenExpiry();

            // ПОЛУЧАЕМ И СОХРАНЯЕМ ДАННЫЕ ПОЛЬЗОВАТЕЛЯ С OCCUPATION
            await fetchUserData(data.token);

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

        // Проверка паролей
        if (formData.password !== formData.confirmPassword) {
            setError('Пароли не совпадают');
            setIsLoading(false);
            return;
        }

        // Валидация пароля
        const passwordValidationResult = validatePassword(formData.password);
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

        // Подготавливаем данные пользователя
        const userData: {
            email: string;
            name: string;
            surname: string;
            password: string;
            roles?: string[];
            occupation?: string[];
        } = {
            email,
            name: formData.firstName,
            surname: formData.lastName,
            password: formData.password,
        };

        // Формируем массив ролей - пробуем разные форматы
        const rolesArray = [];

        // ВАРИАНТ 1: Только основная роль без ROLE_USER
        if (formData.role === 'master') {
            rolesArray.push('ROLE_MASTER');
        } else {
            rolesArray.push('ROLE_CLIENT');
        }

        userData.roles = rolesArray;

        // Добавляем occupation для мастера
        if (formData.role === 'master' && formData.specialty) {
            userData.occupation = [`${API_BASE_URL}/api/occupations/${formData.specialty}`];
            console.log('Adding occupation for master:', userData.occupation);
        }

        console.log('Sending registration data:', userData);

        try {
            // 1. Регистрируем пользователя
            const createResponse = await fetch(`${API_BASE_URL}/api/users`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify(userData)
            });

            const createResponseText = await createResponse.text();
            console.log('Registration response:', createResponse.status, createResponseText);

            if (!createResponse.ok) {
                let errorMessage = 'Ошибка регистрации';
                try {
                    const errorData = JSON.parse(createResponseText);
                    errorMessage = errorData.detail || errorData.message || errorMessage;
                    if (errorData.violations) {
                        errorMessage = errorData.violations.map((v: { propertyPath: string; message: string }) =>
                            `${v.propertyPath}: ${v.message}`
                        ).join(', ');
                    }
                } catch {
                    errorMessage = `HTTP error! status: ${createResponse.status}, response: ${createResponseText}`;
                }
                throw new Error(errorMessage);
            }

            // 2. Логинимся после регистрации
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
                const errorText = await loginResponse.text();
                console.error('Login after registration error:', errorText);
                throw new Error('Не удалось авторизоваться после регистрации');
            }

            const loginData: LoginResponse = await loginResponse.json();

            if (!loginData.token) {
                throw new Error('Токен не получен в ответе');
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
                const userResponse = await fetch(`${API_BASE_URL}/api/users/me`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${loginData.token}`,
                        'Accept': 'application/json',
                    }
                });

                if (userResponse.ok) {
                    const userData = await userResponse.json();
                    console.log('User data after registration:', userData);

                    // Сохраняем данные пользователя
                    setUserData(userData);

                    if (userData.email) {
                        setUserEmail(userData.email);
                    }

                    // Проверяем роли из API
                    if (userData.roles && userData.roles.length > 0) {
                        console.log('User roles from API:', userData.roles);

                        const roles = userData.roles.map((r: string) => r.toLowerCase());

                        if (roles.includes('role_master') || roles.includes('master')) {
                            setUserRole('master');
                            console.log('Setting role from API as master');
                        } else if (roles.includes('role_client') || roles.includes('client')) {
                            setUserRole('client');
                            console.log('Setting role from API as client');
                        }
                    }
                } else {
                    console.warn('Could not fetch user data from /me endpoint (expected for new users)');
                }
            } catch (userErr) {
                console.error('Error fetching user data after registration:', userErr);
            }

            // 7. Отправляем пользователя на подтверждение email
            setRegisteredEmail(email);
            setCurrentState(AuthModalState.CONFIRM_EMAIL);

            // 8. Отправляем успешный auth с токеном
            handleSuccessfulAuth(loginData.token, email);

        } catch (err) {
            console.error('Registration error:', err);
            setError(err instanceof Error ? err.message : 'Произошла ошибка при регистрации');
        } finally {
            setIsLoading(false);
        }
    };

    const grantUserRole = async (token: string, role: 'master' | 'client'): Promise<boolean> => {
        try {
            console.log('Granting role:', role);

            // Возможно, нужно использовать другие значения ролей
            // Попробуем разные варианты
            const roleValue = role === 'master' ? 'MASTER' : 'CLIENT';

            console.log('Trying to grant role:', roleValue);

            const response = await fetch(`${API_BASE_URL}/api/users/grant-role`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify({
                    role: roleValue
                })
            });

            const responseText = await response.text();
            console.log('Grant role response:', response.status, responseText);

            if (response.ok) {
                console.log('Role granted successfully');
                return true;
            } else {
                console.warn('Failed to grant role:', response.status, responseText);

                // Попробуем другие форматы ролей
                const alternativeRoleValues = [
                    role === 'master' ? 'ROLE_MASTER' : 'ROLE_CLIENT',
                    role === 'master' ? 'master' : 'client',
                    role === 'master' ? 'RoleMaster' : 'RoleClient'
                ];

                for (const altRole of alternativeRoleValues) {
                    console.log('Trying alternative role:', altRole);
                    try {
                        const altResponse = await fetch(`${API_BASE_URL}/api/users/grant-role`, {
                            method: 'POST',
                            headers: {
                                'Authorization': `Bearer ${token}`,
                                'Content-Type': 'application/json',
                                'Accept': 'application/json',
                            },
                            body: JSON.stringify({
                                role: altRole
                            })
                        });

                        if (altResponse.ok) {
                            console.log('Role granted successfully with alternative value:', altRole);
                            return true;
                        }
                    } catch (err) {
                        console.log('Failed with alternative role:', altRole);
                    }
                }

                return false;
            }
        } catch (err) {
            console.error('Error granting role:', err);
            return false;
        }
    };

    const handleSuccessfulAuth = (token: string, email?: string) => {
        if (email) {
            setUserEmail(email);
        }

        // Проверяем, есть ли уже сохраненная роль
        const existingRole = getUserRole();

        // Если нет сохраненной роли, используем роль из формы
        if (!existingRole) {
            console.log('Setting role from form after successful auth:', formData.role);
            setUserRole(formData.role);
        } else {
            console.log('Role already exists:', existingRole);
            // Все равно обновляем роль из формы на всякий случай
            setUserRole(formData.role);
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
        setOAuthCallbackData(null);
        setActiveOAuthProvider(null);
        setPasswordValidation({ isValid: false, message: '' });
        setShowPasswordRequirements(false);

        // Очищаем все временные данные
        ['google', 'instagram', 'facebook', 'telegram'].forEach(provider => {
            sessionStorage.removeItem(`pending${provider.charAt(0).toUpperCase() + provider.slice(1)}Role`);
            sessionStorage.removeItem(`pending${provider.charAt(0).toUpperCase() + provider.slice(1)}Specialty`);
            sessionStorage.removeItem(`${provider}CsrfState`);
        });
        localStorage.removeItem('tempGoogleToken');
        localStorage.removeItem('tempGoogleUserData');
        localStorage.removeItem('telegramUserData');
    };

    const handleClose = () => {
        onClose();
    };

    const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget) {
            handleClose();
        }
    };

    // Функция для отображения экрана завершения OAuth
    const renderOAuthCompletionScreen = () => {
        if (!oauthCallbackData || !activeOAuthProvider) return null;

        const providerNames = {
            google: 'Google',
            instagram: 'Instagram',
            facebook: 'Facebook',
            telegram: 'Telegram'
        };

        return (
            <form onSubmit={(e) => { e.preventDefault(); completeOAuth(); }} className={styles.form}>
                <h2>Завершение регистрации через {providerNames[activeOAuthProvider]}</h2>

                <div className={styles.successMessage}>
                    <p>Вы успешно авторизовались через {providerNames[activeOAuthProvider]}!</p>
                    <p>Пожалуйста, выберите тип аккаунта:</p>
                </div>

                {error && <div className={styles.error}>{error}</div>}

                <div className={styles.roleSelector}>
                    <button
                        type="button"
                        className={formData.role === 'master' ? styles.roleButtonActive : styles.roleButton}
                        onClick={() => handleRoleChange('master')}
                        disabled={isLoading}
                    >
                        Я специалист
                    </button>
                    <button
                        type="button"
                        className={formData.role === 'client' ? styles.roleButtonActive : styles.roleButton}
                        onClick={() => handleRoleChange('client')}
                        disabled={isLoading}
                    >
                        Я заказчик
                    </button>
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

                <button
                    type="submit"
                    className={styles.primaryButton}
                    disabled={isLoading || isCheckingProfile}
                >
                    {isLoading ? 'Завершение...' : 'Завершить регистрацию'}
                </button>

                <div className={styles.links}>
                    <button
                        type="button"
                        className={styles.linkButton}
                        onClick={() => {
                            setOAuthCallbackData(null);
                            setActiveOAuthProvider(null);
                            setCurrentState(AuthModalState.LOGIN);
                        }}
                        disabled={isLoading}
                    >
                        Вернуться ко входу
                    </button>
                </div>
            </form>
        );
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
        // Если есть OAuth callback данные, показываем экран завершения
        if (oauthCallbackData && activeOAuthProvider) {
            return renderOAuthCompletionScreen();
        }

        // Обычный экран логина
        return (
            <form onSubmit={handleLogin} className={styles.form}>
                <h2>Вход</h2>

                {error && <div className={styles.error}>{error}</div>}
                <div className={styles.roleSelector}>
                    <button
                        type="button"
                        className={formData.role === 'master' ? styles.roleButtonActive : styles.roleButton}
                        onClick={() => handleRoleChange('master')}
                        disabled={isLoading}
                    >
                        Я специалист
                    </button>
                    <button
                        type="button"
                        className={formData.role === 'client' ? styles.roleButtonActive : styles.roleButton}
                        onClick={() => handleRoleChange('client')}
                        disabled={isLoading}
                    >
                        Я заказчик
                    </button>
                </div>

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
                        onClick={() => handleOAuthStart('google')}
                        disabled={isLoading}
                        title="Войти через Google"
                    >
                        <img src="../chrome.png" alt="Google" />
                    </button>
                    <button
                        type="button"
                        className={styles.facebookButton}
                        onClick={() => handleOAuthStart('facebook')}
                        disabled={isLoading}
                        title="Войти через Facebook"
                    >
                        <img src="../facebook.png" alt="Facebook" />
                    </button>
                    <button
                        type="button"
                        className={styles.instagramButton}
                        onClick={() => handleOAuthStart('instagram')}
                        disabled={isLoading}
                        title="Войти через Instagram"
                    >
                        <img src="../instagram.png" alt="Instagram" />
                    </button>
                    <button
                        type="button"
                        className={styles.telegramButton}
                        onClick={handleTelegramAuthClick}
                        disabled={isLoading}
                        title="Войти через Telegram"
                    >
                        <img src="../telegram.png" alt="Telegram" />
                    </button>
                </div>

                <div className={styles.socialNote}>
                    <p>При авторизации через социальные сети будет использован выбранный тип аккаунта: <strong>{formData.role === 'master' ? 'специалист' : 'заказчик'}</strong></p>
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
                        Я заказчик
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
                        placeholder="Придумайте пароль (Минимум 8 символов)"
                        onFocus={() => setShowPasswordRequirements(true)}
                        onBlur={() => {
                            if (passwordValidation.isValid) {
                                setShowPasswordRequirements(false);
                            }
                        }}
                    />
                    {showPasswordRequirements && (
                        <div className={styles.passwordRequirements}>
                            <p>Пароль должен содержать:</p>
                            <ul>
                                <li className={formData.password.length >= 8 ? styles.requirementMet : ''}>
                                    Минимум 8 символов
                                </li>
                                <li className={/[a-z]/.test(formData.password) ? styles.requirementMet : ''}>
                                    Минимум 1 строчная буква
                                </li>
                                <li className={/[A-Z]/.test(formData.password) ? styles.requirementMet : ''}>
                                    Минимум 1 заглавная буква
                                </li>
                                <li className={/\d/.test(formData.password) ? styles.requirementMet : ''}>
                                    Минимум 1 цифра
                                </li>
                                <li className={/[!@#$%^&*]/.test(formData.password) ? styles.requirementMet : ''}>
                                    Минимум 1 специальный символ (!@#$%^&*)
                                </li>
                            </ul>
                        </div>
                    )}
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
                    {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                        <div className={styles.passwordError}>
                            Пароли не совпадают
                        </div>
                    )}
                </div>

                <button
                    type="submit"
                    className={styles.primaryButton}
                    disabled={isLoading || !passwordValidation.isValid}
                >
                    {isLoading ? 'Регистрация...' : 'Зарегистрироваться'}
                </button>

                <div className={styles.socialTitle}>Или зарегистрироваться с помощью</div>

                <div className={styles.socialButtons}>
                    <button
                        type="button"
                        className={styles.googleButton}
                        onClick={() => handleOAuthStart('google')}
                        disabled={isLoading}
                        title="Зарегистрироваться через Google"
                    >
                        <img src="../chrome.png" alt="Google" />
                    </button>
                    <button
                        type="button"
                        className={styles.facebookButton}
                        onClick={() => handleOAuthStart('facebook')}
                        disabled={isLoading}
                        title="Зарегистрироваться через Facebook"
                    >
                        <img src="../facebook.png" alt="Facebook" />
                    </button>
                    <button
                        type="button"
                        className={styles.instagramButton}
                        onClick={() => handleOAuthStart('instagram')}
                        disabled={isLoading}
                        title="Зарегистрироваться через Instagram"
                    >
                        <img src="../instagram.png" alt="Instagram" />
                    </button>
                    <button
                        type="button"
                        className={styles.telegramButton}
                        onClick={handleTelegramAuthClick}
                        disabled={isLoading}
                        title="Зарегистрироваться через Telegram"
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
                const errorText = await response.text();
                throw new Error(`Ошибка завершения авторизации через Telegram: ${errorText}`);
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
                        Я заказчик
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