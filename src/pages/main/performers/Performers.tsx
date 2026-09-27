import styles from "./Performers.module.scss";
import { Add } from "../../../shared/ui/Button/Header/Add/Add.tsx";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination } from "swiper/modules";

import "swiper/css";
import "swiper/css/pagination";
import "swiper/css/navigation";

export interface PerformerItem {
    id: number;
    name: string;
    title: string;
    img: string;
}

interface PerformersProps {
    items: PerformerItem[];
    getButtonText: (item: PerformerItem) => string;
    onItemClick: (item: PerformerItem) => void;
    /** Пропустить брейкпоинты по ширине вьюпорта и всегда показывать компактный
     *  мобильный Swiper-вариант с компактными карточками — нужно, когда компонент
     *  показывается в узком контейнере (модалка) на широком вьюпорте, где обычные
     *  `@media (max-width: 1200px)` сами не сработают. */
    forceMobile?: boolean;
}

export function Performers({ items, getButtonText, onItemClick, forceMobile = false }: PerformersProps) {
    return (
        <div className={`${styles.root} ${forceMobile ? styles.forceMobile : ''}`.trim()}>
            {/* Desktop: horizontal layout */}
            <div className={styles.performersDesktop}>
                {items.map(item => (
                    <div className={styles.performers_orders} key={item.id}>
                        <div className={styles.performers_orders_welcome}>
                            <div className={styles.performers_orders_about}>
                                <h2 className={styles.performers_orders_title}>{item.name}</h2>
                                {item.title}
                            </div>
                            <Add
                                alwaysVisible
                                text={getButtonText(item)}
                                onClick={() => onItemClick(item)}
                            />
                        </div>
                        <img loading="lazy" decoding="async" src={item.img} alt={item.name} />
                    </div>
                ))}
            </div>

            {/* Mobile: slider */}
            <div className={styles.performersMobile}>
                <Swiper
                    spaceBetween={16}
                    // На реальной мобильной странице карточка чуть уже вьюпорта — виден край
                    // следующей (подсказка, что можно свайпнуть). В модалке (forceMobile) карточка
                    // одна на весь узкий контейнер — "подглядывающий" край там же съезжал по
                    // центру и выглядел как случайный отступ, поэтому карточка ровно на всю ширину.
                    slidesPerView={forceMobile ? 1 : 1.1}
                    pagination={{ clickable: true }}
                    navigation={forceMobile}
                    modules={[Pagination, Navigation]}
                    className={styles.performersSwiper}
                >
                    {items.map(item => (
                        <SwiperSlide key={item.id}>
                            <div className={styles.performers_orders}>
                                <div className={styles.performers_orders_welcome}>
                                    <div className={styles.performers_orders_about}>
                                        <h2 className={styles.performers_orders_title}>{item.name}</h2>
                                        {item.title}
                                    </div>
                                    <Add
                                        alwaysVisible
                                        text={getButtonText(item)}
                                        onClick={() => onItemClick(item)}
                                        className={styles.compactButton}
                                    />
                                </div>
                                <img loading="lazy" decoding="async" src={item.img} alt={item.name} />
                            </div>
                        </SwiperSlide>
                    ))}
                </Swiper>
            </div>
        </div>
    );
}
