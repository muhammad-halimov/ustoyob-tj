import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getAuthToken, getUserRole } from '../../utils/auth';
import styles from '../../pages/profile/clientProfilePage/ClientProfilePage.module.scss';
import AuthModal from '../../shared/ui/AuthModal/AuthModal.tsx';

// Импорт утилит
import { checkImageExists, getGenderDisplay, getFormattedDate } from '../../utils/imageHelper';
import { makeApiRequest, getCurrentUserId } from '../../utils/apiHelper';

// Импорт хуков
import { useUserData } from '../../hooks/useUserData';
import { useReviews } from '../../hooks/useReviews';
import { useComplaints } from '../../hooks/useComplaints';

// Компоненты
import PhotoUploader from '../../widgets/PhotoUploader/PhotoUploader.tsx';

interface ClientProfileData {
    id: string;
    fullName: string;
    rating: number;
    reviews: number;
    avatar: string | null;
    gender: string;
    phone: string;
    phone2: string; // Добавлено поле для второго телефона
    email: string;
}

interface Review {
    id: number;
    master: {
        id: number;
        name?: string;
        surname?: string;
        patronymic?: string;
        profession?: string;
        specialization?: string;
        image?: string;
    };
    rating: number;
    description: string;
    forReviewer: boolean;
    services: {
        id: number;
        title: string;
    };
    images: Array<{
        id: number;
        image: string;
    }>;
    createdAt?: string;
}

// Простой компонент StarRating
const StarRating = ({ rating, onRatingChange }: { rating: number; onRatingChange: (rating: number) => void }) => {
    return (
        <div className={styles.stars}>
            {[1, 2, 3, 4, 5].map((star) => (
                <button
                    key={star}
                    type="button"
                    className={`${styles.star} ${star <= rating ? styles.active : ''}`}
                    onClick={() => onRatingChange(star)}
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                        <g clipPath="url(#clip0_248_13358)">
                            <path d="M12 2.49023L15.51 8.17023L22 9.76023L17.68 14.8502L18.18 21.5102L12 18.9802L5.82 21.5102L6.32 14.8502L2 9.76023L8.49 8.17023L12 2.49023Z" stroke="currentColor" strokeWidth="2" strokeMiterlimit="10"/>
                            <path d="M12 19V18.98" stroke="currentColor" strokeWidth="2" strokeMiterlimit="10"/>
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
    );
};

// Компонент ReviewItem, оставленный внутри файла
const ReviewItem = ({ review, onMasterClick }: { review: Review; onMasterClick: (masterId: number) => void }) => {
    const reviewerName = `${review.master?.surname || ''} ${review.master?.name || ''} ${review.master?.patronymic || ''}`.trim() || 'Специалист';
    const reviewerProfession = review.master?.profession || review.master?.specialization || 'Специалист';
    const reviewDate = review.createdAt ? new Date(review.createdAt).toLocaleDateString('ru-RU') : getFormattedDate();
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

    // Получаем аватар мастера
    const getMasterAvatarUrl = () => {
        if (!review.master?.image) return "../fonTest5.png";

        let imagePath = review.master.image;
        if (imagePath.includes('/')) {
            imagePath = imagePath.split('/').pop() || imagePath;
        }

        const possiblePaths = [
            `${API_BASE_URL}/images/profile_photos/${imagePath}`,
            review.master.image,
            `${API_BASE_URL}${review.master.image}`,
            `${API_BASE_URL}/uploads/profile_photos/${imagePath}`,
            `${API_BASE_URL}/uploads/masters/${imagePath}`,
            `${API_BASE_URL}/images/masters/${imagePath}`,
        ];

        return possiblePaths.find(path => path && path !== "../fonTest5.png") || "../fonTest5.png";
    };

    return (
        <div key={review.id} className={styles.review_item}>
            <div className={styles.review_header}>
                <div className={styles.reviewer_info}>
                    <img
                        src={getMasterAvatarUrl()}
                        alt={reviewerName}
                        className={styles.reviewer_avatar}
                        onClick={() => onMasterClick(review.master.id)}
                        style={{ cursor: 'pointer' }}
                        onError={(e) => {
                            e.currentTarget.src = "../fonTest5.png";
                        }}
                        loading="lazy"
                    />
                    <div className={styles.reviewer_main_info}>
                        <div
                            className={styles.reviewer_name}
                            onClick={() => onMasterClick(review.master.id)}
                            style={{ cursor: 'pointer' }}
                        >
                            {reviewerName}
                        </div>

                        <div className={styles.review_vacation}>
                            <span className={styles.review_worker}>{reviewerProfession}</span>
                            <div className={styles.review_rating_main}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <g clipPath="url(#clip0_324_2272)">
                                        <g clipPath="url(#clip1_324_2272)">
                                            <path d="M12 2.49023L15.51 8.17023L22 9.76023L17.68 14.8502L18.18 21.5102L12 18.9802L5.82 21.5102L6.32 14.8502L2 9.76023L8.49 8.17023L12 2.49023Z" stroke="black" strokeWidth="2" strokeMiterlimit="10"/>
                                        </g>
                                    </g>
                                </svg>
                                <span className={styles.rating_value}>{review.rating}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className={styles.review_details}>
                <div className={styles.review_worker_date}>
                    <span className={styles.review_date}>{reviewDate}</span>
                    <div className={styles.review_rating_secondary}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <g clipPath="url(#clip0_324_2272)">
                                <g clipPath="url(#clip1_324_2272)">
                                    <path d="M12 2.49023L15.51 8.17023L22 9.76023L17.68 14.8502L18.18 21.5102L12 18.9802L5.82 21.5102L6.32 14.8502L2 9.76023L8.49 8.17023L12 2.49023Z" stroke="black" strokeWidth="2" strokeMiterlimit="10"/>
                                </g>
                            </g>
                        </svg>
                        <span className={styles.rating_value}>Поставил: {review.rating}</span>
                    </div>
                </div>
            </div>

            {review.description && (
                <div className={styles.review_text}>
                    {review.description.replace(/<[^>]*>/g, '')}
                </div>
            )}

            {review.images && review.images.length > 0 && (
                <div className={styles.review_images}>
                    {review.images.map((image) => (
                        <img
                            key={image.id}
                            src={`${API_BASE_URL}${image.image}`}
                            alt="Отзыв"
                            className={styles.review_image}
                            loading="lazy"
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

function ClientProfileViewPage() {
    const { id } = useParams<{ id: string }>();
    const clientId = id ? parseInt(id) : null;
    const navigate = useNavigate();

    // Используем кастомные хуки
    const { fetchUserWithAvatar } = useUserData();
    const {
        reviews,
        isLoading: reviewsLoading,
        fetchReviews,
        createReview,
        uploadReviewPhotos,
    } = useReviews();
    const {
        fetchComplaintReasons,
        createComplaint,
        uploadComplaintPhotos,
    } = useComplaints();

    const [isLoading, setIsLoading] = useState(true);
    const [profileData, setProfileData] = useState<ClientProfileData | null>(null);
    const [showAllReviews, setShowAllReviews] = useState(false);
    const [showReviewModal, setShowReviewModal] = useState(false);
    const [showComplaintModal, setShowComplaintModal] = useState(false);
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [complaintReasons, setComplaintReasons] = useState<Array<{
        id: number;
        complaint_code: string;
        complaint_human: string;
    }>>([]);

    // Состояния для формы отзыва
    const [reviewText, setReviewText] = useState('');
    const [selectedStars, setSelectedStars] = useState(0);
    const [reviewPhotos, setReviewPhotos] = useState<File[]>([]);

    // Состояния для формы жалобы
    const [complaintReason, setComplaintReason] = useState('');
    const [complaintDescription, setComplaintDescription] = useState('');
    const [complaintTitle, setComplaintTitle] = useState('');
    const [complaintPhotos, setComplaintPhotos] = useState<File[]>([]);
    const [isSubmittingComplaint, setIsSubmittingComplaint] = useState(false);

    // Загружаем все данные при монтировании
    useEffect(() => {
        const loadAllData = async () => {
            if (!clientId) return;

            setIsLoading(true);

            try {
                // 1. Загружаем данные пользователя
                const userData = await fetchUserWithAvatar(clientId, 'client');
                if (userData) {
                    const transformedData: ClientProfileData = {
                        id: userData.id.toString(),
                        fullName: [userData.surname, userData.name, userData.patronymic]
                            .filter(Boolean)
                            .join(' ') || 'Фамилия Имя Отчество',
                        rating: userData.rating || 0,
                        reviews: 0,
                        avatar: userData.avatarUrl,
                        gender: userData.gender || 'gender_male',
                        phone: userData.phone1 || '+0 000 000 00 00',
                        phone2: userData.phone2 || '+0 000 000 00 00', // Добавлено поле phone2
                        email: userData.email || 'адрес емаил'
                    };
                    setProfileData(transformedData);
                }

                // 2. Загружаем отзывы
                await fetchReviews(clientId, 'client');

                // 3. Загружаем причины жалоб
                const reasons = await fetchComplaintReasons();
                setComplaintReasons(reasons);

            } catch (error) {
                console.error('Error loading data:', error);
            } finally {
                setIsLoading(false);
            }
        };

        loadAllData();
    }, [clientId, fetchUserWithAvatar, fetchReviews, fetchComplaintReasons]);

    // Обновляем счетчик отзывов в профиле
    useEffect(() => {
        if (profileData && reviews.length > 0) {
            setProfileData(prev => prev ? {
                ...prev,
                reviews: reviews.length
            } : null);
        }
    }, [reviews]);

    // Обработчик ошибок изображений
    const handleImageError = async (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
        const img = e.currentTarget;
        const originalSrc = img.src;
        const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

        if (img.classList.contains(styles.avatar) && profileData?.id && profileData.avatar) {
            const avatarPaths = [
                `${API_BASE_URL}/images/profile_photos/${profileData.avatar.split('/').pop()}`,
                `${API_BASE_URL}/api/${profileData.id}/profile-photo`,
                profileData.avatar?.includes("uploads/") ? `/uploads/avatars/${profileData.avatar.split("/").pop()}` : null,
            ].filter(Boolean) as string[];

            for (const source of avatarPaths) {
                if (source && source !== originalSrc && await checkImageExists(source)) {
                    img.src = source;
                    return;
                }
            }
        }

        img.src = "../fonTest6.png";
    };

    // Обработчик клика по профилю мастера
    const handleMasterProfileClick = async (masterId: number) => {
        const token = getAuthToken();
        if (!token) {
            setShowAuthModal(true);
            return;
        }

        try {
            const masterData = await fetchUserWithAvatar(masterId, 'master');
            if (masterData?.roles?.includes('ROLE_MASTER')) {
                navigate(`/master/${masterId}`);
            } else {
                navigate(`/master/${masterId}`);
            }
        } catch (error) {
            console.error('Error checking user role:', error);
            navigate(`/master/${masterId}`);
        }
    };

    // Обработчик оставления отзыва
    const handleLeaveReview = () => {
        const token = getAuthToken();
        if (!token) {
            setShowAuthModal(true);
            return;
        }

        if (getUserRole() !== 'master') {
            alert('Только мастера могут оставлять отзывы о клиентах');
            return;
        }

        setShowReviewModal(true);
    };

    // Обработчик отправки отзыва
    const handleSubmitReview = async () => {
        if (!reviewText.trim() || selectedStars === 0) {
            alert('Пожалуйста, заполните все обязательные поля');
            return;
        }

        try {
            const currentUserId = await getCurrentUserId();
            if (!currentUserId || !profileData) {
                alert('Не удалось определить пользователя или клиента');
                return;
            }

            const reviewData = {
                type: 'client',
                rating: selectedStars,
                description: reviewText,
                client: `/api/users/${profileData.id}`,
                master: `/api/users/${currentUserId}`,
            };

            const createdReview = await createReview(reviewData);

            if (reviewPhotos.length > 0) {
                await uploadReviewPhotos(createdReview.id, reviewPhotos);
            }

            // Обновляем отзывы
            await fetchReviews(parseInt(profileData.id), 'client');
            handleCloseModal();
            alert('Отзыв успешно отправлен!');

        } catch (error) {
            console.error('Error submitting review:', error);
            alert('Произошла ошибка при отправке отзыва');
        }
    };

    // Обработчик закрытия модалки отзыва
    const handleCloseModal = () => {
        setShowReviewModal(false);
        setReviewText('');
        setSelectedStars(0);
        setReviewPhotos([]);
    };

    // Обработчик жалобы
    const handleComplaintClick = () => {
        const token = getAuthToken();
        if (!token) {
            setShowAuthModal(true);
            return;
        }

        setShowComplaintModal(true);
    };

    // Обработчик отправки жалобы
    const handleSubmitComplaint = async () => {
        if (!complaintReason.trim() || !complaintDescription.trim()) {
            alert('Пожалуйста, заполните все обязательные поля');
            return;
        }

        try {
            setIsSubmittingComplaint(true);
            const currentUserId = await getCurrentUserId();

            if (!currentUserId || !profileData) {
                alert('Не удалось определить пользователя или клиента');
                return;
            }

            // Проверяем, что не отправляем жалобу самому себе
            if (currentUserId.toString() === profileData.id) {
                alert('Нельзя отправить жалобу самому себе');
                return;
            }

            const title = complaintTitle.trim() || `Жалоба на клиента ${profileData.fullName}`;

            // Ищем или создаем чат
            let chatIri: string | null = null;
            try {
                const chatsData = await makeApiRequest('/api/chats', { requiresAuth: true });
                const chatsArray = Array.isArray(chatsData) ? chatsData :
                    chatsData['hydra:member'] || [];

                const foundChat = chatsArray.find((chat: any) => {
                    const replyAuthorId = chat.replyAuthor?.id;
                    const authorId = chat.author?.id;
                    const targetUserId = parseInt(profileData.id);
                    return replyAuthorId === targetUserId || authorId === targetUserId;
                });

                if (foundChat) {
                    chatIri = `/api/chats/${foundChat.id}`;
                } else {
                    // Создаем новый чат
                    const chatData = {
                        replyAuthor: `/api/users/${profileData.id}`,
                        active: true,
                        messages: []
                    };

                    const chatResponse = await makeApiRequest('/api/chats', {
                        method: 'POST',
                        body: chatData,
                        requiresAuth: true
                    });
                    chatIri = `/api/chats/${chatResponse.id}`;
                }
            } catch (error) {
                console.error('Error with chat:', error);
                alert('Не удалось создать чат для жалобы');
                return;
            }

            // Создаем жалобу
            const complaintData = {
                type: 'chat',
                title: title,
                description: complaintDescription,
                reason: complaintReason,
                respondent: `/api/users/${profileData.id}`,
                chat: chatIri,
            };

            const createdComplaint = await createComplaint(complaintData);

            if (complaintPhotos.length > 0) {
                await uploadComplaintPhotos(createdComplaint.id, complaintPhotos);
            }

            handleComplaintClose();
            alert('Жалоба успешно отправлена! Администрация рассмотрит её в ближайшее время.');

        } catch (error) {
            console.error('Error submitting complaint:', error);
            alert('Произошла ошибка при отправке жалобы');
        } finally {
            setIsSubmittingComplaint(false);
        }
    };

    // Обработчик закрытия модалки жалобы
    const handleComplaintClose = () => {
        setShowComplaintModal(false);
        setComplaintReason('');
        setComplaintDescription('');
        setComplaintTitle('');
        setComplaintPhotos([]);
    };

    // Обработчики авторизации
    const handleAuthModalClose = () => {
        setShowAuthModal(false);
    };

    const handleAuthSuccess = (token: string, email?: string) => {
        console.log('Login successful', token, email);
        setShowAuthModal(false);
    };

    // Получаем отзывы для отображения
    const displayedReviews = showAllReviews ? reviews : reviews.slice(0, 2);
    const hasMoreReviews = reviews.length > 2;

    // Отображение загрузки
    if (isLoading) {
        return <div className={styles.profile}>Загрузка...</div>;
    }

    // Отображение ошибки
    if (!profileData) {
        return <div className={styles.profile}>Ошибка загрузки данных</div>;
    }

    return (
        <div className={styles.profile}>
            <div className={styles.profile_wrap}>
                {/* Шапка профиля с фото */}
                <div className={styles.profile_header}>
                    <div className={styles.profile_content}>
                        <div className={styles.avatar_section}>
                            <div className={styles.avatar_container}>
                                {profileData.avatar ? (
                                    <img
                                        src={profileData.avatar}
                                        alt="Аватар"
                                        className={styles.avatar}
                                        onError={handleImageError}
                                        onLoad={() => console.log('Avatar loaded successfully from:', profileData.avatar)}
                                    />
                                ) : (
                                    <img
                                        src="../fonTest6.png"
                                        alt="FonTest6"
                                        className={styles.avatar_placeholder}
                                    />
                                )}
                            </div>
                        </div>

                        <div className={styles.profile_info}>
                            <div className={styles.name_specialty}>
                                <div className={styles.name_row}>
                                    <div className={styles.name_with_icon}>
                                        <span className={styles.name}>
                                            {profileData.fullName}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className={styles.rating_reviews}>
                                <span className={styles.rating}>
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <g clipPath="url(#clip0_324_2272)">
                                        <g clipPath="url(#clip1_324_2272)">
                                        <path d="M12 2.49023L15.51 8.17023L22 9.76023L17.68 14.8502L18.18 21.5102L12 18.9802L5.82 21.5102L6.32 14.8502L2 9.76023L8.49 8.17023L12 2.49023Z" stroke="#3A54DA" strokeWidth="2" strokeMiterlimit="10"/>
                                        </g>
                                        </g>
                                    </svg>
                                    {profileData.rating || '0'}
                                </span>
                                <span className={styles.reviews}>
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <g clipPath="url(#clip0_188_2937)">
                                        <g clipPath="url(#clip1_188_2937)">
                                        <path d="M12 1.47998C6.2 1.47998 1.5 5.74998 1.5 11C1.52866 13.0153 2.23294 14.9626 3.5 16.53L2.5 21.53L9.16 20.2C10.1031 20.4499 11.0744 20.5776 12.05 20.58C17.85 20.58 22.55 16.3 22.55 11.03C22.55 5.75998 17.8 1.47998 12 1.47998Z" stroke="#3A54DA" strokeWidth="2" strokeMiterlimit="10"/>
                                        </g>
                                        </g>
                                    </svg>
                                    {profileData.reviews} отзыва
                                </span>
                            </div>
                            <div className={styles.complaint_section}>
                                <button
                                    className={styles.complaint_button}
                                    onClick={handleComplaintClick}
                                >
                                    Пожаловаться на клиента
                                </button>
                            </div>
                        </div>

                    </div>
                </div>

                <div className={styles.divider}></div>

                {/* Личные данные */}
                <div className={styles.personal_data_section}>
                    <h2 className={styles.section_title}>Личные данные</h2>
                    <p className={styles.section_subtitle}>
                        Информация о клиенте
                    </p>

                    <div className={styles.personal_data_list}>
                        <div className={styles.data_item}>
                            <div className={styles.data_label}>Имя</div>
                            <div className={styles.data_value}>
                                {profileData.fullName}
                            </div>
                        </div>

                        <div className={styles.data_item_phone}>
                            <div className={styles.data_item_sex}>
                                <div className={styles.data_label}>Пол</div>
                                <div className={styles.data_value}>
                                    {getGenderDisplay(profileData.gender)}
                                </div>
                            </div>

                            <div className={styles.data_item}>
                                <div className={styles.data_label}>Основной номер</div>
                                <div className={styles.data_value}>
                                    {profileData.phone}
                                </div>
                            </div>

                            <div className={styles.data_item}>
                                <div className={styles.data_label}>Дополнительный номер</div>
                                <div className={styles.data_value}>
                                    {profileData.phone2}
                                </div>
                            </div>
                        </div>

                        <div className={styles.data_item}>
                            <div className={styles.data_label}>электронная почта</div>
                            <div className={styles.data_value}>
                                {profileData.email}
                            </div>
                        </div>
                    </div>
                </div>

                <div className={styles.divider}></div>

                {/* Секция отзывов */}
                <div className={styles.reviews_section} id="reviews">
                    <div className={styles.reviews_header}>
                        <div className={styles.reviews_title_wrapper}>
                            <h2 className={styles.section_title}>Отзывы от специалистов</h2>
                            <p className={styles.section_subtitle}>
                                Специалисты оставили отзывы о работе с клиентом
                            </p>
                        </div>
                    </div>

                    <div className={styles.reviews_list}>
                        {reviewsLoading ? (
                            <div className={styles.loading}>Загрузка отзывов...</div>
                        ) : displayedReviews.length > 0 ? (
                            displayedReviews.map((review) => (
                                <ReviewItem
                                    key={review.id}
                                    review={review}
                                    onMasterClick={handleMasterProfileClick}
                                />
                            ))
                        ) : (
                            <div className={styles.no_reviews}>
                                Пока нет отзывов от специалистов
                                <button
                                    className={styles.leave_review_btn}
                                    onClick={handleLeaveReview}
                                    style={{marginTop: '16px'}}
                                >
                                    Оставить отзыв
                                </button>
                            </div>
                        )}
                        {reviews.length > 0 && (
                            <div className={styles.reviews_actions}>
                                {hasMoreReviews && (
                                    <button
                                        className={styles.show_all_reviews_btn}
                                        onClick={() => setShowAllReviews(!showAllReviews)}
                                    >
                                        {showAllReviews ? 'Скрыть отзывы' : 'Показать все отзывы'}
                                    </button>
                                )}
                                <button
                                    className={styles.leave_review_btn}
                                    onClick={handleLeaveReview}
                                >
                                    Оставить отзыв
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Модальное окно для оставления отзыва */}
            {showReviewModal && (
                <div className={styles.modalOverlay}>
                    <div className={styles.reviewModal}>
                        <div className={styles.modalHeader}>
                            <h2>Оставьте отзыв о работе</h2>
                        </div>

                        <div className={styles.modalContent}>
                            {/* Поле для комментария */}
                            <div className={styles.commentSection}>
                                <textarea
                                    value={reviewText}
                                    onChange={(e) => setReviewText(e.target.value)}
                                    placeholder="Расскажите о вашем опыте работы..."
                                    className={styles.commentTextarea}
                                />
                            </div>

                            {/* Загрузка фото */}
                            <PhotoUploader
                                photos={reviewPhotos}
                                onPhotosChange={setReviewPhotos}
                                label="Приложите фото"
                            />

                            {/* Рейтинг звездами */}
                            <div className={styles.ratingSection}>
                                <label>Поставьте оценку</label>
                                <StarRating
                                    rating={selectedStars}
                                    onRatingChange={setSelectedStars}
                                />
                            </div>
                        </div>

                        {/* Кнопки модалки */}
                        <div className={styles.modalActions}>
                            <button
                                className={styles.closeButton}
                                onClick={handleCloseModal}
                            >
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <g clipPath="url(#clip0_551_2371)">
                                        <g clipPath="url(#clip1_551_2371)">
                                            <path d="M12 22.5C17.799 22.5 22.5 17.799 22.5 12C22.5 6.20101 17.799 1.5 12 1.5C6.20101 1.5 1.5 6.20101 1.5 12C1.5 17.799 6.20101 22.5 12 22.5Z" stroke="#101010" strokeWidth="2" strokeMiterlimit="10"/>
                                            <path d="M16.7705 7.22998L7.23047 16.77" stroke="#101010" strokeWidth="2" strokeMiterlimit="10"/>
                                            <path d="M7.23047 7.22998L16.7705 16.77" stroke="#101010" strokeWidth="2" strokeMiterlimit="10"/>
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
                                Закрыть
                            </button>
                            <button
                                className={styles.submitButton}
                                onClick={handleSubmitReview}
                            >
                                Отправить
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <g clipPath="url(#clip0_551_2758)">
                                        <path d="M12 22.5C17.799 22.5 22.5 17.799 22.5 12C22.5 6.20101 17.799 1.5 12 1.5C6.20101 1.5 1.5 6.20101 1.5 12C1.5 17.799 6.20101 22.5 12 22.5Z" stroke="white" strokeWidth="2" strokeMiterlimit="10"/>
                                        <path d="M6.26953 12H17.7295" stroke="white" strokeWidth="2" strokeMiterlimit="10"/>
                                        <path d="M12.96 7.22998L17.73 12L12.96 16.77" stroke="white" strokeWidth="2" strokeMiterlimit="10"/>
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
            )}

            {/* Модальное окно для жалобы на клиента */}
            {showComplaintModal && (
                <div className={styles.modalOverlay}>
                    <div className={styles.complaintModal}>
                        <div className={styles.modalHeader}>
                            <h2>Пожаловаться на клиента</h2>
                            <p className={styles.modalSubtitle}>
                                Опишите проблему, с которой вы столкнулись при работе с клиентом
                            </p>
                        </div>

                        <div className={styles.modalContent}>
                            {/* Причина жалобы */}
                            <div className={styles.complaintSection}>
                                <label className={styles.sectionLabel}>Причина жалобы *</label>
                                <select
                                    value={complaintReason}
                                    onChange={(e) => setComplaintReason(e.target.value)}
                                    className={styles.complaintSelect}
                                    required
                                >
                                    <option value="">Выберите причину</option>
                                    {complaintReasons.map((reason) => (
                                        <option key={reason.id} value={reason.complaint_code}>
                                            {reason.complaint_human}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Заголовок жалобы */}
                            <div className={styles.complaintSection}>
                                <label className={styles.sectionLabel}>Заголовок жалобы</label>
                                <input
                                    type="text"
                                    value={complaintTitle}
                                    onChange={(e) => setComplaintTitle(e.target.value)}
                                    placeholder="Краткое описание проблемы"
                                    className={styles.complaintInput}
                                />
                            </div>

                            {/* Подробное описание */}
                            <div className={styles.complaintSection}>
                                <label className={styles.sectionLabel}>Подробное описание ситуации *</label>
                                <textarea
                                    value={complaintDescription}
                                    onChange={(e) => setComplaintDescription(e.target.value)}
                                    placeholder="Опишите ситуацию подробно, укажите дату и время, если это уместно..."
                                    className={styles.complaintTextarea}
                                    rows={5}
                                />
                            </div>

                            {/* Загрузка доказательств */}
                            <div className={styles.complaintSection}>
                                <label className={styles.sectionLabel}>Доказательства (необязательно)</label>
                                <p className={styles.photoHint}>
                                    Вы можете приложить скриншоты переписки, фото или другие материалы
                                </p>
                                <PhotoUploader
                                    photos={complaintPhotos}
                                    onPhotosChange={setComplaintPhotos}
                                    label="Доказательства"
                                    maxPhotos={10}
                                />
                            </div>
                        </div>

                        {/* Кнопки модалки жалобы */}
                        <div className={styles.modalActions}>
                            <button
                                className={styles.closeButton}
                                onClick={handleComplaintClose}
                                disabled={isSubmittingComplaint}
                            >
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <g clipPath="url(#clip0_551_2371)">
                                        <g clipPath="url(#clip1_551_2371)">
                                            <path d="M12 22.5C17.799 22.5 22.5 17.799 22.5 12C22.5 6.20101 17.799 1.5 12 1.5C6.20101 1.5 1.5 6.20101 1.5 12C1.5 17.799 6.20101 22.5 12 22.5Z" stroke="#101010" strokeWidth="2" strokeMiterlimit="10"/>
                                            <path d="M16.7705 7.22998L7.23047 16.77" stroke="#101010" strokeWidth="2" strokeMiterlimit="10"/>
                                            <path d="M7.23047 7.22998L16.7705 16.77" stroke="#101010" strokeWidth="2" strokeMiterlimit="10"/>
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
                                Отмена
                            </button>
                            <button
                                className={styles.submitButton}
                                onClick={handleSubmitComplaint}
                                disabled={isSubmittingComplaint || !complaintReason || !complaintDescription}
                            >
                                {isSubmittingComplaint ? 'Отправка...' : 'Отправить жалобу'}
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <g clipPath="url(#clip0_551_2758)">
                                        <path d="M12 22.5C17.799 22.5 22.5 17.799 22.5 12C22.5 6.20101 17.799 1.5 12 1.5C6.20101 1.5 1.5 6.20101 1.5 12C1.5 17.799 6.20101 22.5 12 22.5Z" stroke="white" strokeWidth="2" strokeMiterlimit="10"/>
                                        <path d="M6.26953 12H17.7295" stroke="white" strokeWidth="2" strokeMiterlimit="10"/>
                                        <path d="M12.96 7.22998L17.73 12L12.96 16.77" stroke="white" strokeWidth="2" strokeMiterlimit="10"/>
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
            )}

            {/* Модальное окно авторизации */}
            {showAuthModal && (
                <div className={styles.modalOverlay}>
                    <AuthModal
                        isOpen={showAuthModal}
                        onClose={handleAuthModalClose}
                        onLoginSuccess={handleAuthSuccess}
                    />
                </div>
            )}
        </div>
    );
}

export default ClientProfileViewPage;