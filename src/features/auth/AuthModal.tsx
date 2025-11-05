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

interface RegisterRequest {
    email: string;
    name: string;
    surname: string;
    patronymic: string;
    gender: string;
    phone1?: string;
    roles: string[];
    password: string;
    occupation?: string[];
}

interface UserResponse {
    id: string;
    email: string;
    name: string;
    surname: string;
    roles: string[];
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

    const API_BASE_URL = 'http://usto.tj.auto-schule.site';

    React.useEffect(() => {
        const loadCategories = async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/api/categories`);
                if (response.ok) {
                    const data = await response.json();
                    // Данные приходят как массив объектов
                    setCategories(data);
                }
            } catch (error) {
                console.error('Error loading categories:', error);
            }
        };

        loadCategories();
    }, []);


    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            const response = await fetch(`${API_BASE_URL}/api/authentication_token`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: formData.email,
                    password: formData.password
                })
            });

            const responseText = await response.text();
            console.log('Login response status:', response.status);
            console.log('Login response:', responseText);

            if (!response.ok) {
                let errorMessage = 'Ошибка авторизации';

                if (response.status === 401) {
                    errorMessage = 'Неверный email или пароль';
                } else {
                    try {
                        const errorData = JSON.parse(responseText);
                        errorMessage = errorData.message || errorData.detail || errorMessage;
                    } catch {
                        errorMessage = responseText || `HTTP error! status: ${response.status}`;
                    }
                }

                throw new Error(errorMessage);
            }

            let data: LoginResponse;
            try {
                data = JSON.parse(responseText);
            } catch (parseError) {
                console.error('Error parsing login response:', parseError);
                throw new Error('Ошибка при обработке ответа сервера');
            }

            localStorage.setItem('authToken', data.token);
            localStorage.setItem('userEmail', formData.email);

            if (onLoginSuccess) {
                onLoginSuccess(data.token, formData.email);
            }

            onClose();
            resetForm();

        } catch (err) {
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
        const phone = !formData.phoneOrEmail.includes('@') ? formData.phoneOrEmail : '';

        if (!email && !phone) {
            setError('Укажите email или телефон');
            setIsLoading(false);
            return;
        }

        const requestData: RegisterRequest = {
            email: email,
            name: formData.firstName,
            surname: formData.lastName,
            patronymic: "",
            gender: "gender_male",
            roles: formData.role === 'master' ? ["ROLE_USER"] : ["ROLE_CLIENT"],
            password: formData.password
        };

        if (phone) {
            requestData.phone1 = phone;
        }

        if (formData.role === 'master' && formData.specialty.trim()) {
            // Ищем категорию по ID из выбранной специальности
            const selectedCategoryId = parseInt(formData.specialty);
            const selectedCategory = categories.find(cat => cat.id === selectedCategoryId);

            if (selectedCategory) {
                requestData.occupation = [`${API_BASE_URL}/api/categories/${selectedCategoryId}`];
            } else {
                // Если категория не найдена, используем первую доступную
                requestData.occupation = categories.length > 0
                    ? [`/api/categories/${categories[0].id}`]
                    : ["/api/categories/1"]; // fallback
            }
        }

        console.log('Sending registration request:', requestData);

        try {
            const response = await fetch(`${API_BASE_URL}/api/users`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestData)
            });

            const responseText = await response.text();
            console.log('Registration response status:', response.status);
            console.log('Registration response:', responseText);

            if (!response.ok) {
                let errorMessage = 'Ошибка регистрации';
                try {
                    const errorData = JSON.parse(responseText);
                    errorMessage = errorData.message || errorData.detail || errorMessage;
                } catch {
                    errorMessage = responseText || `HTTP error! status: ${response.status}`;
                }
                throw new Error(errorMessage);
            }

            let userData: UserResponse;
            try {
                userData = JSON.parse(responseText);
                console.log('User registered successfully:', userData);
            } catch (parseError) {
                console.error('Error parsing response:', parseError);
                throw new Error('Ошибка при обработке ответа сервера');
            }

            // Автоматический логин после регистрации если есть email
            if (email) {
                try {
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
                    } else {
                        console.log('Auto-login failed, but registration successful');
                        setCurrentState(AuthModalState.LOGIN);
                        setError('Регистрация успешна! Теперь войдите в систему.');
                    }
                } catch (loginError) {
                    console.error('Auto-login error:', loginError);
                    setCurrentState(AuthModalState.LOGIN);
                    setError('Регистрация успешна! Теперь войдите в систему.');
                }
            } else {
                // Если регистрация по телефону, переходим на страницу логина
                setCurrentState(AuthModalState.LOGIN);
                setError('Регистрация успешна! Теперь войдите в систему.');
            }

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
            // Заглушка для восстановления пароля
            setCurrentState(AuthModalState.VERIFY_CODE);
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
            // Заглушка для сброса пароля
            setCurrentState(AuthModalState.LOGIN);
            setError('Пароль успешно изменен! Теперь войдите с новым паролем.');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Произошла ошибка');
        } finally {
            setIsLoading(false);
        }
    };

    const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
        e.stopPropagation();
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

    const renderWelcomeScreen = (): React.ReactElement => {
        return React.createElement(
            'div',
            { className: styles.welcomeScreen },
            React.createElement('h2', null, 'Войдите, чтобы получить доступ к функциям сервиса'),
            React.createElement(
                'div',
                { className: styles.welcomeButtons },
                React.createElement(
                    'button',
                    {
                        className: styles.primaryButton,
                        onClick: () => setCurrentState(AuthModalState.LOGIN),
                        type: 'button'
                    },
                    'Войти'
                ),
                React.createElement(
                    'button',
                    {
                        className: styles.secondaryButton,
                        onClick: () => setCurrentState(AuthModalState.REGISTER),
                        type: 'button'
                    },
                    'Зарегистрироваться'
                )
            )
        );
    };

    const renderLoginScreen = (): React.ReactElement => {
        return React.createElement(
            'form',
            { onSubmit: handleLogin, className: styles.form },
            React.createElement('h2', null, 'Вход'),

            error && React.createElement(
                'div',
                { className: styles.error },
                error
            ),

            React.createElement(
                'div',
                { className: styles.inputGroup },
                React.createElement('label', null, 'Email'),
                React.createElement('input', {
                    type: 'email',
                    name: 'email',
                    value: formData.email,
                    onChange: handleInputChange,
                    required: true,
                    disabled: isLoading
                })
            ),
            React.createElement(
                'div',
                { className: styles.inputGroup },
                React.createElement('label', null, 'Пароль'),
                React.createElement('input', {
                    type: 'password',
                    name: 'password',
                    value: formData.password,
                    onChange: handleInputChange,
                    required: true,
                    disabled: isLoading
                })
            ),
            React.createElement(
                'button',
                {
                    type: 'submit',
                    className: styles.primaryButton,
                    disabled: isLoading
                },
                isLoading ? 'Вход...' : 'Войти'
            ),
            React.createElement(
                'div',
                { className: styles.links },
                React.createElement(
                    'button',
                    {
                        type: 'button',
                        className: styles.linkButton,
                        onClick: () => setCurrentState(AuthModalState.REGISTER),
                        disabled: isLoading
                    },
                    'Нет аккаунта? Зарегистрируйтесь!'
                ),
                React.createElement(
                    'button',
                    {
                        type: 'button',
                        className: styles.linkButton,
                        onClick: () => setCurrentState(AuthModalState.FORGOT_PASSWORD),
                        disabled: isLoading
                    },
                    'Не помню пароль'
                )
            )
        );
    };

    const renderRegisterScreen = (): React.ReactElement => {
        return React.createElement(
            'form',
            { onSubmit: handleRegister, className: styles.form },
            React.createElement('h2', null, 'Регистрация'),

            error && React.createElement(
                'div',
                { className: styles.error },
                error
            ),

            // Селектор роли
            React.createElement(
                'div',
                { className: styles.roleSelector },
                React.createElement(
                    'button',
                    {
                        type: 'button',
                        className: formData.role === 'master' ? styles.roleButtonActive : styles.roleButton,
                        onClick: () => handleRoleChange('master')
                    },
                    'Мастер'
                ),
                React.createElement(
                    'button',
                    {
                        type: 'button',
                        className: formData.role === 'client' ? styles.roleButtonActive : styles.roleButton,
                        onClick: () => handleRoleChange('client')
                    },
                    'Клиент'
                )
            ),

            // Имя и Фамилия
            React.createElement(
                'div',
                { className: styles.nameRow },
                React.createElement(
                    'div',
                    { className: styles.inputGroup },
                    React.createElement('label', null, 'Имя'),
                    React.createElement('input', {
                        type: 'text',
                        name: 'firstName',
                        value: formData.firstName,
                        onChange: handleInputChange,
                        required: true,
                        disabled: isLoading,
                        placeholder: 'Введите имя'
                    })
                ),
                React.createElement(
                    'div',
                    { className: styles.inputGroup },
                    React.createElement('label', null, 'Фамилия'),
                    React.createElement('input', {
                        type: 'text',
                        name: 'lastName',
                        value: formData.lastName,
                        onChange: handleInputChange,
                        required: true,
                        disabled: isLoading,
                        placeholder: 'Введите фамилию'
                    })
                )
            ),

            // Специальность только для мастеров
            formData.role === 'master' && React.createElement(
                'div',
                { className: styles.inputGroup },
                React.createElement('label', null, 'Специальность *'),
                categories.length > 0
                    ? React.createElement(
                        'select',
                        {
                            name: 'specialty',
                            value: formData.specialty,
                            onChange: (e: React.ChangeEvent<HTMLSelectElement>) =>
                                setFormData(prev => ({...prev, specialty: e.target.value})),
                            required: true,
                            disabled: isLoading
                        },
                        [
                            React.createElement('option', { key: '', value: '' }, 'Выберите специальность'),
                            ...categories.map(category =>
                                React.createElement('option', {
                                    key: category.id,
                                    value: category.id
                                }, category.title)
                            )
                        ]
                    )
                    : React.createElement(
                        'select',
                        {
                            name: 'specialty',
                            value: formData.specialty,
                            onChange: (e: React.ChangeEvent<HTMLSelectElement>) =>
                                setFormData(prev => ({...prev, specialty: e.target.value})),
                            required: true,
                            disabled: true
                        },
                        React.createElement('option', { value: '' }, 'Загрузка категорий...')
                    )
            ),

            // Телефон или почта
            React.createElement(
                'div',
                { className: styles.inputGroup },
                React.createElement('label', null, 'Телефон или почта *'),
                React.createElement('input', {
                    type: 'text',
                    name: 'phoneOrEmail',
                    value: formData.phoneOrEmail,
                    onChange: handleInputChange,
                    required: true,
                    disabled: isLoading,
                    placeholder: '+7 (___) ___-__-__ или example@mail.com'
                })
            ),

            React.createElement(
                'div',
                { className: styles.inputGroup },
                React.createElement('label', null, 'Придумайте пароль *'),
                React.createElement('input', {
                    type: 'password',
                    name: 'password',
                    value: formData.password,
                    onChange: handleInputChange,
                    required: true,
                    disabled: isLoading,
                    placeholder: 'Не менее 6 символов'
                })
            ),

            // Подтвердите пароль
            React.createElement(
                'div',
                { className: styles.inputGroup },
                React.createElement('label', null, 'Подтвердите пароль *'),
                React.createElement('input', {
                    type: 'password',
                    name: 'confirmPassword',
                    value: formData.confirmPassword,
                    onChange: handleInputChange,
                    required: true,
                    disabled: isLoading,
                    placeholder: 'Повторите пароль'
                })
            ),

            // Кнопка регистрации
            React.createElement(
                'button',
                {
                    type: 'submit',
                    className: styles.primaryButton,
                    disabled: isLoading
                },
                isLoading ? 'Регистрация...' : 'Зарегистрироваться'
            ),

            // Ссылка на вход
            React.createElement(
                'div',
                { className: styles.links },
                React.createElement(
                    'button',
                    {
                        type: 'button',
                        className: styles.linkButton,
                        onClick: () => setCurrentState(AuthModalState.LOGIN),
                        disabled: isLoading
                    },
                    'Уже есть аккаунт? Войдите!'
                )
            )
        );
    };

    const renderForgotPasswordScreen = (): React.ReactElement => {
        return React.createElement(
            'form',
            { onSubmit: handleForgotPassword, className: styles.form },
            React.createElement('h2', null, 'Восстановление пароля'),

            error && React.createElement(
                'div',
                { className: styles.error },
                error
            ),

            React.createElement(
                'div',
                { className: styles.inputGroup },
                React.createElement('label', null, 'Email'),
                React.createElement('input', {
                    type: 'email',
                    name: 'email',
                    value: formData.email,
                    onChange: handleInputChange,
                    required: true,
                    disabled: isLoading
                })
            ),
            React.createElement(
                'button',
                {
                    type: 'submit',
                    className: styles.primaryButton,
                    disabled: isLoading
                },
                isLoading ? 'Отправка...' : 'Получить код'
            ),
            React.createElement(
                'div',
                { className: styles.links },
                React.createElement(
                    'button',
                    {
                        type: 'button',
                        className: styles.linkButton,
                        onClick: () => setCurrentState(AuthModalState.LOGIN),
                        disabled: isLoading
                    },
                    'Вернуться к входу'
                )
            )
        );
    };

    const renderVerifyCodeScreen = (): React.ReactElement => {
        return React.createElement(
            'form',
            { onSubmit: (e) => e.preventDefault(), className: styles.form },
            React.createElement('h2', null, 'Введите код'),
            React.createElement(
                'div',
                { className: styles.inputGroup },
                React.createElement('label', null, 'Код подтверждения'),
                React.createElement('input', {
                    type: 'text',
                    name: 'code',
                    value: formData.code,
                    onChange: handleInputChange,
                    required: true,
                    disabled: isLoading,
                    placeholder: 'Введите код из письма'
                })
            ),
            React.createElement(
                'button',
                {
                    type: 'button',
                    className: styles.primaryButton,
                    onClick: () => setCurrentState(AuthModalState.NEW_PASSWORD),
                    disabled: isLoading
                },
                'Подтвердить'
            )
        );
    };

    const renderNewPasswordScreen = (): React.ReactElement => {
        return React.createElement(
            'form',
            { onSubmit: handleResetPassword, className: styles.form },
            React.createElement('h2', null, 'Придумайте новый пароль'),

            error && React.createElement(
                'div',
                { className: styles.error },
                error
            ),

            React.createElement(
                'div',
                { className: styles.inputGroup },
                React.createElement('label', null, 'Новый пароль'),
                React.createElement('input', {
                    type: 'password',
                    name: 'newPassword',
                    value: formData.newPassword,
                    onChange: handleInputChange,
                    required: true,
                    disabled: isLoading,
                    placeholder: 'Введите новый пароль'
                })
            ),
            React.createElement(
                'div',
                { className: styles.inputGroup },
                React.createElement('label', null, 'Повторите пароль'),
                React.createElement('input', {
                    type: 'password',
                    name: 'confirmPassword',
                    value: formData.confirmPassword,
                    onChange: handleInputChange,
                    required: true,
                    disabled: isLoading,
                    placeholder: 'Повторите новый пароль'
                })
            ),
            React.createElement(
                'button',
                {
                    type: 'submit',
                    className: styles.primaryButton,
                    disabled: isLoading
                },
                isLoading ? 'Сохранение...' : 'Подтвердить'
            )
        );
    };

    const renderContent = (): React.ReactElement => {
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

    return React.createElement(
        'div',
        { className: styles.modalOverlay, onClick: handleClose },
        React.createElement(
            'div',
            { className: styles.modalContent, onClick: handleOverlayClick },
            React.createElement(
                'button',
                { className: styles.closeButton, onClick: handleClose, type: 'button' },
                '×'
            ),
            renderContent()
        )
    );
};

export default AuthModal;
export { AuthModalState };