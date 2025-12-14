import React, { useEffect, useState } from 'react';
import styles from "./Header.module.scss";
import { AdBtn } from "../../shared/ui/button/HeaderButton/AdBtn.tsx";
import { EnterBtn } from "../../shared/ui/button/HeaderButton/EnterBtn.tsx";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { getAuthToken, removeAuthToken } from "../../utils/auth";
import { useTranslation } from 'react-i18next';
import { changeLanguage, Language } from '../../locales/i18n.ts';

interface HeaderProps {
    onOpenAuthModal?: () => void; // Добавьте этот интерфейс
}

interface City {
    id: number;
    title: string;
    description: string;
    image: string;
    districts: District[];
    province: Province;
}

interface District {
    id: number;
    title: string;
    image: string;
}

interface Province {
    id: number;
    title: string;
}

interface UserData {
    id: number;
    email: string;
    name: string;
    surname: string;
    approved?: boolean;
    roles: string[];
    oauthType?: {
        id: number;
        googleId: string;
        telegramId: string;
        vkId: string;
        facebookId: string;
        instagramId: string;
    };
}

function Header({ onOpenAuthModal }: HeaderProps) {
    const location = useLocation();
    const navigate = useNavigate();
    const { t, i18n } = useTranslation(['header', 'common', 'cities']);
    const [needsRoleSelection, setNeedsRoleSelection] = useState(false);

    const [showAuthModal, setShowAuthModal] = useState(false);
    const [cities, setCities] = useState<City[]>([]);
    const [selectedCity, setSelectedCity] = useState<string>(() => {
        const savedCity = localStorage.getItem('selectedCity');
        return savedCity || t('header:location');
    });
    const [showCityModal, setShowCityModal] = useState(false);
    const [showLangDropdown, setShowLangDropdown] = useState(false);
    const [showConfirmationBanner, setShowConfirmationBanner] = useState<boolean>(() => {
        const token = getAuthToken();
        if (!token) return false;

        const userDataStr = localStorage.getItem('userData');
        if (userDataStr) {
            try {
                const userData: UserData = JSON.parse(userDataStr);
                return userData.approved === false;
            } catch {
                return false;
            }
        }
        return false;
    });
    const [isLoading, setIsLoading] = useState(false);
    const [showLogo, setShowLogo] = useState(false);
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

    const languages = [
        { code: 'tj' as Language, name: 'ТҶ', fullName: 'Тоҷикӣ' },
        { code: 'ru' as Language, name: 'РУ', fullName: 'Русский' },
        { code: 'en' as Language, name: 'EN', fullName: 'English' },
    ];

    const currentLanguage = languages.find(lang => lang.code === i18n.language) || languages[1];

    const getDisplayCityName = () => {
        if (selectedCity === 'header:location') {
            return t('header:location');
        }
        return t(`cities:${selectedCity}`, { defaultValue: selectedCity });
    };

    useEffect(() => {
        const fetchCities = async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/api/cities`);
                const data = await response.json();
                console.log('Cities from server:', data.map((city: City) => city.title));
                setCities(data);
            } catch (error) {
                console.error('Error fetching cities:', error);
            }
        };

        fetchCities();
    }, [API_BASE_URL]);

    useEffect(() => {
        checkIfNeedsRoleSelection();

        // Обновляем при изменении пути
        const interval = setInterval(checkIfNeedsRoleSelection, 30000);
        return () => clearInterval(interval);
    }, [location.pathname]);

    useEffect(() => {
        const media = window.matchMedia("(max-width: 480px)");
        setShowLogo(media.matches);
        const handler = () => setShowLogo(media.matches);
        media.addEventListener("change", handler);
        return () => media.removeEventListener("change", handler);
    }, []);

    useEffect(() => {
        const checkAccountConfirmation = async () => {
            const token = getAuthToken();
            console.log('Token from localStorage:', token);

            if (!token) {
                console.log('No token found, hiding banner');
                setShowConfirmationBanner(false);
                return;
            }

            try {
                console.log('Fetching fresh user data from server with token:', token.substring(0, 20) + '...');

                const response = await fetch(`${API_BASE_URL}/api/users/me`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token.trim()}`,
                        'Accept': 'application/json',
                        'Content-Type': 'application/json',
                    },
                    credentials: 'include',
                });

                console.log('Response status:', response.status);

                if (!response.ok) {
                    const errorText = await response.text();
                    console.error('Server error:', errorText);

                    if (response.status === 401) {
                        console.error('Unauthorized: Token is invalid or expired');
                        removeAuthToken();
                        setShowConfirmationBanner(false);
                        return;
                    }

                    console.log('Cannot fetch user data, hiding banner for safety');
                    setShowConfirmationBanner(false);
                    return;
                }

                const userData: UserData = await response.json();
                localStorage.setItem('userData', JSON.stringify(userData));
                setShowConfirmationBanner(userData.approved === false);
            } catch (error) {
                console.error('Error checking account confirmation:', error);
                setShowConfirmationBanner(false);
            }
        };

        checkAccountConfirmation();
        const interval = setInterval(checkAccountConfirmation, 60000);
        return () => clearInterval(interval);
    }, [location.pathname]);

    const checkIfNeedsRoleSelection = async () => {
        const token = getAuthToken();
        if (!token) {
            setNeedsRoleSelection(false);
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/api/users/me`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token.trim()}`,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
            });

            if (response.ok) {
                const userData: UserData = await response.json();
                localStorage.setItem('userData', JSON.stringify(userData));

                // Проверяем, авторизован ли через Google и имеет ли роль
                const isGoogleAuth = userData.oauthType?.googleId;
                const hasRole = userData.roles && userData.roles.length > 0;

                // Если авторизован через Google и нет роли - нужен выбор роли
                setNeedsRoleSelection(isGoogleAuth && !hasRole);
            } else {
                setNeedsRoleSelection(false);
            }
        } catch (error) {
            console.error('Error checking user role:', error);
            setNeedsRoleSelection(false);
        }
    };

    const handleResendConfirmationFromHeader = async () => {
        setIsLoading(true);
        const token = getAuthToken();
        if (!token) {
            alert(t('header:confirmationBanner.tokenError'));
            setIsLoading(false);
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/api/confirm-account-tokenless/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });

            console.log('Resend confirmation response status:', response.status);

            if (response.ok) {
                alert(t('header:confirmationBanner.emailSent'));
            } else if (response.status === 409) {
                const errorText = await response.text();
                let errorMessage = t('header:confirmationBanner.sendError');

                try {
                    const errorData = JSON.parse(errorText);
                    errorMessage = errorData.detail || errorData.message || errorMessage;
                } catch {
                    errorMessage = errorText || `${t('common:error')} ${response.status}`;
                }

                alert(`${t('header:confirmationBanner.warning')}: ${errorMessage}`);

                const refreshResponse = await fetch(`${API_BASE_URL}/api/users/me`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Accept': 'application/json',
                    },
                });

                if (refreshResponse.ok) {
                    const userData: UserData = await refreshResponse.json();
                    localStorage.setItem('userData', JSON.stringify(userData));
                    setShowConfirmationBanner(userData.approved === false);
                }
            } else {
                const errorText = await response.text();
                let errorMessage = t('header:confirmationBanner.sendErrorRetry');

                try {
                    const errorData = JSON.parse(errorText);
                    errorMessage = errorData.detail || errorData.message || errorMessage;
                } catch {
                    errorMessage = `${t('common:error')} ${response.status}: ${errorText}`;
                }

                alert(errorMessage);
            }
        } catch (error) {
            console.error('Error resending confirmation:', error);
            alert(t('header:confirmationBanner.networkError'));
        } finally {
            setIsLoading(false);
        }
    };

    const handleCitySelect = (cityTitle: string) => {
        const cityKey = cityTitle.toLowerCase().replace(/\s+/g, '_');
        setSelectedCity(cityKey);
        localStorage.setItem('selectedCity', cityKey);
        setShowCityModal(false);
        window.dispatchEvent(new Event('cityChanged'));
    };

    const handleLanguageChange = (langCode: Language) => {
        changeLanguage(langCode);
        setShowLangDropdown(false);

        setTimeout(() => {
            window.dispatchEvent(new Event('languageChanged'));
        }, 100);
    };

    const getActivePage = () => {
        switch (location.pathname) {
            case "/":
            case "/orders":
                return "orders";
            case "/favorites":
                return "favorites";
            case "/chats":
                return "chats";
            case "/profile":
                return "profile";
            default:
                return "orders";
        }
    };

    const isActivePage = getActivePage();
    const isAuthenticated = !!getAuthToken();

    const handleProfileClick = (e: React.MouseEvent) => {
        const token = getAuthToken();

        if (!token) {
            e.preventDefault();
            handleEnterBtnClick();
        } else if (needsRoleSelection) {
            e.preventDefault();
            // Открываем модалку выбора роли
            if (onOpenAuthModal) {
                onOpenAuthModal();
            } else {
                setShowAuthModal(true);
            }
        }
    };

    const handleEnterBtnClick = () => {
        if (onOpenAuthModal) {
            onOpenAuthModal();
        } else {
            setShowAuthModal(true);
        }
    };

    const closeAuthModal = () => {
        setShowAuthModal(false);

        setTimeout(() => {
            const checkAccountConfirmation = async () => {
                const token = getAuthToken();
                if (!token) return;

                try {
                    const response = await fetch(`${API_BASE_URL}/api/users/me`, {
                        method: 'GET',
                        headers: {
                            'Authorization': `Bearer ${token.trim()}`,
                            'Accept': 'application/json',
                        },
                    });

                    if (response.ok) {
                        const userData: UserData = await response.json();
                        localStorage.setItem('userData', JSON.stringify(userData));
                        setShowConfirmationBanner(userData.approved === false);
                    }
                } catch (error) {
                    console.error('Error checking confirmation:', error);
                }
            };
            checkAccountConfirmation();
        }, 500);
    };

    const handleAdBtnClick = () => {
        navigate('/orders');
    };

    return (
        <header className={styles.header}>
            {showConfirmationBanner && isAuthenticated && (
                <div className={styles.confirmationBanner}>
                    <div className={styles.confirmationBannerContent}>
                        <div className={styles.confirmationBannerText}>
                            <svg
                                width="20"
                                height="20"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                className={styles.confirmationBannerIcon}
                            >
                                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                            </svg>
                            <span>
                                {t('header:confirmationBanner.message')}
                            </span>
                        </div>
                        <button
                            onClick={handleResendConfirmationFromHeader}
                            className={styles.confirmationBannerButton}
                            disabled={isLoading}
                        >
                            {isLoading ? t('header:confirmationBanner.sending') : t('header:confirmationBanner.resend')}
                        </button>
                        <button
                            onClick={() => setShowConfirmationBanner(false)}
                            className={styles.confirmationBannerClose}
                        >
                            ×
                        </button>
                    </div>
                </div>
            )}

            <div className={styles.header_top}>
                <div className={styles.headerWrap}>
                    <div className={styles.locate} onClick={() => setShowCityModal(true)}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <g clipPath="url(#clip0_324_1115)">
                                <g clipPath="url(#clip1_324_1115)">
                                    <path d="M19.6404 9.14C19.6404 15.82 12.0004 22.5 12.0004 22.5C12.0004 22.5 4.36035 15.82 4.36035 9.14C4.36035 7.11375 5.16528 5.17048 6.59806 3.7377C8.03083 2.30493 9.9741 1.5 12.0004 1.5C14.0266 1.5 15.9699 2.30493 17.4026 3.7377C18.8354 5.17048 19.6404 7.11375 19.6404 9.14Z" stroke="#3A54DA" strokeWidth="2" strokeMiterlimit="10"/>
                                    <path d="M12.0006 11.9998C13.5802 11.9998 14.8606 10.7193 14.8606 9.13979C14.8606 7.56025 13.5802 6.27979 12.0006 6.27979C10.4211 6.27979 9.14062 7.56025 9.14062 9.13979C9.14062 10.7193 10.4211 11.9998 12.0006 11.9998Z" stroke="#3A54DA" strokeWidth="2" strokeMiterlimit="10"/>
                                </g>
                            </g>
                            <defs>
                                <clipPath id="clip0_324_1115">
                                    <rect width="24" height="24" fill="white"/>
                                </clipPath>
                                <clipPath id="clip1_324_1115">
                                    <rect width="24" height="24" fill="white"/>
                                </clipPath>
                            </defs>
                        </svg>
                        <span className={styles.locate_title}>
                            {getDisplayCityName()}
                        </span>
                    </div>
                    <div className={styles.rightPart}>
                        <div className={styles.rightPart_lang}>
                            <div className={styles.rightPart_lang__box} onClick={() => setShowLangDropdown(!showLangDropdown)}>
                                <div className={styles.language_selector}>
                                    <span className={styles.current_language}>{currentLanguage.name}</span>
                                    <svg width="17" height="10" viewBox="0 0 17 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M0.707031 0.707031L8.35703 8.35703L16.007 0.707031" stroke="black" strokeWidth="2" strokeMiterlimit="10"/>
                                    </svg>
                                </div>

                                {showLangDropdown && (
                                    <div className={styles.language_dropdown}>
                                        {languages.map((lang) => (
                                            <div
                                                key={lang.code}
                                                className={`${styles.language_option} ${currentLanguage.code === lang.code ? styles.selected : ''}`}
                                                onClick={() => handleLanguageChange(lang.code)}
                                            >
                                                <span className={styles.language_code}>{lang.name}</span>
                                                <span className={styles.language_name}>{lang.fullName}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className={styles.rightPart_buttons}>
                                <AdBtn onClick={() => handleAdBtnClick()} />
                                <EnterBtn
                                    isModalOpen={showAuthModal}
                                    onModalClose={closeAuthModal}
                                    onClick={handleEnterBtnClick}
                                    onLoginSuccess={() => {
                                        setTimeout(() => {
                                            const userDataStr = localStorage.getItem('userData');
                                            if (userDataStr) {
                                                try {
                                                    const userData: UserData = JSON.parse(userDataStr);
                                                    setShowConfirmationBanner(userData.approved === false);
                                                } catch (error) {
                                                    console.error('Error parsing user data:', error);
                                                }
                                            }
                                        }, 500);
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div className={styles.bottomHeader}>
                <div className={styles.bottomHeader_wrap}>
                    <Link to="/" className={styles.bottomHeader_logo}>
                        {!showLogo ? (
                            <svg width="301" height="50" viewBox="0 0 301 50" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M28.929 20.9145C28.392 21.5877 28.5758 22.1222 29.5472 23.2972C30.8578 24.4875 31.5488 24.8045 32.6957 24.9859L44.5009 20.1881C45.344 19.9571 44.7288 19.1333 43.7295 17.9892C42.7298 16.8457 41.5773 15.8856 40.7341 16.1167L28.929 20.9145Z" fill="#A5A5A5" stroke="#A5A5A5"/>
                                <path d="M28.9403 28.2434C28.1151 27.9975 27.6883 28.3679 26.962 29.7084C26.3487 31.3692 26.3133 32.1285 26.5742 33.26L35.4408 42.4122C35.9706 43.1077 36.5043 42.2289 37.1914 40.8741C37.8778 39.5192 38.3368 38.0911 37.807 37.3956L28.9403 28.2434Z" fill="#A5A5A5" stroke="#A5A5A5"/>
                                <path d="M22.6953 33.2241C22.5156 32.3819 21.9859 32.1849 20.4613 32.1902C18.7097 32.4481 18.0264 32.7811 17.1584 33.5525L13.3771 45.7214C13.0207 46.5197 14.0478 46.5668 15.5661 46.5203C17.0843 46.4731 18.5576 46.1913 18.914 45.393L22.6953 33.2241Z" fill="#A5A5A5" stroke="#A5A5A5"/>
                                <path d="M16.6089 28.9559C17.1968 28.3267 17.0553 27.7795 16.1786 26.5322C14.9648 25.2432 14.3007 24.8733 13.1714 24.6029L1.02785 28.4647C0.169202 28.6292 0.718307 29.4985 1.62517 30.7171C2.53257 31.9352 3.60668 32.9822 4.46533 32.8177L16.6089 28.9559Z" fill="#A5A5A5" stroke="#A5A5A5"/>
                                <path d="M14.3482 21.0488C15.3958 21.4201 15.9192 21.0996 16.783 19.8226C17.4929 18.1995 17.5091 17.4224 17.1386 16.2196L5.63899 5.52533C4.94636 4.73325 4.30752 5.56224 3.49343 6.85951C2.68026 8.15713 2.15595 9.56251 2.8486 10.3546L14.3482 21.0488Z" fill="#A5A5A5" stroke="#A5A5A5"/>
                                <path d="M19.5 25.2985C19.5183 27.0982 20.0016 27.7107 21.5 28.2985C23.2689 28.4569 24.0026 28.0415 25 26.7985L31 3.29854C31.5 1.79936 30.5 1.29936 29 0.798539C27.5 0.299316 26 0.299335 25.5 1.79854L19.5 25.2985Z" fill="#3A54DA" stroke="#3A54DA"/>
                                <path d="M65.826 39.0003C63.922 39.0003 62.322 38.6003 61.026 37.8003C59.746 36.9843 58.85 35.8563 58.338 34.4163C57.826 32.9763 57.754 31.2963 58.122 29.3763L61.338 14.2803H67.482L64.506 28.3203C64.218 29.9523 64.426 31.2083 65.13 32.0883C65.85 32.9683 66.994 33.4083 68.562 33.4083C69.602 33.4083 70.562 33.1923 71.442 32.7603C72.322 32.3123 73.074 31.6723 73.698 30.8403C74.322 30.0083 74.762 29.0003 75.018 27.8163L77.898 14.2803H84.042L78.93 38.2803H73.506L74.154 35.2083C73.146 36.3603 71.946 37.2803 70.554 37.9683C69.162 38.6563 67.586 39.0003 65.826 39.0003ZM95.5961 38.9763C93.5481 38.9763 91.5641 38.6563 89.6441 38.0163C87.7241 37.3603 86.1321 36.4083 84.8681 35.1603L87.7961 31.0563C88.9161 32.0323 90.2041 32.8083 91.6601 33.3843C93.1161 33.9443 94.5561 34.2243 95.9801 34.2243C97.3561 34.2243 98.4361 33.9603 99.2201 33.4323C100.02 32.9043 100.42 32.1683 100.42 31.2243C100.42 30.5843 100.092 30.0883 99.4361 29.7363C98.7801 29.3683 97.5801 28.9443 95.8361 28.4643C93.1641 27.7763 91.1961 26.9043 89.9321 25.8483C88.6681 24.7763 88.0361 23.4003 88.0361 21.7203C88.0361 20.0403 88.4841 18.5683 89.3801 17.3043C90.2921 16.0403 91.5161 15.0643 93.0521 14.3763C94.5881 13.6723 96.3081 13.3203 98.2121 13.3203C100.244 13.3203 102.116 13.6403 103.828 14.2803C105.54 14.9203 106.956 15.7923 108.076 16.8963L105.22 21.0963C104.644 20.4883 103.948 19.9603 103.132 19.5123C102.332 19.0483 101.476 18.6963 100.564 18.4563C99.6521 18.2003 98.7401 18.0723 97.8281 18.0723C96.6121 18.0723 95.6201 18.3203 94.8521 18.8163C94.1001 19.3123 93.7241 20.0163 93.7241 20.9283C93.7241 21.5843 94.0601 22.1043 94.7321 22.4883C95.4201 22.8723 96.5881 23.3043 98.2361 23.7843C100.972 24.5363 102.956 25.4163 104.188 26.4243C105.436 27.4323 106.06 28.7443 106.06 30.3603C106.06 32.1043 105.604 33.6243 104.692 34.9203C103.796 36.2003 102.556 37.2003 100.972 37.9203C99.4041 38.6243 97.6121 38.9763 95.5961 38.9763ZM121.175 39.0003C118.471 39.0003 116.479 38.2643 115.199 36.7923C113.935 35.3203 113.583 33.2243 114.143 30.5043L119.063 7.32027H125.207L123.719 14.2803H130.031L128.975 19.2723H122.663L120.527 29.2803C120.239 30.6563 120.303 31.7043 120.719 32.4243C121.135 33.1283 122.007 33.4803 123.335 33.4803C123.847 33.4803 124.335 33.4243 124.799 33.3123C125.279 33.2003 125.727 33.0563 126.143 32.8803L126.071 37.9923C125.383 38.2963 124.615 38.5363 123.767 38.7123C122.919 38.9043 122.055 39.0003 121.175 39.0003ZM111.455 19.2723L112.511 14.2803H118.271L117.215 19.2723H111.455ZM143.573 39.0003C141.109 39.0003 138.973 38.4883 137.165 37.4643C135.373 36.4403 133.981 35.0723 132.989 33.3603C132.013 31.6323 131.525 29.7203 131.525 27.6243C131.525 25.7043 131.909 23.9043 132.677 22.2243C133.461 20.5283 134.525 19.0323 135.869 17.7363C137.229 16.4243 138.781 15.4003 140.525 14.6643C142.269 13.9283 144.117 13.5603 146.069 13.5603C148.517 13.5603 150.637 14.0723 152.429 15.0963C154.237 16.1203 155.637 17.4963 156.629 19.2243C157.621 20.9363 158.117 22.8243 158.117 24.8883C158.117 26.8083 157.725 28.6163 156.941 30.3123C156.173 32.0083 155.109 33.5123 153.749 34.8243C152.405 36.1203 150.861 37.1443 149.117 37.8963C147.373 38.6323 145.525 39.0003 143.573 39.0003ZM144.077 33.6243C145.677 33.6243 147.069 33.2323 148.253 32.4483C149.437 31.6643 150.349 30.6323 150.989 29.3523C151.645 28.0723 151.973 26.6803 151.973 25.1763C151.973 23.8963 151.701 22.7923 151.157 21.8643C150.629 20.9203 149.877 20.2003 148.901 19.7043C147.941 19.1923 146.821 18.9363 145.541 18.9363C143.957 18.9363 142.573 19.3283 141.389 20.1123C140.205 20.8803 139.285 21.9043 138.629 23.1843C137.989 24.4483 137.669 25.8403 137.669 27.3603C137.669 28.6403 137.933 29.7523 138.461 30.6963C139.005 31.6243 139.757 32.3443 140.717 32.8563C141.677 33.3683 142.797 33.6243 144.077 33.6243ZM161.479 49.0803C160.359 49.0803 159.263 48.9443 158.191 48.6723C157.119 48.4163 156.127 47.9443 155.215 47.2563L157.567 42.1683C158.079 42.5843 158.663 42.8963 159.319 43.1043C159.991 43.3283 160.623 43.4403 161.215 43.4403C162.159 43.4403 162.951 43.2243 163.591 42.7923C164.231 42.3763 164.783 41.7203 165.247 40.8243L166.303 38.7123L161.935 14.2803H168.535L171.007 32.3763L180.535 14.2803H187.327L171.511 42.1203C170.503 43.8643 169.463 45.2403 168.391 46.2483C167.319 47.2723 166.207 48.0003 165.055 48.4323C163.903 48.8643 162.711 49.0803 161.479 49.0803ZM198.933 39.0003C196.469 39.0003 194.333 38.4883 192.525 37.4643C190.733 36.4403 189.341 35.0723 188.349 33.3603C187.373 31.6323 186.885 29.7203 186.885 27.6243C186.885 25.7043 187.269 23.9043 188.037 22.2243C188.821 20.5283 189.885 19.0323 191.229 17.7363C192.589 16.4243 194.141 15.4003 195.885 14.6643C197.629 13.9283 199.477 13.5603 201.429 13.5603C203.877 13.5603 205.997 14.0723 207.789 15.0963C209.597 16.1203 210.997 17.4963 211.989 19.2243C212.981 20.9363 213.477 22.8243 213.477 24.8883C213.477 26.8083 213.085 28.6163 212.301 30.3123C211.533 32.0083 210.469 33.5123 209.109 34.8243C207.765 36.1203 206.221 37.1443 204.477 37.8963C202.733 38.6323 200.885 39.0003 198.933 39.0003ZM199.437 33.6243C201.037 33.6243 202.429 33.2323 203.613 32.4483C204.797 31.6643 205.709 30.6323 206.349 29.3523C207.005 28.0723 207.333 26.6803 207.333 25.1763C207.333 23.8963 207.061 22.7923 206.517 21.8643C205.989 20.9203 205.237 20.2003 204.261 19.7043C203.301 19.1923 202.181 18.9363 200.901 18.9363C199.317 18.9363 197.933 19.3283 196.749 20.1123C195.565 20.8803 194.645 21.9043 193.989 23.1843C193.349 24.4483 193.029 25.8403 193.029 27.3603C193.029 28.6403 193.293 29.7523 193.821 30.6963C194.365 31.6243 195.117 32.3443 196.077 32.8563C197.037 33.3683 198.157 33.6243 199.437 33.6243ZM231.534 39.0003C229.838 39.0003 228.31 38.7443 226.95 38.2323C225.59 37.7043 224.446 36.9843 223.518 36.0723C222.59 35.1443 221.934 34.0963 221.55 32.9283L222.702 32.2083L221.406 38.2803H215.982L223.326 3.72027H229.446L226.038 19.7763L225.006 17.8803C226.238 16.5203 227.566 15.4643 228.99 14.7123C230.414 13.9443 232.078 13.5603 233.982 13.5603C236.254 13.5603 238.214 14.0483 239.862 15.0243C241.51 15.9843 242.774 17.2963 243.654 18.9603C244.55 20.6083 244.998 22.4723 244.998 24.5523C244.998 26.5043 244.662 28.3523 243.99 30.0963C243.318 31.8243 242.374 33.3603 241.158 34.7043C239.942 36.0323 238.518 37.0803 236.886 37.8483C235.254 38.6163 233.47 39.0003 231.534 39.0003ZM230.982 33.6003C232.566 33.6003 233.942 33.2083 235.11 32.4243C236.294 31.6243 237.206 30.5763 237.846 29.2803C238.502 27.9843 238.83 26.5763 238.83 25.0563C238.83 23.8083 238.558 22.7283 238.014 21.8163C237.486 20.8883 236.742 20.1763 235.782 19.6803C234.838 19.1843 233.726 18.9363 232.446 18.9363C230.846 18.9363 229.454 19.3203 228.27 20.0883C227.102 20.8563 226.19 21.8803 225.534 23.1603C224.878 24.4243 224.55 25.8083 224.55 27.3123C224.55 28.5923 224.814 29.7043 225.342 30.6483C225.886 31.5923 226.638 32.3203 227.598 32.8323C228.574 33.3443 229.702 33.6003 230.982 33.6003ZM251.195 39.0003C250.123 39.0003 249.219 38.6803 248.483 38.0403C247.747 37.4003 247.379 36.5683 247.379 35.5443C247.379 34.6323 247.595 33.8483 248.027 33.1923C248.475 32.5363 249.043 32.0323 249.731 31.6803C250.435 31.3283 251.179 31.1523 251.963 31.1523C253.051 31.1523 253.955 31.4723 254.675 32.1123C255.395 32.7363 255.755 33.5763 255.755 34.6323C255.755 35.5283 255.539 36.3043 255.107 36.9603C254.691 37.6003 254.131 38.0963 253.427 38.4483C252.739 38.8163 251.995 39.0003 251.195 39.0003ZM269.628 39.0003C266.924 39.0003 264.932 38.2643 263.652 36.7923C262.388 35.3203 262.036 33.2243 262.596 30.5043L267.516 7.32027H273.66L272.172 14.2803H278.484L277.428 19.2723H271.116L268.98 29.2803C268.692 30.6563 268.756 31.7043 269.172 32.4243C269.588 33.1283 270.46 33.4803 271.788 33.4803C272.3 33.4803 272.788 33.4243 273.252 33.3123C273.732 33.2003 274.18 33.0563 274.596 32.8803L274.524 37.9923C273.836 38.2963 273.068 38.5363 272.22 38.7123C271.372 38.9043 270.508 39.0003 269.628 39.0003ZM259.908 19.2723L260.964 14.2803H266.724L265.668 19.2723H259.908ZM276.565 49.0803C275.365 49.0803 274.333 48.9443 273.469 48.6723C272.589 48.4163 271.781 48.0483 271.045 47.5683L273.253 43.1763C273.605 43.4003 273.989 43.5763 274.405 43.7043C274.805 43.8323 275.293 43.8963 275.869 43.8963C276.797 43.8963 277.525 43.6163 278.053 43.0563C278.581 42.5123 278.965 41.6723 279.205 40.5363L284.797 14.2803H290.941L285.253 41.0403C284.901 42.7363 284.317 44.1843 283.501 45.3843C282.685 46.5843 281.685 47.4963 280.501 48.1203C279.333 48.7603 278.021 49.0803 276.565 49.0803ZM289.165 10.2483C288.157 10.2483 287.301 9.94427 286.597 9.33627C285.909 8.72827 285.565 7.94427 285.565 6.98427C285.565 5.78427 285.997 4.80827 286.861 4.05627C287.741 3.28827 288.733 2.90427 289.837 2.90427C290.861 2.90427 291.717 3.20027 292.405 3.79227C293.093 4.38427 293.437 5.18427 293.437 6.19227C293.437 7.34427 293.013 8.31227 292.165 9.09627C291.333 9.86427 290.333 10.2483 289.165 10.2483Z" fill="#A5A5A5"/>
                            </svg>
                        ): (
                            <svg width="46" height="48" viewBox="0 0 46 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M28.929 20.9145C28.392 21.5877 28.5758 22.1222 29.5472 23.2972C30.8578 24.4875 31.5488 24.8045 32.6957 24.9859L44.5009 20.1881C45.344 19.9571 44.7288 19.1333 43.7295 17.9892C42.7298 16.8457 41.5773 15.8856 40.7341 16.1167L28.929 20.9145Z" fill="#A5A5A5" stroke="#A5A5A5"/>
                                <path d="M28.9403 28.2434C28.1151 27.9975 27.6883 28.3679 26.962 29.7084C26.3487 31.3692 26.3133 32.1285 26.5742 33.26L35.4408 42.4122C35.9706 43.1077 36.5043 42.2289 37.1914 40.8741C37.8778 39.5192 38.3368 38.0911 37.807 37.3956L28.9403 28.2434Z" fill="#A5A5A5" stroke="#A5A5A5"/>
                                <path d="M22.6953 33.2241C22.5156 32.3819 21.9859 32.1849 20.4613 32.1902C18.7097 32.4481 18.0264 32.7811 17.1584 33.5525L13.3771 45.7214C13.0207 46.5197 14.0478 46.5668 15.5661 46.5203C17.0843 46.4731 18.5576 46.1913 18.914 45.393L22.6953 33.2241Z" fill="#A5A5A5" stroke="#A5A5A5"/>
                                <path d="M16.6089 28.9559C17.1968 28.3267 17.0553 27.7795 16.1786 26.5322C14.9648 25.2432 14.3007 24.8733 13.1714 24.6029L1.02785 28.4647C0.169202 28.6292 0.718307 29.4985 1.62517 30.7171C2.53257 31.9352 3.60668 32.9822 4.46533 32.8177L16.6089 28.9559Z" fill="#A5A5A5" stroke="#A5A5A5"/>
                                <path d="M14.3482 21.0488C15.3958 21.4201 15.9192 21.0996 16.783 19.8226C17.4929 18.1995 17.5091 17.4224 17.1386 16.2196L5.63899 5.52533C4.94636 4.73325 4.30752 5.56224 3.49343 6.85951C2.68026 8.15713 2.15595 9.56251 2.8486 10.3546L14.3482 21.0488Z" fill="#A5A5A5" stroke="#A5A5A5"/>
                                <path d="M19.5 25.2985C19.5183 27.0982 20.0016 27.7107 21.5 28.2985C23.2689 28.4569 24.0026 28.0415 25 26.7985L31 3.29854C31.5 1.79936 30.5 1.29936 29 0.798539C27.5 0.299316 26 0.299335 25.5 1.79854L19.5 25.2985Z" fill="#3A54DA" stroke="#3A54DA"/>
                            </svg>
                        )}
                    </Link>
                    <div className={styles.rightPart_buttons_mobile}>
                        <AdBtn onClick={() => handleAdBtnClick()} />
                        <EnterBtn
                            isModalOpen={showAuthModal}
                            onModalClose={closeAuthModal}
                            onClick={handleEnterBtnClick}
                            onLoginSuccess={() => {
                                setTimeout(() => {
                                    const userDataStr = localStorage.getItem('userData');
                                    if (userDataStr) {
                                        try {
                                            const userData: UserData = JSON.parse(userDataStr);
                                            setShowConfirmationBanner(userData.approved === false);
                                        } catch (error) {
                                            console.error('Error parsing user data:', error);
                                        }
                                    }
                                }, 500);
                            }}
                        />
                    </div>

                    <nav className={styles.bottomHeader_nav}>
                        <ul className={styles.bottomHeader_navList}>
                            <li className={`${styles.bottomHeader_item} ${isActivePage == "orders" ? styles.active : ""}`}>
                                <Link to="/" className={styles.navLink}>
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <g clipPath="url(#clip0_324_3320)">
                                            <g clipPath="url(#clip1_324_3320)">
                                                <path d="M12 3.41L10.09 1.5H1.50003V20.59C1.4987 20.8412 1.5472 21.0902 1.64272 21.3225C1.73823 21.5548 1.87887 21.7659 2.0565 21.9435C2.23412 22.1212 2.44521 22.2618 2.67754 22.3573C2.90987 22.4528 3.15883 22.5013 3.41003 22.5H20.59C20.8412 22.5013 21.0902 22.4528 21.3225 22.3573C21.5548 22.2618 21.7659 22.1212 21.9436 21.9435C22.1212 21.7659 22.2618 21.5548 22.3573 21.3225C22.4529 21.0902 22.5014 20.8412 22.5 20.59V3.41H12Z" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeMiterlimit="10"/>
                                                <path d="M1.5 7.22998H22.5" stroke="white" strokeWidth="2" strokeMiterlimit="10"/>
                                            </g>
                                        </g>
                                        <defs>
                                            <clipPath id="clip0_324_3320">
                                                <rect width="24" height="24" fill="white"/>
                                            </clipPath>
                                            <clipPath id="clip1_324_3320">
                                                <rect width="24" height="24" fill="white"/>
                                            </clipPath>
                                        </defs>
                                    </svg>
                                    <p>{t('header:orders')}</p>
                                </Link>
                            </li>
                            <li className={`${styles.bottomHeader_item} ${isActivePage === "favorites" ? styles.active : ""}`}>
                                <Link to="/favorites" className={styles.navLink}>
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <g clipPath="url(#clip0_324_3328)">
                                            <g clipPath="url(#clip1_324_3328)">
                                                <path d="M16.77 2.4502C15.7961 2.47111 14.8444 2.74481 14.0081 3.24444C13.1719 3.74408 12.4799 4.45249 12 5.3002C11.5201 4.45249 10.8281 3.74408 9.99186 3.24444C9.15563 2.74481 8.2039 2.47111 7.23 2.4502C4.06 2.4502 1.5 5.3002 1.5 8.8202C1.5 15.1802 12 21.5502 12 21.5502C12 21.5502 22.5 15.1802 22.5 8.8202C22.5 5.3002 19.94 2.4502 16.77 2.4502Z" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeMiterlimit="10"/>
                                            </g>
                                        </g>
                                        <defs>
                                            <clipPath id="clip0_324_3328">
                                                <rect width="24" height="24" fill="white"/>
                                            </clipPath>
                                            <clipPath id="clip1_324_3328">
                                                <rect width="24" height="24" fill="white"/>
                                            </clipPath>
                                        </defs>
                                    </svg>
                                    <p>{t('header:favorites')}</p>
                                </Link>
                            </li>
                            <li className={`${styles.bottomHeader_item} ${isActivePage === "chats" ? styles.active : ""}`}>
                                {isAuthenticated ? (
                                    <Link to="/chats" className={styles.navLink}>
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <g clipPath="url(#clip0_324_3538)">
                                                <g clipPath="url(#clip1_324_3538)">
                                                    <path d="M12 1.47998C6.2 1.47998 1.5 5.74998 1.5 11C1.52866 13.0153 2.23294 14.9626 3.5 16.53L2.5 21.53L9.16 20.2C10.1031 20.4499 11.0744 20.5776 12.05 20.58C17.85 20.58 22.55 16.3 22.55 11.03C22.55 5.75998 17.8 1.47998 12 1.47998Z" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeMiterlimit="10"/>
                                                </g>
                                            </g>
                                            <defs>
                                                <clipPath id="clip0_324_3538">
                                                    <rect width="24" height="24" fill="white"/>
                                                </clipPath>
                                                <clipPath id="clip1_324_3538">
                                                    <rect width="24" height="24" fill="white"/>
                                                </clipPath>
                                            </defs>
                                        </svg>
                                        <p>{t('header:chats')}</p>
                                    </Link>
                                ) : (
                                    <Link
                                        to="/profile"
                                        className={styles.navLink}
                                        onClick={handleProfileClick}
                                    >
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <g clipPath="url(#clip0_324_3538)">
                                                <g clipPath="url(#clip1_324_3538)">
                                                    <path d="M12 1.47998C6.2 1.47998 1.5 5.74998 1.5 11C1.52866 13.0153 2.23294 14.9626 3.5 16.53L2.5 21.53L9.16 20.2C10.1031 20.4499 11.0744 20.5776 12.05 20.58C17.85 20.58 22.55 16.3 22.55 11.03C22.55 5.75998 17.8 1.47998 12 1.47998Z" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeMiterlimit="10"/>
                                                </g>
                                            </g>
                                            <defs>
                                                <clipPath id="clip0_324_3538">
                                                    <rect width="24" height="24" fill="white"/>
                                                </clipPath>
                                                <clipPath id="clip1_324_3538">
                                                    <rect width="24" height="24" fill="white"/>
                                                </clipPath>
                                            </defs>
                                        </svg>
                                        <p>{t('header:chats')}</p>
                                    </Link>
                                )}
                            </li>
                            <li className={`${styles.bottomHeader_item} ${isActivePage === "profile" ? styles.active : ""}`}>
                                {isAuthenticated ? (
                                    <Link to="/profile" className={styles.navLink}>
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
                                             xmlns="http://www.w3.org/2000/svg">
                                            <g clipPath="url(#clip0_324_3342)">
                                                <rect width="24" height="24" fill="white"/>
                                                <g clipPath="url(#clip1_324_3342)">
                                                    <path
                                                        d="M12 12.98C15.1646 12.98 17.73 10.4146 17.73 7.25002C17.73 4.08543 15.1646 1.52002 12 1.52002C8.83543 1.52002 6.27002 4.08543 6.27002 7.25002C6.27002 10.4146 8.83543 12.98 12 12.98Z"
                                                        fill="currentColor"
                                                    />
                                                    <path
                                                        d="M1.5 23.48L1.87 21.43C2.3071 19.0625 3.55974 16.9229 5.41031 15.3828C7.26088 13.8428 9.59246 12.9997 12 13C14.4104 13.0006 16.7443 13.8465 18.5952 15.3905C20.4462 16.9345 21.6971 19.0788 22.13 21.45L22.5 23.5"
                                                        fill="currentColor"
                                                    />
                                                </g>
                                            </g>
                                            <defs>
                                                <clipPath id="clip0_324_3342">
                                                    <rect width="24" height="24" fill="white"/>
                                                </clipPath>
                                                <clipPath id="clip1_324_3342">
                                                    <rect width="24" height="24" fill="white"/>
                                                </clipPath>
                                            </defs>
                                        </svg>
                                        <p>{t('header:profile')}</p>
                                    </Link>
                                ) : (
                                    <Link
                                        to="/profile"
                                        className={styles.navLink}
                                        onClick={handleProfileClick}
                                    >
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
                                             xmlns="http://www.w3.org/2000/svg">
                                            <g clipPath="url(#clip0_324_3342)">
                                                <rect width="24" height="24" fill="white"/>
                                                <g clipPath="url(#clip1_324_3342)">
                                                    <path
                                                        d="M12 12.98C15.1646 12.98 17.73 10.4146 17.73 7.25002C17.73 4.08543 15.1646 1.52002 12 1.52002C8.83543 1.52002 6.27002 4.08543 6.27002 7.25002C6.27002 10.4146 8.83543 12.98 12 12.98Z"
                                                        fill="currentColor"
                                                    />
                                                    <path
                                                        d="M1.5 23.48L1.87 21.43C2.3071 19.0625 3.55974 16.9229 5.41031 15.3828C7.26088 13.8428 9.59246 12.9997 12 13C14.4104 13.0006 16.7443 13.8465 18.5952 15.3905C20.4462 16.9345 21.6971 19.0788 22.13 21.45L22.5 23.5"
                                                        fill="currentColor"
                                                    />
                                                </g>
                                            </g>
                                            <defs>
                                                <clipPath id="clip0_324_3342">
                                                    <rect width="24" height="24" fill="white"/>
                                                </clipPath>
                                                <clipPath id="clip1_324_3342">
                                                    <rect width="24" height="24" fill="white"/>
                                                </clipPath>
                                            </defs>
                                        </svg>
                                        <p>{t('header:profile')}</p>
                                    </Link>
                                )}
                            </li>
                        </ul>
                    </nav>
                </div>
                <div className={styles.mobile_header}>
                    <ul className={styles.bottomHeader_navList}>
                        <li className={`${styles.bottomHeader_item} ${isActivePage == "orders" ? styles.active : ""}`}>
                            <Link to="/" className={styles.navLink}>
                                <p>{t('header:orders')}</p>
                            </Link>
                        </li>
                        <li className={`${styles.bottomHeader_item} ${isActivePage === "favorites" ? styles.active : ""}`}>
                            <Link to="/favorites" className={styles.navLink}>
                                <p>{t('header:favorites')}</p>
                            </Link>
                        </li>
                        <li className={`${styles.bottomHeader_item} ${isActivePage === "chats" ? styles.active : ""}`}>
                            {isAuthenticated ? (
                                <Link to="/chats" className={styles.navLink}>
                                    <p>{t('header:chats')}</p>
                                </Link>
                            ) : (
                                <Link
                                    to="/profile"
                                    className={styles.navLink}
                                    onClick={handleProfileClick}
                                >
                                    <p>{t('header:chats')}</p>
                                </Link>
                            )}
                        </li>
                        <li className={`${styles.bottomHeader_item} ${isActivePage === "profile" ? styles.active : ""}`}>
                            {isAuthenticated ? (
                                <Link to="/profile" className={styles.navLink}>
                                    <p>{t('header:profile')}</p>
                                </Link>
                            ) : (
                                <Link
                                    to="/profile"
                                    className={styles.navLink}
                                    onClick={handleProfileClick}
                                >
                                    <p>{t('header:profile')}</p>
                                </Link>
                            )}
                        </li>
                    </ul>
                </div>
            </div>
            {showCityModal && (
                <div className={styles.modalOverlay} onClick={() => setShowCityModal(false)}>
                    <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h2>{t('header:selectCity')}</h2>
                            <button className={styles.closeButton} onClick={() => setShowCityModal(false)}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                </svg>
                            </button>
                        </div>
                        <div className={styles.cityList}>
                            {cities.map(city => (
                                <div
                                    key={city.id}
                                    className={`${styles.cityItem} ${selectedCity === city.title ? styles.selected : ''}`}
                                    onClick={() => handleCitySelect(city.title)}
                                >
                                    {t(`cities:${city.title}`, city.title)}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </header>
    );
}

export default Header;