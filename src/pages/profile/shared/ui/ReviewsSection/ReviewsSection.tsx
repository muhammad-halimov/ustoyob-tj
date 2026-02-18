import React, { useMemo } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { PhotoGallery, usePhotoGallery } from '../../../../../shared/ui/PhotoGallery';
import { Review } from '../../../../../entities';
import styles from './ReviewsSection.module.scss';

// Экспорт для обратной совместимости
export type { Review } from '../../../../../entities';

interface ReviewsSectionProps {
    reviews: Review[];
    reviewsLoading: boolean;
    visibleCount: number;

    API_BASE_URL: string;
    userRole?: 'master' | 'client'; // Добавляем тип профиля
    onShowMore: () => void;
    onShowLess: () => void;
    renderReviewText: (review: Review) => React.ReactElement;
    getReviewerAvatarUrl: (review: Review) => string;
    getClientName: (review: Review) => string;
    getMasterName: (review: Review) => string;
    onClientProfileClick: (clientId: number) => void;
    onMasterProfileClick?: (masterId: number) => void;
    onServiceClick?: (ticketId: number) => void;
    getReviewImageIndex: (reviewIndex: number, imageIndex: number) => number;
}

export const ReviewsSection: React.FC<ReviewsSectionProps> = ({
    reviews,
    reviewsLoading,
    visibleCount,
    API_BASE_URL,
    userRole = 'master', // По умолчанию мастер
    onShowMore,
    onShowLess,
    renderReviewText,
    getReviewerAvatarUrl,
    getClientName,
    getMasterName,
    onClientProfileClick,
    onMasterProfileClick,
    onServiceClick,
    getReviewImageIndex,
}) => {
    // ЛОГИКА ОТЗЫВОВ (зависит от типа профиля):
    // Профиль МАСТЕРА:
    //   - reviewer (верхнее с аватаркой) = КЛИЕНТ (автор отзыва)
    //   - worker (нижнее) = МАСТЕР (исполнитель работы)
    // Профиль КЛИЕНТА:
    //   - reviewer (верхнее с аватаркой) = МАСТЕР (о ком отзыв)
    //   - worker (нижнее) = КЛИЕНТ (кто написал отзыв)
    
    // Аватарка и имя автора отзыва (верхнее)
    const getReviewAuthorAvatar = (review: Review) => {
        if (userRole === 'master') {
            // Профиль мастера - показываем клиента
            return getReviewerAvatarUrl(review);
        } else {
            // Профиль клиента - показываем мастера
            const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
            
            // Приоритет 1: image (локальное изображение)
            if (review.user?.image) {
                const userImage = typeof review.user.image === 'string' 
                    ? review.user.image 
                    : (review.user.image as any).image;
                
                // Если это полный URL (начинается с http), используем его
                if (userImage.startsWith('http')) {
                    return userImage;
                }
                
                // Если это путь, начинающийся с /, добавляем только API_BASE_URL
                if (userImage.startsWith('/')) {
                    return `${API_BASE_URL}${userImage}`;
                }
                
                // Иначе это имя файла - строим путь через profile_photos
                return `${API_BASE_URL}/images/profile_photos/${userImage}`;
            }
            
            // Приоритет 2: imageExternalUrl (внешние ссылки)
            if (review.user?.imageExternalUrl && review.user.imageExternalUrl.trim()) {
                return review.user.imageExternalUrl;
            }
            
            // Приоритет 3: дефолтное изображение
            return './default_user.png';
        }
    };

    const getReviewAuthorName = (review: Review) => {
        if (userRole === 'master') {
            // Профиль мастера - показываем клиента
            return getClientName(review);
        } else {
            // Профиль клиента - показываем мастера
            return getMasterName(review);
        }
    };

    const handleAuthorClick = (review: Review) => {
        if (userRole === 'master') {
            // Кликаем на клиента
            if (review.reviewer?.id) {
                onClientProfileClick(review.reviewer.id);
            }
        } else {
            // Кликаем на мастера
            if (onMasterProfileClick && review.user?.id) {
                onMasterProfileClick(review.user.id);
            }
        }
    };

    // Worker (нижнее)
    const getWorkerName = (review: Review) => {
        if (userRole === 'master') {
            // Профиль мастера - показываем мастера (исполнитель)
            return getMasterName(review);
        } else {
            // Профиль клиента - показываем клиента (автор отзыва)
            return getClientName(review);
        }
    };

    const handleWorkerClick = (review: Review) => {
        if (userRole === 'master') {
            // Кликаем на мастера
            if (onMasterProfileClick && review.user?.id) {
                onMasterProfileClick(review.user.id);
            }
        } else {
            // Кликаем на клиента
            if (review.reviewer?.id) {
                onClientProfileClick(review.reviewer.id);
            }
        }
    };

    const isWorkerClickable = () => {
        // Worker кликабельный если это не профиль самого человека
        // Для мастера: worker это он сам - НЕ кликабельный
        // Для клиента: worker это он сам - НЕ кликабельный
        return false; // Worker всегда показывает владельца профиля, поэтому не кликабельный
    };
    // Собираем все изображения из отзывов для галереи
    const reviewGalleryImages = useMemo(() => {
        if (!reviews || reviews.length === 0) return [];
        
        const images: string[] = [];
        reviews.forEach(review => {
            if (review.images && review.images.length > 0) {
                review.images.forEach(image => {
                    if (image.image) {
                        images.push(`${API_BASE_URL}/images/review_photos/${image.image}`);
                    }
                });
            }
        });
        return images;
    }, [reviews.length, API_BASE_URL]);

    // PhotoGallery hook для отзывов
    const photoGallery = usePhotoGallery({ images: reviewGalleryImages });
    
    // Отладочная информация по отзывам
    React.useEffect(() => {
        if (reviews.length > 0) {
            console.log('=== Reviews Debug Info ===');
            console.log('Total reviews:', reviews.length);
            reviews.slice(0, 3).forEach((review, index) => {
                console.log(`Review ${index}:`, {
                    id: review.id,
                    reviewer: review.reviewer,
                    reviewerImage: review.reviewer?.image,
                    reviewerImageExternalUrl: review.reviewer?.imageExternalUrl
                });
            });
        }
    }, [reviews]);
    
    return (
        <div className={styles.reviews_section}>
            <h3>Отзывы ({reviews.length})</h3>
            <div className={styles.reviews_list}>
                {reviewsLoading ? (
                    <div className={styles.loading}>Загрузка отзывов...</div>
                ) : reviews.length > 0 ? (
                    <>
                        <div className={styles.reviews_desktop}>
                            {reviews.slice(0, visibleCount).map((review, reviewIndex) => (
                                <div key={review.id} className={styles.review_item}>
                                    <div className={styles.review_header}>
                                        <div className={styles.reviewer_info}>
                                            <img
                                                src={getReviewAuthorAvatar(review)}
                                                alt={getReviewAuthorName(review)}
                                                onClick={() => handleAuthorClick(review)}
                                                style={{ cursor: 'pointer' }}
                                                className={styles.reviewer_avatar}
                                                data-fallback-image={(userRole === 'master' ? review.reviewer?.image : review.user?.image) || ''}
                                                data-fallback-external={(userRole === 'master' ? review.reviewer?.imageExternalUrl : review.user?.imageExternalUrl) || ''}
                                                onError={(e) => {
                                                    const img = e.currentTarget;
                                                    const currentSrc = img.src;
                                                    const fallbackImage = img.dataset.fallbackImage;
                                                    const fallbackExternal = img.dataset.fallbackExternal;
                                                    
                                                    if (currentSrc.includes('default_user')) return;
                                                    
                                                    if (fallbackImage && currentSrc.includes(fallbackImage) && fallbackExternal) {
                                                        img.src = fallbackExternal;
                                                        return;
                                                    }
                                                    
                                                    if (fallbackExternal && currentSrc.includes(fallbackExternal) && fallbackImage) {
                                                        img.src = "./default_user.png";
                                                        return;
                                                    }
                                                    
                                                    img.src = "./default_user.png";
                                                }}
                                            />
                                            <div className={styles.reviewer_main_info}>
                                                <div className={styles.reviewer_name}>{getReviewAuthorName(review)}</div>
                                                <div className={styles.review_service}>
                                                    <span 
                                                        className={`${styles.service_title} ${onServiceClick ? styles.clickable : ''}`}
                                                        onClick={() => {
                                                            if (onServiceClick && review.ticket && review.ticket.id) {
                                                                onServiceClick(review.ticket.id);
                                                            }
                                                        }}
                                                        style={{ cursor: onServiceClick ? 'pointer' : 'default' }}
                                                    >
                                                        {typeof review.services === 'object' && review.services && review.services.title ? String(review.services.title) : 'Услуга'}
                                                    </span>
                                                </div>
                                                <span 
                                                    className={`${styles.review_worker} ${isWorkerClickable() ? styles.clickable : ''}`}
                                                    onClick={() => handleWorkerClick(review)}
                                                    style={{ cursor: isWorkerClickable() ? 'pointer' : 'default' }}
                                                >
                                                    {getWorkerName(review)}
                                                </span>
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
                                            <span className={styles.review_date}>{review.date}</span>
                                        </div>
                                    </div>

                                    {review.description && renderReviewText(review)}

                                    {review.images && review.images.length > 0 && (
                                        <div className={styles.review_images}>
                                            {review.images.map((image, imageIndex) => {
                                                const uniqueKey = `${review.id}-${image.id}-${imageIndex}`;
                                                return (
                                                <div
                                                    key={uniqueKey}
                                                    className={styles.review_image}
                                                    onClick={() => photoGallery.openGallery(getReviewImageIndex(reviewIndex, imageIndex))}
                                                >
                                                    <img
                                                        src={`${API_BASE_URL}/images/review_photos/${image.image}`}
                                                        alt={`Фото отзыва ${imageIndex + 1}`}
                                                        onLoad={() => {
                                                            console.log('Review image loaded:', `${API_BASE_URL}/images/review_photos/${image.image}`);
                                                        }}
                                                        onError={(e) => {
                                                            const originalSrc = e.currentTarget.src;
                                                            console.error('Failed to load review image:', originalSrc);
                                                            
                                                            // Попробуем альтернативный путь
                                                            const altSrc = `${API_BASE_URL}/uploads/review_photos/${image.image}`;
                                                            if (originalSrc !== altSrc && !originalSrc.includes('default_user')) {
                                                                console.log('Trying alternative path:', altSrc);
                                                                e.currentTarget.src = altSrc;
                                                                return;
                                                            }
                                                            
                                                            // Если альтернативный путь тоже не сработал
                                                            if (!originalSrc.includes('default_user')) {
                                                                console.log('Using fallback image for review photo');
                                                                e.currentTarget.src = "./default_user.png";
                                                            }
                                                        }}
                                                    />
                                                </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        <div className={styles.reviews_mobile}>
                            {visibleCount === 2 ? (
                                <Swiper
                                    spaceBetween={16}
                                    slidesPerView={1}
                                    className={styles.reviews_slider}
                                >
                                    {reviews.slice(0, visibleCount).map((review, reviewIndex) => (
                                        <SwiperSlide key={review.id}>
                                            <div className={styles.review_item}>
                                                {/* копия контента выше */}
                                                <div className={styles.review_header}>
                                                    <div className={styles.reviewer_info}>
                                                        <img
                                                            src={getReviewAuthorAvatar(review)}
                                                            alt={getReviewAuthorName(review)}
                                                            onClick={() => handleAuthorClick(review)}
                                                            style={{ cursor: 'pointer' }}
                                                            className={styles.reviewer_avatar}
                                                            data-fallback-image={(userRole === 'master' ? review.reviewer?.image : review.user?.image) || ''}
                                                            data-fallback-external={(userRole === 'master' ? review.reviewer?.imageExternalUrl : review.user?.imageExternalUrl) || ''}
                                                            onError={(e) => {
                                                                const img = e.currentTarget;
                                                                const currentSrc = img.src;
                                                                const fallbackImage = img.dataset.fallbackImage;
                                                                const fallbackExternal = img.dataset.fallbackExternal;
                                                                
                                                                if (currentSrc.includes('default_user')) return;
                                                                
                                                                if (fallbackImage && currentSrc.includes(fallbackImage) && fallbackExternal) {
                                                                    img.src = fallbackExternal;
                                                                    return;
                                                                }
                                                                
                                                                if (fallbackExternal && currentSrc.includes(fallbackExternal) && fallbackImage) {
                                                                    img.src = "./default_user.png";
                                                                    return;
                                                                }
                                                                
                                                                img.src = "./default_user.png";
                                                            }}
                                                        />
                                                        <div className={styles.reviewer_main_info}>
                                                            <div className={styles.reviewer_name}>{getReviewAuthorName(review)}</div>
                                                            <div className={styles.review_service}>
                                                                <span 
                                                                    className={`${styles.service_title} ${onServiceClick ? styles.clickable : ''}`}
                                                                    onClick={() => {
                                                                        if (onServiceClick && review.ticket && review.ticket.id) {
                                                                            onServiceClick(review.ticket.id);
                                                                        }
                                                                    }}
                                                                    style={{ cursor: onServiceClick ? 'pointer' : 'default' }}
                                                                >
                                                                    {typeof review.services === 'object' && review.services && review.services.title ? String(review.services.title) : 'Услуга'}
                                                                </span>
                                                            </div>
                                                            <span 
                                                                className={`${styles.review_worker} ${isWorkerClickable() ? styles.clickable : ''}`}
                                                                onClick={() => handleWorkerClick(review)}
                                                                style={{ cursor: isWorkerClickable() ? 'pointer' : 'default' }}
                                                            >
                                                                {getWorkerName(review)}
                                                            </span>
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
                                                        <span className={styles.review_date}>{review.date}</span>
                                                    </div>
                                                </div>

                                                {review.description && renderReviewText(review)}

                                                {review.images && review.images.length > 0 && (
                                                    <div className={styles.review_images}>
                                                        {review.images.map((image, imageIndex) => {
                                                            const uniqueKey = `${review.id}-${image.id}-${imageIndex}`;
                                                            return (
                                                            <div
                                                                key={uniqueKey}
                                                                className={styles.review_image}
                                                                onClick={() => photoGallery.openGallery(getReviewImageIndex(reviewIndex, imageIndex))}
                                                            >
                                                                <img
                                                                    src={`${API_BASE_URL}/images/review_photos/${image.image}`}
                                                                    alt={`Фото отзыва ${imageIndex + 1}`}
                                                                    onLoad={() => {
                                                                        console.log('Review image loaded (mobile):', `${API_BASE_URL}/images/review_photos/${image.image}`);
                                                                    }}
                                                                    onError={(e) => {
                                                                        const originalSrc = e.currentTarget.src;
                                                                        console.error('Failed to load review image (mobile):', originalSrc);
                                                                        
                                                                        // Попробуем альтернативный путь
                                                                        const altSrc = `${API_BASE_URL}/uploads/review_photos/${image.image}`;
                                                                        if (originalSrc !== altSrc && !originalSrc.includes('default_user')) {
                                                                            console.log('Trying alternative path (mobile):', altSrc);
                                                                            e.currentTarget.src = altSrc;
                                                                            return;
                                                                        }
                                                                        
                                                                        // Если альтернативный путь тоже не сработал
                                                                        if (!originalSrc.includes('default_user')) {
                                                                            console.log('Using fallback image for review photo (mobile)');
                                                                            e.currentTarget.src = "./default_user.png";
                                                                        }
                                                                    }}
                                                                />
                                                            </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        </SwiperSlide>
                                    ))}
                                </Swiper>
                            ) : (
                                <>
                                    {reviews.slice(0, visibleCount).map((review, reviewIndex) => (
                                        <div key={review.id} className={styles.review_item}>
                                            <div className={styles.review_header}>
                                                <div className={styles.reviewer_info}>
                                                    <img
                                                        src={getReviewAuthorAvatar(review)}
                                                        alt={getReviewAuthorName(review)}
                                                        onClick={() => handleAuthorClick(review)}
                                                        style={{ cursor: 'pointer' }}
                                                        className={styles.reviewer_avatar}
                                                        data-fallback-image={(userRole === 'master' ? review.reviewer?.image : review.user?.image) || ''}
                                                        data-fallback-external={(userRole === 'master' ? review.reviewer?.imageExternalUrl : review.user?.imageExternalUrl) || ''}
                                                        onError={(e) => {
                                                            const img = e.currentTarget;
                                                            const currentSrc = img.src;
                                                            const fallbackImage = img.dataset.fallbackImage;
                                                            const fallbackExternal = img.dataset.fallbackExternal;
                                                            
                                                            if (currentSrc.includes('default_user')) return;
                                                            
                                                            if (fallbackImage && currentSrc.includes(fallbackImage) && fallbackExternal) {
                                                                img.src = fallbackExternal;
                                                                return;
                                                            }
                                                            
                                                            if (fallbackExternal && currentSrc.includes(fallbackExternal) && fallbackImage) {
                                                                img.src = "./default_user.png";
                                                                return;
                                                            }
                                                            
                                                            img.src = "./default_user.png";
                                                        }}
                                                    />
                                                    <div className={styles.reviewer_main_info}>
                                                        <div className={styles.reviewer_name}>{getReviewAuthorName(review)}</div>
                                                        <div className={styles.review_service}>
                                                            <span 
                                                                className={`${styles.service_title} ${onServiceClick ? styles.clickable : ''}`}
                                                                onClick={() => {
                                                                    if (onServiceClick && review.ticket && review.ticket.id) {
                                                                        onServiceClick(review.ticket.id);
                                                                    }
                                                                }}
                                                                style={{ cursor: onServiceClick ? 'pointer' : 'default' }}
                                                            >
                                                                {typeof review.services === 'object' && review.services && review.services.title ? String(review.services.title) : 'Услуга'}
                                                            </span>
                                                        </div>
                                                        <span 
                                                            className={`${styles.review_worker} ${isWorkerClickable() ? styles.clickable : ''}`}
                                                            onClick={() => handleWorkerClick(review)}
                                                            style={{ cursor: isWorkerClickable() ? 'pointer' : 'default' }}
                                                        >
                                                            {getWorkerName(review)}
                                                        </span>
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
                                                    <span className={styles.review_date}>{review.date}</span>
                                                </div>
                                            </div>

                                            {review.description && renderReviewText(review)}

                                            {review.images && review.images.length > 0 && (
                                                <div className={styles.review_images}>
                                                    {review.images.map((image, imageIndex) => {
                                                        const uniqueKey = `${review.id}-${image.id}-${imageIndex}`;
                                                        return (
                                                        <div
                                                            key={uniqueKey}
                                                            className={styles.review_image}
                                                            onClick={() => photoGallery.openGallery(getReviewImageIndex(reviewIndex, imageIndex))}
                                                        >
                                                            <img
                                                                src={`${API_BASE_URL}/images/review_photos/${image.image}`}
                                                                alt={`Фото отзыва ${imageIndex + 1}`}
                                                                onLoad={() => {
                                                                    console.log('Review image loaded (list):', `${API_BASE_URL}/images/review_photos/${image.image}`);
                                                                }}
                                                                onError={(e) => {
                                                                    const originalSrc = e.currentTarget.src;
                                                                    console.error('Failed to load review image (list):', originalSrc);
                                                                    
                                                                    // Попробуем альтернативный путь
                                                                    const altSrc = `${API_BASE_URL}/uploads/review_photos/${image.image}`;
                                                                    if (originalSrc !== altSrc && !originalSrc.includes('default_user')) {
                                                                        console.log('Trying alternative path (list):', altSrc);
                                                                        e.currentTarget.src = altSrc;
                                                                        return;
                                                                    }
                                                                    
                                                                    // Если альтернативный путь тоже не сработал
                                                                    if (!originalSrc.includes('default_user')) {
                                                                        console.log('Using fallback image for review photo (list)');
                                                                        e.currentTarget.src = "./default_user.png";
                                                                    }
                                                                }}
                                                            />
                                                        </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </>
                            )}
                        </div>
                    </>
                ) : (
                    <div className={styles.no_reviews}>
                        Пока нет отзывов
                    </div>
                )}
            </div>

            {/* Кнопки управления отзывами */}
            <div className={styles.reviews_actions}>
                {reviews.length >= 2 && visibleCount < reviews.length && (
                    <button
                        className={styles.show_all_reviews_btn}
                        onClick={onShowMore}
                    >
                        Показать все отзывы
                    </button>
                )}
                {visibleCount > 2 && visibleCount >= reviews.length && (
                    <button
                        className={styles.show_all_reviews_btn}
                        onClick={onShowLess}
                    >
                        Скрыть отзывы
                    </button>
                )}
                {reviews.length >= 2 && visibleCount <= 2 && (
                    <div className={styles.swipe_hint}>
                        Листайте вправо
                    </div>
                )}
            </div>

            {/* PhotoGallery для просмотра фото отзывов */}
            <PhotoGallery
                isOpen={photoGallery.isOpen}
                images={reviewGalleryImages}
                currentIndex={photoGallery.currentIndex}
                onClose={photoGallery.closeGallery}
                onNext={photoGallery.goToNext}
                onPrevious={photoGallery.goToPrevious}
                onSelectImage={photoGallery.selectImage}
                fallbackImage="./default_user.png"
            />
        </div>
    );
};
