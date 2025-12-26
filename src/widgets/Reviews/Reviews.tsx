import style from './Reviews.module.scss';
import { useEffect, useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import { useNavigate } from "react-router-dom";

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

function Reviews() {
    const navigate = useNavigate();
    const [isMobile, setIsMobile] = useState(false);
    const [reviews, setReviews] = useState<Review[]>([]);
    const [displayedReviews, setDisplayedReviews] = useState<Review[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showAllReviews, setShowAllReviews] = useState(false);
    const MAX_INITIAL_REVIEWS = 6;

    // Состояния для модального окна с фото
    const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
    const [selectedReviewImages, setSelectedReviewImages] = useState<string[]>([]);
    const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

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
            setError('Не удалось загрузить отзывы');
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
                const userData = await response.json();
                return userData;
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
                    navigate(`/master/${userId}`);
                } else if (userInfo.roles.includes('ROLE_CLIENT')) {
                    console.log('Navigating to client profile');
                    navigate(`/client/${userId}`);
                } else {
                    console.log('Unknown role, defaulting to master');
                    navigate(`/master/${userId}`);
                }
            } else {
                console.log('Could not determine role, defaulting to master');
                navigate(`/master/${userId}`);
            }
        } catch (error) {
            console.error('Error determining role:', error);
            navigate(`/master/${userId}`);
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

    // Функция для получения роли пользователя (Мастер/Клиент)
    const getUserRole = (review: Review): string => {
        if (review.type === 'master') {
            return 'Клиент';
        } else if (review.type === 'client') {
            return 'Мастер';
        }
        return 'Пользователь';
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
        return 'Услуга не указана';
    };

    // Функция для получения типа отзыва (на основе данных из изображения)
    const getReviewTypeText = (review: Review): string => {
        if (review.type === 'master') {
            return 'Отзыв мастеру';
        } else if (review.type === 'client') {
            return 'Отзыв клиенту';
        }
        return 'Отзыв';
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

        // Приоритет у внешнего URL
        if (externalUrl && externalUrl.trim() !== '') {
            return externalUrl;
        }

        if (imagePath && imagePath.trim() !== '') {
            if (imagePath.startsWith('http')) {
                return imagePath;
            }
            return `${API_BASE_URL}/images/profile_photos/${imagePath}`;
        }

        return '../fonTest5.png';
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
        setSelectedReviewImages(imageUrls);
        setCurrentPhotoIndex(startIndex);
        setIsPhotoModalOpen(true);

        // Блокируем скролл страницы
        document.body.style.overflow = 'hidden';
    };

    // Функция закрытия модального окна
    const closePhotoModal = () => {
        setIsPhotoModalOpen(false);
        setSelectedReviewImages([]);
        setCurrentPhotoIndex(0);

        // Восстанавливаем скролл страницы
        document.body.style.overflow = 'auto';
    };

    // Функция для переключения между фото
    const goToNextPhoto = () => {
        setCurrentPhotoIndex((prevIndex) =>
            prevIndex === selectedReviewImages.length - 1 ? 0 : prevIndex + 1
        );
    };

    const goToPrevPhoto = () => {
        setCurrentPhotoIndex((prevIndex) =>
            prevIndex === 0 ? selectedReviewImages.length - 1 : prevIndex - 1
        );
    };

    // Переключение режима показа отзывов
    const toggleShowAllReviews = () => {
        setShowAllReviews(!showAllReviews);
    };

    // Обработчик нажатия клавиш
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isPhotoModalOpen) return;

            switch(e.key) {
                case 'Escape':
                    closePhotoModal();
                    break;
                case 'ArrowLeft':
                    goToPrevPhoto();
                    break;
                case 'ArrowRight':
                    goToNextPhoto();
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isPhotoModalOpen]);

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
                        {displayedReviews.map((review) => {
                            const userId = getUserId(review);
                            const reviewerId = getReviewerId(review);
                            // const userEmail = getUserEmail(review);
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
                                                    <span className={style.user_role}>{getUserRole(review)}</span>
                                                </div>
                                                {/* Email пользователя */}
                                                {/*{userEmail && (*/}
                                                {/*    <p className={style.user_email}>{userEmail}</p>*/}
                                                {/*)}*/}
                                                {/* Услуга */}
                                                <p className={style.service_info}>
                                                    Услуга: {serviceTitle}
                                                </p>
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
                                                    <span className={style.rating_value}>{review.rating.toFixed(1)}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className={style.reviews_about}>
                                            <div className={style.reviews_about_title}>
                                                <p
                                                    onClick={reviewerId ? () => handleProfileClick(reviewerId) : undefined}
                                                    style={{ cursor: reviewerId ? 'pointer' : 'default' }}
                                                    className={style.reviewer_name}
                                                >
                                                    {getReviewerName(review)}
                                                </p>
                                                <p className={style.review_date}>{formatDate(review.createdAt)}</p>
                                            </div>
                                            <p className={style.reviews_about_rev}>
                                                {truncateText(review.description, 120)}
                                            </p>
                                            {review.description.length > 120 && (
                                                <span className={style.reviews_about_more}>Еще</span>
                                            )}

                                            {/* Показ изображений отзыва если есть */}
                                            {review.images && review.images.length > 0 && (
                                                <div className={style.review_images_section}>
                                                    <div className={style.review_images_label}>Галерея изображений</div>
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
                                                    Создано: {formatDate(review.createdAt)}
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
                                            <span className={style.user_role}>{getUserRole(review)}</span>
                                        </div>
                                        {/* Email пользователя */}
                                        {/*{userEmail && (*/}
                                        {/*    <p className={style.user_email}>{userEmail}</p>*/}
                                        {/*)}*/}
                                        {/* Услуга */}
                                        <p className={style.service_info}>
                                            Услуга: {serviceTitle}
                                        </p>
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
                                            <span className={style.rating_value}>{review.rating.toFixed(1)}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className={style.reviews_about}>
                                    <div className={style.reviews_about_title}>
                                        <p
                                            onClick={reviewerId ? () => handleProfileClick(reviewerId) : undefined}
                                            style={{ cursor: reviewerId ? 'pointer' : 'default' }}
                                            className={style.reviewer_name}
                                        >
                                            {getReviewerName(review)}
                                        </p>
                                        <p className={style.review_date}>{formatDate(review.createdAt)}</p>
                                    </div>
                                    <p className={style.reviews_about_rev}>
                                        {review.description}
                                    </p>

                                    {/* Показ изображений отзыва если есть */}
                                    {review.images && review.images.length > 0 && (
                                        <div className={style.review_images_section}>
                                            <div className={style.review_images_label}>Галерея изображений</div>
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
                                            Создано: {formatDate(review.createdAt)}
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
                        {showAllReviews ? 'Скрыть все' : `Показать все (${reviews.length})`}
                    </button>
                </div>
            )}

            {/* Модальное окно для просмотра фотографий */}
            {isPhotoModalOpen && (
                <div className={style.photo_modal_overlay} onClick={closePhotoModal}>
                    <div className={style.photo_modal_content} onClick={(e) => e.stopPropagation()}>
                        <button
                            className={style.photo_modal_close}
                            onClick={closePhotoModal}
                            aria-label="Закрыть"
                        >
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M18 6L6 18" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                <path d="M6 6L18 18" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                        </button>

                        <div className={style.photo_modal_main}>
                            <button
                                className={style.photo_modal_nav}
                                onClick={goToPrevPhoto}
                                aria-label="Предыдущее фото"
                            >
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M15 18L9 12L15 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                            </button>

                            <div className={style.photo_modal_image_container}>
                                <img
                                    src={selectedReviewImages[currentPhotoIndex]}
                                    alt={`Фото ${currentPhotoIndex + 1}`}
                                    className={style.photo_modal_image}
                                    onError={(e) => {
                                        e.currentTarget.src = '../fonTest5.png';
                                    }}
                                />
                            </div>

                            <button
                                className={style.photo_modal_nav}
                                onClick={goToNextPhoto}
                                aria-label="Следующее фото"
                            >
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M9 18L15 12L9 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                            </button>
                        </div>

                        <div className={style.photo_modal_counter}>
                            {currentPhotoIndex + 1} / {selectedReviewImages.length}
                        </div>

                        <div className={style.photo_modal_thumbnails}>
                            {selectedReviewImages.map((image, index) => (
                                <img
                                    key={index}
                                    src={image}
                                    alt={`Миниатюра ${index + 1}`}
                                    className={`${style.photo_modal_thumbnail} ${index === currentPhotoIndex ? style.active : ''}`}
                                    onClick={() => setCurrentPhotoIndex(index)}
                                    onError={(e) => {
                                        e.currentTarget.src = '../fonTest5.png';
                                    }}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Reviews;