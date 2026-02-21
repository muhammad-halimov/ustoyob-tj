import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../../../app/routers/routes.ts';
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import styles from './MainReviewsSection.module.scss';
import { PhotoGallery, usePhotoGallery } from '../../../shared/ui/PhotoGallery';
import { ReadMore } from '../../../widgets/ReadMore';
import { PageLoader } from '../../../widgets/PageLoader';

interface MainReviewsSectionProps {
    className?: string;
}

export const MainReviewsSection: React.FC<MainReviewsSectionProps> = ({ className }) => {
    const [reviews, setReviews] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [visibleCount, setVisibleCount] = useState(6);
    const navigate = useNavigate();
    

    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

    // Загружаем отзывы с API
    useEffect(() => {
        const fetchReviews = async () => {
            try {
                setLoading(true);
                const url = `${API_BASE_URL}/api/reviews?limit=20`;
                console.log('Fetching reviews from:', url);
                
                const response = await fetch(url);
                console.log('Response status:', response.status);
                console.log('Response ok:', response.ok);
                
                if (response.ok) {
                    const data = await response.json();
                    console.log('Reviews data received:', data);
                    
                    // Проверяем разные возможные структуры данных
                    let reviewsData: any[] = [];
                    if (data['hydra:member']) {
                        console.log('Found hydra:member, reviews count:', data['hydra:member'].length);
                        reviewsData = data['hydra:member'];
                    } else if (Array.isArray(data)) {
                        console.log('Found array data, reviews count:', data.length);
                        reviewsData = data;
                    } else {
                        console.log('No reviews found in response');
                        reviewsData = [];
                    }
                    
                    // Сортируем по дате создания (самые новые сначала)
                    const sortedReviews = reviewsData.sort((a, b) => {
                        const dateA = new Date(a.createdAt || 0).getTime();
                        const dateB = new Date(b.createdAt || 0).getTime();
                        return dateB - dateA; // Обратная сортировка (новые сначала)
                    });
                    
                    setReviews(sortedReviews);
                } else {
                    console.error('Response not ok:', response.status, response.statusText);
                }
            } catch (error) {
                console.error('Error fetching reviews:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchReviews();
    }, [API_BASE_URL]);

    // Функция для получения URL изображения отзыва
    const getReviewImageUrl = (imagePath: string): string => {
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

    // Собираем все изображения для галереи
    const galleryImages = useMemo(() => {
        const images: string[] = [];
        reviews.forEach(review => {
            if (review.images && review.images.length > 0) {
                // @ts-ignore
                review.images.forEach(image => {
                    if (image.image) {
                        images.push(getReviewImageUrl(image.image));
                    }
                });
            }
        });
        return images;
    }, [reviews, API_BASE_URL]);

    const photoGallery = usePhotoGallery({ images: galleryImages });

    // Функция для получения аватара клиента
    const getReviewerAvatarUrl = (review: any): string => {
        // Клиент - это тот, кто оставил отзыв
        const client = review.client;
        if (!client) return "./default_user.png";
        
        // Приоритет 1: image (локальное изображение)
        if (client.image) {
            // Если это полный URL (начинается с http), используем его
            if (client.image.startsWith('http')) {
                return client.image;
            }
            
            // Если это путь, начинающийся с /, добавляем только API_BASE_URL
            if (client.image.startsWith('/')) {
                return `${API_BASE_URL}${client.image}`;
            }
            
            // Иначе это имя файла - строим путь через profile_photos
            return `${API_BASE_URL}/images/profile_photos/${client.image}`;
        }
        
        // Приоритет 2: imageExternalUrl (внешние ссылки - Google, VK, Facebook и т.д.)
        if (client.imageExternalUrl && client.imageExternalUrl.trim()) {
            return client.imageExternalUrl;
        }
        
        // Приоритет 3: дефолтное изображение
        return "./default_user.png";
    };

    // Функция для получения имени клиента
    const getClientName = (review: any): string => {
        const client = review.client;
        if (!client) return 'Клиент';
        
        if (!client.name && !client.surname) {
            return client.login || 'Клиент';
        }
        return `${client.name || ''} ${client.surname || ''}`.trim();
    };

    // Функция для получения имени мастера
    const getMasterName = (review: any): string => {
        const master = review.master;
        if (!master) return 'Мастер';
        
        if (!master.name && !master.surname) {
            return master.login || 'Мастер';
        }
        return `${master.name || ''} ${master.surname || ''}`.trim();
    };

    // Функция для форматирования даты
    const formatDate = (dateString?: string): string => {
        if (!dateString) return '';
        
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('ru-RU', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
        } catch {
            return dateString;
        }
    };

    // Получить название услуги
    const getServiceTitle = (review: any): string => {
        return review.ticket?.title || 'Услуга';
    };

    // Навигация к профилям
    const handleClientProfileClick = (clientId: number) => {
        navigate(ROUTES.PROFILE_BY_ID(clientId));
    };

    const handleMasterProfileClick = (masterId: number) => {
        navigate(ROUTES.PROFILE_BY_ID(masterId));
    };

    const handleServiceClick = (ticketId: number) => {
        navigate(ROUTES.TICKET_BY_ID(ticketId));
    };

    // Функция для получения индекса изображения в общей галерее
    const getImageGalleryIndex = (reviewIndex: number, imageIndex: number): number => {
        let totalIndex = 0;
        for (let i = 0; i < reviewIndex; i++) {
            totalIndex += reviews[i].images?.length || 0;
        }
        return totalIndex + imageIndex;
    };

    // Функции для управления видимыми отзывами
    const handleShowMore = () => {
        setVisibleCount(reviews.length);
    };

    const handleShowLess = () => {
        setVisibleCount(6);
    };

    if (loading) {
        return (
            <div className={`${styles.main_reviews} ${className || ''}`}>
                <div className={styles.container}>
                    <h3>Отзывы</h3>
                    <PageLoader text="Загрузка отзывов..." fullPage={false} />
                </div>
            </div>
        );
    }

    if (reviews.length === 0) {
        return (
            <div className={`${styles.main_reviews} ${className || ''}`}>
                <div className={styles.container}>
                    <h3>Отзывы</h3>
                    <div className={styles.no_reviews}>Пока нет отзывов</div>
                </div>
            </div>
        );
    }

    // @ts-ignore
    // @ts-ignore
    // @ts-ignore
    // @ts-ignore
    return (
        <div className={`${styles.main_reviews} ${className || ''}`}>
            <div className={styles.container}>
                <h3>Отзывы</h3>
                
                {/* Desktop карточный вид */}
                <div className={styles.reviews_wrap}>
                    {reviews.slice(0, visibleCount).map((review, reviewIndex) => (
                        <div key={review.id} className={styles.reviews_item}>
                            <div className={styles.reviews_naming}>
                                <img
                                    src={getReviewerAvatarUrl(review)}
                                    alt={getClientName(review)}
                                    onClick={() => handleClientProfileClick(review.client.id)}
                                    className={styles.reviewer_avatar}
                                    data-fallback-image={review.client.image || ''}
                                    data-fallback-external={review.client.imageExternalUrl || ''}
                                    onError={(e) => {
                                        const img = e.currentTarget;
                                        const currentSrc = img.src;
                                        const fallbackImage = img.dataset.fallbackImage;
                                        const fallbackExternal = img.dataset.fallbackExternal;
                                        
                                        // Если уже показываем дефолт - не делаем ничего
                                        if (currentSrc.includes('default_user')) {
                                            return;
                                        }
                                        
                                        // Если текущий src - это image и есть imageExternalUrl
                                        if (fallbackImage && currentSrc.includes(fallbackImage) && fallbackExternal) {
                                            img.src = fallbackExternal;
                                            return;
                                        }
                                        
                                        // Если текущий src - это imageExternalUrl и есть локальный image
                                        if (fallbackExternal && currentSrc.includes(fallbackExternal) && fallbackImage) {
                                            // Уже пробовали внешний - он заблокирован, переходим к дефолту
                                            img.src = "./default_user.png";
                                            return;
                                        }
                                        
                                        // В остальных случаях - дефолтное изображение
                                        img.src = "./default_user.png";
                                    }}
                                />
                                <div className={styles.reviews_naming_title}>
                                    <h3 
                                        onClick={() => handleClientProfileClick(review.client.id)}
                                        className={styles.clickable_name}
                                    >
                                        {getClientName(review)}
                                    </h3>
                                    <div className={styles.reviews_naming_raiting}>
                                        Поставил: 
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M12 2.49023L15.51 8.17023L22 9.76023L17.68 14.8502L18.18 21.5102L12 18.9802L5.82 21.5102L6.32 14.8502L2 9.76023L8.49 8.17023L12 2.49023Z" fill="#FFD700" stroke="#FFD700" strokeWidth="1"/>
                                        </svg>
                                        <span>{parseFloat(review.rating).toFixed(1)}</span>
                                    </div>
                                    <div className={styles.service_master_info}>
                                        <span 
                                            className={styles.service_title}
                                            onClick={() => {
                                                if (review.ticket && review.ticket.id) {
                                                    handleServiceClick(review.ticket.id);
                                                }
                                            }}
                                        >
                                            {getServiceTitle(review)}
                                        </span>
                                        <span className={styles.divider}>•</span>
                                        <span 
                                            className={styles.master_name}
                                            onClick={() => {
                                                if (review.master && review.master.id) {
                                                    handleMasterProfileClick(review.master.id);
                                                }
                                            }}
                                        >
                                            {getMasterName(review)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            
                            <div className={styles.reviews_about}>
                                {review.description && (
                                    <div className={styles.reviews_about_title}>
                                        <ReadMore text={review.description} maxLength={150} />
                                    </div>
                                )}
                                
                                {review.images && review.images.length > 0 && (
                                    <div className={styles.review_images}>
                                        {review.images.slice(0, 3).map((image: any, imageIndex: any) => (
                                            <img
                                                key={image.id}
                                                src={getReviewImageUrl(image.image)}
                                                alt="Отзыв"
                                                className={styles.review_image}
                                                onClick={() => photoGallery.openGallery(getImageGalleryIndex(reviewIndex, imageIndex))}
                                                style={{ cursor: 'pointer' }}
                                                onError={(e) => {
                                                    e.currentTarget.src = "./default_user.png";
                                                }}
                                            />
                                        ))}
                                    </div>
                                )}
                                
                                {review.createdAt && (
                                    <div className={styles.review_date_bottom}>
                                        {formatDate(review.createdAt)}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Mobile слайдер */}
                <div className={styles.reviews_slider}>
                    <Swiper
                        spaceBetween={16}
                        slidesPerView={1.2}
                        breakpoints={{
                            640: {
                                slidesPerView: 1.5,
                            },
                        }}
                    >
                        {reviews.slice(0, visibleCount).map((review, reviewIndex) => (
                            <SwiperSlide key={review.id}>
                                <div className={styles.reviews_item}>
                                    <div className={styles.reviews_naming}>
                                        <img
                                            src={getReviewerAvatarUrl(review)}
                                            alt={getClientName(review)}
                                            onClick={() => handleClientProfileClick(review.client.id)}
                                            className={styles.reviewer_avatar}
                                            data-fallback-image={review.client.image || ''}
                                            data-fallback-external={review.client.imageExternalUrl || ''}
                                            onError={(e) => {
                                                const img = e.currentTarget;
                                                const currentSrc = img.src;
                                                const fallbackImage = img.dataset.fallbackImage;
                                                const fallbackExternal = img.dataset.fallbackExternal;
                                                
                                                // Если уже показываем дефолт - не делаем ничего
                                                if (currentSrc.includes('default_user')) {
                                                    return;
                                                }
                                                
                                                // Если текущий src - это image и есть imageExternalUrl
                                                if (fallbackImage && currentSrc.includes(fallbackImage) && fallbackExternal) {
                                                    img.src = fallbackExternal;
                                                    return;
                                                }
                                                
                                                // Если текущий src - это imageExternalUrl и есть локальный image
                                                if (fallbackExternal && currentSrc.includes(fallbackExternal) && fallbackImage) {
                                                    // Уже пробовали внешний - он заблокирован, переходим к дефолту
                                                    img.src = "./default_user.png";
                                                    return;
                                                }
                                                
                                                // В остальных случаях - дефолтное изображение
                                                img.src = "./default_user.png";
                                            }}
                                        />
                                        <div className={styles.reviews_naming_title}>
                                            <h3 
                                                onClick={() => handleClientProfileClick(review.client.id)}
                                                className={styles.clickable_name}
                                            >
                                                {getClientName(review)}
                                            </h3>
                                            <div className={styles.reviews_naming_raiting}>
                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                    <path d="M12 2.49023L15.51 8.17023L22 9.76023L17.68 14.8502L18.18 21.5102L12 18.9802L5.82 21.5102L6.32 14.8502L2 9.76023L8.49 8.17023L12 2.49023Z" fill="#FFD700" stroke="#FFD700" strokeWidth="1"/>
                                                </svg>
                                                <span>{review.rating}</span>
                                            </div>
                                            <div className={styles.service_master_info}>
                                                <span 
                                                    className={styles.service_title}
                                                    onClick={() => {
                                                        if (review.ticket && review.ticket.id) {
                                                            handleServiceClick(review.ticket.id);
                                                        }
                                                    }}
                                                >
                                                    {getServiceTitle(review)}
                                                </span>
                                                <span className={styles.divider}>•</span>
                                                <span 
                                                    className={styles.master_name}
                                                    onClick={() => {
                                                        if (review.master && review.master.id) {
                                                            handleMasterProfileClick(review.master.id);
                                                        }
                                                    }}
                                                >
                                                    {getMasterName(review)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className={styles.reviews_about}>
                                        {review.description && (
                                            <div className={styles.reviews_about_title}>
                                                <ReadMore text={review.description} maxLength={100} />
                                            </div>
                                        )}
                                        
                                        {review.images && review.images.length > 0 && (
                                            <div className={styles.review_images}>
                                                {review.images.slice(0, 2).map((image: any, imageIndex: any) => (
                                                    <img
                                                        key={image.id}
                                                        src={getReviewImageUrl(image.image)}
                                                        alt="Отзыв"
                                                        className={styles.review_image}
                                                        onClick={() => photoGallery.openGallery(getImageGalleryIndex(reviewIndex, imageIndex))}
                                                        style={{ cursor: 'pointer' }}
                                                        onError={(e) => {
                                                            e.currentTarget.src = "./default_user.png";
                                                        }}
                                                    />
                                                ))}
                                            </div>
                                        )}
                                        
                                        {review.createdAt && (
                                            <div className={styles.review_date_bottom}>
                                                {formatDate(review.createdAt)}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </SwiperSlide>
                        ))}
                    </Swiper>
                </div>

                {/* Кнопки управления отзывами */}
                {reviews.length > 6 && (
                    <div className={styles.reviews_actions}>
                        <button
                            className={styles.show_all_reviews_btn}
                            onClick={visibleCount === reviews.length ? handleShowLess : handleShowMore}
                        >
                            {visibleCount === reviews.length ? 'Скрыть отзывы' : 'Показать все отзывы'}
                        </button>
                    </div>
                )}
            </div>

            {/* PhotoGallery для просмотра фото */}
            <PhotoGallery
                isOpen={photoGallery.isOpen}
                images={galleryImages}
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