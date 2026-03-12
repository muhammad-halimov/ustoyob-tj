import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ROUTES } from '../../../app/routers/routes.ts';
import { smartNameTranslator } from '../../../utils/textHelper';
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import styles from './MainReviewsSection.module.scss';
import { Preview, usePreview } from '../../../shared/ui/Photo/Preview';
import { ReadMore } from '../../../widgets/ReadMore';
import { PageLoader } from '../../../widgets/PageLoader';
import { EmptyState } from '../../../widgets/EmptyState';
import { getAuthorAvatar } from '../../../utils/imageHelper.ts';

interface MainReviewsSectionProps {
    className?: string;
}

export const MainReviewsSection: React.FC<MainReviewsSectionProps> = ({ className }) => {
    const [reviews, setReviews] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [visibleCount, setVisibleCount] = useState(6);
    const navigate = useNavigate();
    const { t, i18n } = useTranslation(['profile', 'components']);
    

    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

    // Загружаем отзывы с API
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
                let reviewsData: any[];
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

    useEffect(() => {
        fetchReviews();
    }, [API_BASE_URL]);

    // Функция для получения имени заказчика
    const getClientName = (review: any): string => {
        const client = review.client;
        if (!client) return t('components:roles.client');
        
        if (!client.name && !client.surname) {
            return client.login || t('components:roles.client');
        }
        
        const currentLang = i18n.language as 'ru' | 'tj' | 'eng';
        const firstName = client.name || '';
        const lastName = client.surname || '';
        
        const translatedFirstName = smartNameTranslator(firstName, currentLang);
        const translatedLastName = smartNameTranslator(lastName, currentLang);
        
        return `${translatedLastName} ${translatedFirstName}`.trim();
    };

    // Функция для получения имени специалиста
    const getMasterName = (review: any): string => {
        const master = review.master;
        if (!master) return t('components:roles.specialist');
        
        if (!master.name && !master.surname) {
            return master.login || t('components:roles.specialist');
        }
        
        const currentLang = i18n.language as 'ru' | 'tj' | 'eng';
        const firstName = master.name || '';
        const lastName = master.surname || '';
        
        const translatedFirstName = smartNameTranslator(firstName, currentLang);
        const translatedLastName = smartNameTranslator(lastName, currentLang);
        
        return `${translatedLastName} ${translatedFirstName}`.trim();
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

    // Функция для получения URL изображения отзыва
    const getReviewImageUrl = (imagePath: string): string => {
        if (!imagePath) return './default_user.png';
        if (imagePath.startsWith('http')) return imagePath;
        if (imagePath.startsWith('/images/review_photos/')) return `${API_BASE_URL}${imagePath}`;
        return `${API_BASE_URL}/images/review_photos/${imagePath}`;
    };

    // Аватар заказчика через общую утилиту
    const getReviewerAvatarUrl = (review: any): string =>
        getAuthorAvatar(review.client);

    // Собираем все изображения для галереи
    const galleryImages = useMemo(() => {
        const images: string[] = [];
        reviews.forEach(review => {
            (review.images || []).forEach((image: any) => {
                if (image.image) images.push(getReviewImageUrl(image.image));
            });
        });
        return images;
    }, [reviews]);

    const photoGallery = usePreview({ images: galleryImages });

    if (loading) {
        return (
            <div className={`${styles.main_reviews} ${className || ''}`}>
                <div className={styles.container}>
                    <h3>{t('profile:reviewsTitle')}</h3>
                    <PageLoader text={t('profile:loadingReviews')} fullPage={false} />
                </div>
            </div>
        );
    }

    if (reviews.length === 0) {
        return (
            <div className={`${styles.main_reviews} ${className || ''}`}>
                <div className={styles.container}>
                    <h3>{t('profile:reviewsTitle')}</h3>
                    <EmptyState title={t('profile:noReviews')} onRefresh={fetchReviews} />
                </div>
            </div>
        );
    }

    return (
        <div className={`${styles.main_reviews} ${className || ''}`}>
            <div className={styles.container}>
                <h3>{t('profile:reviewsTitle')}</h3>
                
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
                                    onError={(e) => { e.currentTarget.src = './default_user.png'; }}
                                />
                                <div className={styles.reviews_naming_title}>
                                    <h3 
                                        onClick={() => handleClientProfileClick(review.client.id)}
                                        className={styles.clickable_name}
                                    >
                                        {getClientName(review)}
                                    </h3>
                                    <div className={styles.reviews_naming_raiting}>
                                        {t('profile:ratedLabel')} 
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
                                            onError={(e) => { e.currentTarget.src = './default_user.png'; }}
                                        />
                                        <div className={styles.reviews_naming_title}>
                                            <h3 
                                                onClick={() => handleClientProfileClick(review.client.id)}
                                                className={styles.clickable_name}
                                            >
                                                {getClientName(review)}
                                            </h3>
                                            <div className={styles.reviews_naming_raiting}>
                                                {t('profile:ratedLabel')}
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
                            {visibleCount === reviews.length ? t('profile:hideReviews') : t('profile:showAllReviews')}
                        </button>
                    </div>
                )}
            </div>

            {/* Preview для просмотра фото */}
            <Preview
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