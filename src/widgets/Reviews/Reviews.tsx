import style from './Reviews.module.scss';
import {useEffect, useState} from "react";
import {Swiper, SwiperSlide} from "swiper/react";
import "swiper/css";
import {useNavigate} from "react-router-dom";
import { useTranslation } from 'react-i18next';
import { PhotoGallery, usePhotoGallery } from '../../shared/ui/PhotoGallery';

import "swiper/css/navigation";
import "swiper/css/zoom";

interface Review {
    id: number;
    type: string;
    rating: number;
    description: string;
    ticket?: {
        id: number;
        title: string;
        service: boolean;
        active?: boolean;
        author: {
            id: number;
            email: string;
            login: string;
            name: string;
            surname: string;
            image: string;
            imageExternalUrl?: string;
            roles: string[];
        };
        master: {
            id: number;
            email: string;
            login: string;
            name: string;
            surname: string;
            image: string;
            imageExternalUrl?: string;
            roles: string[];
        };
    };
    images: Array<{
        id: number;
        image: string;
    }>;
    master?: {
        id: number;
        email: string;
        login: string;
        name: string;
        surname: string;
        image: string;
        imageExternalUrl?: string;
        roles: string[];
    };
    client?: {
        id: number;
        email: string;
        login: string;
        name: string;
        surname: string;
        image: string;
        imageExternalUrl?: string;
        roles: string[];
    };
    createdAt: string;
    updatedAt: string;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// Функция для форматирования даты (используется в компоненте с t функцией)
export const formatDate = (dateString: string, months?: string[]): string => {
    try {
        const date = new Date(dateString);
        const day = date.getDate();
        const monthIndex = date.getMonth();
        const year = date.getFullYear();
        
        // Если передана массив месяцев из переводов, используем его
        if (months && months[monthIndex]) {
            return `${day} ${months[monthIndex]} ${year}`;
        }
        
        // Fallback на русский
        return date.toLocaleDateString('ru-RU', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    } catch {
        return 'Дата не указана';
    }
};

function Reviews() {
    const navigate = useNavigate();
    const { t } = useTranslation('components');
    const [isMobile, setIsMobile] = useState(false);
    const [reviews, setReviews] = useState<Review[]>([]);
    const [displayedReviews, setDisplayedReviews] = useState<Review[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showAllReviews, setShowAllReviews] = useState(false);
    const MAX_INITIAL_REVIEWS = 6;

    // Состояние для динамических изображений галереи
    const [galleryImages, setGalleryImages] = useState<string[]>([]);
    
    // Хук для управления галереей фотографий
    const photoGallery = usePhotoGallery({ images: galleryImages });

    // Функция для форматирования даты с учетом текущего языка
    const formatLocalizedDate = (dateString: string): string => {
        const months = t('time.months', { returnObjects: true }) as string[] || [];
        return formatDate(dateString, months);
    };

    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth <= 480);
        check();
        window.addEventListener("resize", check);
        return () => window.removeEventListener("resize", check);
    }, []);

    useEffect(() => {
        fetchReviews();
    }, []);

    // Эффект для обновления отображаемых отзывов при изменении showAllReviews
    useEffect(() => {
        if (showAllReviews) {
            setDisplayedReviews(reviews);
        } else {
            setDisplayedReviews(reviews.slice(0, MAX_INITIAL_REVIEWS));
        }
    }, [showAllReviews, reviews]);

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

            // Убираем фильтрацию по описанию, но фильтруем по рейтингу
            const validReviews = reviewsData.filter(review =>
                review.rating > 0 // Только отзывы с рейтингом
            );

            // Сортируем по дате создания (новые сначала)
            const sortedReviews = validReviews.sort((a, b) =>
                new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );

            console.log(`Total reviews from API: ${reviewsData.length}`);
            console.log(`Valid reviews after filtering: ${sortedReviews.length}`);
            console.log('Sample review structure:', sortedReviews[0]);

            setReviews(sortedReviews);
            setDisplayedReviews(sortedReviews.slice(0, MAX_INITIAL_REVIEWS));

        } catch (error) {
            console.error('Error fetching reviews:', error);
            setError(t('app.errorLoading'));
        } finally {
            setIsLoading(false);
        }
    };

    // Функция для получения информации о пользователе без авторизации
    const getUserInfoWithoutAuth = async (userId: number) => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/users/${userId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
            });

            if (response.ok) {
                return await response.json();
            }
            return null;
        } catch (error) {
            console.error('Error fetching user info:', error);
            return null;
        }
    };

    // Обработчик клика по профилю
    const handleProfileClick = async (userId: number) => {
        console.log('Profile click for user:', userId);

        try {
            const userInfo = await getUserInfoWithoutAuth(userId);

            if (userInfo && userInfo.roles) {
                if (userInfo.roles.includes('ROLE_MASTER')) {
                    console.log('Navigating to master profile');
                    navigate(`/profile/${userId}`);
                } else if (userInfo.roles.includes('ROLE_CLIENT')) {
                    console.log('Navigating to client profile');
                    navigate(`/profile/${userId}`);
                } else {
                    console.log('Unknown role, defaulting to profile');
                    navigate(`/profile/${userId}`);
                }
            } else {
                console.log('Could not determine role, defaulting to profile');
                navigate(`/profile/${userId}`);
            }
        } catch (error) {
            console.error('Error determining role:', error);
            navigate(`/profile/${userId}`);
        }
    };

    // Функция для получения имени пользователя (чей профиль)
    const getUserName = (review: Review): string => {
        // Для отзыва клиенту - автор отзыва (мастер)
        if (review.type === 'client') {
            if (review.master) {
                return `${review.master.name || ''} ${review.master.surname || ''}`.trim() || 'Мастер';
            } else if (review.ticket?.master) {
                return `${review.ticket.master.name || ''} ${review.ticket.master.surname || ''}`.trim() || 'Мастер';
            }
        }
        // Для отзыва мастеру - автор отзыва (клиент)
        else if (review.type === 'master') {
            if (review.client) {
                return `${review.client.name || ''} ${review.client.surname || ''}`.trim() || 'Клиент';
            } else if (review.ticket?.author) {
                return `${review.ticket.author.name || ''} ${review.ticket.author.surname || ''}`.trim() || 'Клиент';
            }
        }
        return 'Пользователь';
    };

    // Функция для получения ID пользователя (чей профиль)
    const getUserId = (review: Review): number | null => {
        // Для отзыва клиенту - ID мастера (автор)
        if (review.type === 'client') {
            if (review.master) {
                return review.master.id;
            } else if (review.ticket?.master) {
                return review.ticket.master.id;
            }
        }
        // Для отзыва мастеру - ID клиента (автор)
        else if (review.type === 'master') {
            if (review.client) {
                return review.client.id;
            } else if (review.ticket?.author) {
                return review.ticket.author.id;
            }
        }
        return null;
    };

    // Функция для получения label роли пользователя (Мастер:/Клиент:)
    const getUserRoleLabel = (review: Review): string => {
        if (review.type === 'master') {
            return t('reviews.masterLabel');
        } else if (review.type === 'client') {
            return t('reviews.clientLabel');
        }
        return t('app.defaultUser');
    };

    // Функция для получения email пользователя
    // const getUserEmail = (review: Review): string => {
    //     if (review.type === 'master' && review.master) {
    //         return review.master.email || '';
    //     } else if (review.type === 'client' && review.client) {
    //         return review.client.email || '';
    //     } else if (review.ticket) {
    //         if (review.type === 'master' && review.ticket.master) {
    //             return review.ticket.master.email || '';
    //         } else if (review.type === 'client' && review.ticket.author) {
    //             return review.ticket.author.email || '';
    //         }
    //     }
    //     return '';
    // };

    // Функция для получения названия услуги
    const getServiceTitle = (review: Review): string => {
        if (review.ticket?.title) {
            return review.ticket.title;
        }
        return t('pages.reviews.serviceNotSpecified');
    };

    // Функция для получения типа отзыва (на основе данных из изображения)
    const getReviewTypeText = (review: Review): string => {
        if (review.type === 'master') {
            return t('reviews.reviewForMaster');
        } else if (review.type === 'client') {
            return t('reviews.reviewForClient');
        }
        return t('pages.reviews.reviewer');
    };

    // Функция для получения профессии/специальности
    // const getUserProfession = (review: Review): string => {
    //     if (review.type === 'master') {
    //         return 'Специалист';
    //     } else if (review.type === 'client' && review.ticket?.title) {
    //         return `Заказ: ${review.ticket.title}`;
    //     } else if (review.ticket?.title) {
    //         return `Услуга: ${review.ticket.title}`;
    //     }
    //     return 'Пользователь';
    // };

    // Функция для получения имени того, кто оставил отзыв
    const getReviewerName = (review: Review): string => {
        // Для отзыва клиенту - получатель отзыва (клиент)
        if (review.type === 'client') {
            if (review.client) {
                return `${review.client.name || ''} ${review.client.surname || ''}`.trim() || 'Клиент';
            } else if (review.ticket?.author) {
                return `${review.ticket.author.name || ''} ${review.ticket.author.surname || ''}`.trim() || 'Клиент';
            }
        }
        // Для отзыва мастеру - получатель отзыва (мастер)
        else if (review.type === 'master') {
            if (review.master) {
                return `${review.master.name || ''} ${review.master.surname || ''}`.trim() || 'Мастер';
            } else if (review.ticket?.master) {
                return `${review.ticket.master.name || ''} ${review.ticket.master.surname || ''}`.trim() || 'Мастер';
            }
        }
        return 'Пользователь';
    };

    // Функция для получения ID того, кто оставил отзыв (для перехода)
    const getReviewerId = (review: Review): number | null => {
        // Для отзыва клиенту - ID клиента (получатель)
        if (review.type === 'client') {
            if (review.client) {
                return review.client.id;
            } else if (review.ticket?.author) {
                return review.ticket.author.id;
            }
        }
        // Для отзыва мастеру - ID мастера (получатель)
        else if (review.type === 'master') {
            if (review.master) {
                return review.master.id;
            } else if (review.ticket?.master) {
                return review.ticket.master.id;
            }
        }
        return null;
    };

    // Функция для получения даты обновления
    // const formatUpdatedDate = (dateString: string): string => {
    //     try {
    //         const date = new Date(dateString);
    //         return `Обновлено ${date.toLocaleDateString('ru-RU', {
    //             day: 'numeric',
    //             month: 'short',
    //             year: 'numeric'
    //         })}`;
    //     } catch {
    //         return '';
    //     }
    // };

    // Функция для получения URL аватара
    const getAvatarUrl = (review: Review): string => {
        let imagePath: string = '';
        let externalUrl: string | undefined = '';

        // Для отзыва клиенту - аватар мастера (автор)
        if (review.type === 'client') {
            if (review.master) {
                imagePath = review.master.image || '';
                externalUrl = review.master.imageExternalUrl;
            } else if (review.ticket?.master) {
                imagePath = review.ticket.master.image || '';
                externalUrl = review.ticket.master.imageExternalUrl;
            }
        }
        // Для отзыва мастеру - аватар клиента (автор)
        else if (review.type === 'master') {
            if (review.client) {
                imagePath = review.client.image || '';
                externalUrl = review.client.imageExternalUrl;
            } else if (review.ticket?.author) {
                imagePath = review.ticket.author.image || '';
                externalUrl = review.ticket.author.imageExternalUrl;
            }
        }

        // Приоритет у внутреннего image
        if (imagePath && imagePath.trim() !== '') {
            if (imagePath.startsWith('http')) {
                return imagePath;
            }
            return `${API_BASE_URL}/images/profile_photos/${imagePath}`;
        } else if (!imagePath && externalUrl && externalUrl.trim() !== '') {
            return externalUrl;
        }

        return '../default_user.png';
    };

    // Функция для получения URL изображения отзыва
    const getReviewImageUrl = (imagePath: string): string => {
        console.log('Original image path:', imagePath); // Для отладки

        if (imagePath.startsWith('http')) {
            return imagePath;
        }

        // Если путь начинается с /images/review_photos/, значит это уже полный относительный путь
        if (imagePath.startsWith('/images/review_photos/')) {
            return `${API_BASE_URL}${imagePath}`;
        }

        // Если это только имя файла (например, "photo123.jpg")
        if (!imagePath.includes('/') && !imagePath.startsWith('/')) {
            return `${API_BASE_URL}/images/review_photos/${imagePath}`;
        }

        // Если это относительный путь без начального слэша
        if (imagePath.includes('/') && !imagePath.startsWith('/')) {
            return `${API_BASE_URL}/images/review_photos/${imagePath}`;
        }

        // По умолчанию добавляем API_BASE_URL
        return `${API_BASE_URL}${imagePath}`;
    };

    // Функция для обрезки длинного текста
    const truncateText = (text: string, maxLength: number): string => {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    };

    // Функция открытия модального окна с фото
    const openPhotoModal = (reviewImages: Array<{id: number, image: string}>, startIndex: number = 0) => {
        const imageUrls = reviewImages.map(img => getReviewImageUrl(img.image));
        setGalleryImages(imageUrls);
        photoGallery.openGallery(startIndex);
    };

    // Переключение режима показа отзывов
    const toggleShowAllReviews = () => {
        setShowAllReviews(!showAllReviews);
    };

    if (isLoading) {
        return (
            <div className={style.reviews}>
                <h3>{t('pages.reviews.title')}</h3>
                <div className={style.loading}>{t('app.loading')}</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className={style.reviews}>
                <h3>{t('pages.reviews.title')}</h3>
                <div className={style.error}>{error}</div>
            </div>
        );
    }

    if (reviews.length === 0) {
        return (
            <div className={style.reviews}>
                <h3>{t('pages.reviews.title')}</h3>
                <div className={style.noReviews}>{t('reviews.noReviews')}</div>
            </div>
        );
    }

    return (
        <div className={style.reviews}>
            <h3>{t('pages.reviews.title')}</h3>

            {/* MOBILE SWIPER */}
            {isMobile ? (
                <div className={style.reviews_slider}>
                    <Swiper
                        spaceBetween={16}
                        slidesPerView={1.1}
                        grabCursor={true}
                    >
                        {displayedReviews.map((review) => {
                            const userId = getUserId(review);
                            const serviceTitle = getServiceTitle(review);
                            const reviewTypeText = getReviewTypeText(review);

                            return (
                                <SwiperSlide key={review.id}>
                                    <div className={style.reviews_item}>
                                        {/* Заголовок типа отзыва */}
                                        <div className={style.review_type_header}>
                                            <span className={style.review_type_text}>
                                                {reviewTypeText}
                                            </span>
                                        </div>

                                        <div className={style.reviews_naming}>
                                            <img
                                                className={style.picPhoto}
                                                src={getAvatarUrl(review)}
                                                alt="avatar"
                                                onError={(e) => {
                                                    e.currentTarget.src = '../fonTest5.png';
                                                }}
                                                onClick={userId ? () => handleProfileClick(userId) : undefined}
                                                style={{ cursor: userId ? 'pointer' : 'default' }}
                                            />
                                            <div className={style.reviews_naming_title}>
                                                <h3
                                                    onClick={userId ? () => handleProfileClick(userId) : undefined}
                                                    style={{ cursor: userId ? 'pointer' : 'default' }}
                                                >
                                                    {getUserName(review)}
                                                </h3>
                                                {/* ID и роль пользователя */}
                                                <div className={style.user_info}>
                                                    {/*<span className={style.user_id}>ID #{userId}</span>*/}
                                                    {getUserRoleLabel(review)} {getReviewerName(review)}
                                                </div>
                                                {/* Email пользователя */}
                                                {/*{userEmail && (*/}
                                                {/*    <p className={style.user_email}>{userEmail}</p>*/}
                                                {/*)}*/}
                                                {/* Услуга */}
                                                <p className={style.service_info}>
                                                    {t('reviews.serviceLabel')} {serviceTitle}
                                                </p>
                                                <div className={style.reviews_naming_raiting}>
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
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
                                                    <span className={style.rating_value}>{review.rating.toFixed(1)}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className={style.reviews_about}>
                                            <p className={style.reviews_about_rev}>
                                                {truncateText(review.description, 120)}
                                            </p>
                                            {review.description.length > 120 && (
                                                <span className={style.reviews_about_more}>Еще</span>
                                            )}

                                            {/* Показ изображений отзыва если есть */}
                                            {review.images && review.images.length > 0 && (
                                                <div className={style.review_images_section}>
                                                    {/*<div className={style.review_images_label}>Галерея изображений</div>*/}
                                                    <div className={style.review_images_small}>
                                                        {review.images.map((image, index) => (
                                                            <img
                                                                key={image.id}
                                                                src={getReviewImageUrl(image.image)}
                                                                alt="Отзыв"
                                                                className={style.review_image_small}
                                                                onClick={() => openPhotoModal(review.images, index)}
                                                                style={{ cursor: 'pointer' }}
                                                            />
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Даты создания и обновления */}
                                            <div className={style.review_dates}>
                                                <span className={style.created_date}>
                                                    {formatLocalizedDate(review.createdAt)}
                                                </span>
                                                {/*{review.updatedAt !== review.createdAt && (*/}
                                                {/*    <span className={style.updated_date}>*/}
                                                {/*        {formatUpdatedDate(review.updatedAt)}*/}
                                                {/*    </span>*/}
                                                {/*)}*/}
                                            </div>
                                        </div>
                                    </div>
                                </SwiperSlide>
                            );
                        })}
                    </Swiper>
                </div>
            ) : (
                /* DESKTOP GRID */
                <div className={style.reviews_wrap}>
                    {displayedReviews.map((review) => {
                        const userId = getUserId(review);
                        const reviewerId = getReviewerId(review);
                        // const userEmail = getUserEmail(review);
                        const serviceTitle = getServiceTitle(review);
                        const reviewTypeText = getReviewTypeText(review);

                        return (
                            <div className={style.reviews_item} key={review.id}>
                                {/* Заголовок типа отзыва */}
                                <div className={style.review_type_header}>
                                    <span className={style.review_type_text}>
                                        {reviewTypeText}
                                    </span>
                                </div>

                                <div className={style.reviews_naming}>
                                    <img
                                        className={style.picPhoto}
                                        src={getAvatarUrl(review)}
                                        alt="avatar"
                                        onError={(e) => {
                                            e.currentTarget.src = '../fonTest5.png';
                                        }}
                                        onClick={userId ? () => handleProfileClick(userId) : undefined}
                                        style={{ cursor: userId ? 'pointer' : 'default' }}
                                    />
                                    <div className={style.reviews_naming_title}>
                                        <h3
                                            onClick={userId ? () => handleProfileClick(userId) : undefined}
                                            style={{ cursor: userId ? 'pointer' : 'default' }}
                                        >
                                            {getUserName(review)}
                                        </h3>
                                        {/* ID и роль пользователя */}
                                        <div className={style.user_info}>
                                            {/*<span className={style.user_id}>ID #{userId}</span>*/}
                                            <div className={style.reviews_about_title}>
                                                <p
                                                    onClick={reviewerId ? () => handleProfileClick(reviewerId) : undefined}
                                                    style={{ cursor: reviewerId ? 'pointer' : 'default' }}
                                                    className={style.reviewer_name}
                                                >
                                                    {getUserRoleLabel(review)} {getReviewerName(review)}
                                                </p>
                                            </div>
                                        </div>
                                        {/* Email пользователя */}
                                        {/*{userEmail && (*/}
                                        {/*    <p className={style.user_email}>{userEmail}</p>*/}
                                        {/*)}*/}
                                        {/* Услуга */}
                                        {review.type === 'master' && (
                                            <p className={style.service_info}>
                                                {t('reviews.serviceLabel')} {serviceTitle}
                                            </p>
                                        )}
                                        <div className={style.reviews_naming_raiting}>
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
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
                                            <span className={style.rating_value}>{review.rating.toFixed(1)}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className={style.reviews_about}>
                                    <p className={style.reviews_about_rev}>
                                        {review.description}
                                    </p>

                                    {/* Показ изображений отзыва если есть */}
                                    {review.images && review.images.length > 0 && (
                                        <div className={style.review_images_section}>
                                            {/*<div className={style.review_images_label}>Галерея изображений</div>*/}
                                            <div className={style.review_images_small}>
                                                {review.images.map((image, index) => (
                                                    <img
                                                        key={image.id}
                                                        src={getReviewImageUrl(image.image)}
                                                        alt="Отзыв"
                                                        className={style.review_image_small}
                                                        onClick={() => openPhotoModal(review.images, index)}
                                                        style={{ cursor: 'pointer' }}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Даты создания и обновления */}
                                    <div className={style.review_dates}>
                                        <span className={style.created_date}>
                                            {formatLocalizedDate(review.createdAt)}
                                        </span>
                                        {/*{review.updatedAt !== review.createdAt && (*/}
                                        {/*    <span className={style.updated_date}>*/}
                                        {/*        {formatUpdatedDate(review.updatedAt)}*/}
                                        {/*    </span>*/}
                                        {/*)}*/}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Кнопка показать все/скрыть все */}
            {reviews.length > MAX_INITIAL_REVIEWS && (
                <div className={style.reviews_actions}>
                    <button
                        className={style.show_all_button}
                        onClick={toggleShowAllReviews}
                    >
                        {showAllReviews ? t('buttons.hideAll') : `${t('buttons.showMore')} (${reviews.length})`}
                    </button>
                </div>
            )}

            {/* Новый компонент для просмотра фотографий */}
            <PhotoGallery
                isOpen={photoGallery.isOpen}
                images={galleryImages}
                currentIndex={photoGallery.currentIndex}
                onClose={photoGallery.closeGallery}
                onNext={photoGallery.goToNext}
                onPrevious={photoGallery.goToPrevious}
                onSelectImage={photoGallery.selectImage}
                fallbackImage="../fonTest5.png"
            />
        </div>
    );
}

export default Reviews;