import React, { useState } from 'react';
import styles from './AuthModal.module.scss';

const AuthModalState = {
    WELCOME: 'welcome',
    LOGIN: 'login',
    REGISTER: 'register',
    FORGOT_PASSWORD: 'forgot_password',
    VERIFY_CODE: 'verify_code',
    NEW_PASSWORD: 'new_password'
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
    code: string;
    newPassword: string;
    phoneOrEmail: string;
    role: 'master' | 'client';
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
        code: '',
        newPassword: '',
        phoneOrEmail: '',
        role: 'master'
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string>('');

    const API_BASE_URL = 'https://admin.ustoyob.tj';

    React.useEffect(() => {
        const loadCategories = async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/api/categories`);
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

    const resetForm = () => {
        setFormData({
            email: '',
            password: '',
            confirmPassword: '',
            firstName: '',
            lastName: '',
            specialty: '',
            code: '',
            newPassword: '',
            phoneOrEmail: '',
            role: 'master'
        });
        setError('');
        setCurrentState(AuthModalState.WELCOME);
    };

    const handleClose = () => {
        resetForm();
        onClose();
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

                // ДОБАВЛЯЕМ ПОДСКАЗКИ ДЛЯ ПОЛЬЗОВАТЕЛЯ
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

                // Сохраняем токен
                localStorage.setItem('authToken', data.token);
                localStorage.setItem('userEmail', formData.email);

                // Получаем информацию о пользователе с использованием токена
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

                        // ДОБАВЛЯЕМ: Сохраняем роль пользователя
                        if (userData.roles && userData.roles.length > 0) {
                            const userRole = userData.roles[0]; // Берем первую роль
                            localStorage.setItem('userRole', userRole);
                            console.log('User role saved:', userRole);
                        }
                    } else {
                        console.warn('Failed to fetch user data, but login successful');
                    }
                } catch (userError) {
                    console.error('Error fetching user data:', userError);
                }

                if (onLoginSuccess) {
                    onLoginSuccess(data.token, formData.email);
                }


                window.location.reload();
                onClose();
                resetForm();

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

        // Валидация
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

        // Для регистрации используем ТОЛЬКО email согласно документации логина
        const email = formData.phoneOrEmail.includes('@') ? formData.phoneOrEmail : '';

        if (!email) {
            setError('Для регистрации требуется email. Телефон не поддерживается для входа.');
            setIsLoading(false);
            return;
        }

        // Подготовка данных для регистрации
        const requestData: any = {
            email: email,
            name: formData.firstName,
            surname: formData.lastName,
            password: formData.password
        };

        // Для клиентов используем ROLE_CLIENT, для мастеров ROLE_MASTER
        if (formData.role === 'master') {
            requestData.roles = ["ROLE_MASTER"];
            // Для мастеров добавляем категорию если выбрана
            if (formData.specialty) {
                requestData.occupation = [parseInt(formData.specialty)];
            }
        } else {
            requestData.roles = ["ROLE_CLIENT"];
        }

        console.log('Registration request:', requestData);

        try {
            const response = await fetch(`${API_BASE_URL}/api/users`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify(requestData)
            });

            const responseText = await response.text();
            console.log('Registration response:', responseText);

            if (!response.ok) {
                let errorMessage = 'Ошибка регистрации';
                try {
                    const errorData = JSON.parse(responseText);
                    errorMessage = errorData.message || errorData.detail || errorMessage;

                    // Обработка специфических ошибок
                    if (errorData.violations) {
                        errorMessage = errorData.violations.map((v: any) => v.message).join(', ');
                    }
                } catch {
                    errorMessage = `HTTP error! status: ${response.status}. Response: ${responseText}`;
                }
                throw new Error(errorMessage);
            }

            console.log('User registered successfully');

            // Автоматический логин после успешной регистрации
            try {
                const loginResponse = await fetch(`${API_BASE_URL}/api/authentication_token`, {
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

                if (loginResponse.ok) {
                    const loginData: LoginResponse = await loginResponse.json();
                    localStorage.setItem('authToken', loginData.token);
                    localStorage.setItem('userEmail', email);

                    if (onLoginSuccess) {
                        onLoginSuccess(loginData.token, email);
                    }
                    window.location.reload();
                    onClose();
                    resetForm();
                } else {
                    // Если авто-логин не удался, переходим на страницу логина
                    setCurrentState(AuthModalState.LOGIN);
                    setError('Регистрация успешна! Теперь войдите в систему.');
                }
            } catch (loginError) {
                console.error('Auto-login error:', loginError);
                setCurrentState(AuthModalState.LOGIN);
                setError('Регистрация успешна! Теперь войдите в систему.');
            }

        } catch (err) {
            console.error('Registration error:', err);

            // Если ошибка связана с occupation, пробуем без него
            if (err instanceof Error && err.message.includes('occupation')) {
                console.log('Trying registration without occupation...');

                // Удаляем occupation из данных и пробуем снова
                const simplifiedData = { ...requestData };
                delete simplifiedData.occupation;

                try {
                    const retryResponse = await fetch(`${API_BASE_URL}/api/users`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Accept': 'application/json',
                        },
                        body: JSON.stringify(simplifiedData)
                    });

                    const retryText = await retryResponse.text();

                    if (retryResponse.ok) {
                        console.log('User registered successfully without occupation');

                        // Авто-логин после успешной регистрации
                        const loginResponse = await fetch(`${API_BASE_URL}/api/authentication_token`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                                email: email,
                                password: formData.password
                            })
                        });

                        if (loginResponse.ok) {
                            const loginData: LoginResponse = await loginResponse.json();
                            localStorage.setItem('authToken', loginData.token);
                            localStorage.setItem('userEmail', email);

                            if (onLoginSuccess) {
                                onLoginSuccess(loginData.token, email);
                            }
                            onClose();
                            resetForm();
                            return;
                        }

                        setCurrentState(AuthModalState.LOGIN);
                        setError('Регистрация успешна! Теперь войдите в систему.');
                        return;
                    } else {
                        throw new Error(`Retry failed: ${retryText}`);
                    }
                } catch (retryError) {
                    console.error('Retry registration error:', retryError);
                    setError(`Ошибка регистрации: ${retryError instanceof Error ? retryError.message : 'Неизвестная ошибка'}`);
                }
            } else {
                setError(err instanceof Error ? err.message : 'Произошла ошибка при регистрации');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleForgotPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            // TODO: Реализовать восстановление пароля когда endpoint будет доступен
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
            // TODO: Реализовать сброс пароля когда endpoint будет доступен
            console.log('Reset password with code:', formData.code);
            setError('Сброс пароля временно недоступен');
        } catch (err) {
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
                <h2>Войдите, чтобы получить доступ к функциям сервиса</h2>
                <div className={styles.welcomeButtons}>
                    <img className={styles.enterPic} src="./enter_pic.png" alt="enter" width='280'/>
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
                        // disabled={isLoading}
                    >
                        <img src="./facebook.png" alt="Facebook" />
                    </a>

                    <a
                        className={styles.googleButton}
                        // disabled={isLoading}
                    >
                        <img src="./google.png" alt="Google" />
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
                    {isLoading ? 'Регистрация...' : 'Войти'}
                </button>

                <div className={styles.socialButtons}>
                    <a
                        className={styles.facebookButton}
                        // disabled={isLoading}
                    >
                        <img src="./facebook.png" alt="Facebook" />
                    </a>

                    <a
                        className={styles.googleButton}
                        // disabled={isLoading}
                    >
                        <img src="./google.png" alt="Google" />
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
            <form onSubmit={(e) => e.preventDefault()} className={styles.form}>
                <h2>Введите код</h2>
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
                    type="button"
                    className={styles.primaryButton}
                    onClick={() => setCurrentState(AuthModalState.NEW_PASSWORD)}
                    disabled={isLoading}
                >
                    Подтвердить
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