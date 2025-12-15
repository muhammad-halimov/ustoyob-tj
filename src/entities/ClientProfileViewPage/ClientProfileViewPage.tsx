import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getAuthToken, getUserRole } from '../../utils/auth';
import styles from '../../pages/profile/clientProfilePage/ClientProfilePage.module.scss';
import { fetchUserWithRole } from "../../utils/api.ts";
import AuthModal from '../../shared/ui/AuthModal/AuthModal.tsx';

interface ClientProfileData {
    id: string;
    fullName: string;
    rating: number;
    reviews: number;
    avatar: string | null;
    gender: string;
    phone: string;
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
    reviewer: {
        id: number;
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

// Добавляем интерфейс для пользователя
interface UserData {
    id: number;
    name?: string;
    surname?: string;
    patronymic?: string;
    gender?: string;
    phone1?: string;
    email?: string;
    rating?: number;
    image?: string;
    roles?: string[];
    occupation?: Array<{ title: string }>;
}

// Обновляем интерфейс для отзыва с сервера согласно API документации
interface ReviewResponse {
    id: number;
    type?: string;
    rating?: number;
    description?: string;
    ticket?: {
        id: number;
        title: string;
        service: boolean;
        active: boolean;
        author: {
            id: number;
            email: string;
            login: string;
            name: string;
            surname: string;
            image: string;
            imageExternalUrl: string;
        };
        master: {
            id: number;
            email: string;
            login: string;
            name: string;
            surname: string;
            image: string;
            imageExternalUrl: string;
        };
    };
    master?: {
        id: number;
        email: string;
        login: string;
        name: string;
        surname: string;
        image: string;
        imageExternalUrl: string;
    };
    client?: {
        id: number;
        email: string;
        login: string;
        name: string;
        surname: string;
        image: string;
        imageExternalUrl: string;
    };
    images?: Array<{
        id: number;
        image: string;
    }>;
    createdAt?: string;
    updatedAt?: string;
}

// Интерфейс для жалобы
// interface AppealData {
//     type: string;
//     title: string;
//     complaintReason: string;
//     supportReason?: string;
//     status?: string;
//     priority?: string;
//     administrant?: string;
//     author: string;
//     respondent: string;
//     description: string;
//     ticket?: string;
//     ticketAppeal?: boolean;
// }

// Интерфейс для пользователя в списке
// interface UserInList {
//     id: number;
//     roles?: string[];
//     [key: string]: unknown;
// }
//
// // Интерфейс для API ответов
// interface HydraResponse<T> {
//     'hydra:member'?: T[];
//     'hydra:totalItems'?: number;
//     'hydra:view'?: {
//         '@id': string;
//         '@type': string;
//         'hydra:first'?: string;
//         'hydra:last'?: string;
//         'hydra:next'?: string;
//     };
// }

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

function ClientProfileViewPage() {
    const { id } = useParams<{ id: string }>();
    const clientId = id ? parseInt(id) : null;
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(true);
    const [profileData, setProfileData] = useState<ClientProfileData | null>(null);
    const [reviews, setReviews] = useState<Review[]>([]);
    const [reviewsLoading, setReviewsLoading] = useState(false);
    const [showAllReviews, setShowAllReviews] = useState(false);
    const [showReviewModal, setShowReviewModal] = useState(false);
    const [showComplaintModal, setShowComplaintModal] = useState(false);
    const [showAuthModal, setShowAuthModal] = useState(false);

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

    useEffect(() => {
        if (clientId) {
            fetchClientData(clientId);
        }
    }, [clientId]);

    useEffect(() => {
        if (profileData?.id) {
            fetchClientReviews(parseInt(profileData.id));
        }
    }, [profileData?.id]);

    const checkImageExists = (url: string): Promise<boolean> => {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => resolve(true);
            img.onerror = () => resolve(false);
            img.src = url;
        });
    };

    const [complaintReasons, setComplaintReasons] = useState<Array<{
        id: number;
        complaint_code: string;
        complaint_human: string;
    }>>([]);

    // В useEffect добавьте:
    useEffect(() => {
        fetchComplaintReasons();
    }, []);

    const fetchComplaintReasons = async () => {
        try {
            const token = getAuthToken();
            const headers: HeadersInit = {
                'Accept': 'application/json',
            };

            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const response = await fetch(`${API_BASE_URL}/api/appeals/reasons`, {
                method: 'GET',
                headers: headers,
            });

            if (response.ok) {
                const reasons = await response.json();
                console.log('Available complaint reasons:', reasons);
                setComplaintReasons(reasons);
            } else {
                console.error('Failed to fetch complaint reasons');
                // Устанавливаем дефолтные причины
                setComplaintReasons([
                    { id: 1, complaint_code: 'other', complaint_human: 'Другое' }
                ]);
            }
        } catch (error) {
            console.error('Error fetching complaint reasons:', error);
            // Устанавливаем дефолтные причины при ошибке
            setComplaintReasons([
                { id: 1, complaint_code: 'other', complaint_human: 'Другое' }
            ]);
        }
    };

    const fetchClientData = async (clientId: number) => {
        try {
            setIsLoading(true);
            // const token = getAuthToken();
            //
            // if (!token) {
            //     navigate('/');
            //     return;
            // }

            // Получаем данные клиента
            const clientData = await fetchUser(clientId, 'client');
            if (!clientData) {
                console.error('Client not found');
                setProfileData(null);
                return;
            }

            console.log('Client data received:', clientData);

            const avatarUrl = await getAvatarUrl(clientData);

            const transformedData: ClientProfileData = {
                id: clientData.id.toString(),
                fullName: [clientData.surname, clientData.name, clientData.patronymic]
                    .filter(Boolean)
                    .join(' ') || 'Фамилия Имя Отчество',
                rating: clientData.rating || 0,
                reviews: 0,
                avatar: avatarUrl,
                gender: clientData.gender || 'gender_male',
                phone: clientData.phone1 || '+0 000 000 00 00',
                email: clientData.email || 'адрес емаил'
            };

            setProfileData(transformedData);

        } catch (error) {
            console.error('Error fetching client data:', error);
            setProfileData(null);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchUser = async (userId: number, userType: 'master' | 'client'): Promise<UserData | null> => {
        try {
            const token = getAuthToken();

            const headers: HeadersInit = {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            };

            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            try {
                const directResponse = await fetch(`${API_BASE_URL}/api/users/${userId}`, {
                    method: 'GET',
                    headers: headers,
                });

                if (directResponse.ok) {
                    const userData: UserData = await directResponse.json();
                    console.log(`Found user ${userId} directly:`, userData);

                    if (token && userData.roles) {
                        const hasRole = userType === 'master'
                            ? userData.roles.includes('ROLE_MASTER')
                            : userData.roles.includes('ROLE_CLIENT');

                        if (!hasRole) {
                            console.warn(`User ${userId} does not have required role ${userType}`);
                            return null;
                        }
                    }

                    return userData;
                } else if (directResponse.status === 401 || directResponse.status === 403) {
                    console.log(`Access denied (${directResponse.status}) for user ${userId}, trying public data`);
                }
            } catch (directError) {
                console.log('Direct fetch failed:', directError);
            }

            console.log('Could not fetch user data, using fallback');
            return null;

        } catch (error) {
            console.error(`Error fetching ${userType} data:`, error);
            return null;
        }
    };

    const getAvatarUrl = async (userData: UserData): Promise<string | null> => {
        if (!userData) return null;

        console.log('Getting avatar URL for client:', userData.id);
        console.log('Client image data:', userData.image);

        if (userData.image) {
            // Извлекаем имя файла если это полный путь
            let imagePath = userData.image;
            if (imagePath.includes('/')) {
                imagePath = imagePath.split('/').pop() || imagePath;
            }

            const mainAvatarPath = `${API_BASE_URL}/images/profile_photos/${imagePath}`;
            console.log('Main avatar path for client:', mainAvatarPath);

            // Проверяем основной путь /images/profile_photos/
            if (await checkImageExists(mainAvatarPath)) {
                console.log('Using main avatar path for client');
                return mainAvatarPath;
            }

            // Проверяем другие возможные пути
            const alternativePaths = [
                `${API_BASE_URL}/${userData.image}`,
                userData.image, // оригинальное значение
                `${API_BASE_URL}/uploads/profile_photos/${imagePath}`,
                `${API_BASE_URL}/uploads/clients/${imagePath}`,
                `${API_BASE_URL}/images/clients/${imagePath}`
            ];

            for (const path of alternativePaths) {
                console.log('Checking client avatar path:', path);
                if (path && await checkImageExists(path)) {
                    console.log('Using client avatar from:', path);
                    return path;
                }
            }
        }

        console.log('No avatar found for client, using placeholder');
        return null;
    };

    const fetchClientReviews = async (clientId: number) => {
        try {
            setReviewsLoading(true);
            const token = getAuthToken();

            const headers: HeadersInit = {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            };

            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            console.log('Fetching reviews for client ID:', clientId);

            // Согласно документации, нужно фильтровать отзывы по client
            const endpoint = `/api/reviews?client=${clientId}`;

            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                method: 'GET',
                headers: headers,
            });

            // Если 401 или 403, это нормально для неавторизованного пользователя
            if (response.status === 401 || response.status === 403) {
                console.log('Unauthorized access to reviews, trying without auth');
                // Пробуем без авторизации
                const publicResponse = await fetch(`${API_BASE_URL}/api/reviews?client=${clientId}`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                    },
                });

                if (publicResponse.ok) {
                    const reviewsData = await publicResponse.json();
                    processReviewsData(reviewsData, clientId);
                } else {
                    console.log('No reviews found or access denied');
                    setReviews([]);
                    setProfileData(prev => prev ? {
                        ...prev,
                        reviews: 0
                    } : null);
                }
                return;
            }

            if (response.status === 404) {
                console.log('No reviews found for this client');
                setReviews([]);
                return;
            }

            if (!response.ok) {
                console.error(`Failed to fetch reviews: ${response.status} ${response.statusText}`);
                setReviews([]);
                return;
            }

            const reviewsData = await response.json();
            processReviewsData(reviewsData, clientId);

        } catch (error) {
            console.error('Error fetching client reviews:', error);
            setReviews([]);
            setProfileData(prev => prev ? {
                ...prev,
                reviews: 0
            } : null);
        } finally {
            setReviewsLoading(false);
        }
    };

    // Вспомогательная функция для обработки данных отзывов
    const processReviewsData = (reviewsData: any, clientId: number) => {
        console.log('Raw reviews data:', reviewsData);

        let reviewsArray: ReviewResponse[] = [];

        if (Array.isArray(reviewsData)) {
            reviewsArray = reviewsData;
        } else if (reviewsData && typeof reviewsData === 'object') {
            // Проверяем hydra формат
            if ('hydra:member' in reviewsData && Array.isArray(reviewsData['hydra:member'])) {
                reviewsArray = reviewsData['hydra:member'] as ReviewResponse[];
            }
            // Проверяем, что это объект с полем id типа number
            else if ('id' in reviewsData && typeof reviewsData.id === 'number') {
                reviewsArray = [reviewsData as ReviewResponse];
            }
        }

        // Фильтруем отзывы только для данного клиента (на всякий случай)
        const clientReviews = reviewsArray.filter(review => {
            // Проверяем, что отзыв относится к клиенту
            const reviewClientId = review.client?.id;
            return reviewClientId === clientId;
        });

        console.log(`Processing ${clientReviews.length} reviews for client ${clientId}`);

        if (clientReviews.length > 0) {
            const transformedReviews = clientReviews.map((review): Review => {
                console.log('Processing review:', review);

                // Получаем информацию о мастере, который оставил отзыв
                const masterData = review.master ? {
                    id: review.master.id,
                    name: review.master.name,
                    surname: review.master.surname,
                    image: review.master.image
                } : null;

                const transformedReview: Review = {
                    id: review.id,
                    rating: review.rating || 0,
                    description: review.description || '',
                    forReviewer: review.type === 'client' || false, // Если тип 'client', значит отзыв о клиенте
                    services: { id: 0, title: 'Услуга' }, // В API нет информации об услугах в отзыве
                    images: review.images || [],
                    master: masterData ? {
                        id: masterData.id,
                        name: masterData.name,
                        surname: masterData.surname,
                        patronymic: '',
                        profession: '',
                        specialization: '',
                        image: masterData.image
                    } : {
                        id: 0,
                        name: 'Мастер',
                        surname: '',
                        profession: 'Специалист',
                        specialization: 'Специалист'
                    },
                    reviewer: {
                        id: review.master?.id || 0
                    },
                    createdAt: review.createdAt
                };

                return transformedReview;
            });

            console.log('All transformed reviews:', transformedReviews);
            setReviews(transformedReviews);

            // Обновляем счетчик отзывов в профиле
            setProfileData(prev => prev ? {
                ...prev,
                reviews: transformedReviews.length
            } : null);

        } else {
            console.log('No reviews data found for this client');
            setReviews([]);
            setProfileData(prev => prev ? {
                ...prev,
                reviews: 0
            } : null);
        }
    };

    const handleImageError = async (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
        console.log('Image loading error, trying fallback sources');
        const img = e.currentTarget;
        const originalSrc = img.src;

        // Если это аватар клиента
        if (img.classList.contains(styles.avatar) && profileData?.id && profileData.avatar) {
            const avatarPaths = [
                `${API_BASE_URL}/images/profile_photos/${profileData.avatar.split('/').pop()}`,
                `${API_BASE_URL}/api/${profileData.id}/profile-photo`,
                profileData.avatar?.includes("uploads/") ? `/uploads/avatars/${profileData.avatar.split("/").pop()}` : null,
            ].filter(Boolean) as string[];

            for (const source of avatarPaths) {
                if (source && source !== originalSrc) {
                    try {
                        if (await checkImageExists(source)) {
                            img.src = source;
                            console.log('Fallback avatar loaded:', source);
                            return;
                        }
                    } catch {
                        console.log('Fallback avatar failed:', source);
                        continue;
                    }
                }
            }
        }

        // Если это аватар мастера в отзыве
        if (img.classList.contains(styles.reviewer_avatar)) {
            img.src = "../fonTest6.png";
            return;
        }

        // Общий fallback
        img.src = "../fonTest6.png";
    };

    const getReviewerAvatarUrl = (review: Review) => {
        if (review.master?.image) {
            console.log('Master image from data:', review.master.image);

            // Проверяем, является ли image полным URL или только именем файла
            let imagePath = review.master.image;

            // Если это полный URL, извлекаем имя файла
            if (imagePath.includes('/')) {
                imagePath = imagePath.split('/').pop() || imagePath;
            }

            // Основной путь к аватарам пользователей
            const mainAvatarPath = `${API_BASE_URL}/images/profile_photos/${imagePath}`;

            // Проверяем все возможные пути в правильном порядке
            const possiblePaths = [
                mainAvatarPath, // Основной путь /images/profile_photos/
                review.master.image, // Оригинальное значение из данных
                `${API_BASE_URL}${review.master.image}`, // Если это относительный путь
                `${API_BASE_URL}/images/profile_photos/${review.master.image}`,
                `${API_BASE_URL}/uploads/profile_photos/${review.master.image}`,
                `${API_BASE_URL}/uploads/masters/${review.master.image}`,
                `${API_BASE_URL}/images/masters/${review.master.image}`,
                `${API_BASE_URL}/${review.master.image}`
            ];

            // Удаляем дубликаты
            const uniquePaths = Array.from(new Set(possiblePaths.filter(Boolean)));

            for (const path of uniquePaths) {
                if (path && path !== "../fonTest6.png") {
                    console.log('Trying master avatar path:', path);
                    return path;
                }
            }
        }

        console.log('Using default avatar for master');
        return "../fonTest6.png";
    };

    const getReviewerName = (review: Review) => {
        return `${review.master?.surname || ''} ${review.master?.name || ''} ${review.master?.patronymic || ''}`.trim() || 'Специалист';
    };

    const getReviewerProfession = (review: Review) => {
        return review.master?.profession || review.master?.specialization || 'Специалист';
    };

    const formatReviewDate = (dateString?: string) => {
        if (!dateString) return getFormattedDate();
        try {
            return new Date(dateString).toLocaleDateString('ru-RU');
        } catch {
            return getFormattedDate();
        }
    };

    const getFormattedDate = (): string => {
        const now = new Date();
        const day = now.getDate().toString().padStart(2, '0');
        const month = (now.getMonth() + 1).toString().padStart(2, '0');
        const year = now.getFullYear();
        return `${day}.${month}.${year}`;
    };

    const getGenderDisplay = (gender: string) => {
        const genderMap: { [key: string]: string } = {
            'gender_female': 'Женский',
            'gender_male': 'Мужской',
            'female': 'Женский',
            'male': 'Мужской',
            'other': 'Другой'
        };
        return genderMap[gender] || gender;
    };

    const handleMasterProfileClick = async (masterId: number) => {
        const token = getAuthToken();

        // Если пользователь не авторизован, показываем модалку авторизации
        if (!token) {
            setShowAuthModal(true);
            return;
        }

        try {
            const { role } = await fetchUserWithRole(masterId);

            if (role === 'master') {
                navigate(`/master/${masterId}`);
            } else {
                console.warn('User is not a master, role:', role);
                navigate(`/master/${masterId}`);
            }
        } catch (error) {
            console.error('Error checking user role:', error);
            navigate(`/master/${masterId}`);
        }
    };

    const handleLeaveReview = () => {
        const token = getAuthToken();
        if (!token) {
            setShowAuthModal(true);
            return;
        }

        const userRole = getUserRole();
        if (userRole !== 'master') {
            alert('Только мастера могут оставлять отзывы о клиентах');
            return;
        }

        setShowReviewModal(true);
    };

    // Функции для работы с формой отзыва
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

    const handleCloseModal = () => {
        setShowReviewModal(false);
        setReviewText('');
        setSelectedStars(0);
        setReviewPhotos([]);
    };

    const handleSubmitReview = async () => {
        if (!reviewText.trim()) {
            alert('Пожалуйста, напишите комментарий');
            return;
        }

        if (selectedStars === 0) {
            alert('Пожалуйста, поставьте оценку');
            return;
        }

        try {
            const token = getAuthToken();
            if (!token) {
                alert('Необходима авторизация');
                return;
            }

            const currentUserId = await getCurrentUserId();

            if (!currentUserId || !profileData) {
                alert('Не удалось определить пользователя или клиента');
                return;
            }

            // Согласно документации, структура данных должна быть такой
            const reviewData = {
                type: 'client', // Тип отзыва: 'client' (отзыв о клиенте)
                rating: selectedStars,
                description: reviewText,
                client: `/api/users/${profileData.id}`,
                master: `/api/users/${currentUserId}`,
                // ticket может быть обязательным, нужно проверить
                // ticket: `/api/tickets/{ticket_id}`
            };

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

                // Загружаем фото через отдельный эндпоинт
                if (reviewPhotos.length > 0) {
                    try {
                        await uploadReviewPhotos(reviewResponse.id, reviewPhotos, token);
                        console.log('All photos uploaded successfully');
                    } catch (uploadError) {
                        console.error('Error uploading photos, but review was created:', uploadError);
                        alert('Отзыв отправлен, но возникла ошибка при загрузке фото');
                    }
                }

                handleCloseModal();
                alert('Отзыв успешно отправлен!');

                // Обновляем список отзывов
                if (profileData?.id) {
                    fetchClientReviews(parseInt(profileData.id));
                }

            } else {
                const errorText = await response.text();
                console.error('Error creating review. Status:', response.status, 'Response:', errorText);

                let errorMessage = 'Ошибка при отправке отзыва';
                if (response.status === 422) {
                    try {
                        const errorData = JSON.parse(errorText);
                        if (errorData.violations && errorData.violations.length > 0) {
                            errorMessage = errorData.violations.map((v: any) => v.message).join(', ');
                        }
                    } catch (e) {
                        errorMessage = 'Ошибка валидации данных';
                    }
                } else if (response.status === 400) {
                    // Возможно, требуется поле ticket
                    if (errorText.includes('ticket')) {
                        errorMessage = 'Для отправки отзыва требуется указать тикет. Пожалуйста, свяжитесь с администрацией.';
                    } else {
                        errorMessage = 'Неверные данные для отправки отзыва';
                    }
                } else if (response.status === 404) {
                    errorMessage = 'Ресурс не найден. Возможно, пользователь не существует.';
                }

                alert(errorMessage);
            }

        } catch (error) {
            console.error('Error submitting review:', error);
            alert('Произошла непредвиденная ошибка при отправке отзыва');
        }
    };

    const uploadReviewPhotos = async (reviewId: number, photos: File[], token: string) => {
        try {
            console.log(`Uploading ${photos.length} photos for review ${reviewId}`);

            for (const photo of photos) {
                const formData = new FormData();
                formData.append('imageFile', photo); // Поле должно быть 'imageFile' согласно API

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
                const userData: UserData = await response.json();
                return userData.id;
            }
            return null;
        } catch (error) {
            console.error('Error getting current user ID:', error);
            return null;
        }
    };

    // Функции для работы с жалобой
    const handleComplaintClick = () => {
        const token = getAuthToken();
        if (!token) {
            setShowAuthModal(true);
            return;
        }

        setShowComplaintModal(true);
    };

    const handleAuthModalClose = () => {
        setShowAuthModal(false);
    };

    const handleAuthSuccess = (token: string, email?: string) => {
        console.log('Login successful', token, email);
        setShowAuthModal(false);
    };

    const handleComplaintClose = () => {
        setShowComplaintModal(false);
        setComplaintReason('');
        setComplaintDescription('');
        setComplaintTitle('');
        setComplaintPhotos([]);
    };

    const handleComplaintPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files);
            setComplaintPhotos(prev => [...prev, ...files]);
        }
    };

    const removeComplaintPhoto = (index: number) => {
        setComplaintPhotos(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmitComplaint = async () => {
        if (!complaintReason.trim()) {
            alert('Пожалуйста, выберите причину жалобы');
            return;
        }

        if (!complaintDescription.trim()) {
            alert('Пожалуйста, опишите ситуацию подробнее');
            return;
        }

        try {
            setIsSubmittingComplaint(true);
            const token = getAuthToken();
            if (!token) {
                alert('Необходима авторизация');
                return;
            }

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

            // Пробуем получить существующий чат с пользователем
            let chatIri: string | null = null;

            try {
                // Ищем чаты с этим пользователем
                const chatsResponse = await fetch(`${API_BASE_URL}/api/chats`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Accept': 'application/json',
                    },
                });

                if (chatsResponse.ok) {
                    const chatsData = await chatsResponse.json();

                    // Ищем чат где replyAuthor или author соответствует нашему пользователю
                    let chatsArray: any[] = [];
                    if (Array.isArray(chatsData)) {
                        chatsArray = chatsData;
                    } else if (chatsData && typeof chatsData === 'object') {
                        if ('hydra:member' in chatsData && Array.isArray(chatsData['hydra:member'])) {
                            chatsArray = chatsData['hydra:member'];
                        }
                    }

                    // Ищем чат с нужным пользователем
                    const foundChat = chatsArray.find((chat: any) => {
                        const replyAuthorId = chat.replyAuthor?.id;
                        const authorId = chat.author?.id;
                        const targetUserId = parseInt(profileData.id);

                        return replyAuthorId === targetUserId || authorId === targetUserId;
                    });

                    if (foundChat) {
                        chatIri = `/api/chats/${foundChat.id}`;
                        console.log('Found existing chat:', foundChat.id);
                    }
                }
            } catch (error) {
                console.error('Error searching for chat:', error);
            }

            // Если чат не найден, пробуем создать его
            if (!chatIri) {
                try {
                    // Создаем чат с пользователем для жалобы
                    const chatData = {
                        replyAuthor: `/api/users/${profileData.id}`,
                        active: true,
                        // Можем добавить фиктивное сообщение
                        messages: []
                    };

                    const createChatResponse = await fetch(`${API_BASE_URL}/api/chats`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json',
                            'Accept': 'application/json',
                        },
                        body: JSON.stringify(chatData)
                    });

                    if (createChatResponse.ok || createChatResponse.status === 201) {
                        const chatResponse = await createChatResponse.json();
                        chatIri = `/api/chats/${chatResponse.id}`;
                        console.log('Created new chat for complaint:', chatResponse.id);
                    }
                } catch (error) {
                    console.error('Error creating chat:', error);
                }
            }

            // Если все равно не удалось получить chatIri, используем фиктивный ID
            if (!chatIri) {
                // Попробуем использовать тип 'ticket' с фиктивным тикетом
                // или попросим бэкенд предоставить правильный формат
                alert('Не удалось создать чат для жалобы. Пожалуйста, свяжитесь с администрацией другим способом.');
                return;
            }

            // Создаем жалобу с типом 'chat'
            const complaintData = {
                type: 'chat',
                title: title,
                description: complaintDescription,
                reason: complaintReason,
                respondent: `/api/users/${profileData.id}`,
                chat: chatIri,
                // Добавляем автора, если требуется
                // author: `/api/users/${currentUserId}`
            };

            console.log('Sending complaint data:', complaintData);

            const response = await fetch(`${API_BASE_URL}/api/appeals`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify(complaintData)
            });

            if (response.ok || response.status === 201) {
                const complaintResponse = await response.json();
                console.log('Complaint created successfully:', complaintResponse);

                // Загружаем фото через отдельный эндпоинт, если есть
                if (complaintPhotos.length > 0) {
                    try {
                        const appealId = complaintResponse.id;
                        await uploadAppealPhotos(appealId, complaintPhotos, token);
                        console.log('All complaint photos uploaded successfully');
                    } catch (uploadError) {
                        console.error('Error uploading complaint photos, but complaint was created:', uploadError);
                        alert('Жалоба отправлена, но возникла ошибка при загрузке фото');
                    }
                }

                handleComplaintClose();
                alert('Жалоба успешно отправлена! Администрация рассмотрит её в ближайшее время.');

            } else {
                const errorText = await response.text();
                console.error('Error creating complaint. Status:', response.status, 'Response:', errorText);

                let errorMessage = 'Ошибка при отправке жалобы';
                if (response.status === 422) {
                    try {
                        const errorData = JSON.parse(errorText);
                        if (errorData.violations && errorData.violations.length > 0) {
                            errorMessage = errorData.violations.map((v: any) => v.message).join(', ');
                        }
                    } catch (e) {
                        errorMessage = 'Ошибка валидации данных';
                    }
                } else if (response.status === 400) {
                    // Пробуем другой подход - используем тип 'ticket' с фиктивным тикетом
                    if (errorText.includes('Missing')) {
                        errorMessage = 'Требуется привязка к тикету или чату. Пожалуйста, свяжитесь с администрацией другим способом.';
                    }
                } else if (response.status === 403) {
                    errorMessage = 'Нет доступа для отправки жалобы';
                }

                alert(errorMessage);
            }

        } catch (error) {
            console.error('Error submitting complaint:', error);
            alert('Произошла непредвиденная ошибка при отправке жалобы');
        } finally {
            setIsSubmittingComplaint(false);
        }
    };

    const uploadAppealPhotos = async (appealId: number, photos: File[], token: string) => {
        try {
            console.log(`Uploading ${photos.length} photos for appeal ${appealId}`);

            for (const photo of photos) {
                const formData = new FormData();
                formData.append('imageFile', photo); // Поле должно быть 'imageFile' согласно API

                console.log(`Uploading appeal photo: ${photo.name}`);

                const response = await fetch(`${API_BASE_URL}/api/appeals/${appealId}/upload-photo`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    },
                    body: formData
                });

                if (response.ok || response.status === 201) {
                    const uploadResult = await response.json();
                    console.log('Appeal photo uploaded successfully:', uploadResult);
                } else {
                    const errorText = await response.text();
                    console.error(`Error uploading photo for appeal ${appealId}:`, errorText);
                    throw new Error(`Failed to upload appeal photo: ${response.status}`);
                }
            }

            console.log('All appeal photos uploaded successfully');
        } catch (error) {
            console.error('Error uploading appeal photos:', error);
            throw error;
        }
    };

    // Получаем отзывы для отображения (первые 2 или все)
    const displayedReviews = showAllReviews ? reviews : reviews.slice(0, 2);
    const hasMoreReviews = reviews.length > 2;

    if (isLoading) {
        return <div className={styles.profile}>Загрузка...</div>;
    }

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

                {/* Личные данные (только просмотр) */}
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

                        <div className={styles.data_item_sex}>
                            <div className={styles.data_label}>Пол</div>
                            <div className={styles.data_value}>
                                {getGenderDisplay(profileData.gender)}
                            </div>
                        </div>

                        <div className={styles.data_item}>
                            <div className={styles.data_label}>номер телефона</div>
                            <div className={styles.data_value}>
                                {profileData.phone}
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
                            displayedReviews.map((review) => {
                                const reviewerName = getReviewerName(review);
                                const reviewerProfession = getReviewerProfession(review);
                                const reviewDate = formatReviewDate(review.createdAt);

                                return (
                                    <div key={review.id} className={styles.review_item}>
                                        <div className={styles.review_header}>
                                            <div className={styles.reviewer_info}>
                                                <img
                                                    src={getReviewerAvatarUrl(review)}
                                                    alt={reviewerName}
                                                    className={styles.reviewer_avatar}
                                                    onClick={() => handleMasterProfileClick(review.master.id)}
                                                    style={{ cursor: 'pointer' }}
                                                    onError={(e) => {
                                                        e.currentTarget.src = "../fonTest5.png";
                                                    }}
                                                    loading="lazy"
                                                />
                                                <div className={styles.reviewer_main_info}>
                                                    <div
                                                        className={styles.reviewer_name}
                                                        onClick={() => handleMasterProfileClick(review.master.id)}
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
                                                    <span>Поставил: </span>
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
                            })
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
                            <div className={styles.photoSection}>
                                <label>Приложите фото</label>
                                <div className={styles.photoUploadContainer}>
                                    {/* Превью загруженных фото */}
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
                                                >
                                                    ×
                                                </button>
                                            </div>
                                        ))}

                                        {/* Кнопка добавления фото (всегда справа) */}
                                        <div className={styles.photoUpload}>
                                            <input
                                                type="file"
                                                id="review-photos"
                                                multiple
                                                accept="image/*"
                                                onChange={handlePhotoUpload}
                                                className={styles.fileInput}
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
                                <label>Поставьте оценку</label>
                                <div className={styles.stars}>
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <button
                                            key={star}
                                            type="button"
                                            className={`${styles.star} ${star <= selectedStars ? styles.active : ''}`}
                                            onClick={() => handleStarClick(star)}
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
                                <div className={styles.photoUploadContainer}>
                                    <div className={styles.photoPreviews}>
                                        {complaintPhotos.map((photo, index) => (
                                            <div key={index} className={styles.photoPreview}>
                                                <img
                                                    src={URL.createObjectURL(photo)}
                                                    alt={`Доказательство ${index + 1}`}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => removeComplaintPhoto(index)}
                                                    className={styles.removePhoto}
                                                >
                                                    ×
                                                </button>
                                            </div>
                                        ))}

                                        <div className={styles.photoUpload}>
                                            <input
                                                type="file"
                                                id="complaint-photos"
                                                multiple
                                                accept="image/*"
                                                onChange={handleComplaintPhotoUpload}
                                                className={styles.fileInput}
                                            />
                                            <label htmlFor="complaint-photos" className={styles.photoUploadButton}>
                                                +
                                            </label>
                                        </div>
                                    </div>
                                </div>
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