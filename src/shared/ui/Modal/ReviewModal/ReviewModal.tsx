import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getAuthToken, getUserRole } from '../../../../utils/auth.ts';
import AuthModal from '../../../../features/auth/AuthModal.tsx';
import styles from './ReviewModal.module.scss';

interface ReviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (message: string) => void;
    onError: (message: string) => void;
    ticketId: number;
    targetUserId: number;
    onReviewSubmitted?: (reviewCount: number) => void;
    showServiceSelector?: boolean;
}

interface Service {
    id: number;
    title: string;
    description?: string;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const ReviewModal: React.FC<ReviewModalProps> = ({
    isOpen,
    onClose,
    onSuccess,
    onError,
    ticketId,
    targetUserId,
    onReviewSubmitted,
    showServiceSelector = false
}) => {
    const { t } = useTranslation('components');
    const [reviewText, setReviewText] = useState('');
    const [selectedStars, setSelectedStars] = useState(0);
    const [reviewPhotos, setReviewPhotos] = useState<File[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [services, setServices] = useState<Service[]>([]);
    const [selectedServiceId, setSelectedServiceId] = useState<number | null>(null);
    const [loadingServices, setLoadingServices] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    // Проверяем авторизацию при открытии модалки
    React.useEffect(() => {
        if (isOpen) {
            const token = getAuthToken();
            setIsAuthenticated(!!token);
        }
    }, [isOpen]);

    // Загружаем услуги при открытии модалки если нужен выбор услуги
    React.useEffect(() => {
        if (isOpen && isAuthenticated && showServiceSelector && targetUserId) {
            fetchServices();
        }
    }, [isOpen, isAuthenticated, showServiceSelector, targetUserId]);

    const fetchServices = async () => {
        try {
            setLoadingServices(true);
            const token = getAuthToken();
            const headers: HeadersInit = {
                'Content-Type': 'application/json',
            };

            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            // Получаем роль текущего пользователя
            const userRole = getUserRole();

            // Формируем endpoint по роли ТЕКУЩЕГО пользователя, но используя ID ЦЕЛЕВОГО
            // Если я клиент - показываем услуги мастера (целевого)
            // Если я мастер - показываем заказы клиента (целевого)
            const endpoint = userRole === 'client'
                ? `/api/tickets?service=true&active=true&exists[author]=false&exists[master]=true&master=${targetUserId}`
                : `/api/tickets?service=false&active=true&exists[master]=false&exists[author]=true&author=${targetUserId}`;

            console.log('Fetching services with endpoint:', endpoint);

            const response = await fetch(`${API_BASE_URL}${endpoint}`, { 
                headers 
            });

            if (response.ok) {
                const data = await response.json();
                let ticketsArray: any[] = [];

                if (Array.isArray(data)) {
                    ticketsArray = data;
                } else if (data && typeof data === 'object') {
                    if (data['hydra:member'] && Array.isArray(data['hydra:member'])) {
                        ticketsArray = data['hydra:member'];
                    }
                }

                const servicesList: Service[] = ticketsArray.map(ticket => ({
                    id: ticket.id,
                    title: ticket.title || 'Без названия',
                    description: ticket.description
                }));

                setServices(servicesList);
                console.log('Loaded services:', servicesList);
            } else {
                console.error('Failed to fetch services:', response.status);
            }
        } catch (error) {
            console.error('Error fetching services:', error);
        } finally {
            setLoadingServices(false);
        }
    };

    if (!isOpen) return null;

    const handleStarClick = (starCount: number) => {
        setSelectedStars(starCount);
    };

    const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files);
            setReviewPhotos(prev => [...prev, ...files]);
        }
    };

    const removePhoto = (index: number) => {
        setReviewPhotos(prev => prev.filter((_, i) => i !== index));
    };

    const getCurrentUserId = async (): Promise<number | null> => {
        try {
            const token = getAuthToken();
            if (!token) return null;

            const response = await fetch(`${API_BASE_URL}/api/users/me`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json',
                },
            });

            if (response.ok) {
                const userData = await response.json();
                return userData.id;
            }
            return null;
        } catch (error) {
            console.error('Error getting current user ID:', error);
            return null;
        }
    };

    const uploadReviewPhotos = async (reviewId: number, photos: File[], token: string) => {
        try {
            console.log(`Uploading ${photos.length} photos for review ${reviewId}`);

            for (const photo of photos) {
                const formData = new FormData();
                formData.append('imageFile', photo);

                console.log(`Uploading photo: ${photo.name}`);

                const response = await fetch(`${API_BASE_URL}/api/reviews/${reviewId}/upload-photo`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    },
                    body: formData
                });

                if (response.ok || response.status === 201) {
                    const uploadResult = await response.json();
                    console.log('Photo uploaded successfully:', uploadResult);
                } else {
                    const errorText = await response.text();
                    console.error(`Error uploading photo for review ${reviewId}:`, errorText);
                    throw new Error(`Failed to upload photo: ${response.status}`);
                }
            }

            console.log('All photos uploaded successfully');
        } catch (error) {
            console.error('Error uploading review photos:', error);
            throw error;
        }
    };

    const fetchReviewCount = async (userId: number): Promise<number> => {
        try {
            const token = getAuthToken();
            const headers: HeadersInit = {
                'Content-Type': 'application/json',
            };

            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const reviewsResponse = await fetch(`${API_BASE_URL}/api/reviews?exists[services]=true&exists[master]=true&exists[client]=true&master=${userId}`, { headers });

            if (!reviewsResponse.ok) {
                console.error('Failed to fetch reviews:', reviewsResponse.status);
                return 0;
            }

            const reviewsData = await reviewsResponse.json();

            let reviewsArray: any[] = [];
            if (Array.isArray(reviewsData)) {
                reviewsArray = reviewsData;
            } else if (reviewsData && typeof reviewsData === 'object') {
                if (reviewsData['hydra:member'] && Array.isArray(reviewsData['hydra:member'])) {
                    reviewsArray = reviewsData['hydra:member'];
                }
            }

            const userReviews = reviewsArray.filter(review => {
                const reviewMasterId = review.master?.id;
                const reviewClientId = review.client?.id;
                return reviewMasterId === userId || reviewClientId === userId;
            });

            console.log(`Found ${userReviews.length} reviews for user ${userId}`);
            return userReviews.length;
        } catch (error) {
            console.error('Error fetching review count:', error);
            return 0;
        }
    };

    const handleSubmitReview = async () => {
        if (!reviewText.trim()) {
            alert(t('reviewModal.errorCommentRequired'));
            return;
        }

        if (selectedStars === 0) {
            alert(t('reviewModal.errorRatingRequired'));
            return;
        }

        if (showServiceSelector && !selectedServiceId) {
            alert(t('reviewModal.errorServiceRequired'));
            return;
        }

        setIsSubmitting(true);

        try {
            const token = getAuthToken()!;

            const userRole = getUserRole();
            const currentUserId = await getCurrentUserId();

            if (!currentUserId) {
                alert(t('reviewModal.errorUserNotFound'));
                return;
            }

            if (!targetUserId) {
                alert(t('reviewModal.errorTargetUserNotFound'));
                return;
            }

            // Проверяем что не оставляем отзыв самому себе
            if (currentUserId === targetUserId) {
                alert(t('reviewModal.errorSelfReview'));
                return;
            }

            interface ReviewData {
                type: string;
                rating: number;
                description: string;
                ticket: string;
                master?: string;
                client?: string;
            }

            const reviewData: ReviewData = {
                type: '',
                rating: selectedStars,
                description: reviewText,
                ticket: `/api/tickets/${showServiceSelector && selectedServiceId ? selectedServiceId : ticketId}`,
            };

            // Определяем тип отзыва и IRI пользователей
            if (userRole === 'master') {
                reviewData.type = 'client';
                reviewData.master = `/api/users/${currentUserId}`;
                reviewData.client = `/api/users/${targetUserId}`;
            } else if (userRole === 'client') {
                reviewData.type = 'master';
                reviewData.client = `/api/users/${currentUserId}`;
                reviewData.master = `/api/users/${targetUserId}`;
            } else {
                alert(t('reviewModal.errorUnknownRole'));
                return;
            }

            console.log('Sending review data:', reviewData);

            const response = await fetch(`${API_BASE_URL}/api/reviews`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify(reviewData)
            });

            if (response.ok || response.status === 201) {
                const reviewResponse = await response.json();
                console.log('Review created successfully:', reviewResponse);

                // Загружаем фото если есть
                if (reviewPhotos.length > 0 && reviewResponse.id) {
                    try {
                        await uploadReviewPhotos(reviewResponse.id, reviewPhotos, token);
                        console.log('All photos uploaded successfully');
                    } catch (uploadError) {
                        console.error('Error uploading photos, but review was created:', uploadError);
                    }
                }

                // Обновляем количество отзывов
                if (onReviewSubmitted) {
                    const updatedCount = await fetchReviewCount(targetUserId);
                    onReviewSubmitted(updatedCount);
                }

                handleCloseModal();
                onSuccess(t('reviewModal.successMessage'));

            } else {
                const errorText = await response.text();
                console.error('Error creating review. Status:', response.status, 'Response:', errorText);

                let errorMessage = t('reviewModal.errorDefault');
                
                // Проверяем на "no interactions" - нет чата между пользователями
                if (errorText.includes('no interactions') || errorText.includes('no interaction')) {
                    errorMessage = t('reviewModal.errorNoInteraction');
                } else if (response.status === 422) {
                    try {
                        const errorData = JSON.parse(errorText);
                        if (errorData.violations && errorData.violations.length > 0) {
                            errorMessage = errorData.violations.map((v: any) => v.message).join(', ');
                        } else if (errorData.message) {
                            // Проверяем message в объекте ошибки
                            if (errorData.message.includes('no interactions') || errorData.message.includes('no interaction')) {
                                errorMessage = t('reviewModal.errorNoInteraction');
                            } else {
                                errorMessage = errorData.message;
                            }
                        }
                    } catch (e) {
                        errorMessage = t('reviewModal.errorValidation');
                    }
                } else if (response.status === 400) {
                    errorMessage = t('reviewModal.errorInvalidData');
                } else if (response.status === 404) {
                    errorMessage = t('reviewModal.errorNotFound');
                } else if (response.status === 403) {
                    errorMessage = t('reviewModal.errorNoAccess');
                }

                onError(errorMessage);
            }

        } catch (error) {
            console.error('Error submitting review:', error);
            onError(t('reviewModal.errorUnexpected'));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCloseModal = () => {
        setReviewText('');
        setSelectedStars(0);
        setReviewPhotos([]);
        setSelectedServiceId(null);
        setServices([]);
        setIsAuthenticated(false);
        onClose();
    };

    const handleAuthSuccess = (token: string) => {
        console.log('Login successful, token:', token);
        setIsAuthenticated(true);
    };

    if (!isOpen) return null;

    // Если пользователь не авторизован - показываем только AuthModal
    if (!isAuthenticated) {
        return (
            <AuthModal
                isOpen={true}
                onClose={handleCloseModal}
                onLoginSuccess={handleAuthSuccess}
            />
        );
    }

    // Если авторизован - показываем форму отзыва
    return (
        <div className={styles.modalOverlay} onClick={handleCloseModal}>
            <div className={styles.reviewModal} onClick={(e) => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                    <h2>{t('reviewModal.title')}</h2>
                </div>

                <div className={styles.modalContent}>
                    {/* Выбор услуги (только в профиле) */}
                    {showServiceSelector && (
                        <div className={styles.serviceSection}>
                            <label>{t('reviewModal.selectService')}</label>
                            {loadingServices ? (
                                <div className={styles.loadingServices}>{t('reviewModal.loadingServices')}</div>
                            ) : services.length === 0 ? (
                                <div className={styles.noServices}>{t('reviewModal.noServices')}</div>
                            ) : (
                                <select
                                    value={selectedServiceId || ''}
                                    onChange={(e) => setSelectedServiceId(Number(e.target.value))}
                                    className={styles.serviceSelect}
                                    disabled={isSubmitting}
                                >
                                    <option value="">{t('reviewModal.selectServicePlaceholder')}</option>
                                    {services.map(service => (
                                        <option key={service.id} value={service.id}>
                                            {service.title}
                                        </option>
                                    ))}
                                </select>
                            )}
                        </div>
                    )}

                    {/* Поле для комментария */}
                    <div className={styles.commentSection}>
                        <textarea
                            value={reviewText}
                            onChange={(e) => setReviewText(e.target.value)}
                            placeholder={t('reviewModal.commentPlaceholder')}
                            className={styles.commentTextarea}
                            disabled={isSubmitting}
                        />
                    </div>

                    {/* Загрузка фото */}
                    <div className={styles.photoSection}>
                        <label>{t('reviewModal.attachPhoto')}</label>
                        <div className={styles.photoUploadContainer}>
                            <div className={styles.photoPreviews}>
                                {reviewPhotos.map((photo, index) => (
                                    <div key={index} className={styles.photoPreview}>
                                        <img
                                            src={URL.createObjectURL(photo)}
                                            alt={`Preview ${index + 1}`}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => removePhoto(index)}
                                            className={styles.removePhoto}
                                            disabled={isSubmitting}
                                        >
                                            ×
                                        </button>
                                    </div>
                                ))}

                                <div className={styles.photoUpload}>
                                    <input
                                        type="file"
                                        id="review-photos"
                                        multiple
                                        accept="image/*"
                                        onChange={handlePhotoUpload}
                                        className={styles.fileInput}
                                        disabled={isSubmitting}
                                    />
                                    <label htmlFor="review-photos" className={styles.photoUploadButton}>
                                        +
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Рейтинг звездами */}
                    <div className={styles.ratingSection}>
                        <label>{t('reviewModal.rateWork')}</label>
                        <div className={styles.stars}>
                            {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                    key={star}
                                    type="button"
                                    className={`${styles.star} ${star <= selectedStars ? styles.active : ''}`}
                                    onClick={() => handleStarClick(star)}
                                    disabled={isSubmitting}
                                >
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"
                                         xmlns="http://www.w3.org/2000/svg">
                                        <g clipPath="url(#clip0_248_13358)">
                                            <path
                                                d="M12 2.49023L15.51 8.17023L22 9.76023L17.68 14.8502L18.18 21.5102L12 18.9802L5.82 21.5102L6.32 14.8502L2 9.76023L8.49 8.17023L12 2.49023Z"
                                                stroke="currentColor" strokeWidth="2" strokeMiterlimit="10"/>
                                            <path d="M12 19V18.98" stroke="currentColor" strokeWidth="2"
                                                  strokeMiterlimit="10"/>
                                        </g>
                                        <defs>
                                            <clipPath id="clip0_248_13358">
                                                <rect width="24" height="24" fill="white"/>
                                            </clipPath>
                                        </defs>
                                    </svg>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Кнопки модалки */}
                <div className={styles.modalActions}>
                    <button
                        className={styles.closeButton}
                        onClick={handleCloseModal}
                        disabled={isSubmitting}
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
                             xmlns="http://www.w3.org/2000/svg">
                            <g clipPath="url(#clip0_551_2371)">
                                <g clipPath="url(#clip1_551_2371)">
                                    <path
                                        d="M12 22.5C17.799 22.5 22.5 17.799 22.5 12C22.5 6.20101 17.799 1.5 12 1.5C6.20101 1.5 1.5 6.20101 1.5 12C1.5 17.799 6.20101 22.5 12 22.5Z"
                                        stroke="currentColor" strokeWidth="2" strokeMiterlimit="10"/>
                                    <path d="M16.7705 7.22998L7.23047 16.77" stroke="currentColor" strokeWidth="2"
                                          strokeMiterlimit="10"/>
                                    <path d="M7.23047 7.22998L16.7705 16.77" stroke="currentColor" strokeWidth="2"
                                          strokeMiterlimit="10"/>
                                </g>
                            </g>
                            <defs>
                                <clipPath id="clip0_551_2371">
                                    <rect width="24" height="24" fill="white"/>
                                </clipPath>
                                <clipPath id="clip1_551_2371">
                                    <rect width="24" height="24" fill="white"/>
                                </clipPath>
                            </defs>
                        </svg>
                        {t('reviewModal.close')}
                    </button>
                    <button
                        className={styles.submitButton}
                        onClick={handleSubmitReview}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? t('reviewModal.submitting') : t('reviewModal.submit')}
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
                             xmlns="http://www.w3.org/2000/svg">
                            <g clipPath="url(#clip0_551_2758)">
                                <path
                                    d="M12 22.5C17.799 22.5 22.5 17.799 22.5 12C22.5 6.20101 17.799 1.5 12 1.5C6.20101 1.5 1.5 6.20101 1.5 12C1.5 17.799 6.20101 22.5 12 22.5Z"
                                    stroke="white" strokeWidth="2" strokeMiterlimit="10"/>
                                <path d="M6.26953 12H17.7295" stroke="white" strokeWidth="2"
                                      strokeMiterlimit="10"/>
                                <path d="M12.96 7.22998L17.73 12L12.96 16.77" stroke="white" strokeWidth="2"
                                      strokeMiterlimit="10"/>
                            </g>
                            <defs>
                                <clipPath id="clip0_551_2758">
                                    <rect width="24" height="24" fill="white"/>
                                </clipPath>
                            </defs>
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ReviewModal;
