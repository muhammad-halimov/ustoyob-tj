import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getAuthToken, getUserRole } from '../../utils/auth';
import styles from '../../pages/profile/clientProfilePage/ClientProfilePage.module.scss';
import {fetchUserById, fetchUserWithRole} from "../../utils/api.ts";

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

// Интерфейсы для жалобы
interface AppealData {
    type: string;
    title: string;
    complaintReason: string;
    supportReason?: string;
    status?: string;
    priority?: string;
    administrant?: string;
    author: string;
    respondent: string;
    description: string;
    ticket?: string;
    ticketAppeal?: boolean;
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

// Добавляем интерфейс для отзыва с сервера
interface ReviewResponse {
    id: number;
    rating?: number;
    description?: string;
    forClient?: boolean;
    services?: { id: number; title: string };
    images?: Array<{ id: number; image: string }>;
    master?: { id: number };
    reviewer?: { id: number };
    createdAt?: string;
}

// Добавляем интерфейс для пользователя в списке
interface UserInList {
    id: number;
    roles?: string[];
    [key: string]: unknown;
}

// Добавляем интерфейс для API ответов
// interface HydraResponse<T> {
//     'hydra:member'?: T[];
// }

const API_BASE_URL = 'https://admin.ustoyob.tj';

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

    const fetchClientData = async (clientId: number) => {
        try {
            setIsLoading(true);
            const token = getAuthToken();

            if (!token) {
                navigate('/');
                return;
            }

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
            if (!token) {
                console.log('No token available for fetching user data');
                return null;
            }

            // ПОДХОД 1: Прямой запрос по ID пользователя
            try {
                const directResponse = await fetch(`${API_BASE_URL}/api/users/${userId}`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                    },
                });

                if (directResponse.ok) {
                    const userData: UserData = await directResponse.json();
                    console.log(`Found user ${userId} directly:`, userData);

                    // Проверяем, что у пользователя правильная роль
                    if (userData.roles) {
                        const hasRole = userType === 'master'
                            ? userData.roles.includes('ROLE_MASTER')
                            : userData.roles.includes('ROLE_CLIENT');

                        if (!hasRole) {
                            console.warn(`User ${userId} does not have required role ${userType}`);
                            return null;
                        }
                    }

                    return userData;
                }
            } catch (directError) {
                console.log('Direct fetch failed, trying alternative approach:', directError);
            }

            // ПОДХОД 2: Получаем всех пользователей и фильтруем на клиенте
            console.log('Trying to fetch all users and filter locally');
            const response = await fetch(`${API_BASE_URL}/api/users`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
            });

            if (!response.ok) {
                console.warn(`Failed to fetch users:`, response.status);
                return null;
            }

            const usersData = await response.json();
            console.log('All users data received');

            // Обрабатываем разные форматы ответа
            let usersArray: UserInList[] = [];

            if (Array.isArray(usersData)) {
                usersArray = usersData;
            } else if (usersData && typeof usersData === 'object') {
                // Проверяем hydra формат
                if ('hydra:member' in usersData && Array.isArray(usersData['hydra:member'])) {
                    usersArray = usersData['hydra:member'] as UserInList[];
                }
                // Проверяем, что это объект с полем id типа number
                else if ('id' in usersData && typeof usersData.id === 'number') {
                    usersArray = [usersData as UserInList];
                }
            }

            // Ищем пользователя по ID в массиве
            const userData = usersArray.find((user: UserInList) => user.id === userId) || null;

            if (userData) {
                console.log(`Found user ${userId} in list:`, userData);

                // Проверяем роль пользователя
                if (userData.roles) {
                    const hasRole = userType === 'master'
                        ? userData.roles.includes('ROLE_MASTER')
                        : userData.roles.includes('ROLE_CLIENT');

                    if (!hasRole) {
                        console.warn(`User ${userId} does not have required role ${userType}`);
                        return null;
                    }
                }

                return userData as UserData;
            } else {
                console.log(`User ${userId} not found in the list`);
                return null;
            }

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
            const serverUrl = `${API_BASE_URL}/images/profile_photos/${userData.image}`;
            console.log('Checking server avatar for client:', serverUrl);

            if (await checkImageExists(serverUrl)) {
                console.log('Using server avatar for client');
                return serverUrl;
            }

            const alternativeUrl = `${API_BASE_URL}/${userData.image}`;
            console.log('Checking alternative avatar URL for client:', alternativeUrl);

            if (await checkImageExists(alternativeUrl)) {
                console.log('Using alternative avatar URL for client');
                return alternativeUrl;
            }

            const clientPaths = [
                `${API_BASE_URL}/uploads/profile_photos/${userData.image}`,
                `${API_BASE_URL}/uploads/clients/${userData.image}`,
                `${API_BASE_URL}/images/clients/${userData.image}`
            ];

            for (const path of clientPaths) {
                console.log('Checking client avatar path:', path);
                if (await checkImageExists(path)) {
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

            if (!token) {
                console.log('No token available for fetching reviews');
                return;
            }

            console.log('Fetching reviews for client ID:', clientId);

            // ЭТОТ ENDPOINT ДОЛЖЕН РАБОТАТЬ, ОСТАВЬТЕ ЕГО
            const endpoint = `/api/reviews/clients/${clientId}`;

            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
            });

            if (response.status === 401) {
                console.log('Unauthorized, redirecting to login');
                navigate('/');
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
            console.log('Raw client reviews data:', reviewsData);

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

            console.log(`Processing ${reviewsArray.length} client reviews`);

            if (reviewsArray.length > 0) {
                const transformedReviews = await Promise.all(
                    reviewsArray.map(async (review): Promise<Review> => {
                        console.log('Processing client review:', review);

                        // Получаем информацию о мастере, который оставил отзыв
                        const masterId = review.master?.id;
                        let masterData: UserData | null = null;

                        if (masterId) {
                            // ИСПОЛЬЗУЙТЕ НОВУЮ ФУНКЦИЮ
                            masterData = await fetchUserById(masterId);
                        }

                        const transformedReview: Review = {
                            id: review.id,
                            rating: review.rating || 0,
                            description: review.description || '',
                            forReviewer: review.forClient || false,
                            services: review.services || { id: 0, title: 'Услуга' },
                            images: review.images || [],
                            master: masterData ? {
                                id: masterData.id,
                                name: masterData.name,
                                surname: masterData.surname,
                                patronymic: masterData.patronymic,
                                profession: masterData.occupation?.map((occ) => occ.title).join(', '),
                                specialization: masterData.occupation?.map((occ) => occ.title).join(', '),
                                image: masterData.image
                            } : {
                                id: 0,
                                name: 'Мастер',
                                surname: '',
                                profession: 'Специалист',
                                specialization: 'Специалист'
                            },
                            reviewer: {
                                id: review.reviewer?.id || 0
                            },
                            createdAt: review.createdAt
                        };

                        return transformedReview;
                    })
                );

                console.log('All transformed client reviews:', transformedReviews);
                setReviews(transformedReviews);

                // Обновляем счетчик отзывов в профиле
                setProfileData(prev => prev ? {
                    ...prev,
                    reviews: transformedReviews.length
                } : null);

            } else {
                console.log('No client reviews data found');
                setReviews([]);
                setProfileData(prev => prev ? {
                    ...prev,
                    reviews: 0
                } : null);
            }

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

    const handleImageError = async (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
        console.log('Image loading error, trying fallback sources');
        const img = e.currentTarget;

        if (!profileData?.id) {
            img.src = "../fonTest6.png";
            return;
        }

        const fallbackSources = [
            profileData.avatar?.includes("uploads/") ? `${API_BASE_URL}/api/${profileData.id}/profile-photo` : null,
            profileData.avatar?.includes("uploads/") ? `/uploads/avatars/${profileData.avatar.split("/").pop()}` : null,
            "../fonTest6.png"
        ].filter(Boolean) as string[];

        for (const source of fallbackSources) {
            if (source && source !== img.src) {
                try {
                    if (await checkImageExists(source)) {
                        img.src = source;
                        console.log('Fallback image loaded:', source);
                        return;
                    }
                } catch {
                    console.log('Fallback image failed:', source);
                    continue;
                }
            }
        }

        img.src = "../fonTest6.png";
    };

    const getReviewerAvatarUrl = (review: Review) => {
        if (review.master?.image) {
            console.log('Master image from data:', review.master.image);

            const possiblePaths = [
                review.master.image,
                `${API_BASE_URL}/images/profile_photos/${review.master.image}`,
                `${API_BASE_URL}/uploads/profile_photos/${review.master.image}`,
                `${API_BASE_URL}/uploads/masters/${review.master.image}`,
                `${API_BASE_URL}/images/masters/${review.master.image}`,
                `${API_BASE_URL}/${review.master.image}`
            ];

            for (const path of possiblePaths) {
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
        console.log('Navigating to master profile:', masterId);

        // Можно использовать fetchUserWithRole для проверки роли
        try {
            const { role } = await fetchUserWithRole(masterId);

            if (role === 'master') {
                navigate(`/master/${masterId}`);
            } else {
                console.warn('User is not a master, role:', role);
                // Все равно перенаправляем на мастер профиль
                navigate(`/master/${masterId}`);
            }
        } catch (error) {
            console.error('Error checking user role:', error);
            // Fallback
            navigate(`/master/${masterId}`);
        }
    };

    const handleLeaveReview = () => {
        const token = getAuthToken();
        if (!token) {
            navigate('/auth');
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

    // Интерфейс для данных отзыва
    interface ReviewData {
        type: string;
        rating: number;
        description: string;
        client: string;
        master: string;
    }

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

            // const userRole = getUserRole();
            const currentUserId = await getCurrentUserId();

            if (!currentUserId || !profileData) {
                alert('Не удалось определить пользователя или клиента');
                return;
            }

            // Мастер оставляет отзыв клиенту -> type: "client"
            const reviewData: ReviewData = {
                type: 'client',
                rating: selectedStars,
                description: reviewText,
                client: `/api/users/${profileData.id}`,
                master: `/api/users/${currentUserId}`
            };

            console.log('Sending review data:', reviewData);

            const response = await fetch(`${API_BASE_URL}/api/reviews`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(reviewData)
            });

            if (response.ok) {
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
                    errorMessage = 'Ошибка валидации данных. Проверьте введенные данные.';
                } else if (response.status === 400) {
                    errorMessage = 'Неверные данные для отправки отзыва.';
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
                formData.append('image', photo);

                console.log(`Uploading photo: ${photo.name}`);

                const response = await fetch(`${API_BASE_URL}/api/reviews/${reviewId}/upload-photo`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    },
                    body: formData
                });

                if (response.ok) {
                    const uploadResult = await response.json();
                    console.log('Photo uploaded successfully:', uploadResult);
                } else {
                    const errorText = await response.text();
                    console.error(`Error uploading photo for review ${reviewId}:`, errorText);
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
            navigate('/auth');
            return;
        }

        setShowComplaintModal(true);
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

            // Создаем заголовок жалобы
            const title = complaintTitle.trim() || `Жалоба на клиента ${profileData.fullName}`;

            // Подготавливаем данные для отправки
            const complaintData: AppealData = {
                type: 'complaint',
                title: title,
                complaintReason: complaintReason,
                description: complaintDescription,
                author: `/api/users/${currentUserId}`,
                respondent: `/api/users/${profileData.id}`,
                status: 'new',
                priority: 'medium',
                ticketAppeal: false
            };

            console.log('Sending complaint data:', complaintData);

            const response = await fetch(`${API_BASE_URL}/api/appeals`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(complaintData)
            });

            if (response.ok) {
                const complaintResponse = await response.json();
                console.log('Complaint created successfully:', complaintResponse);

                // Загружаем фото через отдельный эндпоинт, если есть
                if (complaintPhotos.length > 0) {
                    try {
                        await uploadComplaintPhotos(complaintResponse.id, complaintPhotos, token);
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
                    errorMessage = 'Ошибка валидации данных. Проверьте введенные данные.';
                } else if (response.status === 400) {
                    errorMessage = 'Неверные данные для отправки жалобы.';
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

    const uploadComplaintPhotos = async (appealId: number, photos: File[], token: string) => {
        try {
            console.log(`Uploading ${photos.length} photos for appeal ${appealId}`);

            for (const photo of photos) {
                const formData = new FormData();
                formData.append('image', photo);

                console.log(`Uploading complaint photo: ${photo.name}`);

                const response = await fetch(`${API_BASE_URL}/api/appeals/${appealId}/upload-photo`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    },
                    body: formData
                });

                if (response.ok) {
                    const uploadResult = await response.json();
                    console.log('Complaint photo uploaded successfully:', uploadResult);
                } else {
                    const errorText = await response.text();
                    console.error(`Error uploading photo for appeal ${appealId}:`, errorText);
                }
            }

            console.log('All complaint photos uploaded successfully');
        } catch (error) {
            console.error('Error uploading complaint photos:', error);
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
                                >
                                    <option value="">Выберите причину</option>
                                    <option value="other">Другое</option>
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
        </div>
    );
}

export default ClientProfileViewPage;