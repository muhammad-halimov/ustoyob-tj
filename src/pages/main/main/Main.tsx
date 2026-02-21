import styles from "./Main.module.scss";
import Search from "../../../features/search/search/Search.tsx";
import { AdBtn } from "../../../shared/ui/Button/HeaderButton/AdBtn.tsx";
import Category from "../categories/Category.tsx";
import { MainReviewsSection } from "../reviews";
import Recommendations from "../recommendations/Recommendations.tsx";
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ROUTES } from '../../../app/routers/routes';
import { getUserRole } from "../../../utils/auth.ts";
import { useTranslation } from "react-i18next";
import AuthModal from "../../../features/auth/AuthModal.tsx";

import "swiper/css";
import CookieConsentBanner from "../../../widgets/Banners/CookieConsentBanner/CookieConsentBanner.tsx";

interface SearchResult {
    id: number;
    title: string;
    price: number;
    unit: string;
    description: string;
    address: string;
    date: string;
    author: string;
    timeAgo: string;
}

interface MainPageProps {
    onOpenAuthModal?: () => void;
}

export function MainPage({ onOpenAuthModal }: MainPageProps) {
    const [showResults, setShowResults] = useState(false);
    const [modalMessage, setModalMessage] = useState<string | null>(null);
    const [showAuthModal, setShowAuthModal] = useState(false);
    
    const { t } = useTranslation('components');

    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

    const userRole = getUserRole();

    useEffect(() => {
        const checkUrlParams = () => {
            const showAuthModalParam = searchParams.get('showAuthModal');
            const oauthSourceParam = searchParams.get('oauthSource');
            const oauthErrorParam = searchParams.get('oauth_error');

            console.log('URL params check:', {
                showAuthModal: showAuthModalParam,
                oauthSource: oauthSourceParam,
                oauthError: oauthErrorParam
            });

            if (oauthErrorParam) {
                setModalMessage(`Ошибка авторизации: ${decodeURIComponent(oauthErrorParam)}`);

                const newParams = new URLSearchParams(searchParams);
                newParams.delete('oauth_error');
                setSearchParams(newParams);
            }

            if (showAuthModalParam === 'true') {
                console.log('Should open auth modal, source:', oauthSourceParam);

                if (oauthSourceParam === 'google') {
                    const googleCode = localStorage.getItem('googleAuthCode');
                    const googleState = localStorage.getItem('googleAuthState');

                    console.log('Google auth data in localStorage:', {
                        code: googleCode ? 'present' : 'missing',
                        state: googleState ? 'present' : 'missing'
                    });

                    if (googleCode && googleState) {
                        setShowAuthModal(true);

                        // Открываем модалку авторизации
                        if (onOpenAuthModal) {
                            onOpenAuthModal();
                        }
                    }
                }

                // Очищаем URL параметры
                const newParams = new URLSearchParams(searchParams);
                newParams.delete('showAuthModal');
                newParams.delete('oauthSource');
                setSearchParams(newParams, { replace: true });
            }
        };

        checkUrlParams();

        const hasAuthParams = searchParams.has('showAuthModal') ||
            searchParams.has('oauth_error') ||
            searchParams.has('code') ||
            searchParams.has('state');

        if (hasAuthParams) {
            checkUrlParams();
        }

    }, [searchParams, setSearchParams, onOpenAuthModal]);

    useEffect(() => {
        const checkGoogleAuthData = () => {
            const googleCode = localStorage.getItem('googleAuthCode');
            const googleState = localStorage.getItem('googleAuthState');

            if (googleCode && googleState && !userRole) {
                console.log('Found Google auth data, should show role selection');
                setShowAuthModal(true);

                if (onOpenAuthModal) {
                    onOpenAuthModal();
                }
            }
        };

        checkGoogleAuthData();

        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === 'googleAuthCode' || e.key === 'googleAuthState') {
                checkGoogleAuthData();
            }
        };

        window.addEventListener('storage', handleStorageChange);

        return () => {
            window.removeEventListener('storage', handleStorageChange);
        };
    }, [userRole, onOpenAuthModal, t]);

    // Обработчик события сброса всех состояний при клике на лого
    useEffect(() => {
        const handleResetAllStates = () => {
            // Сбрасываем состояния главной страницы
            setShowResults(false);
            setModalMessage(null);
            setShowAuthModal(false);
        };

        window.addEventListener('resetAllStates', handleResetAllStates);
        return () => window.removeEventListener('resetAllStates', handleResetAllStates);
    }, []);

    const worker = [
        { id: 1, name: t('roles.customers'), title: t('roles.customersDesc'), img: "./clientTest.jpg" },
        { id: 2, name: t('roles.masters'), title: t('roles.mastersDesc'), img: "./master.jpg" }
    ];

    const handleSearchResults = (results: SearchResult[]) => {
        setShowResults(results.length > 0);
    };

    const handleFilterToggle = (isVisible: boolean) => {
        console.log(isVisible);
    };

    const handleAdBtnClick = (workerType: "client" | "master") => {
        if (workerType === "master" && userRole === "master") {
            navigate(ROUTES.TICKET_CREATE);
        } else if (workerType === "client" && userRole === "client") {
            navigate(ROUTES.TICKET_CREATE);
        } else if (!userRole) {
            setShowAuthModal(true);
        } else {
            setModalMessage(`Вы должны быть ${workerType === "master" ? "мастером" : "заказчиком"} для этой операции.`);
        }
    };

    return (
        <div className={styles.main}>
            <Search onSearchResults={handleSearchResults} onFilterToggle={handleFilterToggle} />
            <Category />
            {!showResults && (
                <>
                    <div className={styles.performers}>
                        {worker.map(work => (
                            <div className={styles.performers_orders} key={work.id}>
                                <div className={styles.performers_orders_welcome}>
                                    <div className={styles.performers_orders_about}>
                                        <h2 className={styles.performers_orders_title}>{work.name}</h2>
                                        {work.title}
                                    </div>
                                    <AdBtn
                                        alwaysVisible
                                        text={work.id === 1 ? t('pages.main.postTicket') : t('pages.main.postService')}
                                        onClick={() =>
                                            handleAdBtnClick(work.id === 1 ? "client" : "master")
                                        }
                                    />
                                </div>
                                <img src={work.img} alt="fonTest1" />
                            </div>
                        ))}
                    </div>

                    <div className={styles.searchMasters}>
                        {/* MOBILE SLIDER */}
                        {/*<div className={styles.mobileSlider}>*/}
                        {/*    <Swiper*/}
                        {/*        spaceBetween={16}*/}
                        {/*        slidesPerView={1.2}*/}
                        {/*    >*/}
                        {/*        {masters.map(master => (*/}
                        {/*            <SwiperSlide key={master.id}>*/}
                        {/*                <div className={styles.searchMasters_item}>*/}
                        {/*                    <img src="./fonTest2.png" alt="fonTest2" />*/}
                        {/*                    <h3 className={styles.searchMasters_item_welc}>{master.name}</h3>*/}
                        {/*                    <p className={styles.searchMasters_item_title}>{master.title}</p>*/}
                        {/*                </div>*/}
                        {/*            </SwiperSlide>*/}
                        {/*        ))}*/}
                        {/*    </Swiper>*/}
                        {/*</div>*/}

                        {/* DESKTOP GRID */}
                        {/*<div className={styles.desktopGrid}>*/}
                        {/*    {masters.map(master => (*/}
                        {/*        <div className={styles.searchMasters_item} key={master.id}>*/}
                        {/*            <img src="./fonTest2.png" alt="fonTest2" />*/}
                        {/*            <h3 className={styles.searchMasters_item_welc}>{master.name}</h3>*/}
                        {/*            <p className={styles.searchMasters_item_title}>{master.title}</p>*/}
                        {/*        </div>*/}
                        {/*    ))}*/}
                        {/*</div>*/}
                    </div>

                    {/*<About />*/}
                    <Recommendations />
                    <MainReviewsSection />
                </>
            )}

            {modalMessage && (
                <div className={styles.modalOverlay} onClick={() => setModalMessage(null)}>
                    <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
                        <p>{modalMessage}</p>
                        <button className={styles.btnClose} onClick={() => setModalMessage(null)}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <g clipPath="url(#clip0_551_2371)">
                                    <g clipPath="url(#clip1_551_2371)">
                                        <path d="M12 22.5C17.799 22.5 22.5 17.799 22.5 12C22.5 6.20101 17.799 1.5 12 1.5C6.20101 1.5 1.5 6.20101 1.5 12C1.5 17.799 6.20101 22.5 12 22.5Z" stroke="#101010" strokeWidth="2" strokeMiterlimit="10"/>
                                        <path d="M16.7705 7.22998L7.23047 16.77" stroke="#101010" strokeWidth="2" strokeMiterlimit="10"/>
                                        <path d="M7.23047 7.22998L16.7705 16.77" stroke="#101010" strokeWidth="2" strokeMiterlimit="10"/>
                                    </g>
                                </g>
                                <defs>
                                    <clipPath id="clip0_551_2371">
                                        <rect width="24" height="24" fill="white"/>
                                    </clipPath>
                                    <clipPath id="clip1_551_2371">
                                        <rect width="24" height="24" fill="white"/>
                                    </clipPath>
                                </defs>
                            </svg>
                        </button>
                    </div>
                </div>
            )}

            <AuthModal
                isOpen={showAuthModal}
                onClose={() => setShowAuthModal(false)}
            />
            <CookieConsentBanner/>
        </div>
    );
}