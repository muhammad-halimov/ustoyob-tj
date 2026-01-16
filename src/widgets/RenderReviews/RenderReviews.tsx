import { useMemo, useState, useCallback } from 'react';
import styles from '../../pages/profile/clientProfilePage/ClientProfilePage.module.scss';
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";

interface ReviewImage {
    id: number;
    image: string;
}

interface ReviewMaster {
    id: number;
    name?: string;
    surname?: string;
    patronymic?: string;
    profession?: string;
    specialization?: string;
    image?: string;
}

export interface Review {
    id: number;
    master?: ReviewMaster;
    rating: number;
    description?: string;
    images?: ReviewImage[];
    createdAt?: string;
    services?: {
        id: number;
        title: string;
    };
    // Добавляем поля для совместимости
    reviewer?: {
        id: number;
        name: string;
        surname: string;
        image: string;
    };
    vacation?: string;
    worker?: string;
}

interface ReviewListProps {
    reviews: Review[];
    showAll: boolean;
    onToggleShowAll: () => void;
    previewLimit: number;
    loading: boolean;
    onClientProfileClick?: (clientId: number) => void;
}

export const defaultUserImage = './fonTest6.png';

function ReviewList({ reviews, showAll, onToggleShowAll, previewLimit, loading, onClientProfileClick }: ReviewListProps) {
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
    const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
    const [selectedImages, setSelectedImages] = useState<string[]>([]);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [visibleCount, setVisibleCount] = useState(2);

    // ОСНОВНОЕ ИСПРАВЛЕНИЕ: Правильная функция для получения URL аватара рецензента
    const getReviewerAvatarUrl = (review: Review) => {
        console.log('Getting avatar URL for review:', review.id);

        // Пробуем получить URL из reviewer (мастер, оставивший отзыв в клиентском профиле)
        if (review.reviewer?.image) {
            console.log('Using reviewer image:', review.reviewer.image);
            return convertImagePath(review.reviewer.image);
        }

        // Если нет reviewer, пробуем master (для обратной совместимости)
        if (review.master?.image) {
            console.log('Using master image:', review.master.image);
            return convertImagePath(review.master.image);
        }

        console.log('No image found, using default');
        return defaultUserImage;
    };

    // Вспомогательная функция для преобразования пути к изображению
    const convertImagePath = (imagePath: string): string => {
        if (!imagePath) return defaultUserImage;

        console.log('Converting image path:', imagePath);

        // Если путь уже полный URL
        if (imagePath.startsWith('http')) {
            console.log('Already a full URL');
            return imagePath;
        }

        // Если путь начинается с /, добавляем базовый URL
        if (imagePath.startsWith('/')) {
            // Проверяем разные варианты путей
            if (imagePath.includes('/images/profile_photos/')) {
                const fullUrl = `${API_BASE_URL}${imagePath}`;
                console.log('Profile photo path, full URL:', fullUrl);
                return fullUrl;
            }

            if (imagePath.includes('/uploads/profile_photos/')) {
                const fullUrl = `${API_BASE_URL}${imagePath}`;
                console.log('Upload profile photo path, full URL:', fullUrl);
                return fullUrl;
            }

            // Если это просто путь, начинающийся с /, добавляем базовый URL
            const fullUrl = `${API_BASE_URL}${imagePath}`;
            console.log('Generic path with /, full URL:', fullUrl);
            return fullUrl;
        }

        // Если это просто имя файла или относительный путь
        // Пробуем разные варианты

        // Вариант 1: Путь к изображениям профилей
        const profilePhotoUrl = `${API_BASE_URL}/images/profile_photos/${imagePath}`;
        console.log('Trying profile photo URL:', profilePhotoUrl);

        // Вариант 2: Путь к загруженным изображениям профилей
        const uploadProfilePhotoUrl = `${API_BASE_URL}/uploads/profile_photos/${imagePath}`;
        console.log('Trying upload profile photo URL:', uploadProfilePhotoUrl);

        // Вариант 3: Путь к изображениям мастеров
        const mastersPhotoUrl = `${API_BASE_URL}/images/masters/${imagePath}`;
        console.log('Trying masters photo URL:', mastersPhotoUrl);

        // По умолчанию используем путь к изображениям профилей
        console.log('Using default profile photo URL');
        return profilePhotoUrl;
    };

    const getReviewImageUrl = (imagePath: string): string => {
        if (!imagePath) return defaultUserImage;

        // Если путь уже полный URL
        if (imagePath.startsWith('http')) {
            return imagePath;
        }

        // Если путь начинается с /, добавляем базовый URL
        if (imagePath.startsWith('/')) {
            // Проверяем, содержит ли путь уже /images/review_photos/
            if (imagePath.includes('/images/review_photos/')) {
                return `${API_BASE_URL}${imagePath}`;
            }
            return `${API_BASE_URL}/images/review_photos${imagePath}`;
        }

        // Иначе добавляем полный путь к изображениям отзывов
        return `${API_BASE_URL}/images/review_photos/${imagePath}`;
    };

    const openPhotoModal = useCallback((images: ReviewImage[], startIndex: number = 0) => {
        const imageUrls = images.map(img => getReviewImageUrl(img.image));
        setSelectedImages(imageUrls);
        setCurrentImageIndex(startIndex);
        setIsPhotoModalOpen(true);
        document.body.style.overflow = 'hidden';
    }, []);

    const closePhotoModal = useCallback(() => {
        setIsPhotoModalOpen(false);
        setSelectedImages([]);
        setCurrentImageIndex(0);
        document.body.style.overflow = 'auto';
    }, []);

    const goToNextImage = useCallback(() => {
        setCurrentImageIndex(prev =>
            prev === selectedImages.length - 1 ? 0 : prev + 1
        );
    }, [selectedImages.length]);

    const goToPrevImage = useCallback(() => {
        setCurrentImageIndex(prev =>
            prev === 0 ? selectedImages.length - 1 : prev - 1
        );
    }, [selectedImages.length]);

    const getReviewerName = (review: Review) => {
        // Для клиентского профиля: reviewer - это мастер, оставивший отзыв
        if (review.reviewer?.name || review.reviewer?.surname) {
            return `${review.reviewer.name || ''} ${review.reviewer.surname || ''}`.trim();
        }

        // Для обратной совместимости
        return `${review.master?.surname || ''} ${review.master?.name || ''} ${review.master?.patronymic || ''}`.trim() || 'Специалист';
    };

    const getReviewService = (review: Review) => {
        if (review.vacation) return review.vacation;
        if (review.services?.title) return review.services.title;
        return review.master?.profession || review.master?.specialization || 'Услуга';
    };

    const getWorkerName = (review: Review) => {
        if (review.worker) return review.worker;
        return 'Клиент';
    };

    const getFormattedDate = (dateString?: string) => {
        if (!dateString) return 'Дата не указана';
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('ru-RU');
        } catch (e) {
            return 'Дата не указана';
        }
    };

    const visibleReviews = useMemo(() => {
        if (showAll) return reviews;
        return reviews.slice(0, previewLimit);
    }, [reviews, showAll, previewLimit]);

    const handleClientClick = (review: Review) => {
        if (onClientProfileClick && review.reviewer?.id) {
            onClientProfileClick(review.reviewer.id);
        } else if (onClientProfileClick && review.master?.id) {
            onClientProfileClick(review.master.id);
        }
    };

    const handleShowMore = () => {
        setVisibleCount(reviews.length);
    };

    const handleShowLess = () => {
        setVisibleCount(2);
    };

    if (loading) return <div className={styles.loading}>Загрузка отзывов...</div>;
    if (!reviews.length) return <div className={styles.no_reviews}>Пока нет отзывов от специалистов</div>;

    return (
        <>
            <div className={styles.reviews_section}>
                <h3>Отзывы</h3>
                <div className={styles.reviews_list}>
                    {/* Desktop версия */}
                    <div className={styles.reviews_desktop}>
                        {visibleReviews.map(review => (
                            <div key={review.id} className={styles.review_item}>
                                <div className={styles.review_header}>
                                    <div className={styles.reviewer_info}>
                                        <img
                                            src={getReviewerAvatarUrl(review)}
                                            alt={getReviewerName(review)}
                                            className={styles.reviewer_avatar}
                                            onClick={() => handleClientClick(review)}
                                            style={{ cursor: onClientProfileClick ? 'pointer' : 'default' }}
                                            onError={(e) => {
                                                console.error('Image load error:', e);
                                                e.currentTarget.src = defaultUserImage;
                                            }}
                                            loading="lazy"
                                        />
                                        <div className={styles.reviewer_main_info}>
                                            <div className={styles.reviewer_name}>{getReviewerName(review)}</div>
                                            <div className={styles.review_service}>
                                                Услуга: <span className={styles.service_title}>{getReviewService(review)}</span>
                                            </div>
                                            <span className={styles.review_worker}>{getWorkerName(review)}</span>
                                            <div className={styles.review_rating_main}>
                                                <span>Поставил: </span>
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
                                                <span className={styles.rating_value}>{review.rating}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className={styles.review_details}>
                                    <div className={styles.review_worker_date}>
                                        <span className={styles.review_date}>{getFormattedDate(review.createdAt)}</span>
                                    </div>
                                </div>

                                {review.description && (
                                    <div className={styles.review_text}>
                                        {review.description.replace(/<[^>]*>/g, '')}
                                    </div>
                                )}

                                {review.images && review.images.length > 0 && (
                                    <div className={styles.review_images}>
                                        {review.images.map((img, index) => (
                                            <img
                                                key={img.id}
                                                src={getReviewImageUrl(img.image)}
                                                alt="Отзыв"
                                                className={styles.review_image}
                                                loading="lazy"
                                                onClick={() => openPhotoModal(review.images || [], index)}
                                                style={{ cursor: 'pointer' }}
                                                onError={(e) => {
                                                    console.error('Review image failed to load:', img.image);
                                                    e.currentTarget.src = defaultUserImage;
                                                }}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Mobile версия с Swiper */}
                    <div className={styles.reviews_mobile}>
                        <Swiper
                            spaceBetween={16}
                            slidesPerView={1}
                            className={styles.reviews_slider}
                        >
                            {visibleReviews.slice(0, visibleCount).map(review => (
                                <SwiperSlide key={review.id}>
                                    <div className={styles.review_item}>
                                        <div className={styles.review_header}>
                                            <div className={styles.reviewer_info}>
                                                <img
                                                    src={getReviewerAvatarUrl(review)}
                                                    alt={getReviewerName(review)}
                                                    className={styles.reviewer_avatar}
                                                    onClick={() => handleClientClick(review)}
                                                    style={{ cursor: onClientProfileClick ? 'pointer' : 'default' }}
                                                    onError={(e) => {
                                                        console.error('Mobile image load error:', e);
                                                        e.currentTarget.src = defaultUserImage;
                                                    }}
                                                />
                                                <div className={styles.reviewer_main_info}>
                                                    <div className={styles.reviewer_name}>{getReviewerName(review)}</div>
                                                    <div className={styles.review_service}>
                                                        Услуга: <span className={styles.service_title}>{getReviewService(review)}</span>
                                                    </div>
                                                    <span className={styles.review_worker}>{getWorkerName(review)}</span>
                                                    <div className={styles.review_rating_main}>
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
                                                        <span className={styles.rating_value}>{review.rating}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {review.description && (
                                            <div className={styles.review_text}>
                                                {review.description.replace(/<[^>]*>/g, '')}
                                            </div>
                                        )}
                                    </div>
                                </SwiperSlide>
                            ))}
                        </Swiper>
                    </div>
                </div>

                {/* Кнопки управления отзывами */}
                <div className={styles.reviews_actions}>
                    {reviews.length > previewLimit && (
                        <button className={styles.show_all_reviews_btn} onClick={onToggleShowAll}>
                            {showAll ? 'Скрыть отзывы' : `Показать все отзывы (${reviews.length})`}
                        </button>
                    )}
                    {/* Для мобильной версии дополнительная кнопка */}
                    {reviews.length > 2 && (
                        <button
                            className={styles.show_all_reviews_btn_mobile}
                            onClick={visibleCount === reviews.length ? handleShowLess : handleShowMore}
                        >
                            {visibleCount === reviews.length ? 'Скрыть отзывы' : 'Показать все отзывы'}
                        </button>
                    )}
                </div>
            </div>

            {/* Модальное окно для просмотра фотографий */}
            {isPhotoModalOpen && (
                <div className={styles.photo_modal_overlay} onClick={closePhotoModal}>
                    <div className={styles.photo_modal_content} onClick={(e) => e.stopPropagation()}>
                        <button
                            className={styles.photo_modal_close}
                            onClick={closePhotoModal}
                            aria-label="Закрыть"
                        >
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M18 6L6 18" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                <path d="M6 6L18 18" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                        </button>

                        <div className={styles.photo_modal_main}>
                            <button
                                className={styles.photo_modal_nav}
                                onClick={goToPrevImage}
                                aria-label="Предыдущее фото"
                            >
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M15 18L9 12L15 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                            </button>

                            <div className={styles.photo_modal_image_container}>
                                <img
                                    src={selectedImages[currentImageIndex]}
                                    alt={`Фото ${currentImageIndex + 1}`}
                                    className={styles.photo_modal_image}
                                    onError={(e) => {
                                        e.currentTarget.src = defaultUserImage;
                                    }}
                                />
                            </div>

                            <button
                                className={styles.photo_modal_nav}
                                onClick={goToNextImage}
                                aria-label="Следующее фото"
                            >
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M9 18L15 12L9 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                            </button>
                        </div>

                        <div className={styles.photo_modal_counter}>
                            {currentImageIndex + 1} / {selectedImages.length}
                        </div>

                        <div className={styles.photo_modal_thumbnails}>
                            {selectedImages.map((image, index) => (
                                <img
                                    key={index}
                                    src={image}
                                    alt={`Миниатюра ${index + 1}`}
                                    className={`${styles.photo_modal_thumbnail} ${index === currentImageIndex ? styles.active : ''}`}
                                    onClick={() => setCurrentImageIndex(index)}
                                    onError={(e) => {
                                        e.currentTarget.src = defaultUserImage;
                                    }}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

export default ReviewList;