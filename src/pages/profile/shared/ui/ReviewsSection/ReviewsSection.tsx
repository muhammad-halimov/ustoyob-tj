import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ShowMore } from '../../../../../shared/ui/Button/ShowMore/ShowMore';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Preview, usePreview } from '../../../../../shared/ui/Photo/Preview';
import { ReadMore } from '../../../../../widgets/ReadMore';
import { EmptyState } from '../../../../../widgets/EmptyState';
import { Marquee } from '../../../../../shared/ui/Text/Marquee';
import { Review } from '../../../../../entities';
import styles from './ReviewsSection.module.scss';
import { getAuthorAvatar } from '../../../../../utils/imageHelper';
import { ActionsDropdown } from '../../../../../widgets/ActionsDropdown';
import { IoWarningOutline, IoCreateOutline } from 'react-icons/io5';
import { ReviewSortingFilter, ReviewSortByType, ReviewTimeFilterType } from '../../../../../widgets/Sorting/ReviewCriteriaFilter';

// Экспорт для обратной совместимости
export type { Review } from '../../../../../entities';

interface ReviewsSectionProps {
    reviews: Review[];
    reviewsLoading: boolean;
    visibleCount: number;

    API_BASE_URL: string;
    userRole?: 'master' | 'client'; // Добавляем тип профиля
    onShowMore?: () => void;
    onShowLess?: () => void;
    /** Max characters before "Читать дальше" button appears. Default: 150 */
    maxLength?: number;
    getReviewerAvatarUrl?: (review: Review) => string;
    getClientName: (review: Review) => string;
    getMasterName: (review: Review) => string;
    onClientProfileClick: (clientId: number) => void;
    onMasterProfileClick?: (masterId: number) => void;
    onServiceClick?: (ticketId: number) => void;
    getReviewImageIndex: (reviewIndex: number, imageIndex: number) => number;    onComplaintClick?: (reviewId: number, authorId: number) => void;
    onRefresh?: () => void;
    currentUserId?: number;
    onEditClick?: (review: Review) => void;
}

export const ReviewsSection: React.FC<ReviewsSectionProps> = ({
    reviews,
    reviewsLoading,
    visibleCount,
    API_BASE_URL,
    userRole = 'master', // По умолчанию специалист
    onShowMore,
    onShowLess,
    maxLength = 150,
    getClientName,
    getMasterName,
    onClientProfileClick,
    onMasterProfileClick,
    onServiceClick,
    getReviewImageIndex: _getReviewImageIndex,
    onComplaintClick,
    onRefresh,
    currentUserId,
    onEditClick,
}) => {
    const { t } = useTranslation(['profile', 'common']);

    // ── Internal sort / filter state ────────────────────────────────────────────
    const [sortBy, setSortBy] = useState<ReviewSortByType>('newest');
    const [timeFilter, setTimeFilter] = useState<ReviewTimeFilterType>('all');
    const [withPhotosOnly, setWithPhotosOnly] = useState(false);

    /** Returns midnight of the given date */
    const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

    const sortedReviews = useMemo(() => {
        const now = new Date();
        const todayStart = startOfDay(now);
        const yesterdayStart = new Date(todayStart); yesterdayStart.setDate(yesterdayStart.getDate() - 1);
        const weekStart = new Date(todayStart); weekStart.setDate(weekStart.getDate() - 6);
        const monthStart = new Date(todayStart); monthStart.setDate(monthStart.getDate() - 29);

        const parseReviewDate = (review: Review): Date => {
            if (review.createdAt) return new Date(review.createdAt);
            // Fallback: parse 'dd.mm.yyyy' display format
            if (review.date) {
                const parts = review.date.split('.');
                if (parts.length === 3) return new Date(+parts[2], +parts[1] - 1, +parts[0]);
            }
            return new Date(0);
        };

        let filtered = [...reviews];

        // Time filter
        if (timeFilter !== 'all') {
            filtered = filtered.filter(r => {
                const d = parseReviewDate(r);
                if (timeFilter === 'today') return d >= todayStart;
                if (timeFilter === 'yesterday') return d >= yesterdayStart && d < todayStart;
                if (timeFilter === 'week') return d >= weekStart;
                if (timeFilter === 'month') return d >= monthStart;
                return true;
            });
        }

        // With photos filter
        if (withPhotosOnly) {
            filtered = filtered.filter(r => r.images && r.images.length > 0);
        }

        // Sort
        filtered.sort((a, b) => {
            if (sortBy === 'newest') return parseReviewDate(b).getTime() - parseReviewDate(a).getTime();
            if (sortBy === 'oldest') return parseReviewDate(a).getTime() - parseReviewDate(b).getTime();
            if (sortBy === 'rating-high') return b.rating - a.rating;
            if (sortBy === 'rating-low') return a.rating - b.rating;
            return 0;
        });

        return filtered;
    }, [reviews, sortBy, timeFilter, withPhotosOnly]);

    /** Compute the global image index within sortedReviews for the gallery */
    const getSortedReviewImageIndex = (reviewIndex: number, imageIndex: number): number => {
        let total = 0;
        for (let i = 0; i < reviewIndex; i++) total += sortedReviews[i].images?.length || 0;
        return total + imageIndex;
    };
    // ЛОГИКА ОТЗЫВОВ (зависит от типа профиля):
    // Профиль СПЕЦИАЛИСТА:
    //   - reviewer (верхнее с аватаркой) = ЗАКАЗЧИК (автор отзыва)
    //   - worker (нижнее) = СПЕЦИАЛИСТ (исполнитель работы)
    // Профиль ЗАКАЗЧИКА:
    //   - reviewer (верхнее с аватаркой) = СПЕЦИАЛИСТ (о ком отзыв)
    //   - worker (нижнее) = ЗАКАЗЧИК (кто написал отзыв)
    
    // Аватарка и имя автора отзыва (верхнее)
    const getReviewAuthorAvatar = (review: Review) => {
        if (userRole === 'master') {
            // Профиль специалиста - показываем заказчика
            return getAuthorAvatar(review.reviewer);
        } else {
            // Профиль заказчика - показываем специалиста
            return getAuthorAvatar(review.user);
        }
    };

    const getReviewAuthorName = (review: Review) => {
        if (userRole === 'master') {
            // Профиль специалиста - показываем заказчика
            return getClientName(review);
        } else {
            // Профиль заказчика - показываем специалиста
            return getMasterName(review);
        }
    };

    const handleAuthorClick = (review: Review) => {
        if (userRole === 'master') {
            // Кликаем на заказчика
            if (review.reviewer?.id) {
                onClientProfileClick(review.reviewer.id);
            }
        } else {
            // Кликаем на специалиста
            if (onMasterProfileClick && review.user?.id) {
                onMasterProfileClick(review.user.id);
            }
        }
    };

    // Worker (нижнее)
    const getWorkerName = (review: Review) => {
        if (userRole === 'master') {
            // Профиль специалиста - показываем специалиста (исполнитель)
            return getMasterName(review);
        } else {
            // Профиль заказчика - показываем заказчика (автор отзыва)
            return getClientName(review);
        }
    };

    const handleWorkerClick = (review: Review) => {
        if (userRole === 'master') {
            // Кликаем на специалиста
            if (onMasterProfileClick && review.user?.id) {
                onMasterProfileClick(review.user.id);
            }
        } else {
            // Кликаем на заказчика
            if (review.reviewer?.id) {
                onClientProfileClick(review.reviewer.id);
            }
        }
    };

    const getReviewAuthorId = (review: Review): number | undefined =>
        userRole === 'master' ? review.reviewer?.id : review.user?.id;

    const isWorkerClickable = () => {
        return true;
    };
    const getServiceTitleText = (review: Review): string =>
        review.ticket?.title
            ? String(review.ticket.title)
            : t('profile:serviceDefault');
    // Собираем все изображения из отзывов для галереи (из отсортированного/отфильтрованного списка)
    const reviewGalleryImages = useMemo(() => {
        if (!sortedReviews || sortedReviews.length === 0) return [];
        
        const images: string[] = [];
        sortedReviews.forEach(review => {
            if (review.images && review.images.length > 0) {
                review.images.forEach(image => {
                    if (image.image) {
                        images.push(`${API_BASE_URL}/uploads/reviews/${image.image}`);
                    }
                });
            }
        });
        return images;
    }, [sortedReviews, API_BASE_URL]);

    // Preview hook для отзывов
    const photoGallery = usePreview({ images: reviewGalleryImages });
    
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
            <h3>{t('profile:reviewsTitle')} ({reviews.length})</h3>
            {reviews.length > 0 && (
                <ReviewSortingFilter
                    sortBy={sortBy}
                    timeFilter={timeFilter}
                    withPhotosOnly={withPhotosOnly}
                    onSortChange={setSortBy}
                    onTimeFilterChange={setTimeFilter}
                    onWithPhotosToggle={() => setWithPhotosOnly(p => !p)}
                />
            )}
            <div className={styles.reviews_list}>
                {reviewsLoading ? (
                    <EmptyState isLoading />
                ) : sortedReviews.length > 0 ? (
                    <>
                        <div className={styles.reviews_desktop}>
                            {sortedReviews.slice(0, visibleCount).map((review, reviewIndex) => (
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
                                                    if (!img.src.includes('default_user')) {
                                                        img.src = "./default_user.png";
                                                    }
                                                }}
                                            />
                                            <div className={styles.reviewer_main_info}>
                                                <div
                                                    className={`${styles.reviewer_name} ${styles.reviewer_name_link}`}
                                                    onClick={() => handleAuthorClick(review)}
                                                >
                                                    <Marquee text={getReviewAuthorName(review)} alwaysScroll/>
                                                </div>
                                                <div className={styles.review_service}>
                                                    <div 
                                                        className={`${styles.service_title} ${onServiceClick ? styles.clickable : ''}`}
                                                        onClick={() => {
                                                            if (onServiceClick && review.ticket && review.ticket.id) {
                                                                onServiceClick(review.ticket.id);
                                                            }
                                                        }}
                                                        style={{ cursor: onServiceClick ? 'pointer' : 'default' }}
                                                    >
                                                        <Marquee text={getServiceTitleText(review)} alwaysScroll />
                                                    </div>
                                                </div>
                                                <div 
                                                    className={`${styles.review_worker} ${isWorkerClickable() ? styles.clickable : ''}`}
                                                    onClick={() => handleWorkerClick(review)}
                                                    style={{ cursor: isWorkerClickable() ? 'pointer' : 'default' }}
                                                >
                                                    <Marquee text={getWorkerName(review)} alwaysScroll/>
                                                </div>
                                                <div className={styles.review_rating_main}>
                                                    <span>{t('profile:ratedLabel')} </span>
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

                                    {review.description && <ReadMore text={review.description} maxLength={maxLength} textClassName={styles.review_text} buttonClassName={styles.review_more} />}

                                    {review.images && review.images.length > 0 && (
                                        <div className={styles.review_images}>
                                            {review.images.map((image, imageIndex) => {
                                                const uniqueKey = `${review.id}-${image.id}-${imageIndex}`;
                                                return (
                                                <div
                                                    key={uniqueKey}
                                                    className={styles.review_image}
                                                    onClick={() => photoGallery.openGallery(getSortedReviewImageIndex(reviewIndex, imageIndex))}
                                                >
                                                    <img
                                                        src={`${API_BASE_URL}/uploads/reviews/${image.image}`}
                                                        alt={`${t('profile:reviewPhotoAlt')} ${imageIndex + 1}`}
                                                        onError={(e) => {
                                                            if (!e.currentTarget.src.includes('default_user')) {
                                                                e.currentTarget.src = "./default_user.png";
                                                            }
                                                        }}
                                                    />
                                                </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                    {(onComplaintClick || onEditClick) && (
                                        <ActionsDropdown
                                            style={{ position: 'absolute', top: '2px', right: '0', zIndex: 2 }}
                                            items={[
                                                ...(onEditClick ? [{ icon: <IoCreateOutline />, label: t('profile:editBtn'), onClick: () => onEditClick!(review), hidden: !currentUserId || getReviewAuthorId(review) !== currentUserId }] : []),
                                                ...(onComplaintClick ? [{ icon: <IoWarningOutline />, label: t('profile:complaint'), onClick: () => onComplaintClick!(review.id, getReviewAuthorId(review) ?? 0), danger: true as const, hidden: !!currentUserId && getReviewAuthorId(review) === currentUserId }] : []),
                                            ]}
                                        />
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
                                    {sortedReviews.slice(0, visibleCount).map((review, reviewIndex) => (
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
                                                                if (!img.src.includes('default_user')) {
                                                                    img.src = "./default_user.png";
                                                                }
                                                            }}
                                                        />
                                                        <div className={styles.reviewer_main_info}>
                                                            <div
                                                                className={`${styles.reviewer_name} ${styles.reviewer_name_link}`}
                                                                onClick={() => handleAuthorClick(review)}
                                                            >
                                                                <Marquee text={getReviewAuthorName(review)} alwaysScroll/>
                                                            </div>
                                                            <div className={styles.review_service}>
                                                                <div 
                                                                    className={`${styles.service_title} ${onServiceClick ? styles.clickable : ''}`}
                                                                    onClick={() => {
                                                                        if (onServiceClick && review.ticket && review.ticket.id) {
                                                                            onServiceClick(review.ticket.id);
                                                                        }
                                                                    }}
                                                                    style={{ cursor: onServiceClick ? 'pointer' : 'default' }}
                                                                >
                                                                    <Marquee text={getServiceTitleText(review)} alwaysScroll />
                                                                </div>
                                                            </div>
                                                            <div 
                                                                className={`${styles.review_worker} ${isWorkerClickable() ? styles.clickable : ''}`}
                                                                onClick={() => handleWorkerClick(review)}
                                                                style={{ cursor: isWorkerClickable() ? 'pointer' : 'default' }}
                                                            >
                                                                <Marquee text={getWorkerName(review)} alwaysScroll/>
                                                            </div>
                                                            <div className={styles.review_rating_main}>
                                                                <span>{t('profile:ratedLabel')} </span>
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

                                                {review.description && <ReadMore text={review.description} maxLength={maxLength} textClassName={styles.review_text} buttonClassName={styles.review_more} />}

                                                {review.images && review.images.length > 0 && (
                                                    <div className={styles.review_images}>
                                                        {review.images.map((image, imageIndex) => {
                                                            const uniqueKey = `${review.id}-${image.id}-${imageIndex}`;
                                                            return (
                                                            <div
                                                                key={uniqueKey}
                                                                className={styles.review_image}
                                                                onClick={() => photoGallery.openGallery(getSortedReviewImageIndex(reviewIndex, imageIndex))}
                                                            >
                                                                <img
                                                                    src={`${API_BASE_URL}/uploads/reviews/${image.image}`}
                                                                    alt={`${t('profile:reviewPhotoAlt')} ${imageIndex + 1}`}
                                                                    onError={(e) => {
                                                                        if (!e.currentTarget.src.includes('default_user')) {
                                                                            e.currentTarget.src = "./default_user.png";
                                                                        }
                                                                    }}
                                                                />
                                                            </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                                {(onComplaintClick || onEditClick) && (
                                                    <ActionsDropdown
                                                        style={{ position: 'absolute', top: '2px', right: '0', zIndex: 2 }}
                                                        items={[
                                                            ...(onEditClick ? [{ icon: <IoCreateOutline />, label: t('profile:editBtn'), onClick: () => onEditClick!(review), hidden: !currentUserId || getReviewAuthorId(review) !== currentUserId }] : []),
                                                            ...(onComplaintClick ? [{ icon: <IoWarningOutline />, label: t('profile:complaint'), onClick: () => onComplaintClick!(review.id, getReviewAuthorId(review) ?? 0), danger: true as const, hidden: !!currentUserId && getReviewAuthorId(review) === currentUserId }] : []),
                                                        ]}
                                                    />
                                                )}
                                            </div>
                                        </SwiperSlide>
                                    ))}
                                </Swiper>
                            ) : (
                                <>
                                    {sortedReviews.slice(0, visibleCount).map((review, reviewIndex) => (
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
                                                            if (!img.src.includes('default_user')) {
                                                                img.src = "./default_user.png";
                                                            }
                                                        }}
                                                    />
                                                    <div className={styles.reviewer_main_info}>
                                                        <div
                                                            className={`${styles.reviewer_name} ${styles.reviewer_name_link}`}
                                                            onClick={() => handleAuthorClick(review)}
                                                        >
                                                            <Marquee text={getReviewAuthorName(review)} alwaysScroll/>
                                                        </div>
                                                        <div className={styles.review_service}>
                                                            <div 
                                                                className={`${styles.service_title} ${onServiceClick ? styles.clickable : ''}`}
                                                                onClick={() => {
                                                                    if (onServiceClick && review.ticket && review.ticket.id) {
                                                                        onServiceClick(review.ticket.id);
                                                                    }
                                                                }}
                                                                style={{ cursor: onServiceClick ? 'pointer' : 'default' }}
                                                            >
                                                                <Marquee text={getServiceTitleText(review)} alwaysScroll />
                                                            </div>
                                                        </div>
                                                        <div 
                                                            className={`${styles.review_worker} ${isWorkerClickable() ? styles.clickable : ''}`}
                                                            onClick={() => handleWorkerClick(review)}
                                                            style={{ cursor: isWorkerClickable() ? 'pointer' : 'default' }}
                                                        >
                                                            <Marquee text={getWorkerName(review)} alwaysScroll/>
                                                        </div>
                                                        <div className={styles.review_rating_main}>
                                                            <span>{t('profile:ratedLabel')} </span>
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

                                            {review.description && <ReadMore text={review.description} maxLength={maxLength} textClassName={styles.review_text} buttonClassName={styles.review_more} />}

                                            {review.images && review.images.length > 0 && (
                                                <div className={styles.review_images}>
                                                    {review.images.map((image, imageIndex) => {
                                                        const uniqueKey = `${review.id}-${image.id}-${imageIndex}`;
                                                        return (
                                                        <div
                                                            key={uniqueKey}
                                                            className={styles.review_image}
                                                            onClick={() => photoGallery.openGallery(getSortedReviewImageIndex(reviewIndex, imageIndex))}
                                                        >
                                                            <img
                                                                src={`${API_BASE_URL}/uploads/reviews/${image.image}`}
                                                                alt={`${t('profile:reviewPhotoAlt')} ${imageIndex + 1}`}
                                                                onError={(e) => {
                                                                    if (!e.currentTarget.src.includes('default_user')) {
                                                                        e.currentTarget.src = "./default_user.png";
                                                                    }
                                                                }}
                                                            />
                                                        </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                            {(onComplaintClick || onEditClick) && (
                                                <ActionsDropdown
                                                    style={{ position: 'absolute', top: '2px', right: '0', zIndex: 2 }}
                                                    items={[
                                                        ...(onEditClick ? [{ icon: <IoCreateOutline />, label: t('profile:editBtn'), onClick: () => onEditClick!(review), hidden: !currentUserId || getReviewAuthorId(review) !== currentUserId }] : []),
                                                        ...(onComplaintClick ? [{ icon: <IoWarningOutline />, label: t('profile:complaint'), onClick: () => onComplaintClick!(review.id, getReviewAuthorId(review) ?? 0), danger: true as const, hidden: !!currentUserId && getReviewAuthorId(review) === currentUserId }] : []),
                                                    ]}
                                                />
                                            )}
                                        </div>
                                    ))}
                                </>
                            )}
                        </div>
                    </>
                ) : (
                    <EmptyState title={t('profile:noReviews')} onRefresh={onRefresh} />
                )}
            </div>

            {/* Кнопки управления отзывами */}
            <div className={styles.reviews_actions}>
                {sortedReviews.length >= 2 && onShowMore && onShowLess && (
                    <ShowMore
                        expanded={visibleCount > 2}
                        canLoadMore={visibleCount < sortedReviews.length}
                        onShowMore={onShowMore}
                        onShowLess={onShowLess}
                        onClear={onShowLess}
                        showMoreText={t('common:app.showMore')}
                        showLessText={t('common:app.showLess')}
                    />
                )}
            </div>

            {/* Preview для просмотра фото отзывов */}
            <Preview
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
