import { useMemo } from 'react';
import styles from '../../pages/profile/clientProfilePage/ClientProfilePage.module.scss';

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
}

interface ReviewListProps {
    reviews: Review[];
    showAll: boolean;
    onToggleShowAll: () => void;
    previewLimit: number;
    getFullName: () => string;
    loading: boolean;
}

export const defaultUserImage = '../default_user.png';

function ReviewList({reviews, showAll, onToggleShowAll, previewLimit, getFullName, loading}: ReviewListProps) {

    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

    const getReviewerAvatarUrl = (review: Review) => {
        if (!review.master?.image) return defaultUserImage;

        const possiblePaths = [
            review.master.image,
            `${API_BASE_URL}/images/profile_photos/${review.master.image}`,
        ].filter(path => path);

        return possiblePaths[0] || defaultUserImage;
    };

    const getReviewerName = (review: Review) => {
        return `${review.master?.surname || ''} ${review.master?.name || ''} ${review.master?.patronymic || ''}`.trim() || 'Специалист';
    };

    const getReviewerProfession = (review: Review) => {
        return review.master?.profession || review.master?.specialization || 'Специалист';
    };

    const visibleReviews = useMemo(() => {
        if (showAll) return reviews;
        return reviews.slice(0, previewLimit);
    }, [reviews, showAll, previewLimit]);

    if (loading) return <div className={styles.loading}>Загрузка отзывов...</div>;
    if (!reviews.length) return <div className={styles.no_reviews}>Пока нет отзывов от специалистов</div>;

    return (
        <>
            {visibleReviews.map(review => (
                <div key={review.id} className={styles.review_item}>
                    <div className={styles.review_header}>
                        <div className={styles.reviewer_info}>
                            <img
                                src={getReviewerAvatarUrl(review)}
                                alt={getReviewerName(review)}
                                className={styles.reviewer_avatar}
                                onError={(e) => { e.currentTarget.src = '../default_user.png'; }}
                                loading="lazy"
                            />
                            <div className={styles.reviewer_main_info}>
                                <div className={styles.review_vacation}>
                                    <span className={styles.review_worker}>{getFullName()}</span> {getReviewerProfession(review)}
                                </div>
                                <div className={styles.review_rating_main}>
                                    <span className={styles.rating_value}>Поставил {review.rating}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {review.description && <div className={styles.review_text}>{review.description.replace(/<[^>]*>/g, '')}</div>}

                    {review.images && review.images.length > 0 && (
                        <div className={styles.review_images}>
                            {review.images.map(img => (
                                img.image
                                    ? <img key={img.id} src={`${API_BASE_URL}${img.image}`} alt="Отзыв" className={styles.review_image} loading="lazy" />
                                    : <img key={img.id} src={defaultUserImage} alt="Отзыв" className={styles.review_image} loading="lazy" />
                            ))}
                        </div>
                    )}
                </div>
            ))}

            {reviews.length > previewLimit && (
                <div className={styles.reviews_actions}>
                    <button className={styles.show_all_reviews_btn} onClick={onToggleShowAll}>
                        {showAll ? 'Скрыть отзывы' : `Показать все отзывы (${reviews.length})`}
                    </button>
                </div>
            )}
        </>
    );
}

export default ReviewList;

