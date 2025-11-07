import styles from "./Main.module.scss";
import Search from "../../../features/search/Search.tsx";
import {AdBtn} from "../../../shared/ui/button/HeaderButton/AdBtn.tsx";
import About from "../../../widgets/About/About.tsx";
import Category from "../../../widgets/Category/Category.tsx";
import Reviews from "../../../widgets/Reviews/Reviews.tsx";
import {useState} from "react";
import Recommendations from "../../../widgets/Recommendations/Recommendations.tsx";

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

    const masters = [
        {
            id: 1,
            name: "Поиск проверенных мастеров",
            title: 'Найдите специалиста нужного профиля в пару кликов: стройка, ремонт, сантехника и многое другое.'
        },
        {
            id: 2,
            name: "Поиск проверенных мастеров",
            title: 'Найдите специалиста нужного профиля в пару кликов: стройка, ремонт, сантехника и многое другое.'
        },
        {
            id: 3,
            name: "Поиск проверенных мастеров",
            title: 'Найдите специалиста нужного профиля в пару кликов: стройка, ремонт, сантехника и многое другое.'
        },
        {
            id: 4,
            name: "Поиск проверенных мастеров",
            title: 'Найдите специалиста нужного профиля в пару кликов: стройка, ремонт, сантехника и многое другое.'
        },
    ]

    const worker = [
        {
            id: 1,
            name: 'Заказчики',
            title: 'Здесь клиенты находят проверенных специалистов для ремонта, строительства и других услуг',
            img: './fonTest1.png'
        },
        {
            id: 2,
            name: 'Мастера',
            title: 'Здесь мастера получают реальные заказы и новые возможности для заработка.',
            img: './fonTest1.png'
        }
    ]

    const handleSearchResults = (results: SearchResult[]) => {
        setShowResults(results.length > 0);
    };

    const handleFilterToggle = (isVisible: boolean) => {
        console.log(isVisible);
    };

    return (
        <div className={styles.main}>
            <Search
                onSearchResults={handleSearchResults}
                onFilterToggle={handleFilterToggle}
            />

            {!showResults && (
                <>
                    <div className={styles.performers}>
                        {worker.map(work => (
                            <div className={styles.performers_orders} key={work.id}>
                                <div className={styles.performers_orders_welcome}>
                                    <div className={styles.performers_orders_about}>
                                        <h2 className={styles.performers_orders_title}>
                                            {work.name}
                                        </h2>
                                        {work.title}
                                    </div>
                                    <AdBtn/>
                                </div>
                                <img src={work.img} alt="fonTest1"/>
                            </div>
                        ))}
                    </div>

                    <div className={styles.searchMasters}>
                        {masters.map(master => (
                            <div className={styles.searchMasters_item} key={master.id}>
                                <img src="./fonTest2.png" alt="fonTest2"/>
                                <h3 className={styles.searchMasters_item_welc}>
                                    {master.name}
                                </h3>
                                <p className={styles.searchMasters_item_title}>
                                    {master.title}
                                </p>
                            </div>
                        ))}
                    </div>
                    <About/>
                    <Category/>
                    <Reviews/>
                    <Recommendations/>
                </>
            )}
        </div>
    );
}