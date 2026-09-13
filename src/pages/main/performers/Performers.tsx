import styles from "./Performers.module.scss";
import { Add } from "../../../shared/ui/Button/Header/Add/Add.tsx";
import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination } from "swiper/modules";

import "swiper/css";
import "swiper/css/pagination";

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
}

export function Performers({ items, getButtonText, onItemClick }: PerformersProps) {
    return (
        <>
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
                        <img src={item.img} alt={item.name} />
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
                                    />
                                </div>
                                <img src={item.img} alt={item.name} />
                            </div>
                        </SwiperSlide>
                    ))}
                </Swiper>
            </div>
        </>
    );
}
