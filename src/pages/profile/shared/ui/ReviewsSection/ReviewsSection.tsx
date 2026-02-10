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
    swiperKey: number;
    API_BASE_URL: string;
    onShowMore: () => void;
    onShowLess: () => void;
    renderReviewText: (review: Review) => React.ReactElement;
    getReviewerAvatarUrl: (review: Review) => string;
    getClientName: (review: Review) => string;
    getMasterName: (review: Review) => string;
    onClientProfileClick: (clientId: number) => void;
    getReviewImageIndex: (reviewIndex: number, imageIndex: number) => number;
}

export const ReviewsSection: React.FC<ReviewsSectionProps> = ({
    reviews,
    reviewsLoading,
    visibleCount,
    swiperKey,
    API_BASE_URL,
    onShowMore,
    onShowLess,
    renderReviewText,
    getReviewerAvatarUrl,
    getClientName,
    getMasterName,
    onClientProfileClick,
    getReviewImageIndex,
}) => {
    // Собираем все изображения из отзывов для галереи
    const reviewGalleryImages = useMemo(() => {
        const images: string[] = [];
        reviews.forEach(review => {
            if (review.images && review.images.length > 0) {
                review.images.forEach(image => {
                    images.push(`${API_BASE_URL}/images/review_photos/${image.image}`);
                });
            }
        });
        return images;
    }, [reviews, API_BASE_URL]);

    // PhotoGallery hook для отзывов
    const photoGallery = usePhotoGallery({ images: reviewGalleryImages });
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
                                                src={getReviewerAvatarUrl(review)}
                                                alt={getClientName(review)}
                                                onClick={() => onClientProfileClick(review.reviewer.id)}
                                                style={{ cursor: 'pointer' }}
                                                className={styles.reviewer_avatar}
                                                onError={(e) => {
                                                    e.currentTarget.src = "./fonTest5.png";
                                                }}
                                            />
                                            <div className={styles.reviewer_main_info}>
                                                <div className={styles.reviewer_name}>{getClientName(review)}</div>
                                                <div className={styles.review_service}>
                                                    Услуга: <span className={styles.service_title}>{typeof review.services === 'object' && review.services && review.services.title ? String(review.services.title) : 'Услуга'}</span>
                                                </div>
                                                <span className={styles.review_worker}>{getMasterName(review)}</span>
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
                                            {review.images.map((image, imageIndex) => (
                                                <div
                                                    key={image.id}
                                                    className={styles.review_image}
                                                    onClick={() => photoGallery.openGallery(getReviewImageIndex(reviewIndex, imageIndex))}
                                                >
                                                    <img
                                                        src={`${API_BASE_URL}/images/review_photos/${image.image}`}
                                                        alt={`Фото отзыва ${imageIndex + 1}`}
                                                        onError={(e) => {
                                                            const target = e.currentTarget;
                                                            if (target.dataset.errorHandled) return;
                                                            target.dataset.errorHandled = 'true';
                                                            target.src = "./fonTest5.png";
                                                        }}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        <div className={styles.reviews_mobile}>
                            {visibleCount === 2 ? (
                                <Swiper
                                    key={swiperKey}
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
                                                            src={getReviewerAvatarUrl(review)}
                                                            alt={getClientName(review)}
                                                            onClick={() => onClientProfileClick(review.reviewer.id)}
                                                            style={{ cursor: 'pointer' }}
                                                            className={styles.reviewer_avatar}
                                                            onError={(e) => {
                                                                e.currentTarget.src = "./fonTest5.png";
                                                            }}
                                                        />
                                                        <div className={styles.reviewer_main_info}>
                                                            <div className={styles.reviewer_name}>{getClientName(review)}</div>
                                                            <div className={styles.review_service}>
                                                                Услуга: <span className={styles.service_title}>{typeof review.services === 'object' && review.services && review.services.title ? String(review.services.title) : 'Услуга'}</span>
                                                            </div>
                                                            <span className={styles.review_worker}>{getMasterName(review)}</span>
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

                                                <div className={styles.review_details}>
                                                    <div className={styles.review_worker_date}>
                                                        <span className={styles.review_date}>{review.date}</span>
                                                    </div>
                                                </div>

                                                {review.description && renderReviewText(review)}

                                                {review.images && review.images.length > 0 && (
                                                    <div className={styles.review_images}>
                                                        {review.images.map((image, imageIndex) => (
                                                            <div
                                                                key={image.id}
                                                                className={styles.review_image}
                                                                onClick={() => photoGallery.openGallery(getReviewImageIndex(reviewIndex, imageIndex))}
                                                            >
                                                                <img
                                                                    src={`${API_BASE_URL}/images/review_photos/${image.image}`}
                                                                    alt={`Фото отзыва ${imageIndex + 1}`}
                                                                    onError={(e) => {
                                                                        const target = e.currentTarget;
                                                                        if (target.dataset.errorHandled) return;
                                                                        target.dataset.errorHandled = 'true';
                                                                        target.src = "./fonTest5.png";
                                                                    }}
                                                                />
                                                            </div>
                                                        ))}
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
                                                        src={getReviewerAvatarUrl(review)}
                                                        alt={getClientName(review)}
                                                        onClick={() => onClientProfileClick(review.reviewer.id)}
                                                        style={{ cursor: 'pointer' }}
                                                        className={styles.reviewer_avatar}
                                                        onError={(e) => {
                                                            e.currentTarget.src = "./fonTest5.png";
                                                        }}
                                                    />
                                                    <div className={styles.reviewer_main_info}>
                                                        <div className={styles.reviewer_name}>{getClientName(review)}</div>
                                                        <div className={styles.review_service}>
                                                            Услуга: <span className={styles.service_title}>{typeof review.services === 'object' && review.services && review.services.title ? String(review.services.title) : 'Услуга'}</span>
                                                        </div>
                                                        <span className={styles.review_worker}>{getMasterName(review)}</span>
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

                                            <div className={styles.review_details}>
                                                <div className={styles.review_worker_date}>
                                                    <span className={styles.review_date}>{review.date}</span>
                                                </div>
                                            </div>

                                            {review.description && renderReviewText(review)}

                                            {review.images && review.images.length > 0 && (
                                                <div className={styles.review_images}>
                                                    {review.images.map((image, imageIndex) => (
                                                        <div
                                                            key={image.id}
                                                            className={styles.review_image}
                                                            onClick={() => photoGallery.openGallery(getReviewImageIndex(reviewIndex, imageIndex))}
                                                        >
                                                            <img
                                                                src={`${API_BASE_URL}/images/review_photos/${image.image}`}
                                                                alt={`Фото отзыва ${imageIndex + 1}`}
                                                                onError={(e) => {
                                                                    const target = e.currentTarget;
                                                                    if (target.dataset.errorHandled) return;
                                                                    target.dataset.errorHandled = 'true';
                                                                    target.src = "./fonTest5.png";
                                                                }}
                                                            />
                                                        </div>
                                                    ))}
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
                {reviews.length > 2 && (
                    <button
                        className={styles.show_all_reviews_btn}
                        onClick={visibleCount === reviews.length ? onShowLess : onShowMore}
                    >
                        {visibleCount === reviews.length ? 'Скрыть отзывы' : 'Показать все отзывы'}
                    </button>
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
                fallbackImage="./fonTest5.png"
            />
        </div>
    );
};
