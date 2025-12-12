import React, { useState } from 'react';
import styles from './AuthModal.module.scss';
import { setAuthToken, getAuthTokenExpiry, setAuthTokenExpiry, clearAuthData } from '../../utils/auth';

const AuthModalState = {
    WELCOME: 'welcome',
    LOGIN: 'login',
    REGISTER: 'register',
    FORGOT_PASSWORD: 'forgot_password',
    VERIFY_CODE: 'verify_code',
    NEW_PASSWORD: 'new_password',
    CONFIRM_EMAIL: 'confirm_email'
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

// Константы для времени жизни токена
const TOKEN_LIFETIME_HOURS = 1; // 1 час
const TOKEN_REFRESH_BUFFER_MINUTES = 5; // Обновлять токен за 5 минут до истечения

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

    const API_BASE_URL = 'https://admin.ustoyob.tj';

    React.useEffect(() => {
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
            role
        }));
    };

    // Функция для установки времени истечения токена
    const setTokenExpiry = () => {
        const expiryTime = new Date();
        expiryTime.setHours(expiryTime.getHours() + TOKEN_LIFETIME_HOURS);
        setAuthTokenExpiry(expiryTime.toISOString());

        // Запускаем проверку истекшего токена
        startTokenExpiryCheck();
    };

    // Функция для проверки истекшего токена
    const checkTokenExpiry = (): boolean => {
        const expiry = getAuthTokenExpiry();
        if (!expiry) return true;

        const now = new Date();
        const expiryDate = new Date(expiry);

        // Если токен истек или истечет в ближайшие 5 минут
        const bufferTime = TOKEN_REFRESH_BUFFER_MINUTES * 60 * 1000; // минуты в миллисекундах
        return expiryDate.getTime() - now.getTime() < bufferTime;
    };

    // Функция для обновления токена
    const refreshToken = async (): Promise<boolean> => {
        const token = localStorage.getItem('authToken');
        if (!token) return false;

        try {
            // Здесь можно добавить логику для обновления токена через API
            // Если API поддерживает refresh token, используйте его
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
                    setAuthToken(newTokenData.token);
                    setTokenExpiry();
                    return true;
                }
            }
        } catch (err) {
            console.error('Error refreshing token:', err);
        }

        return false;
    };

    // Запуск периодической проверки токена
    const startTokenExpiryCheck = () => {
        // Проверяем каждую минуту
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

    // Проверяем токен при загрузке компонента
    React.useEffect(() => {
        if (localStorage.getItem('authToken') && checkTokenExpiry()) {
            console.log('Token expired on page load');
            clearAuthData();
        }
    }, []);

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
            }

            let errorMessage = 'Ошибка подтверждения аккаунта';
            const responseText = await response.text();

            try {
                const errorData = JSON.parse(responseText);
                errorMessage = errorData.message || errorData.detail || errorMessage;
            } catch {
                errorMessage = responseText || `HTTP error! status: ${response.status}`;
            }

            return { success: false, error: errorMessage };
        } catch (err) {
            console.error('Confirm token error:', err);
            return {
                success: false,
                error: `Ошибка при подтверждении аккаунта: ${err}`
            };
        }
    };

    const handleConfirmToken = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            if (!formData.code.trim()) {
                throw new Error('Введите токен подтверждения');
            }

            const result = await confirmAccountWithToken(formData.code.trim());

            if (result.success) {
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

                            if (currentUserData.approved === true && onLoginSuccess) {
                                onLoginSuccess(token, currentUserData.email);
                            }
                        }
                    } catch (err) {
                        console.error('Error updating user data:', err);
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

    const sendConfirmationEmail = async (email: string) => {
        try {
            console.log('Sending confirmation email to:', email);

            const token = localStorage.getItem('authToken');

            if (!token) {
                console.error('No auth token found in localStorage');
                return {
                    success: false,
                    error: 'Токен авторизации не найден.'
                };
            }

            console.log('Using token for confirmation (first 20 chars):', token.substring(0, 20) + '...');

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
                } catch {
                    console.log('Confirmation email sent, but response not JSON:', responseText);
                    return { success: true, data: null };
                }
            }

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
        } catch (err) {
            console.error('Error sending confirmation email:', err);
            return {
                success: false,
                error: `Ошибка при отправке письма подтверждения: ${err}`
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

            // Сохраняем токен и устанавливаем время его истечения
            setAuthToken(data.token);
            setTokenExpiry();
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

        // Исправляем типизацию any
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

            // Сохраняем токен с временем истечения
            setAuthToken(finalToken);
            setTokenExpiry();
            localStorage.setItem('userEmail', email);

            const roleForLocalStorage = formData.role === 'master' ? 'ROLE_MASTER' : 'ROLE_CLIENT';
            localStorage.setItem('userRole', roleForLocalStorage);
            console.log('User role saved to localStorage:', roleForLocalStorage);

            console.log('Step 5: Sending confirmation email');

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

            setRegisteredEmail(email);
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

    const handleResendConfirmation = async () => {
        setIsLoading(true);
        setError('');

        try {
            if (!registeredEmail) {
                throw new Error('Email не найден');
            }

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

    // Функция для обновления файла utils/auth.ts
    const updateAuthUtils = () => {
        // console.log('Для полноценной работы необходимо обновить файл utils/auth.ts:');
        // console.log(`
        // // utils/auth.ts - Обновленная версия
        //
        // const AUTH_TOKEN_KEY = 'authToken';
        // const TOKEN_EXPIRY_KEY = 'tokenExpiry';
        // const USER_ROLE_KEY = 'userRole';
        // const USER_DATA_KEY = 'userData';
        // const USER_EMAIL_KEY = 'userEmail';
        //
        // export const getAuthToken = (): string | null => {
        //     return localStorage.getItem(AUTH_TOKEN_KEY);
        // };
        //
        // export const setAuthToken = (token: string): void => {
        //     localStorage.setItem(AUTH_TOKEN_KEY, token);
        // };
        //
        // export const removeAuthToken = (): void => {
        //     localStorage.removeItem(AUTH_TOKEN_KEY);
        // };
        //
        // export const getAuthTokenExpiry = (): string | null => {
        //     return localStorage.getItem(TOKEN_EXPIRY_KEY);
        // };
        //
        // export const setAuthTokenExpiry = (expiry: string): void => {
        //     localStorage.setItem(TOKEN_EXPIRY_KEY, expiry);
        // };
        //
        // export const removeAuthTokenExpiry = (): void => {
        //     localStorage.removeItem(TOKEN_EXPIRY_KEY);
        // };
        //
        // export const clearAuthData = (): void => {
        //     localStorage.removeItem(AUTH_TOKEN_KEY);
        //     localStorage.removeItem(TOKEN_EXPIRY_KEY);
        //     localStorage.removeItem(USER_ROLE_KEY);
        //     localStorage.removeItem(USER_DATA_KEY);
        //     localStorage.removeItem(USER_EMAIL_KEY);
        // };
        //
        // export const getUserRole = (): 'client' | 'master' | null => {
        //     const role = localStorage.getItem(USER_ROLE_KEY);
        //     if (role === 'ROLE_MASTER') return 'master';
        //     if (role === 'ROLE_CLIENT') return 'client';
        //     return null;
        // };
        //
        // export const setUserRole = (role: 'client' | 'master'): void => {
        //     const roleValue = role === 'master' ? 'ROLE_MASTER' : 'ROLE_CLIENT';
        //     localStorage.setItem(USER_ROLE_KEY, roleValue);
        // };
        //
        // export const getUserData = (): any => {
        //     const data = localStorage.getItem(USER_DATA_KEY);
        //     return data ? JSON.parse(data) : null;
        // };
        //
        // export const setUserData = (data: any): void => {
        //     localStorage.setItem(USER_DATA_KEY, JSON.stringify(data));
        // };
        //
        // export const getIsAuthenticated = (): boolean => {
        //     const token = getAuthToken();
        //     if (!token) return false;
        //
        //     const expiry = getAuthTokenExpiry();
        //     if (!expiry) return true; // Если нет информации об истечении, считаем что токен валиден
        //
        //     const now = new Date();
        //     const expiryDate = new Date(expiry);
        //     return now < expiryDate;
        // };
        //
        // // Функция для автоматического выхода при истечении токена
        // export const setupTokenExpiryListener = (onTokenExpired: () => void): void => {
        //     setInterval(() => {
        //         if (!getIsAuthenticated()) {
        //             clearAuthData();
        //             onTokenExpired();
        //         }
        //     }, 60000); // Проверка каждую минуту
        // };
        // `);
    };

    // Вызываем обновление при монтировании компонента
    React.useEffect(() => {
        updateAuthUtils();
    }, []);

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
                    <a className={styles.googleButton}>
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
                    <a className={styles.facebookButton}>
                        <img src="../facebook.png" alt="Facebook" />
                    </a>
                    <a className={styles.googleButton}>
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
            <form onSubmit={handleConfirmToken} className={styles.form}>
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