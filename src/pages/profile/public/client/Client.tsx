import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getAuthToken, getUserRole } from '../../../../utils/auth.ts';
import styles from '../../private/client/Client.module.scss';
import AuthModal from '../../../../shared/ui/AuthModal/AuthModal.tsx';

// Импорт утилит
import { checkImageExists, getGenderDisplay, getFormattedDate } from '../../../../utils/imageHelper.ts';
import { makeApiRequest, getCurrentUserId } from '../../../../utils/apiHelper.ts';

// Импорт хуков
import { useUserData } from '../../../../hooks/useUserData.ts';
import { useReviews, Review } from '../../../../hooks/useReviews.ts';
import { useComplaints } from '../../../../hooks/useComplaints.ts';

// Компоненты
import PhotoUploader from '../../../../widgets/PhotoUploader/PhotoUploader.tsx';

// Обновленный интерфейс для данных пользователя
interface ClientProfileData {
    id: string;
    fullName: string;
    rating: number;
    reviews: number;
    avatar: string | null;
    gender: string;
    phone: string;
    phone2: string;
    email: string;
    login?: string;
    bio?: string;
    dateOfBirth?: string;
    imageExternalUrl?: string;
    atHome?: boolean;
    active?: boolean;
    approved?: boolean;
    roles?: string[];
    socialNetworks?: Array<{
        id: number;
        network: string;
        handle: string;
    }>;
    education?: Array<{
        id: number;
        uniTitle: string;
        faculty: string;
        beginning: number;
        ending: number;
        graduated: boolean;
    }>;
    occupation?: Array<{
        id: number;
        title: string;
        image: string;
    }>;
    addresses?: Array<{
        id: number;
        province?: { id: number; title: string };
        city?: { id: number; title: string; image: string };
        suburb?: { id: number; title: string };
        district?: { id: number; title: string; image: string };
        settlement?: { id: number; title: string };
        community?: { id: number; title: string };
        village?: { id: number; title: string };
    }>;
    gallery?: {
        id: number;
        images: Array<{
            id: number;
            image: string;
        }>;
    };
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

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

// Компонент ReviewItem
const ReviewItem = ({ review, onMasterClick }: { review: Review; onMasterClick: (masterId: number) => void }) => {
    const reviewerName = `${review.master?.surname || ''} ${review.master?.name || ''} ${review.master?.patronymic || ''}`.trim() || 'Специалист';
    const reviewerProfession = 'Специалист';
    const reviewDate = review.createdAt ? new Date(review.createdAt).toLocaleDateString('ru-RU') : getFormattedDate();
    const serviceName = review.ticket?.title || 'Услуга';

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

    // Функция для получения URL фото отзыва
    const getReviewImageUrl = (imagePath: string) => {
        if (!imagePath) return "";

        // Если путь уже полный URL
        if (imagePath.startsWith('http')) {
            return imagePath;
        }

        // Если путь начинается с /, добавляем BASE_URL
        if (imagePath.startsWith('/')) {
            return `${API_BASE_URL}${imagePath}`;
        }

        // Проверяем различные варианты путей для фото отзывов
        const possiblePaths = [
            `${API_BASE_URL}/images/review_photos/${imagePath}`,
            `${API_BASE_URL}${imagePath}`,
            `${API_BASE_URL}/uploads/review_photos/${imagePath}`,
            `${API_BASE_URL}/images/${imagePath}`,
            imagePath
        ];

        return possiblePaths.find(path => path) || "";
    };

    return (
        <div key={review.id} className={styles.review_item}>
            <div className={styles.review_header}>
                <div className={styles.reviewer_info}>
                    <img
                        src={getMasterAvatarUrl()}
                        alt={reviewerName}
                        className={styles.reviewer_avatar}
                        onClick={() => review.master && onMasterClick(review.master.id)}
                        style={{ cursor: 'pointer' }}
                        onError={(e) => {
                            e.currentTarget.src = "../fonTest5.png";
                        }}
                        loading="lazy"
                    />
                    <div className={styles.reviewer_main_info}>
                        <div
                            className={styles.reviewer_name}
                            onClick={() => review.master && onMasterClick(review.master.id)}
                            style={{ cursor: 'pointer' }}
                        >
                            {reviewerName}
                        </div>

                        {/* Информация об услуге с иконкой */}
                        {serviceName && (
                            <div className={styles.service_info_with_icon}>
                                <svg
                                    width="16"
                                    height="16"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    xmlns="http://www.w3.org/2000/svg"
                                    style={{ marginRight: '8px' }}
                                >
                                    <path d="M20 7L9.00004 18L3.99994 13" stroke="#3A54DA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                                <span className={styles.service_name}>{serviceName}</span>
                            </div>
                        )}

                        <div className={styles.review_vacation}>
                            <span className={styles.review_worker}>{reviewerProfession}</span>
                            <div className={styles.review_rating_main}>
                                {/* SVG звездочки для рейтинга */}
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <g clipPath="url(#clip0_186_6434)">
                                        <g clipPath="url(#clip1_186_6434)">
                                            <path d="M12 2.49023L15.51 8.17023L22 9.76023L17.68 14.8502L18.18 21.5102L12 18.9802L5.82 21.5102L6.32 14.8502L2 9.76023L8.49 8.17023L12 2.49023Z" stroke="#3A54DA" strokeWidth="2" strokeMiterlimit="10"/>
                                            <path d="M12 19V18.98" stroke="#3A54DA" strokeWidth="2" strokeMiterlimit="10"/>
                                        </g>
                                    </g>
                                    <defs>
                                        <clipPath id="clip0_186_6434">
                                            <rect width="24" height="24" fill="white"/>
                                        </clipPath>
                                        <clipPath id="clip1_186_6434">
                                            <rect width="24" height="24" fill="white"/>
                                        </clipPath>
                                    </defs>
                                </svg>
                                <span className={styles.rating_value}>{review.rating.toFixed(1)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className={styles.review_details}>
                <div className={styles.review_worker_date}>
                    <span className={styles.review_date}>{reviewDate}</span>
                    <div className={styles.review_rating_secondary}>
                        <span>Поставил: </span>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <g clipPath="url(#clip0_186_6434)">
                                <g clipPath="url(#clip1_186_6434)">
                                    <path d="M12 2.49023L15.51 8.17023L22 9.76023L17.68 14.8502L18.18 21.5102L12 18.9802L5.82 21.5102L6.32 14.8502L2 9.76023L8.49 8.17023L12 2.49023Z" stroke="#3A54DA" strokeWidth="2" strokeMiterlimit="10"/>
                                    <path d="M12 19V18.98" stroke="#3A54DA" strokeWidth="2" strokeMiterlimit="10"/>
                                </g>
                            </g>
                            <defs>
                                <clipPath id="clip0_186_6434">
                                    <rect width="24" height="24" fill="white"/>
                                </clipPath>
                                <clipPath id="clip1_186_6434">
                                    <rect width="24" height="24" fill="white"/>
                                </clipPath>
                            </defs>
                        </svg>
                        <span className={styles.rating_value}>{review.rating.toFixed(1)}</span>
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
                    {review.images.map((image, index) => {
                        const imageUrl = getReviewImageUrl(image.image);
                        return imageUrl ? (
                            <img
                                key={image.id || index}
                                src={imageUrl}
                                alt={`Отзыв ${index + 1}`}
                                className={styles.review_image}
                                loading="lazy"
                                onError={(e) => {
                                    e.currentTarget.src = "../fonTest5.png";
                                }}
                            />
                        ) : null;
                    })}
                </div>
            )}
        </div>
    );
};

// Функция для получения полных данных пользователя
const fetchFullUserData = async (userId: number): Promise<ClientProfileData | null> => {
    try {
        const token = getAuthToken();

        // 1. Получаем основные данные пользователя
        const response = await fetch(`${API_BASE_URL}/api/users/${userId}`, {
            method: 'GET',
            headers: {
                'Authorization': token ? `Bearer ${token}` : '',
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            console.error('Failed to fetch user data:', response.status);
            return null;
        }

        const userData = await response.json();
        console.log('Full user data from API:', userData);

        // 2. Получаем галерею пользователя (примеры работ)
        let gallery = null;
        try {
            const galleryResponse = await fetch(`${API_BASE_URL}/api/galleries?user=${userId}`, {
                method: 'GET',
                headers: {
                    'Authorization': token ? `Bearer ${token}` : '',
                    'Accept': 'application/json',
                },
            });

            if (galleryResponse.ok) {
                const galleries = await galleryResponse.json();
                if (galleries.length > 0) {
                    gallery = galleries[0]; // Берем первую галерею
                }
            }
        } catch (error) {
            console.error('Error fetching gallery:', error);
        }

        // Формируем URL аватара
        let avatarUrl: string | null = null;
        if (userData.image) {
            // Проверяем различные варианты путей
            if (userData.image.startsWith('http')) {
                avatarUrl = userData.image;
            } else if (userData.image.startsWith('/')) {
                avatarUrl = `${API_BASE_URL}${userData.image}`;
            } else {
                // Пробуем различные пути
                const possiblePaths = [
                    `${API_BASE_URL}/images/profile_photos/${userData.image}`,
                    `${API_BASE_URL}/uploads/profile_photos/${userData.image}`,
                    `${API_BASE_URL}/uploads/${userData.image}`,
                    `${API_BASE_URL}/${userData.image}`,
                ];

                // Для простоты используем первый вариант
                avatarUrl = possiblePaths[0];
            }
        }

        // Формируем полное имя
        const fullName = [
            userData.surname || '',
            userData.name || '',
            userData.patronymic || ''
        ].filter(Boolean).join(' ') || 'Фамилия Имя Отчество';

        return {
            id: userData.id.toString(),
            fullName,
            rating: userData.rating || 0,
            reviews: 0, // Будет обновлено из отзывов
            avatar: avatarUrl,
            gender: userData.gender || 'gender_male',
            phone: userData.phone1 || 'Не указан',
            phone2: userData.phone2 || 'Не указан',
            email: userData.email || 'Не указан',
            login: userData.login,
            bio: userData.bio,
            dateOfBirth: userData.dateOfBirth,
            imageExternalUrl: userData.imageExternalUrl,
            atHome: userData.atHome,
            active: userData.active,
            approved: userData.approved,
            roles: userData.roles || [],
            socialNetworks: userData.socialNetworks || [],
            education: userData.education || [],
            occupation: userData.occupation || [], // Специальности
            addresses: userData.addresses || [],
            gallery: gallery,
        };
    } catch (error) {
        console.error('Error fetching full user data:', error);
        return null;
    }
};

function Client() {
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
                // 1. Загружаем полные данные пользователя через новый метод
                const userData = await fetchFullUserData(clientId);
                if (userData) {
                    setProfileData(userData);
                }

                // 2. Загружаем отзывы используя хук useReviews
                if (clientId) {
                    await fetchReviews(clientId, 'client');
                }

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
    }, [clientId, fetchReviews, fetchComplaintReasons]);

    // Обновляем счетчик отзывов в профиле
    useEffect(() => {
        if (profileData) {
            setProfileData(prev => prev ? {
                ...prev,
                reviews: reviews.length
            } : null);
        }
    }, [reviews]);

    // Функция для получения URL изображения галереи
    const getGalleryImageUrl = (imagePath: string) => {
        if (!imagePath) return "";

        if (imagePath.startsWith('http')) {
            return imagePath;
        }

        if (imagePath.startsWith('/')) {
            return `${API_BASE_URL}${imagePath}`;
        }

        const possiblePaths = [
            `${API_BASE_URL}/images/gallery/${imagePath}`,
            `${API_BASE_URL}/uploads/gallery/${imagePath}`,
            `${API_BASE_URL}/images/${imagePath}`,
            `${API_BASE_URL}/${imagePath}`,
            imagePath
        ];

        return possiblePaths.find(path => path) || "";
    };

    // Добавьте функцию для получения тикета/услуги
    const fetchActiveTicket = async (masterId: number, clientId: number) => {
        try {
            const token = getAuthToken();
            if (!token) return null;

            // Ищем активные тикеты между мастером и клиентом
            const endpoint = `/api/tickets?active=true&master.id=${masterId}&author.id=${clientId}&service=true`;
            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
            });

            if (!response.ok) {
                console.error('Failed to fetch tickets:', response.status);
                return null;
            }

            const data = await response.json();
            const tickets = data['hydra:member'] || data;

            if (tickets && tickets.length > 0) {
                // Возвращаем первый активный тикет
                return tickets[0];
            }

            return null;
        } catch (error) {
            console.error('Error fetching ticket:', error);
            return null;
        }
    };

    // Обработчик ошибок изображений
    const handleImageError = async (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
        const img = e.currentTarget;
        const originalSrc = img.src;

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

            // Получаем активный тикет между мастером и клиентом
            const activeTicket = await fetchActiveTicket(currentUserId, parseInt(profileData.id));
            if (!activeTicket) {
                alert('Для оставления отзыва требуется активная услуга/тикет с этим клиентом');
                return;
            }

            // Формируем данные для создания отзыва согласно документации API
            const reviewData = {
                type: 'client', // Тип отзыва: 'client' или 'master'
                rating: selectedStars, // Рейтинг от 1 до 5
                description: reviewText,
                ticket: `/api/tickets/${activeTicket.id}`, // Обязательное поле - IRI к тикету
                client: `/api/users/${profileData.id}`, // Клиент, о котором отзыв
                master: `/api/users/${currentUserId}`, // Мастер, который оставляет отзыв
            };

            console.log('Sending review data:', reviewData);

            const createdReview = await createReview(reviewData);

            if (reviewPhotos.length > 0 && createdReview?.id) {
                await uploadReviewPhotos(createdReview.id, reviewPhotos);
            }

            // Обновляем отзывы
            if (profileData.id) {
                await fetchReviews(parseInt(profileData.id), 'client');
            }

            handleCloseModal();
            alert('Отзыв успешно отправлен!');

        } catch (error) {
            console.error('Error submitting review:', error);
            alert('Произошла ошибка при отправке отзыва. Проверьте консоль для деталей.');
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

            if (complaintPhotos.length > 0 && createdComplaint?.id) {
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

    // Функция для форматирования даты рождения
    const formatDateOfBirth = (dateString?: string) => {
        if (!dateString) return 'Не указана';
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('ru-RU');
        } catch (error) {
            return dateString;
        }
    };

    // Функция для получения URL изображения специальности
    const getOccupationImageUrl = (imagePath: string) => {
        if (!imagePath) return "../fonTest5.png";

        if (imagePath.startsWith('http')) {
            return imagePath;
        }

        if (imagePath.startsWith('/')) {
            return `${API_BASE_URL}${imagePath}`;
        }

        const possiblePaths = [
            `${API_BASE_URL}/images/occupations/${imagePath}`,
            `${API_BASE_URL}/uploads/occupations/${imagePath}`,
            `${API_BASE_URL}/images/${imagePath}`,
            `${API_BASE_URL}/${imagePath}`,
        ];

        return possiblePaths.find(path => path) || "../fonTest5.png";
    };

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

                        {/* Логин */}
                        {profileData.login && (
                            <div className={styles.data_item}>
                                <div className={styles.data_label}>Логин</div>
                                <div className={styles.data_value}>
                                    {profileData.login}
                                </div>
                            </div>
                        )}

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
                            <div className={styles.data_label}>Электронная почта</div>
                            <div className={styles.data_value}>
                                {profileData.email}
                            </div>
                        </div>

                        {/* О себе */}
                        {profileData.bio && (
                            <div className={styles.data_item}>
                                <div className={styles.data_label}>О себе</div>
                                <div className={styles.data_value}>
                                    {profileData.bio}
                                </div>
                            </div>
                        )}

                        {/* Дата рождения */}
                        {profileData.dateOfBirth && (
                            <div className={styles.data_item}>
                                <div className={styles.data_label}>Дата рождения</div>
                                <div className={styles.data_value}>
                                    {formatDateOfBirth(profileData.dateOfBirth)}
                                </div>
                            </div>
                        )}

                        {/* Выезд на дом */}
                        {profileData.atHome !== undefined && (
                            <div className={styles.data_item}>
                                <div className={styles.data_label}>Выезд на дом</div>
                                <div className={styles.data_value}>
                                    {profileData.atHome ? 'Да' : 'Нет'}
                                </div>
                            </div>
                        )}

                        {/* Статус активности */}
                        {profileData.active !== undefined && (
                            <div className={styles.data_item}>
                                <div className={styles.data_label}>Статус</div>
                                <div className={styles.data_value}>
                                    {profileData.active ? 'Активен' : 'Неактивен'}
                                </div>
                            </div>
                        )}

                        {/* Статус подтверждения */}
                        {profileData.approved !== undefined && (
                            <div className={styles.data_item}>
                                <div className={styles.data_label}>Подтверждён</div>
                                <div className={styles.data_value}>
                                    {profileData.approved ? 'Да' : 'Нет'}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Специальности (occupation) */}
                    {profileData.occupation && profileData.occupation.length > 0 && (
                        <div className={styles.data_section}>
                            <h3 className={styles.section_subtitle}>Специальности</h3>
                            <div className={styles.occupation_list}>
                                {profileData.occupation.map((occupation) => (
                                    <div key={occupation.id} className={styles.occupation_item}>
                                        {occupation.image && (
                                            <img
                                                src={getOccupationImageUrl(occupation.image)}
                                                alt={occupation.title}
                                                className={styles.occupation_image}
                                                onError={(e) => e.currentTarget.src = "../fonTest5.png"}
                                            />
                                        )}
                                        <div className={styles.occupation_title}>{occupation.title}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Адреса */}
                    {profileData.addresses && profileData.addresses.length > 0 && (
                        <div className={styles.data_section}>
                            <h3 className={styles.section_subtitle}>Адреса работы</h3>
                            {profileData.addresses.map((address, index) => (
                                <div key={address.id || index} className={styles.address_item}>
                                    {address.province && (
                                        <div className={styles.data_item}>
                                            <div className={styles.data_label}>Область</div>
                                            <div className={styles.data_value}>{address.province.title}</div>
                                        </div>
                                    )}
                                    {address.city && (
                                        <div className={styles.data_item}>
                                            <div className={styles.data_label}>Город</div>
                                            <div className={styles.data_value}>{address.city.title}</div>
                                        </div>
                                    )}
                                    {address.district && (
                                        <div className={styles.data_item}>
                                            <div className={styles.data_label}>Район</div>
                                            <div className={styles.data_value}>{address.district.title}</div>
                                        </div>
                                    )}
                                    {address.suburb && (
                                        <div className={styles.data_item}>
                                            <div className={styles.data_label}>Пригород</div>
                                            <div className={styles.data_value}>{address.suburb.title}</div>
                                        </div>
                                    )}
                                    {address.settlement && (
                                        <div className={styles.data_item}>
                                            <div className={styles.data_label}>Населённый пункт</div>
                                            <div className={styles.data_value}>{address.settlement.title}</div>
                                        </div>
                                    )}
                                    {address.community && (
                                        <div className={styles.data_item}>
                                            <div className={styles.data_label}>Община</div>
                                            <div className={styles.data_value}>{address.community.title}</div>
                                        </div>
                                    )}
                                    {address.village && (
                                        <div className={styles.data_item}>
                                            <div className={styles.data_label}>Деревня</div>
                                            <div className={styles.data_value}>{address.village.title}</div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Образование */}
                    {profileData.education && profileData.education.length > 0 && (
                        <div className={styles.data_section}>
                            <h3 className={styles.section_subtitle}>Образование и опыт</h3>
                            {profileData.education.map((edu, index) => (
                                <div key={edu.id || index} className={styles.education_item}>
                                    <div className={styles.data_item}>
                                        <div className={styles.data_label}>Университет</div>
                                        <div className={styles.data_value}>{edu.uniTitle}</div>
                                    </div>
                                    <div className={styles.data_item}>
                                        <div className={styles.data_label}>Факультет</div>
                                        <div className={styles.data_value}>{edu.faculty}</div>
                                    </div>
                                    <div className={styles.data_item}>
                                        <div className={styles.data_label}>Годы обучения</div>
                                        <div className={styles.data_value}>
                                            {edu.beginning} - {edu.ending} {edu.graduated ? '(окончил)' : '(не окончил)'}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Социальные сети */}
                    {profileData.socialNetworks && profileData.socialNetworks.length > 0 && (
                        <div className={styles.data_section}>
                            <h3 className={styles.section_subtitle}>Социальные сети</h3>
                            <div className={styles.social_networks}>
                                {profileData.socialNetworks.map((social) => (
                                    <div key={social.id} className={styles.social_item}>
                                        <span className={styles.social_network}>{social.network}:</span>
                                        <span className={styles.social_handle}>{social.handle}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Примеры работ (Галерея) */}
                {profileData.gallery && profileData.gallery.images && profileData.gallery.images.length > 0 && (
                    <>
                        <div className={styles.divider}></div>
                        <div className={styles.gallery_section}>
                            <h2 className={styles.section_title}>Примеры работ</h2>
                            <p className={styles.section_subtitle}>
                                Фотографии выполненных работ
                            </p>
                            <div className={styles.gallery_images}>
                                {profileData.gallery.images.map((image) => (
                                    <div key={image.id} className={styles.gallery_image_wrapper}>
                                        <img
                                            src={getGalleryImageUrl(image.image)}
                                            alt="Пример работы"
                                            className={styles.gallery_image}
                                            onError={(e) => e.currentTarget.src = "../fonTest5.png"}
                                            loading="lazy"
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
                )}

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

export default Client;