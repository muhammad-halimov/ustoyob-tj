import React, { useState } from 'react';
import styles from './AuthModal.module.scss';
import { setAuthToken } from '../../utils/auth'; // Импортируем функцию

const AuthModalState = {
    WELCOME: 'welcome',
    LOGIN: 'login',
    REGISTER: 'register',
    FORGOT_PASSWORD: 'forgot_password',
    VERIFY_CODE: 'verify_code',
    NEW_PASSWORD: 'new_password',
    CONFIRM_EMAIL: 'confirm_email' // Добавили новое состояние
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

interface ConfirmResponse {
    success: boolean;
    message: string;
    redirectUrl: string;
}

interface ConfirmTokenResponse {
    success: boolean;
    error?: string;
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
    const [registeredEmail, setRegisteredEmail] = useState<string>(''); // Для хранения email после регистрации

    const API_BASE_URL = 'https://admin.ustoyob.tj';

    React.useEffect(() => {
        const loadCategories = async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/api/occupations`);
                if (response.ok) {
                    const data = await response.json();
                    setCategories(data);
                }
            } catch (error) {
                console.error('Error loading categories:', error);
            }
        };

        loadCategories();
    }, []);

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
            role: role
        }));
    };

    // Подтверждение аккаунта по токену
    const confirmAccountWithToken = async (token: string): Promise<ConfirmTokenResponse> => {
        try {
            console.log('Confirming account with token:', token);

            const response = await fetch(`${API_BASE_URL}/api/confirm-account/${token}`, {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                },
            });

            console.log('Confirm token response status:', response.status);

            if (response.ok) {
                return { success: true };
            } else {
                let errorMessage = 'Ошибка подтверждения аккаунта';
                const responseText = await response.text();

                try {
                    const errorData = JSON.parse(responseText);
                    errorMessage = errorData.message || errorData.detail || errorMessage;
                } catch {
                    errorMessage = responseText || `HTTP error! status: ${response.status}`;
                }

                return { success: false, error: errorMessage };
            }
        } catch (error) {
            console.error('Confirm token error:', error);
            return {
                success: false,
                error: `Ошибка при подтверждении аккаунта: ${error}`
            };
        }
    };

    const handleConfirmToken = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            // Здесь должен быть токен из формы (например, formData.code)
            if (!formData.code.trim()) {
                throw new Error('Введите токен подтверждения');
            }

            const result = await confirmAccountWithToken(formData.code.trim());

            if (result.success) {
                // Обновляем данные пользователя после подтверждения
                const token = localStorage.getItem('authToken');
                if (token) {
                    try {
                        const userResponse = await fetch(`${API_BASE_URL}/api/users/me`, {
                            method: 'GET',
                            headers: {
                                'Authorization': `Bearer ${token}`,
                                'Accept': 'application/json',
                            },
                        });

                        if (userResponse.ok) {
                            const currentUserData = await userResponse.json();
                            localStorage.setItem('userData', JSON.stringify(currentUserData));

                            // Проверяем статус подтверждения
                            if (currentUserData.approved === true) {
                                alert('Аккаунт успешно подтвержден!');
                                // Если есть callback, вызываем его
                                if (onLoginSuccess) {
                                    onLoginSuccess(token, currentUserData.email);
                                }
                            }
                        }
                    } catch (error) {
                        console.error('Error updating user data:', error);
                    }
                }

                alert('Аккаунт успешно подтвержден! Теперь вы можете войти.');
                setCurrentState(AuthModalState.LOGIN);
            } else {
                throw new Error(result.error || 'Ошибка подтверждения аккаунта');
            }
        } catch (err) {
            console.error('Confirm token error:', err);
            setError(err instanceof Error ? err.message : 'Произошла ошибка при подтверждении');
        } finally {
            setIsLoading(false);
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
    };

    const handleClose = () => {
        onClose();
    };

    const handleSuccessfulAuth = (token: string, email?: string) => {
        resetForm();
        if (onLoginSuccess) {
            onLoginSuccess(token, email);
        }
        onClose();
    };

    // НОВАЯ ФУНКЦИЯ: Отправка запроса на подтверждение аккаунта
    const sendConfirmationEmail = async (email: string) => {
        try {
            console.log('Sending confirmation email to:', email);

            // Получаем токен из localStorage
            const token = localStorage.getItem('authToken');

            if (!token) {
                console.error('No auth token found in localStorage');
                return {
                    success: false,
                    error: 'Токен авторизации не найден.'
                };
            }

            console.log('Using token for confirmation (first 20 chars):', token.substring(0, 20) + '...');

            // Пробуем отправить запрос на подтверждение
            const response = await fetch(`${API_BASE_URL}/api/confirm-account-tokenless/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });

            const responseText = await response.text();
            console.log('Confirmation email response status:', response.status);
            console.log('Confirmation email response text:', responseText);

            if (response.ok) {
                try {
                    const data: ConfirmResponse = JSON.parse(responseText);
                    console.log('Confirmation email sent successfully:', data);
                    return { success: true, data };
                } catch (parseError) {
                    console.log('Confirmation email sent, but response not JSON:', responseText);
                    // Если ответ не JSON, но статус 200, считаем успешным
                    return { success: true, data: null };
                }
            } else {
                console.warn('Failed to send confirmation email');
                let errorMessage = 'Не удалось отправить письмо подтверждения';

                try {
                    const errorData = JSON.parse(responseText);
                    errorMessage = errorData.detail || errorData.message || errorMessage;
                    console.log('Error details:', errorData);
                } catch {
                    errorMessage = `HTTP error! status: ${response.status}`;
                }

                return { success: false, error: errorMessage };
            }
        } catch (error) {
            console.error('Error sending confirmation email:', error);
            return {
                success: false,
                error: `Ошибка при отправке письма подтверждения: ${error}`
            };
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

                } catch (parseError) {
                    console.log('Cannot parse error response as JSON, using raw text');
                    errorMessage = responseText || `HTTP error! status: ${response.status}`;
                }

                if (response.status === 401) {
                    errorMessage += '. Проверьте email и пароль.';
                }

                throw new Error(errorMessage);
            }

            try {
                const data: LoginResponse = JSON.parse(responseText);
                console.log('Login successful, token received:', data);

                if (!data.token) {
                    throw new Error('Токен не получен в ответе');
                }

                // Используем функцию из utils/auth.ts
                setAuthToken(data.token);
                localStorage.setItem('userEmail', formData.email);

                try {
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
                } catch (userError) {
                    console.error('Error fetching user data:', userError);
                }

                handleSuccessfulAuth(data.token, formData.email);

            } catch (parseError) {
                throw new Error('Неверный формат ответа от сервера');
            }

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

        // Объявляем email перед использованием
        const email = formData.phoneOrEmail.includes('@') ? formData.phoneOrEmail : '';

        if (!email) {
            setError('Для регистрации требуется email. Телефон не поддерживается для входа.');
            setIsLoading(false);
            return;
        }

        const baseUserData: any = {
            email: email,
            name: formData.firstName,
            surname: formData.lastName,
            password: formData.password,
        };

        if (formData.role === 'master' && formData.specialty) {
            baseUserData.occupation = [`${API_BASE_URL}/api/occupations/${formData.specialty}`];
        }

        console.log('Step 1: Creating user with data:', baseUserData);

        try {
            // ШАГ 1: Создаем пользователя
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
                        errorMessage = errorData.violations.map((v: any) => v.message).join(', ');
                    }
                } catch {
                    errorMessage = `HTTP error! status: ${createResponse.status}`;
                }
                throw new Error(errorMessage);
            }

            const userData = JSON.parse(createResponseText);
            console.log('User created successfully:', userData);

            // Получаем ID созданного пользователя
            const userId = userData.id;
            console.log('Created user ID:', userId);

            // Ждем секунду, чтобы сервер обработал запрос
            await new Promise(resolve => setTimeout(resolve, 1000));

            // ШАГ 2: Получаем первый токен (для назначения роли)
            console.log('Step 2: Getting initial token for role assignment');

            const initialLoginResponse = await fetch(`${API_BASE_URL}/api/authentication_token`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify({
                    email: email,
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

            // ШАГ 3: Назначаем роль
            console.log('Step 3: Assigning role via grant-role');

            const roleToAssign = formData.role; // 'master' или 'client'

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

                // Продолжаем регистрацию даже если роль не назначилась
                console.warn('Role assignment failed:', grantRoleError);
            } else {
                console.log('Role assigned successfully:', grantRoleResponseText);

                try {
                    const grantRoleResult = JSON.parse(grantRoleResponseText);
                    console.log('Grant role result:', grantRoleResult);
                } catch (e) {
                    console.log('Grant role response (not JSON):', grantRoleResponseText);
                }
            }

            // Ждем немного, чтобы сервер обновил роль
            await new Promise(resolve => setTimeout(resolve, 1000));

            // ШАГ 4: Получаем новый токен после назначения роли
            console.log('Step 4: Getting new token after role assignment');

            const newLoginResponse = await fetch(`${API_BASE_URL}/api/authentication_token`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify({
                    email: email,
                    password: formData.password
                })
            });

            const newLoginResponseText = await newLoginResponse.text();
            console.log('New login response status:', newLoginResponse.status);

            let finalToken: string;

            if (!newLoginResponse.ok) {
                console.warn('Failed to get new token after role assignment, trying one more time...');

                // Пробуем еще раз через небольшую задержку
                await new Promise(resolve => setTimeout(resolve, 2000));

                const retryLoginResponse = await fetch(`${API_BASE_URL}/api/authentication_token`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                    },
                    body: JSON.stringify({
                        email: email,
                        password: formData.password
                    })
                });

                if (retryLoginResponse.ok) {
                    const retryLoginData: LoginResponse = await retryLoginResponse.json();
                    console.log('New token received on retry:', retryLoginData.token.substring(0, 20) + '...');

                    // Сохраняем новый токен
                    finalToken = retryLoginData.token;
                } else {
                    console.warn('Failed to get new token even on retry');
                    // Сохраняем старый токен на всякий случай
                    finalToken = initialLoginData.token;
                }
            } else {
                const newLoginData: LoginResponse = JSON.parse(newLoginResponseText);
                console.log('New token received:', newLoginData.token.substring(0, 20) + '...');

                // Сохраняем новый токен
                finalToken = newLoginData.token;
            }

            // Используем функцию из utils/auth.ts
            setAuthToken(finalToken);
            localStorage.setItem('userEmail', email);

            const roleForLocalStorage = formData.role === 'master' ? 'ROLE_MASTER' : 'ROLE_CLIENT';
            localStorage.setItem('userRole', roleForLocalStorage);
            console.log('User role saved to localStorage:', roleForLocalStorage);

            // ШАГ 5: Отправляем письмо подтверждения с новым токеном
            console.log('Step 5: Sending confirmation email');

            // Получаем актуальный токен из localStorage
            const currentToken = localStorage.getItem('authToken');
            if (currentToken) {
                const confirmationResult = await sendConfirmationEmail(email);

                if (!confirmationResult.success) {
                    console.warn('Confirmation email not sent:', confirmationResult.error);
                } else {
                    console.log('Confirmation email sent successfully');
                }
            } else {
                console.warn('No auth token found, cannot send confirmation email');
            }

            // ШАГ 6: Проверяем данные пользователя
            console.log('Step 6: Getting user data');

            if (finalToken) {
                try {
                    const userResponse = await fetch(`${API_BASE_URL}/api/users/me`, {
                        method: 'GET',
                        headers: {
                            'Authorization': `Bearer ${finalToken}`,
                            'Accept': 'application/json',
                        },
                    });

                    if (userResponse.ok) {
                        const currentUserData = await userResponse.json();
                        console.log('Final user data:', currentUserData);
                        console.log('Final user roles:', currentUserData.roles);
                        localStorage.setItem('userData', JSON.stringify(currentUserData));

                        // Обновляем роль из ответа API
                        if (currentUserData.roles && currentUserData.roles.length > 0) {
                            const actualRole = currentUserData.roles[0];
                            localStorage.setItem('userRole', actualRole);
                            console.log('Final role from API:', actualRole);
                        }
                    } else {
                        console.warn('Failed to fetch final user data');
                        const errorText = await userResponse.text();
                        console.log('Error:', errorText);
                    }
                } catch (userError) {
                    console.error('Error fetching final user data:', userError);
                }
            }

            console.log('Registration successful! Role:', formData.role);
            console.log('User registered with email:', email);

            // Сохраняем email для экрана подтверждения
            setRegisteredEmail(email);

            // Показываем экран подтверждения
            setCurrentState(AuthModalState.CONFIRM_EMAIL);

        } catch (err) {
            console.error('Registration error:', err);
            setError(err instanceof Error ? err.message : 'Произошла ошибка при регистрации');
        } finally {
            setIsLoading(false);
        }
    };

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

    // НОВАЯ ФУНКЦИЯ: Повторная отправка письма подтверждения
    const handleResendConfirmation = async () => {
        setIsLoading(true);
        setError('');

        try {
            if (!registeredEmail) {
                throw new Error('Email не найден');
            }

            // Перед отправкой проверяем токен
            const token = localStorage.getItem('authToken');
            if (!token) {
                throw new Error('Токен авторизации не найден. Пожалуйста, войдите заново.');
            }

            const result = await sendConfirmationEmail(registeredEmail);

            if (result.success) {
                alert('Письмо с подтверждением отправлено повторно! Проверьте вашу почту.');
            } else {
                throw new Error(result.error || 'Ошибка отправки письма');
            }
        } catch (err) {
            console.error('Resend confirmation error:', err);
            setError(err instanceof Error ? err.message : 'Произошла ошибка');
        } finally {
            setIsLoading(false);
        }
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
                    <img className={styles.enterPic} src="../Logo.svg" alt="enter" width='120'/>
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
                    <a
                        className={styles.facebookButton}
                    >
                        <img src="../facebook.png" alt="Facebook" />
                    </a>

                    <a
                        className={styles.googleButton}
                    >
                        <img src="../google.png" alt="Google" />
                    </a>
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

                <div className={styles.socialButtons}>
                    <a
                        className={styles.facebookButton}
                    >
                        <img src="../facebook.png" alt="Facebook" />
                    </a>

                    <a
                        className={styles.googleButton}
                    >
                        <img src="../google.png" alt="Google" />
                    </a>
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

    // НОВЫЙ ЭКРАН: Подтверждение email
    const renderConfirmEmailScreen = () => {
        return (
            <div className={styles.form}>
                <h2>Подтверждение аккаунта</h2>

                <div className={styles.successMessage}>
                    <p>Регистрация успешна!</p>
                    <p>На вашу почту <strong>{registeredEmail}</strong> отправлено письмо с ссылкой для подтверждения аккаунта.</p>
                    <p>Пожалуйста, проверьте вашу почту и перейдите по ссылке для завершения регистрации.</p>
                </div>

                <button
                    type="button"
                    className={styles.primaryButton}
                    onClick={handleResendConfirmation}
                    disabled={isLoading}
                >
                    {isLoading ? 'Отправка...' : 'Отправить письмо повторно'}
                </button>

                <div className={styles.links}>
                    <button
                        type="button"
                        className={styles.linkButton}
                        onClick={() => setCurrentState(AuthModalState.VERIFY_CODE)}
                        disabled={isLoading}
                    >
                        У меня есть токен подтверждения
                    </button>
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
            <form onSubmit={handleConfirmToken} className={styles.form}> {/* НОВОЕ: используем handleConfirmToken */}
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