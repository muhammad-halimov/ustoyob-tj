import styles from "./Main.module.scss";
import Search from "../../../features/search/Search.tsx";
import { AdBtn } from "../../../shared/ui/button/HeaderButton/AdBtn.tsx";
// import About from "../../../widgets/About/About.tsx";
import Category from "../../../widgets/Category/Category.tsx";
import Reviews from "../../../widgets/Reviews/Reviews.tsx";
import Recommendations from "../../../widgets/Recommendations/Recommendations.tsx";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { getUserRole } from "../../../utils/auth.ts";

// import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";

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

export function MainPage() {
    const [showResults, setShowResults] = useState(false);
    const [modalMessage, setModalMessage] = useState<string | null>(null);
    const navigate = useNavigate();

    const userRole = getUserRole();

    // const masters = [
    //     { id: 1, name: "Поиск проверенных мастеров", title: "Найдите специалиста нужного профиля в пару кликов: стройка, ремонт, сантехника и многое другое." },
    //     { id: 2, name: "Поиск проверенных мастеров2", title: "Найдите специалиста нужного профиля в пару кликов: стройка, ремонт, сантехника и многое другое." },
    //     { id: 3, name: "Поиск проверенных мастеров3", title: "Найдите специалиста нужного профиля в пару кликов: стройка, ремонт, сантехника и многое другое." },
    //     { id: 4, name: "Поиск проверенных мастеров4", title: "Найдите специалиста нужного профиля в пару кликов: стройка, ремонт, сантехника и многое другое." },
    // ];

    const worker = [
        { id: 1, name: "Заказчики", title: "Здесь клиенты находят проверенных специалистов для ремонта, строительства и других услуг", img: "./clientTest.jpg" },
        { id: 2, name: "Мастера", title: "Здесь мастера получают реальные заказы и новые возможности для заработка.", img: "./master.jpg" }
    ];

    const handleSearchResults = (results: SearchResult[]) => {
        setShowResults(results.length > 0);
    };

    const handleFilterToggle = (isVisible: boolean) => {
        console.log(isVisible);
    };

    const handleAdBtnClick = (workerType: "client" | "master") => {
        if (workerType === "master" && userRole === "master") {
            navigate("/profile/services");
        } else if (workerType === "client" && userRole === "client") {
            navigate("/create-ad");
        } else if (!userRole) {
            setModalMessage("Пожалуйста, авторизуйтесь.");
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
                    <Reviews />
                </>
            )}

            {/* Модалка */}
            {modalMessage && (
                <div className={styles.modalOverlay} onClick={() => setModalMessage(null)}>
                    <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
                        <p>{modalMessage}</p>
                        <button className={styles.btnClose} onClick={() => setModalMessage(null)}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <g clipPath="url(#clip0_551_2371)">
                                    <g clipPath="url(#clip1_551_2371)">
                                        <path d="M12 22.5C17.799 22.5 22.5 17.799 22.5 12C22.5 6.20101 17.799 1.5 12 1.5C6.20101 1.5 1.5 6.20101 1.5 12C1.5 17.799 6.20101 22.5 12 22.5Z" stroke="#101010" stroke-width="2" stroke-miterlimit="10"/>
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
        </div>
    );
}
