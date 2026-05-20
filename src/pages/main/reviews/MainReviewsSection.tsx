import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ROUTES } from '../../../app/routers/routes';
import { smartNameTranslator } from '../../../utils/textHelper';
import { Swiper, SwiperSlide } from "swiper/react";
import styles from './MainReviewsSection.module.scss';
import { Preview, usePreview } from '../../../shared/ui/Photo/Preview';
import { Marquee } from '../../../shared/ui/Text/Marquee';
import { EmptyState } from '../../../widgets/EmptyState';
import { getAuthorAvatar } from '../../../utils/imageHelper';
import { ActionsDropdown } from '../../../widgets/ActionsDropdown';
import { IoWarningOutline } from 'react-icons/io5';
import Feedback from '../../../shared/ui/Modal/Feedback';
import { ShowMore } from '../../../shared/ui/Button/ShowMore/ShowMore';
import { getPageSize } from '../../../utils/pageSize';
import { parsePagedResponse } from '../../../utils/apiHelper';
import { useShowMore } from '../../../hooks';
import { API_BASE_URL } from '../../../utils/config';

interface MainReviewsSectionProps {
    className?: string;
}

export const MainReviewsSection: React.FC<MainReviewsSectionProps> = ({ className }) => {
    const [reviews, setReviews] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedReviews, setExpandedReviews] = useState<Record<number, boolean>>({});
    const { page, skipFetchRef: skipReviewsFetchRef, applyFetch: applyReviewsFetch, showMoreProps: reviewsShowMoreProps } = useShowMore<any>(setReviews);
    const [complaintReviewId, setComplaintReviewId] = useState<number | null>(null);
    const [complaintAuthorId, setComplaintAuthorId] = useState<number | null>(null);
    const [isComplaintOpen, setIsComplaintOpen] = useState(false);
    const navigate = useNavigate();
    const { t, i18n } = useTranslation(['profile', 'components', 'common']);

    // Загружаем отзывы с API
    const fetchReviews = async (currentPage: number) => {
        try {
            setLoading(true);
            const pageSize = getPageSize();
            const url = `${API_BASE_URL}/api/reviews?page=${currentPage}&itemsPerPage=${pageSize}`;
            console.log('Fetching reviews from:', url);
            
            const response = await fetch(url);
            
            if (response.ok) {
                const data = await response.json();
                
                const { items: reviewsData, hasMore: fetchedHasMore } = parsePagedResponse<any>(data, currentPage, pageSize);
                
                // Сортируем по дате создания (самые новые сначала)
                const sortedReviews = reviewsData.sort((a, b) => {
                    const dateA = new Date(a.createdAt || 0).getTime();
                    const dateB = new Date(b.createdAt || 0).getTime();
                    return dateB - dateA;
                });
                
                applyReviewsFetch(sortedReviews, fetchedHasMore);
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
        if (skipReviewsFetchRef.current) {
            skipReviewsFetchRef.current = false;
            return;
        }
        fetchReviews(page);
    }, [API_BASE_URL, page]);



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

    // Функция для обновления
    const handleRefresh = () => fetchReviews(page);
    // для получения URL изображения отзыва
    const getReviewImageUrl = (imagePath: string): string => {
        if (!imagePath) return './default_user.png';
        if (imagePath.startsWith('http')) return imagePath;
        if (imagePath.startsWith('/uploads/') || imagePath.startsWith('/images/')) return `${API_BASE_URL}${imagePath}`;
        return `${API_BASE_URL}/uploads/reviews/${imagePath}`;
    };

    // Аватар заказчика через общую утилиту
    const getReviewerAvatarUrl = (review: any): string =>
        getAuthorAvatar(review.client);

    const getPlainReviewText = (review: any) =>
        review.description ? review.description.replace(/<[^>]*>/g, '') : '';

    const isReviewExpanded = (review: any) => expandedReviews[review.id];

    const renderReviewDescription = (review: any, previewLength = 150) => {
        if (!review.description) return null;

        const plainText = getPlainReviewText(review);
        const expanded = isReviewExpanded(review);
        const canShowMore = plainText.length > previewLength;

        return (
            <div className={styles.reviews_about_title}>
                <div>
                    {expanded ? plainText : `${plainText.slice(0, previewLength)}...`}
                </div>
                {canShowMore && (
                    <ShowMore
                        expanded={expanded}
                        canLoadMore={canShowMore}
                        onShowMore={() => setExpandedReviews(prev => ({ ...prev, [review.id]: true }))}
                        onShowLess={() => setExpandedReviews(prev => ({ ...prev, [review.id]: false }))}
                        onClear={() => {}}
                        showMoreText={t('common:app.showMore')}
                        showLessText={t('common:app.showLess')}
                        clearBtn={false}
                        hideShowMoreWhenExpanded
                        loading={false}
                        horizontal
                    />
                )}
            </div>
        );
    };

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

    if (loading && reviews.length === 0) {
        return (
            <div className={`${styles.main_reviews} ${className || ''}`}>
                <div className={styles.container}>
                    <h3>{t('profile:reviewsTitle')}</h3>
                    <EmptyState isLoading={loading} title={t('profile:noReviews')} onRefresh={handleRefresh} />
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
                    {!loading && reviews.length === 0 && (
                        <EmptyState title={t('profile:noReviews')} onRefresh={handleRefresh} />
                    )}
                    {reviews.map((review, reviewIndex) => (
                        <div key={review.id} className={styles.reviews_item}>
                            <ActionsDropdown
                                style={{ position: 'absolute', top: '0px', right: '10px', zIndex: 2 }}
                                items={[{
                                    icon: <IoWarningOutline />,
                                    label: t('profile:complaint'),
                                    onClick: () => { setComplaintReviewId(review.id); setComplaintAuthorId(review.client?.id ?? 0); setIsComplaintOpen(true); },
                                    danger: true,
                                }]}
                            />
                            <div className={styles.reviews_naming}>
                                <img
                                    src={getReviewerAvatarUrl(review)}
                                    alt={getClientName(review)}
                                    onClick={() => handleClientProfileClick(review.client.id)}
                                    className={styles.reviewer_avatar}
                                    onError={(e) => { e.currentTarget.src = './default_user.png'; }}
                                />
                                <div className={styles.reviews_naming_title}>
                                    <div 
                                        onClick={() => handleClientProfileClick(review.client.id)}
                                        className={styles.clickable_name}
                                    >
                                        <Marquee text={getClientName(review)} alwaysScroll />
                                    </div>
                                    <div className={styles.reviews_naming_raiting}>
                                        {t('profile:ratedLabel')} 
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M12 2.49023L15.51 8.17023L22 9.76023L17.68 14.8502L18.18 21.5102L12 18.9802L5.82 21.5102L6.32 14.8502L2 9.76023L8.49 8.17023L12 2.49023Z" fill="#FFD700" stroke="#FFD700" strokeWidth="1"/>
                                        </svg>
                                        <span>{parseFloat(review.rating).toFixed(1)}</span>
                                    </div>
                                    <div className={styles.service_master_info}>
                                        <div 
                                            className={styles.service_title}
                                            onClick={() => {
                                                if (review.ticket && review.ticket.id) {
                                                    handleServiceClick(review.ticket.id);
                                                }
                                            }}
                                        >
                                            <Marquee text={getServiceTitle(review)} alwaysScroll />
                                        </div>
                                        <div 
                                            className={styles.master_name}
                                            onClick={() => {
                                                if (review.master && review.master.id) {
                                                    handleMasterProfileClick(review.master.id);
                                                }
                                            }}
                                        >
                                            <Marquee text={getMasterName(review)} alwaysScroll />
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <div className={styles.reviews_about}>
                                {renderReviewDescription(review, 150)}
                                
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
                        {reviews.map((review, reviewIndex) => (
                            <SwiperSlide key={review.id}>
                                <div className={styles.reviews_item}>
                                    <ActionsDropdown
                                        style={{ position: 'absolute', top: '0px', right: '10px', zIndex: 2 }}
                                        items={[{
                                            icon: <IoWarningOutline />,
                                            label: t('profile:complaint'),
                                            onClick: () => { setComplaintReviewId(review.id); setComplaintAuthorId(review.client?.id ?? 0); setIsComplaintOpen(true); },
                                            danger: true,
                                        }]}
                                    />
                                    <div className={styles.reviews_naming}>
                                        <img
                                            src={getReviewerAvatarUrl(review)}
                                            alt={getClientName(review)}
                                            onClick={() => handleClientProfileClick(review.client.id)}
                                            className={styles.reviewer_avatar}
                                            onError={(e) => { e.currentTarget.src = './default_user.png'; }}
                                        />
                                        <div className={styles.reviews_naming_title}>
                                            <div 
                                                onClick={() => handleClientProfileClick(review.client.id)}
                                                className={styles.clickable_name}
                                            >
                                                <Marquee text={getClientName(review)} alwaysScroll />
                                            </div>
                                            <div className={styles.reviews_naming_raiting}>
                                                {t('profile:ratedLabel')}
                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                    <path d="M12 2.49023L15.51 8.17023L22 9.76023L17.68 14.8502L18.18 21.5102L12 18.9802L5.82 21.5102L6.32 14.8502L2 9.76023L8.49 8.17023L12 2.49023Z" fill="#FFD700" stroke="#FFD700" strokeWidth="1"/>
                                                </svg>
                                                <span>{parseFloat(review.rating).toFixed(1)}</span>
                                            </div>
                                            <div className={styles.service_master_info}>
                                                <div 
                                                    className={styles.service_title}
                                                    onClick={() => {
                                                        if (review.ticket && review.ticket.id) {
                                                            handleServiceClick(review.ticket.id);
                                                        }
                                                    }}
                                                >
                                                    <Marquee text={getServiceTitle(review)} alwaysScroll />
                                                </div>
                                                <div 
                                                    className={styles.master_name}
                                                    onClick={() => {
                                                        if (review.master && review.master.id) {
                                                            handleMasterProfileClick(review.master.id);
                                                        }
                                                    }}
                                                >
                                                    <Marquee text={getMasterName(review)} alwaysScroll />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className={styles.reviews_about}>
                                        {renderReviewDescription(review, 100)}
                                        
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

                <ShowMore
                    {...reviewsShowMoreProps}
                    showMoreText={t('common:app.showMore')}
                    showLessText={t('common:app.showLess')}
                    loading={loading}
                    horizontal
                />
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
            <Feedback
                mode="complaint"
                isOpen={isComplaintOpen}
                onClose={() => setIsComplaintOpen(false)}
                onSuccess={() => setIsComplaintOpen(false)}
                onError={() => {}}
                targetUserId={complaintAuthorId ?? 0}
                reviewId={complaintReviewId ?? undefined}
                complaintType="review"
            />
        </div>
    );
};