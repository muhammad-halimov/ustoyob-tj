import style from './Reviews.module.scss';
import { useEffect, useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";

interface Review {
    id: number;
    type: string;
    rating: number;
    description: string;
    ticket?: {
        id: number;
        title: string;
        active: boolean;
        author: {
            id: number;
            email: string;
            name: string;
            surname: string;
            image: string;
        };
        master: {
            id: number;
            email: string;
            name: string;
            surname: string;
            image: string;
        };
        service: boolean;
    };
    images: Array<{
        id: number;
        image: string;
    }>;
    master?: {
        id: number;
        email: string;
        name: string;
        surname: string;
        image: string;
    };
    client?: {
        id: number;
        email: string;
        name: string;
        surname: string;
        image: string;
    };
    createdAt: string;
    updatedAt: string;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

function Reviews() {
    const [isMobile, setIsMobile] = useState(false);
    const [reviews, setReviews] = useState<Review[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth <= 480);
        check();
        window.addEventListener("resize", check);
        return () => window.removeEventListener("resize", check);
    }, []);

    useEffect(() => {
        fetchReviews();
    }, []);

    const fetchReviews = async () => {
        try {
            setIsLoading(true);
            setError(null);

            const response = await fetch(`${API_BASE_URL}/api/reviews`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const reviewsData: Review[] = await response.json();
            console.log('Received reviews:', reviewsData);

            // Убираем строгую фильтрацию по описанию - показываем все отзывы с рейтингом
            const validReviews = reviewsData.filter(review =>
                review.rating > 0 // Только отзывы с рейтингом
            );

            // Сортируем по дате создания (новые сначала)
            const sortedReviews = validReviews.sort((a, b) =>
                new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );

            console.log(`Total reviews from API: ${reviewsData.length}`);
            console.log(`Valid reviews after filtering: ${sortedReviews.length}`);

            // Логируем типы отзывов для отладки
            const masterReviews = sortedReviews.filter(r => r.type === 'master');
            const clientReviews = sortedReviews.filter(r => r.type === 'client');

            console.log(`Master reviews: ${masterReviews.length}`);
            console.log(`Client reviews: ${clientReviews.length}`);

            setReviews(sortedReviews);

        } catch (error) {
            console.error('Error fetching reviews:', error);
            setError('Не удалось загрузить отзывы');
        } finally {
            setIsLoading(false);
        }
    };

    // Функция для получения имени пользователя
    const getUserName = (review: Review): string => {
        if (review.type === 'master' && review.master) {
            return `${review.master.name || ''} ${review.master.surname || ''}`.trim() || 'Мастер';
        } else if (review.type === 'client' && review.client) {
            return `${review.client.name || ''} ${review.client.surname || ''}`.trim() || 'Клиент';
        }
        return 'Пользователь';
    };

    // Функция для получения профессии/специальности - ДОБАВЛЕНО const
    const getUserProfession = (review: Review): string => {
        if (review.type === 'master') {
            return 'Специалист';
        } else if (review.type === 'client' && review.ticket?.title) {
            return `Заказ: ${review.ticket.title}`;
        }
        return 'Пользователь';
    };

    // Функция для получения имени того, кто оставил отзыв
    const getReviewerName = (review: Review): string => {
        if (review.type === 'master' && review.client) {
            return `${review.client.name || ''} ${review.client.surname || ''}`.trim() || 'Клиент';
        } else if (review.type === 'client' && review.master) {
            return `${review.master.name || ''} ${review.master.surname || ''}`.trim() || 'Мастер';
        }
        return 'Пользователь';
    };

    // Функция для форматирования даты
    const formatDate = (dateString: string): string => {
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('ru-RU', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            });
        } catch {
            return 'Дата не указана';
        }
    };

    // Функция для получения URL аватара
    const getAvatarUrl = (review: Review): string => {
        if (review.type === 'master' && review.master?.image) {
            if (review.master.image.startsWith('http')) {
                return review.master.image;
            }
            return `${API_BASE_URL}/images/profile_photos/${review.master.image}`;
        } else if (review.type === 'client' && review.client?.image) {
            if (review.client.image.startsWith('http')) {
                return review.client.image;
            }
            return `${API_BASE_URL}/images/profile_photos/${review.client.image}`;
        }
        return '../fonTest5.png'; // Запасное изображение
    };

    // Функция для обрезки длинного текста
    const truncateText = (text: string, maxLength: number): string => {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    };

    if (isLoading) {
        return (
            <div className={style.reviews}>
                <h3>Отзывы</h3>
                <div className={style.loading}>Загрузка отзывов...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className={style.reviews}>
                <h3>Отзывы</h3>
                <div className={style.error}>{error}</div>
            </div>
        );
    }

    if (reviews.length === 0) {
        return (
            <div className={style.reviews}>
                <h3>Отзывы</h3>
                <div className={style.noReviews}>Пока нет отзывов</div>
            </div>
        );
    }

    return (
        <div className={style.reviews}>
            <h3>Отзывы</h3>

            {/* MOBILE SWIPER */}
            {isMobile ? (
                <div className={style.reviews_slider}>
                    <Swiper
                        spaceBetween={16}
                        slidesPerView={1.1}
                        grabCursor={true}
                    >
                        {reviews.map((review) => (
                            <SwiperSlide key={review.id}>
                                <div className={style.reviews_item}>
                                    <div className={style.reviews_naming}>
                                        <img
                                            className={style.picPhoto}
                                            src={getAvatarUrl(review)}
                                            alt="avatar"
                                            onError={(e) => {
                                                e.currentTarget.src = '../fonTest5.png';
                                            }}
                                        />
                                        <div className={style.reviews_naming_title}>
                                            <h3>{getUserName(review)}</h3>
                                            <p>{getUserProfession(review)}</p>
                                            <div className={style.reviews_naming_raiting}>
                                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                    <g clipPath="url(#clip0_324_2272)">
                                                        <g clipPath="url(#clip1_324_2272)">
                                                            <path d="M12 2.49023L15.51 8.17023L22 9.76023L17.68 14.8502L18.18 21.5102L12 18.9802L5.82 21.5102L6.32 14.8502L2 9.76023L8.49 8.17023L12 2.49023Z" stroke="#3A54DA" strokeWidth="2" strokeMiterlimit="10"/>
                                                            <path d="M12 19V18.98" stroke="black" strokeWidth="2" strokeMiterlimit="10"/>
                                                        </g>
                                                    </g>
                                                    <defs>
                                                        <clipPath id="clip0_324_2272">
                                                            <rect width="24" height="24" fill="white"/>
                                                        </clipPath>
                                                        <clipPath id="clip1_324_2272">
                                                            <rect width="24" height="24" fill="white"/>
                                                        </clipPath>
                                                    </defs>
                                                </svg>
                                                {review.rating.toFixed(1)}
                                            </div>
                                        </div>
                                    </div>

                                    <div className={style.reviews_about}>
                                        <div className={style.reviews_about_title}>
                                            <p>{getReviewerName(review)}</p>
                                            <p>{formatDate(review.createdAt)}</p>
                                        </div>
                                        <p className={style.reviews_about_rev}>
                                            {truncateText(review.description, 120)}
                                        </p>
                                        {review.description.length > 120 && (
                                            <span className={style.reviews_about_more}>Еще</span>
                                        )}

                                        {/* Показ изображений отзыва если есть */}
                                        {review.images && review.images.length > 0 && (
                                            <div className={style.review_images}>
                                                {review.images.map((image) => (
                                                    <img
                                                        key={image.id}
                                                        src={`${API_BASE_URL}${image.image}`}
                                                        alt="Отзыв"
                                                        className={style.review_image}
                                                    />
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </SwiperSlide>
                        ))}
                    </Swiper>
                </div>
            ) : (
                /* DESKTOP GRID */
                <div className={style.reviews_wrap}>
                    {reviews.map((review) => (
                        <div className={style.reviews_item} key={review.id}>
                            <div className={style.reviews_naming}>
                                <img
                                    className={style.picPhoto}
                                    src={getAvatarUrl(review)}
                                    alt="avatar"
                                    onError={(e) => {
                                        e.currentTarget.src = '../fonTest5.png';
                                    }}
                                />
                                <div className={style.reviews_naming_title}>
                                    <h3>{getUserName(review)}</h3>
                                    <p>{getUserProfession(review)}</p>
                                    <div className={style.reviews_naming_raiting}>
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <g clipPath="url(#clip0_324_2272)">
                                                <g clipPath="url(#clip1_324_2272)">
                                                    <path d="M12 2.49023L15.51 8.17023L22 9.76023L17.68 14.8502L18.18 21.5102L12 18.9802L5.82 21.5102L6.32 14.8502L2 9.76023L8.49 8.17023L12 2.49023Z" stroke="#3A54DA" strokeWidth="2" strokeMiterlimit="10"/>
                                                    <path d="M12 19V18.98" stroke="black" strokeWidth="2" strokeMiterlimit="10"/>
                                                </g>
                                            </g>
                                            <defs>
                                                <clipPath id="clip0_324_2272">
                                                    <rect width="24" height="24" fill="white"/>
                                                </clipPath>
                                                <clipPath id="clip1_324_2272">
                                                    <rect width="24" height="24" fill="white"/>
                                                </clipPath>
                                            </defs>
                                        </svg>
                                        {review.rating.toFixed(1)}
                                    </div>
                                </div>
                            </div>

                            <div className={style.reviews_about}>
                                <div className={style.reviews_about_title}>
                                    <p>{getReviewerName(review)}</p>
                                    <p>{formatDate(review.createdAt)}</p>
                                </div>
                                <p className={style.reviews_about_rev}>
                                    {review.description}
                                </p>

                                {/* Показ изображений отзыва если есть */}
                                {review.images && review.images.length > 0 && (
                                    <div className={style.review_images}>
                                        {review.images.map((image) => (
                                            <img
                                                key={image.id}
                                                src={`${API_BASE_URL}${image.image}`}
                                                alt="Отзыв"
                                                className={style.review_image}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default Reviews;