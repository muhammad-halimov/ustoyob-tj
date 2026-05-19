import styles from "./Main.module.scss";
import Search from "../search/search/Search";
import { Add } from "../../../shared/ui/Button/Header/Add/Add";
import Category from "../categories/Category";
import { MainReviewsSection } from "../reviews";
import Recommendations from "../recommendations/Recommendations";
import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ROUTES } from '../../../app/routers/routes';
import { getUserRole } from "../../../utils/auth";
import { useTranslation } from "react-i18next";
import Auth from "../../../shared/ui/Modal/Auth/Auth";
import Status from "../../../shared/ui/Modal/Status/Status";

import "swiper/css";
import "swiper/css/pagination";
import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination } from 'swiper/modules';
import CookieConsentBanner from "../../../widgets/Banners/CookieConsentBanner/CookieConsentBanner";

import type { TicketView } from '../../../entities';

interface MainPageProps {
    onOpenAuthModal?: () => void;
}

export function MainPage({ onOpenAuthModal }: MainPageProps) {
    const [showResults, setShowResults] = useState(false);
    const [modalMessage, setModalMessage] = useState<string | null>(null);
    const [showAuthModal, setShowAuthModal] = useState(false);
    
    const { t } = useTranslation(['components', 'pages']);

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

    const handleSearchResults = useCallback((results: TicketView[]) => {
        setShowResults(results.length > 0);
    }, []);

    const handleFilterToggle = useCallback((isVisible: boolean) => {
        console.log(isVisible);
    }, []);

    const handleAdBtnClick = (workerType: "client" | "master") => {
        if (workerType === "master" && userRole === "master") {
            navigate(ROUTES.TICKET_CREATE);
        } else if (workerType === "client" && userRole === "client") {
            navigate(ROUTES.TICKET_CREATE);
        } else if (!userRole) {
            setShowAuthModal(true);
        } else {
            setModalMessage(workerType === "master" ? t('roles.mustBeMaster') : t('roles.mustBeClient'));
        }
    };

    return (
        <div className={styles.main}>
            <Search onSearchResults={handleSearchResults} onFilterToggle={handleFilterToggle} />
            <Category />
            {!showResults && (
                <>
                    {/* Desktop: horizontal layout */}
                    <div className={styles.performersDesktop}>
                        {worker.map(work => (
                            <div className={styles.performers_orders} key={work.id}>
                                <div className={styles.performers_orders_welcome}>
                                    <div className={styles.performers_orders_about}>
                                        <h2 className={styles.performers_orders_title}>{work.name}</h2>
                                        {work.title}
                                    </div>
                                    <Add
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

                    {/* Mobile: slider */}
                    <div className={styles.performersMobile}>
                        <Swiper
                            spaceBetween={16}
                            slidesPerView={1.1}
                            pagination={{ clickable: true }}
                            modules={[Pagination]}
                            className={styles.performersSwiper}
                        >
                            {worker.map(work => (
                                <SwiperSlide key={work.id}>
                                    <div className={styles.performers_orders}>
                                        <div className={styles.performers_orders_welcome}>
                                            <div className={styles.performers_orders_about}>
                                                <h2 className={styles.performers_orders_title}>{work.name}</h2>
                                                {work.title}
                                            </div>
                                            <Add
                                                alwaysVisible
                                                text={work.id === 1 ? t('pages.main.postTicket') : t('pages.main.postService')}
                                                onClick={() =>
                                                    handleAdBtnClick(work.id === 1 ? "client" : "master")
                                                }
                                            />
                                        </div>
                                        <img src={work.img} alt="fonTest1" />
                                    </div>
                                </SwiperSlide>
                            ))}
                        </Swiper>
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
                    <div className={styles.recommendationsWrapper}>
                        <h3 className={styles.recommendationsTitle}>{t('pages.recommendations.title')}</h3>
                        <Recommendations />
                    </div>
                    <MainReviewsSection />
                </>
            )}

            {modalMessage && (
                <Status
                    type="warning"
                    isOpen={!!modalMessage}
                    onClose={() => setModalMessage(null)}
                    message={modalMessage}
                />
            )}

            <Auth
                isOpen={showAuthModal}
                onClose={() => setShowAuthModal(false)}
            />
            <CookieConsentBanner/>
        </div>
    );
}