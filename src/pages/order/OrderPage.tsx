import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {useState, useEffect, useCallback} from 'react';
import { getAuthToken, getUserRole } from '../../utils/auth';
import styles from './OrderPage.module.scss';
import {createChatWithAuthor, initChatModals} from "../../utils/chatUtils";
import AuthModal from "../../features/auth/AuthModal";
// import { fetchUserWithRole } from "../../utils/api.ts";

interface ApiTicket {
    id: number;
    title: string;
    description: string;
    budget: number;
    unit: { id: number; title: string };
    addresses: {
        id: number;
        title?: string;
        province?: {
            id: number;
            title?: string;
        };
        district?: {
            id: number;
            title?: string;
            image?: string | null;
        };
        city?: {
            id: number;
            title?: string;
            image?: string | null;
        };
        suburb?: {
            id: number;
            title?: string;
        } | null;
        settlement?: {
            id: number;
            title?: string;
        } | null;
        village?: {
            id: number;
            title?: string;
        } | null;
        community?: {
            id: number;
            title?: string;
        } | null;
    }[];
    createdAt: string;
    master: { id: number; name?: string; surname?: string; image?: string } | null;
    author: { id: number; name?: string; surname?: string; image?: string };
    category: { id: number; title: string };
    notice?: string;
    images?: { id: number; image: string }[];
    ticketImages?: { id: number; image: string }[];
    active: boolean;
    service: boolean;
}

interface Order {
    id: number;
    title: string;
    price: number;
    unit: string;
    description: string;
    address: string;
    date: string;
    author: string;
    authorId: number;
    timeAgo: string;
    category: string;
    additionalComments?: string;
    photos?: string[];
    notice?: string;
    rating: number;
    authorImage?: string;
}

interface City {
    id: number;
    title: string;
    description: string;
    image: string | null;
    districts: { id: number }[];
}

interface Review {
    id: number;
    master?: { id: number };
    client?: { id: number };
}

interface Favorite {
    id: number;
    tickets?: { id: number }[];
    masters?: { id: number }[];
    clients?: { id: number }[];
}

interface UserData {
    id: number;
    name?: string;
    surname?: string;
    rating?: number;
    image?: string;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export function OrderPage() {
    const {id} = useParams<{ id: string }>();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [order, setOrder] = useState<Order | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [isLiked, setIsLiked] = useState(false);
    const [isLikeLoading, setIsLikeLoading] = useState(false);
    const [favoriteId, setFavoriteId] = useState<number | null>(null);
    const [rating, setRating] = useState<number>(0);

    const [showReviewModal, setShowReviewModal] = useState(false);
    const [reviewText, setReviewText] = useState('');
    const [selectedStars, setSelectedStars] = useState(0);
    const [reviewPhotos, setReviewPhotos] = useState<File[]>([]);
    const [showAuthModal, setShowAuthModal] = useState(false);

    const ticketType = searchParams.get('type') as 'client' | 'master' | null;
    const specificTicketId = searchParams.get('ticket');
    const [reviewCount, setReviewCount] = useState<number>(0);

    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [showErrorModal, setShowErrorModal] = useState(false);
    const [showInfoModal, setShowInfoModal] = useState(false);
    const [modalMessage, setModalMessage] = useState('');

    useEffect(() => {
        initChatModals({
            showSuccessModal: (message: string) => {
                setModalMessage(message);
                setShowSuccessModal(true);
                // Автоматическое закрытие через 3 секунды
                setTimeout(() => setShowSuccessModal(false), 3000);
            },
            showErrorModal: (message: string) => {
                setModalMessage(message);
                setShowErrorModal(true);
                setTimeout(() => setShowErrorModal(false), 3000);
            },
            showInfoModal: (message: string) => {
                setModalMessage(message);
                setShowInfoModal(true);
                setTimeout(() => setShowInfoModal(false), 3000);
            }
        });

        const role = getUserRole();
        const loadData = async () => {
            await fetchCities();
            if (id) {
                await fetchOrder(parseInt(id), role, ticketType, specificTicketId ? parseInt(specificTicketId) : undefined);
            }
        };

        loadData();
    }, [id, ticketType, specificTicketId]);

    useEffect(() => {
        if (order) {
            checkFavoriteStatus();
        }
    }, [order]);

    useEffect(() => {
        const role = getUserRole();
        const loadData = async () => {
            await fetchCities();
            if (id) {
                await fetchOrder(parseInt(id), role, ticketType, specificTicketId ? parseInt(specificTicketId) : undefined);
            }
        };

        loadData();
    }, [id, ticketType, specificTicketId]);

    const handleCloseSuccessModal = () => {
        setShowSuccessModal(false);
    };

    const handleCloseErrorModal = () => {
        setShowErrorModal(false);
    };

    const handleCloseInfoModal = () => {
        setShowInfoModal(false);
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

            // Загружаем ВСЕ отзывы и фильтруем на клиенте
            const reviewsResponse = await fetch(`${API_BASE_URL}/api/reviews`, {headers});

            if (!reviewsResponse.ok) {
                console.error('Failed to fetch reviews:', reviewsResponse.status);
                return 0;
            }

            const reviewsData = await reviewsResponse.json();

            // Получаем массив отзывов
            let reviewsArray: Review[] = [];
            if (Array.isArray(reviewsData)) {
                reviewsArray = reviewsData;
            } else if (reviewsData && typeof reviewsData === 'object') {
                if (reviewsData['hydra:member'] && Array.isArray(reviewsData['hydra:member'])) {
                    reviewsArray = reviewsData['hydra:member'];
                }
            }

            // Фильтруем отзывы для данного пользователя
            // Пользователь может быть как мастером (master), так и клиентом (client)
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

            const userRole = getUserRole();
            const currentUserId = await getCurrentUserId();

            if (!currentUserId || !order) {
                alert('Не удалось определить пользователя или заказ');
                return;
            }

            if (!order.authorId) {
                alert('Не удалось определить автора заказа');
                return;
            }

            // ПРАВИЛЬНАЯ ЛОГИКА СОГЛАСНО ВАШИМ ПРАВИЛАМ:
            let reviewType = '';
            let masterIri = '';
            let clientIri = '';

            if (userRole === 'master') {
                // Мастер оставляет отзыв клиенту -> type: "client"
                reviewType = 'client';
                masterIri = `/api/users/${currentUserId}`;
                clientIri = `/api/users/${order.authorId}`;
            } else if (userRole === 'client') {
                // Клиент оставляет отзыв мастеру -> type: "master"
                reviewType = 'master';
                clientIri = `/api/users/${currentUserId}`;
                masterIri = `/api/users/${order.authorId}`;
            } else {
                alert('Неизвестная роль пользователя');
                return;
            }

            // Проверяем что не оставляем отзыв самому себе
            if (currentUserId === order.authorId) {
                alert('Нельзя оставлять отзыв самому себе');
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
                type: reviewType,
                rating: selectedStars,
                description: reviewText,
                ticket: `/api/tickets/${order.id}`, // Тикет обязателен в нашем случае
            };

            // Добавляем master или client в зависимости от типа
            if (reviewType === 'master') {
                reviewData.master = masterIri;
            } else if (reviewType === 'client') {
                reviewData.client = clientIri;
            }

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

                // Обновляем количество отзывов для автора заказа
                if (order?.authorId) {
                    const updatedCount = await fetchReviewCount(order.authorId);
                    setReviewCount(updatedCount);
                }

                handleCloseModal();
                alert('Отзыв успешно отправлен!');
            } else {
                const errorText = await response.text();
                console.error('Error creating review. Status:', response.status, 'Response:', errorText);

                let errorMessage = 'Ошибка при отправке отзыва';
                if (response.status === 422) {
                    errorMessage = 'Ошибка валидации данных. Проверьте введенные данные.';
                } else if (response.status === 400) {
                    errorMessage = 'Неверные данные для отправки отзыва.';
                } else if (response.status === 404) {
                    errorMessage = 'Ресурс не найден. Возможно, заказ или пользователь не существуют.';
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

                    if (response.status === 422) {
                        console.error('Validation error for photo upload');
                    }
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
                const userData = await response.json();
                return userData.id;
            }
            return null;
        } catch (error) {
            console.error('Error getting current user ID:', error);
            return null;
        }
    };

    const handleCloseModal = () => {
        setShowReviewModal(false);
        setReviewText('');
        setSelectedStars(0);
        setReviewPhotos([]);
    };

    // Функция для очистки текста от HTML-сущностей и лишних пробелов
    const cleanText = useCallback((text: string): string => {
        if (!text) return '';

        // 1. Заменяем HTML-сущности на обычные символы
        let cleaned = text
            .replace(/&nbsp;/g, ' ')          // неразрывный пробел
            .replace(/&amp;/g, '&')           // амперсанд
            .replace(/&lt;/g, '<')            // меньше
            .replace(/&gt;/g, '>')            // больше
            .replace(/&quot;/g, '"')          // двойная кавычка
            .replace(/&#039;/g, "'")          // одинарная кавычка
            .replace(/&hellip;/g, '...')      // многоточие
            .replace(/&mdash;/g, '—')         // тире
            .replace(/&laquo;/g, '«')         // левая кавычка
            .replace(/&raquo;/g, '»');        // правая кавычка

        // 2. Удаляем все остальные HTML-сущности (общий паттерн)
        cleaned = cleaned.replace(/&[a-z]+;/g, ' ');

        // 3. Удаляем HTML-теги (если есть)
        cleaned = cleaned.replace(/<[^>]*>/g, '');

        // 4. Убираем лишние пробелы и переносы строк
        cleaned = cleaned
            .replace(/\s+/g, ' ')             // множественные пробелы -> один пробел
            .replace(/\n\s*\n/g, '\n')        // множественные пустые строки -> одна
            .trim();                          // убираем пробелы в начале и конце

        return cleaned;
    }, []);

    const checkFavoriteStatus = async () => {
        const token = getAuthToken();
        if (!token || !order) return;

        try {
            const response = await fetch(`${API_BASE_URL}/api/favorites/me`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const favorite: Favorite = await response.json();
                console.log('Favorite data:', favorite);

                const isTicketInFavorites = favorite.tickets?.some((t: { id: number }) => t.id === order.id);
                setIsLiked(!!isTicketInFavorites);

                if (isTicketInFavorites) {
                    setFavoriteId(favorite.id);
                } else {
                    setFavoriteId(null);
                }
            } else if (response.status === 404) {
                setIsLiked(false);
                setFavoriteId(null);
            }
        } catch (error) {
            console.error('Error checking favorite status:', error);
        }
    };

    const loadLocalStorageFavorites = (): { masters: number[], tickets: number[] } => {
        try {
            const stored = localStorage.getItem('favorites');
            if (stored) {
                return JSON.parse(stored);
            }
        } catch (error) {
            console.error('Error loading favorites from localStorage:', error);
        }
        return {masters: [], tickets: []};
    };

    const saveLocalStorageFavorites = (favorites: { masters: number[], tickets: number[] }) => {
        try {
            localStorage.setItem('favorites', JSON.stringify(favorites));
        } catch (error) {
            console.error('Error saving favorites to localStorage:', error);
        }
    };

    const handleLikeClick = async () => {
        const token = getAuthToken();
        const ticketId = order?.id;

        if (!ticketId) {
            console.error('No ticket ID to add to favorites');
            return;
        }

        // Для неавторизованных пользователей работаем с localStorage
        if (!token) {
            const localFavorites = loadLocalStorageFavorites();
            const isCurrentlyLiked = localFavorites.tickets.includes(ticketId);

            if (isCurrentlyLiked) {
                // Снимаем лайк
                const updatedLocalFavorites = loadLocalStorageFavorites();
                const updatedTickets = updatedLocalFavorites.tickets.filter(id => id !== order?.id);
                saveLocalStorageFavorites({
                    ...updatedLocalFavorites,
                    tickets: updatedTickets
                });
                setIsLiked(false);
                window.dispatchEvent(new Event('favoritesUpdated'));
            } else {
                // Ставим лайк
                const updatedTickets = [...localFavorites.tickets, ticketId];
                saveLocalStorageFavorites({
                    ...localFavorites,
                    tickets: updatedTickets
                });
                setIsLiked(true);
            }
            window.dispatchEvent(new Event('favoritesUpdated'));
            return;
        }

        if (isLiked && favoriteId) {
            await handleUnlike();
            return;
        }

        setIsLikeLoading(true);
        try {
            if (!ticketId) {
                console.error('No ticket ID to add to favorites');
                return;
            }

            const currentFavoritesResponse = await fetch(`${API_BASE_URL}/api/favorites/me`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            let existingFavoriteId: number | null = null;
            let existingMasters: string[] = [];
            let existingClients: string[] = [];
            let existingTickets: string[] = [];

            if (currentFavoritesResponse.ok) {
                const currentFavorite: Favorite = await currentFavoritesResponse.json();
                existingFavoriteId = currentFavorite.id;

                existingMasters = currentFavorite.masters?.map((master: {
                    id: number
                }) => `/api/users/${master.id}`) || [];
                existingClients = currentFavorite.clients?.map((client: {
                    id: number
                }) => `/api/users/${client.id}`) || [];
                existingTickets = currentFavorite.tickets?.map((ticket: {
                    id: number
                }) => `/api/tickets/${ticket.id}`) || [];

                console.log('Existing favorites:', {
                    masters: existingMasters,
                    clients: existingClients,
                    tickets: existingTickets
                });
            }

            const favoriteIdToUse = existingFavoriteId;
            const ticketIri = `/api/tickets/${ticketId}`;

            if (existingTickets.includes(ticketIri)) {
                console.log('Ticket already in favorites');
                setIsLiked(true);
                return;
            }

            if (favoriteIdToUse) {
                interface FavoriteUpdateData {
                    masters: string[];
                    clients: string[];
                    tickets: string[];
                }

                const updateData: FavoriteUpdateData = {
                    masters: existingMasters,
                    clients: existingClients,
                    tickets: [...existingTickets, ticketIri]
                };

                console.log('Updating favorite with data:', updateData);

                const patchResponse = await fetch(`${API_BASE_URL}/api/favorites/${favoriteIdToUse}`, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/merge-patch+json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(updateData)
                });

                if (patchResponse.ok) {
                    setIsLiked(true);
                    setFavoriteId(favoriteIdToUse);
                    console.log('Successfully added ticket to favorites');
                    window.dispatchEvent(new Event('favoritesUpdated'));
                } else {
                    const errorText = await patchResponse.text();
                    console.error('Failed to update favorite:', errorText);
                    alert('Ошибка при добавлении в избранное');
                }
            } else {
                interface FavoriteCreateData {
                    masters: string[];
                    clients: string[];
                    tickets: string[];
                }

                const createData: FavoriteCreateData = {
                    masters: [],
                    clients: [],
                    tickets: [ticketIri]
                };

                console.log('Creating new favorite with data:', createData);

                const createResponse = await fetch(`${API_BASE_URL}/api/favorites`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(createData)
                });

                if (createResponse.ok) {
                    const newFavorite: Favorite = await createResponse.json();
                    setIsLiked(true);
                    setFavoriteId(newFavorite.id);
                    console.log('Successfully created favorite with ticket');
                } else {
                    const errorText = await createResponse.text();
                    console.error('Failed to create favorite:', errorText);
                    alert('Ошибка при создании избранного');
                }
            }

        } catch (error) {
            console.error('Error adding to favorites:', error);
            alert('Ошибка при добавлении в избранное');
        } finally {
            setIsLikeLoading(false);
        }
    };

    const handleUnlike = async () => {
        if (!favoriteId) return;

        setIsLikeLoading(true);
        try {
            const token = getAuthToken();
            const ticketIdToRemove = order?.id;

            if (!ticketIdToRemove) return;

            const currentFavoritesResponse = await fetch(`${API_BASE_URL}/api/favorites/me`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!currentFavoritesResponse.ok) return;

            const currentFavorite: Favorite = await currentFavoritesResponse.json();

            const newMasters = currentFavorite.masters?.map((m: { id: number }) => `/api/users/${m.id}`) || [];
            const newClients = currentFavorite.clients?.map((c: { id: number }) => `/api/users/${c.id}`) || [];
            const newTickets = currentFavorite.tickets?.map((t: { id: number }) => `/api/tickets/${t.id}`) || [];

            const removeIri = `/api/tickets/${ticketIdToRemove}`;
            const updatedTickets = newTickets.filter((ticketIri: string) => ticketIri !== removeIri);

            interface UnlikeUpdateData {
                masters: string[];
                clients: string[];
                tickets: string[];
            }

            const updateData: UnlikeUpdateData = {
                masters: newMasters,
                clients: newClients,
                tickets: updatedTickets
            };

            console.log("PATCH UNLIKE:", updateData);

            const patchResponse = await fetch(`${API_BASE_URL}/api/favorites/${currentFavorite.id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/merge-patch+json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(updateData)
            });

            if (patchResponse.ok) {
                setIsLiked(false);
                setFavoriteId(null);
                console.log('Successfully removed from favorites');
                window.dispatchEvent(new Event('favoritesUpdated'));
            } else {
                console.error("PATCH error:", await patchResponse.text());
                alert('Ошибка при удалении из избранного');
            }

        } catch (error) {
            console.error('Error removing from favorites:', error);
            alert('Ошибка при удалении из избранного');
        } finally {
            setIsLikeLoading(false);
        }
    };

    const fetchCities = async (): Promise<City[]> => {
        try {
            const token = getAuthToken();
            if (!token) return [];

            const response = await fetch(`${API_BASE_URL}/api/cities`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) return [];

            const citiesData: City[] = await response.json();
            return citiesData;
        } catch (error) {
            console.error('Error fetching cities:', error);
            return [];
        }
    };

    const getFullAddress = (ticketData: ApiTicket): string => {
        console.log('getFullAddress input:', ticketData);

        if (!ticketData.addresses || ticketData.addresses.length === 0) {
            return 'Адрес не указан';
        }

        const address = ticketData.addresses[0];
        const parts: string[] = [];

        // Провинция (область)
        if (address.province?.title) {
            parts.push(address.province.title);
        }

        // Город
        if (address.city?.title) {
            parts.push(address.city.title);
        }

        // Район
        if (address.district?.title) {
            parts.push(address.district.title);
        }

        // Пригород (если есть)
        if (address.suburb?.title) {
            parts.push(address.suburb.title);
        }

        // Поселение (если есть)
        if (address.settlement?.title) {
            parts.push(address.settlement.title);
        }

        // Деревня (если есть)
        if (address.village?.title) {
            parts.push(address.village.title);
        }

        // Сообщество (если есть)
        if (address.community?.title) {
            parts.push(address.community.title);
        }

        // Конкретный адрес
        if (address.title) {
            parts.push(address.title);
        }

        const result = parts.length > 0 ? parts.join(', ') : 'Адрес не указан';
        console.log('Formatted address:', result);
        return result;
    };

    const formatProfileImageUrl = (imagePath: string): string => {
        if (!imagePath) return '';

        if (imagePath.startsWith('/images/profile_photos/')) {
            return `${API_BASE_URL}${imagePath}`;
        } else if (imagePath.startsWith('http')) {
            return imagePath;
        } else {
            return `${API_BASE_URL}/images/profile_photos/${imagePath}`;
        }
    };

    const formatTicketImageUrl = (imagePath: string): string => {
        if (!imagePath) return '';

        console.log('Formatting ticket image path:', imagePath);

        if (imagePath.startsWith('/images/ticket_photos/')) {
            return `${API_BASE_URL}${imagePath}`;
        } else if (imagePath.startsWith('http')) {
            return imagePath;
        } else {
            return `${API_BASE_URL}/images/ticket_photos/${imagePath}`;
        }
    };

    const fetchOrder = async (userId: number, role: string | null, ticketTypeParam: 'client' | 'master' | null, specificTicketId?: number) => {
        try {
            setIsLoading(true);
            setError(null);

            console.log('Fetching order with params:', {
                userId,
                role,
                ticketType: ticketTypeParam,
                specificTicketId
            });

            let endpoint = '';
            const targetUserId = userId; // Изменено с let на const

            // Определяем endpoint и ID пользователя для запроса
            if (ticketTypeParam === 'client') {
                endpoint = `/api/tickets/clients/${targetUserId}`;
            } else if (ticketTypeParam === 'master') {
                endpoint = `/api/tickets/masters/${targetUserId}`;
            } else {
                endpoint = `/api/tickets`;
            }

            console.log('Fetching from endpoint:', endpoint);

            const headers: HeadersInit = {
                'Content-Type': 'application/json',
            };

            const token = getAuthToken();
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                method: 'GET',
                headers: headers,
            });

            if (!response.ok) {
                if (response.status === 404) setError('Тикеты не найдены');
                else throw new Error(`HTTP error! status: ${response.status}`);
                return;
            }

            const ticketsData = await response.json();
            console.log('Received tickets data:', ticketsData);

            let ticketData: ApiTicket | null = null;

            if (Array.isArray(ticketsData)) {
                if (ticketsData.length === 0) {
                    setError('У пользователя нет активных тикетов');
                    return;
                }

                if (specificTicketId) {
                    ticketData = ticketsData.find((ticket: ApiTicket) => ticket.id === specificTicketId) || null;
                    if (!ticketData) {
                        setError('Тикет не найден');
                        return;
                    }
                } else {
                    ticketData = ticketsData[0];
                }
            } else {
                ticketData = ticketsData as ApiTicket;
            }

            if (!ticketData) {
                setError('Тикет не найден');
                return;
            }

            // Определяем, чью информацию показывать
            let displayUserId = 0;
            let displayUserName = '';
            let displayUserImage = '';
            let userTypeForRating: 'client' | 'master' | null = ticketTypeParam;

            if (ticketTypeParam === 'client') {
                // Если смотрим тикеты клиента, показываем информацию о клиенте (авторе)
                displayUserId = ticketData.author?.id || 0;
                displayUserName = ticketData.author ? `${ticketData.author.name || ''} ${ticketData.author.surname || ''}`.trim() : 'Клиент';
                displayUserImage = ticketData.author?.image ? formatProfileImageUrl(ticketData.author.image) : '';
                userTypeForRating = 'client';
            } else if (ticketTypeParam === 'master') {
                // Если смотрим тикеты мастера, показываем информацию о мастере
                displayUserId = ticketData.master?.id || 0;
                displayUserName = ticketData.master ? `${ticketData.master.name || ''} ${ticketData.master.surname || ''}`.trim() : 'Мастер';
                displayUserImage = ticketData.master?.image ? formatProfileImageUrl(ticketData.master.image) : '';
                userTypeForRating = 'master';
            } else {
                // Если тип не указан, по умолчанию показываем автора
                displayUserId = ticketData.author?.id || 0;
                displayUserName = ticketData.author ? `${ticketData.author.name || ''} ${ticketData.author.surname || ''}`.trim() : 'Пользователь';
                displayUserImage = ticketData.author?.image ? formatProfileImageUrl(ticketData.author.image) : '';
                userTypeForRating = null;
            }

            // Если не удалось определить ID из тикета, используем userId из URL
            if (displayUserId === 0 && userId) {
                displayUserId = userId;
                console.log('Using userId from URL as displayUserId:', displayUserId);

                // Получаем дополнительную информацию о пользователе
                const userInfo = await fetchUserInfo(displayUserId, userTypeForRating);
                if (!displayUserName || displayUserName === 'Клиент' || displayUserName === 'Мастер' || displayUserName === 'Пользователь') {
                    displayUserName = userInfo.name;
                }
                if (!displayUserImage) {
                    displayUserImage = userInfo.image;
                }
            }

            console.log('Final user info:', {
                displayUserId,
                displayUserName,
                userTypeForRating,
                displayUserImage
            });

            const reviewCountForUser = await fetchReviewCount(displayUserId);
            setReviewCount(reviewCountForUser);

            // Получаем рейтинг пользователя
            const userRatingInfo = await fetchUserInfo(displayUserId, userTypeForRating);
            const userRating = userRatingInfo.rating;
            setRating(userRating);

            const fullAddress = getFullAddress(ticketData);

            const photos: string[] = [];
            if (ticketData.images?.length) {
                photos.push(...ticketData.images.map(img => {
                    const imageUrl = img.image.startsWith('http') ? img.image : formatTicketImageUrl(img.image);
                    return imageUrl;
                }));
            }

            if (ticketData.ticketImages?.length) {
                photos.push(...ticketData.ticketImages.map(img => {
                    const imageUrl = img.image.startsWith('http') ? img.image : formatTicketImageUrl(img.image);
                    return imageUrl;
                }));
            }

            const orderData: Order = {
                id: ticketData.id,
                title: ticketData.title ? cleanText(ticketData.title) : 'Без названия',
                price: ticketData.budget || 0,
                unit: ticketData.unit?.title || 'tjs',
                description: ticketData.description ? cleanText(ticketData.description) : 'Описание отсутствует',
                address: fullAddress,
                date: formatDate(ticketData.createdAt),
                author: displayUserName,
                authorId: displayUserId,
                timeAgo: getTimeAgo(ticketData.createdAt),
                category: ticketData.category?.title ? cleanText(ticketData.category.title) : 'другое',
                additionalComments: ticketData.notice ? cleanText(ticketData.notice) : undefined,
                photos: photos.length > 0 ? photos : undefined,
                notice: ticketData.notice ? cleanText(ticketData.notice) : undefined,
                rating: userRating,
                authorImage: displayUserImage || undefined,
            };

            console.log('Final order data:', orderData);
            setOrder(orderData);

        } catch (error) {
            console.error('Error fetching order:', error);
            setError('Не удалось загрузить данные заказа');
        } finally {
            setIsLoading(false);
        }
    };

    const fetchUserInfo = async (userId: number, userType: 'client' | 'master' | null): Promise<{
        name: string;
        rating: number;
        image: string
    }> => {
        try {
            if (!userId || userId === 0) {
                return {name: 'Пользователь', rating: 0, image: ''};
            }

            const headers: HeadersInit = {
                'Content-Type': 'application/json',
            };

            const token = getAuthToken();
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            try {
                console.log(`Trying direct fetch for user ID: ${userId}`);
                const directResponse = await fetch(`${API_BASE_URL}/api/users/${userId}`, {
                    headers: headers,
                });

                if (directResponse.ok) {
                    const userData: UserData = await directResponse.json();
                    console.log('Direct fetch successful:', userData);
                    return formatUserInfo(userData);
                }
            } catch (directError) {
                console.log('Direct fetch failed, trying filtered fetch...', directError);
            }

            let url = `${API_BASE_URL}/api/users`;

            if (userType === 'master') {
                url += `?roles[]=ROLE_MASTER`;
            } else if (userType === 'client') {
                url += `?roles[]=ROLE_CLIENT`;
            }

            console.log(`Fetching user info from filtered URL: ${url}`);

            const response = await fetch(url, {headers});

            if (!response.ok) {
                console.log(`Failed to fetch users list: ${response.status}`);
                return {name: 'Пользователь', rating: 0, image: ''};
            }

            const usersData = await response.json();

            // Проверяем разные форматы ответа
            let usersArray: UserData[] = [];
            if (Array.isArray(usersData)) {
                usersArray = usersData;
            } else if (usersData && typeof usersData === 'object') {
                if (usersData['hydra:member'] && Array.isArray(usersData['hydra:member'])) {
                    usersArray = usersData['hydra:member'];
                } else if (usersData.id) {
                    usersArray = [usersData as UserData];
                }
            }

            // Ищем пользователя по ID в массиве
            const userData = usersArray.find(user => user.id === userId);

            if (userData) {
                return formatUserInfo(userData);
            }

            // Если пользователь не найден, возвращаем fallback
            console.log(`User ${userId} not found in list`);
            return {name: 'Пользователь', rating: 0, image: ''};

        } catch (error) {
            console.error('Error fetching user info:', error);
            return {name: 'Пользователь', rating: 0, image: ''};
        }
    };

    const formatUserInfo = (userData: UserData): { name: string; rating: number; image: string } => {
        if (!userData) {
            return {name: 'Пользователь', rating: 0, image: ''};
        }

        const name = `${userData.name || ''} ${userData.surname || ''}`.trim() || 'Пользователь';
        const rating = userData.rating || 0;

        let image = '';
        if (userData.image) {
            if (userData.image.startsWith('/images/profile_photos/')) {
                image = `${API_BASE_URL}${userData.image}`;
            } else if (userData.image.startsWith('http')) {
                image = userData.image;
            } else {
                image = `${API_BASE_URL}/images/profile_photos/${userData.image}`;
            }
        }

        console.log('User info found:', {name, rating, image});
        return {name, rating, image};
    };

    const formatDate = (dateString: string) => {
        try {
            if (!dateString) return 'Дата не указана';
            return new Date(dateString).toLocaleDateString('ru-RU', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            });
        } catch {
            return 'Дата не указана';
        }
    };

    const getTimeAgo = (dateString: string) => {
        try {
            if (!dateString) return 'недавно';
            const date = new Date(dateString);
            const now = new Date();
            const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
            if (diffInSeconds < 60) return 'только что';
            if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} ${getRussianWord(Math.floor(diffInSeconds / 60), ['минуту', 'минуты', 'минут'])} назад`;
            if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} ${getRussianWord(Math.floor(diffInSeconds / 3600), ['час', 'часа', 'часов'])} назад`;
            return `${Math.floor(diffInSeconds / 86400)} ${getRussianWord(Math.floor(diffInSeconds / 86400), ['день', 'дня', 'дней'])} назад`;
        } catch {
            return 'недавно';
        }
    };

    const getRussianWord = (number: number, words: [string, string, string]) => {
        const cases = [2, 0, 1, 1, 1, 2];
        return words[number % 100 > 4 && number % 100 < 20 ? 2 : cases[number % 10 < 5 ? number % 10 : 5]];
    };

    const handleLeaveReview = () => {
        setShowReviewModal(true);
    };

    const handleRespondClick = async (authorId: number) => {
        const token = getAuthToken();

        // Если пользователь не авторизован, показываем модалку авторизации
        if (!token) {
            setShowAuthModal(true);
            return;
        }

        try {
            const chat = await createChatWithAuthor(authorId, order?.id);

            if (chat && chat.id) {
                console.log('Navigating to chat:', chat.id);
                navigate(`/chats?chatId=${chat.id}`);
            } else {
                console.error('Failed to create chat');
                navigate(`/chats`);
            }
        } catch (error) {
            console.error('Error creating chat:', error);
            navigate(`/chats`);
        }
    };

    const handleLoginSuccess = (token: string, email?: string) => {
        console.log('Login successful, token:', token);
        if (email) {
            console.log('User email:', email);
        }
        setShowAuthModal(false);

        if (order?.authorId) {
            const createChat = async () => {
                try {
                    const chat = await createChatWithAuthor(order.authorId, order.id);
                    if (chat && chat.id) {
                        console.log('Navigating to chat after login:', chat.id);
                        navigate(`/chats?chatId=${chat.id}`);
                    } else {
                        console.error('Failed to create chat after login');
                        navigate(`/chats`);
                    }
                } catch (error) {
                    console.error('Error creating chat after login:', error);
                    navigate(`/chats`);
                }
            };
            createChat();
        } else {
            // Если нет order, просто идем в чаты
            navigate(`/chats`); // Уже правильный путь
        }
    };

    const handleProfileClick = async (userId: number) => {
        console.log('Profile click for user:', userId);

        try {
            const userInfo = await getUserInfoWithoutAuth(userId);

            if (userInfo && userInfo.roles) {
                if (userInfo.roles.includes('ROLE_MASTER')) {
                    console.log('Navigating to master profile');
                    navigate(`/master/${userId}`); // Используйте navigate вместо window.location.href
                } else if (userInfo.roles.includes('ROLE_CLIENT')) {
                    console.log('Navigating to client profile');
                    navigate(`/client/${userId}`); // Используйте navigate вместо window.location.href
                } else {
                    console.log('Unknown role, defaulting to master');
                    navigate(`/master/${userId}`); // Используйте navigate вместо window.location.href
                }
            } else {
                console.log('Could not determine role, defaulting to master');
                navigate(`/master/${userId}`); // Используйте navigate вместо window.location.href
            }
        } catch (error) {
            console.error('Error determining role:', error);
            navigate(`/master/${userId}`); // Используйте navigate вместо window.location.href
        }
    };

    const getUserInfoWithoutAuth = async (userId: number): Promise<any> => {
        try {
            console.log(`Fetching user info for ID: ${userId} without auth`);

            const response = await fetch(`${API_BASE_URL}/api/users/${userId}`, {
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                return await response.json();
            } else {
                console.log(`User info fetch failed: ${response.status}`);
                throw new Error(`Failed to fetch user info: ${response.status}`);
            }
        } catch (error) {
            console.error('Error fetching user info:', error);
            throw error;
        }
    };

    // Добавим функцию для получения информации о пользователе
    // const getUserInfo = async (userId: number): Promise<any> => {
    //     try {
    //         const headers: HeadersInit = {
    //             'Content-Type': 'application/json',
    //             'Accept': 'application/json',
    //         };
    //
    //         // Пробуем с токеном если есть
    //         const token = getAuthToken();
    //         if (token) {
    //             headers['Authorization'] = `Bearer ${token}`;
    //         }
    //
    //         console.log(`Fetching user info for ID: ${userId}`);
    //         const response = await fetch(`${API_BASE_URL}/api/users/${userId}`, {
    //             headers: headers,
    //         });
    //
    //         if (!response.ok) {
    //             throw new Error(`Failed to fetch user info: ${response.status}`);
    //         }
    //
    //         const userData = await response.json();
    //         console.log('User data fetched successfully:', {
    //             id: userData.id,
    //             name: userData.name,
    //             surname: userData.surname,
    //             roles: userData.roles
    //         });
    //
    //         return userData;
    //     } catch (error) {
    //         console.error('Error in getUserInfo:', error);
    //         throw error;
    //     }
    // };

// Добавим вспомогательную функцию для получения данных тикета
//     const getTicketData = async (ticketId: number): Promise<ApiTicket | null> => {
//         try {
//             const headers: HeadersInit = {
//                 'Content-Type': 'application/json',
//             };
//
//             const token = getAuthToken();
//             if (token) {
//                 headers['Authorization'] = `Bearer ${token}`;
//             }
//
//             const response = await fetch(`${API_BASE_URL}/api/tickets/${ticketId}`, {
//                 headers: headers,
//             });
//
//             if (response.ok) {
//                 return await response.json();
//             }
//             return null;
//         } catch (error) {
//             console.error('Error fetching ticket data:', error);
//             return null;
//         }
//     };

    if (isLoading) return <div className={styles.loading}>Загрузка...</div>;
    if (error) return (
        <div className={styles.error}>
            <p>{error}</p>
            <button onClick={() => navigate(-1)}>Назад</button>
        </div>
    );
    if (!order) return (
        <div className={styles.error}>
            <p>Заказ не найден</p>
            <button onClick={() => navigate(-1)}>Назад</button>
        </div>
    );

    return (
        <div className={styles.container}>
            <div className={styles.orderCard}>
                <div className={styles.orderHeader}>
                    <h1 className={styles.orderTitle}>{order.title}</h1>
                </div>
                <span className={styles.category}>{order.category}</span>
                <div className={styles.priceSection}>
                    <span className={styles.price}>{order.price} TJS, {order.unit}</span>
                </div>

                <section className={styles.section}>
                    <h2 className={styles.section_about}>Описание</h2>
                    <p className={styles.description}>{order.description ? cleanText(order.description) : 'Описание отсутствует'}</p>
                </section>

                <section className={styles.section}>
                    <div className={styles.address}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"
                                  stroke="#3A54DA" strokeWidth="2"/>
                            <circle cx="12" cy="9" r="2.5" stroke="#3A54DA" strokeWidth="2"/>
                        </svg>
                        {order.address}
                    </div>
                    <div className={styles.published}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                            <path d="M3 8h18M21 6v14H3V6h18zM16 2v4M8 2v4" stroke="#3A54DA" strokeWidth="2"/>
                        </svg>
                        Опубликовано {order.date} ({order.timeAgo})
                    </div>
                </section>

                <section className={styles.section}>
                    <h2 className={styles.section_more}>Дополнительные комментарии</h2>
                    <div className={styles.commentsContent}>
                        <p>{order.additionalComments
                            ? cleanText(order.additionalComments)
                            : 'Комментарии от заказчика (при наличии)'}</p>
                    </div>
                </section>

                <section className={styles.section}>
                    <h2 className={styles.section_more}>Приложенные фото</h2>
                    <div className={styles.photosContent}>
                        {order.photos && order.photos.length > 0 ? (
                            <div className={styles.photos}>
                                {order.photos.map((photo, index) => (
                                    <img
                                        key={index}
                                        src={photo}
                                        alt={`Фото ${index + 1}`}
                                        className={styles.photo}
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).src = '../fonTest1.png';
                                        }}
                                    />
                                ))}
                            </div>
                        ) : (
                            <p>к данному заказу (при наличии)</p>
                        )}
                    </div>
                </section>

                <section className={styles.section}>
                    <div className={styles.section_photo}>
                        <img
                            src={order.authorImage || '../fonTest1.png'}
                            alt="authorImage"
                            onClick={() => handleProfileClick(order.authorId)}
                            style={{cursor: 'pointer'}}
                            onError={(e) => {
                                (e.target as HTMLImageElement).src = '../fonTest1.png';
                            }}
                        />
                        <div className={styles.authorSection}>
                            <div className={styles.authorInfo}>
                                <h3
                                    onClick={() => handleProfileClick(order.authorId)}
                                    style={{cursor: 'pointer'}}
                                >
                                    {order.author}
                                </h3>
                            </div>
                            <p>{order.title}</p>
                        </div>
                    </div>
                </section>

                <section className={styles.rate}>
                    <div className={styles.rate_wrap}>
                        <div className={styles.rate_item}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
                                 xmlns="http://www.w3.org/2000/svg">
                                <g clipPath="url(#clip0_324_2272)">
                                    <g clipPath="url(#clip1_324_2272)">
                                        <path
                                            d="M12 2.49023L15.51 8.17023L22 9.76023L17.68 14.8502L18.18 21.5102L12 18.9802L5.82 21.5102L6.32 14.8502L2 9.76023L8.49 8.17023L12 2.49023Z"
                                            stroke="#3A54DA" strokeWidth="2" strokeMiterlimit="10"/>
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
                            <p>{rating}</p>
                        </div>
                        <div className={styles.rate_item}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
                                 xmlns="http://www.w3.org/2000/svg">
                                <g clipPath="url(#clip0_214_6840)">
                                    <path
                                        d="M12 1.48047C6.2 1.48047 1.5 5.75047 1.5 11.0005C1.52866 13.0157 2.23294 14.9631 3.5 16.5305L2.5 21.5305L9.16 20.2005C10.1031 20.4504 11.0744 20.5781 12.05 20.5805C17.85 20.5805 22.55 16.3005 22.55 11.0305C22.55 5.76047 17.8 1.48047 12 1.48047Z"
                                        stroke="#3A54DA" strokeWidth="2" strokeMiterlimit="10"/>
                                </g>
                                <defs>
                                    <clipPath id="clip0_214_6840">
                                        <rect width="24" height="24" fill="white"/>
                                    </clipPath>
                                </defs>
                            </svg>
                            <p>{reviewCount}</p>
                        </div>
                        <div className={styles.rate_item}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
                                 xmlns="http://www.w3.org/2000/svg">
                                <g clipPath="url(#clip0_214_6844)">
                                    <g clipPath="url(#clip1_214_6844)">
                                        <path
                                            d="M12 22.5C17.799 22.5 22.5 17.799 22.5 12C22.5 6.20101 17.799 1.5 12 1.5C6.20101 1.5 1.5 6.20101 1.5 12C1.5 17.799 6.20101 22.5 12 22.5Z"
                                            stroke="#3A54DA" strokeWidth="2" strokeMiterlimit="10"/>
                                        <path d="M6.27002 11.9997L10.09 15.8197L17.73 8.17969" stroke="#3A54DA"
                                              strokeWidth="2" strokeMiterlimit="10"/>
                                    </g>
                                </g>
                                <defs>
                                    <clipPath id="clip0_214_6844">
                                        <rect width="24" height="24" fill="white"/>
                                    </clipPath>
                                    <clipPath id="clip1_214_6844">
                                        <rect width="24" height="24" fill="white"/>
                                    </clipPath>
                                </defs>
                            </svg>
                            <p>Диплом об образовании</p>
                        </div>
                    </div>

                    <div className={styles.actionButtons}>
                        <div className={styles.topRow}>
                            <div
                                className={`${styles.favoriteButton} ${isLikeLoading ? styles.loading : ''}`}
                                onClick={handleLikeClick}
                                title={isLiked ? "Удалить из избранного" : "Добавить в избранное"}
                            >
                                <svg width="64" height="44" viewBox="0 0 64 44" fill="none"
                                     xmlns="http://www.w3.org/2000/svg">
                                    <rect
                                        x="1"
                                        y="1"
                                        width="62"
                                        height="42"
                                        rx="9"
                                        stroke="#3A54DA"
                                        strokeWidth="2"
                                        fill={isLiked ? "#3A54DA" : "none"}
                                    />
                                    <g clipPath="url(#clip0_214_6848)">
                                        <path
                                            d="M36.77 12.4502C35.7961 12.4711 34.8444 12.7448 34.0081 13.2444C33.1719 13.7441 32.4799 14.4525 32 15.3002C31.5201 14.4525 30.8281 13.7441 29.9919 13.2444C29.1556 12.7448 28.2039 12.4711 27.23 12.4502C24.06 12.4502 21.5 15.3002 21.5 18.8202C21.5 25.1802 32 31.5502 32 31.5502C32 31.5502 42.5 25.1802 42.5 18.8202C42.5 15.3002 39.94 12.4502 36.77 12.4502Z"
                                            stroke={isLiked ? "white" : "#3A54DA"}
                                            strokeWidth="2"
                                            strokeMiterlimit="10"
                                            fill={isLiked ? "white" : "none"}
                                        />
                                    </g>
                                    <defs>
                                        <clipPath id="clip0_214_6848">
                                            <rect width="24" height="24" fill="white" transform="translate(20 10)"/>
                                        </clipPath>
                                    </defs>
                                </svg>
                            </div>

                            <button className={styles.respondButton}
                                    onClick={() => order?.authorId && handleRespondClick(order.authorId)}>
                                Откликнуться
                            </button>
                        </div>

                        <button
                            className={styles.reviewButton}
                            onClick={() => {
                                const token = getAuthToken();
                                if (!token) {

                                    setShowAuthModal(true);
                                } else {
                                    handleLeaveReview();
                                }
                            }}
                        >
                            Оставить отзыв
                        </button>
                    </div>
                </section>
            </div>

            {/* Модальное окно отзыва */}
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
                            >
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
                                     xmlns="http://www.w3.org/2000/svg">
                                    <g clipPath="url(#clip0_551_2371)">
                                        <g clipPath="url(#clip1_551_2371)">
                                            <path
                                                d="M12 22.5C17.799 22.5 22.5 17.799 22.5 12C22.5 6.20101 17.799 1.5 12 1.5C6.20101 1.5 1.5 6.20101 1.5 12C1.5 17.799 6.20101 22.5 12 22.5Z"
                                                stroke="#101010" strokeWidth="2" strokeMiterlimit="10"/>
                                            <path d="M16.7705 7.22998L7.23047 16.77" stroke="#101010" strokeWidth="2"
                                                  strokeMiterlimit="10"/>
                                            <path d="M7.23047 7.22998L16.7705 16.77" stroke="#101010" strokeWidth="2"
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
                                Закрыть
                            </button>
                            <button
                                className={styles.submitButton}
                                onClick={handleSubmitReview}
                            >
                                Отправить
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
            )}
            {showAuthModal && (
                <AuthModal
                    isOpen={showAuthModal}
                    onClose={() => setShowAuthModal(false)}
                    onLoginSuccess={handleLoginSuccess}
                />
            )}
            {showSuccessModal && (
                <div className={styles.modalOverlay} onClick={handleCloseSuccessModal}>
                    <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                        <h2 className={styles.successTitle}>Успешно!</h2>
                        <div className={styles.successIcon}>
                            <img src="./uspeh.png" alt="Успех"/>
                        </div>
                        <p className={styles.successMessage}>{modalMessage}</p>
                        <button
                            className={styles.successButton}
                            onClick={handleCloseSuccessModal}
                        >
                            Понятно
                        </button>
                    </div>
                </div>
            )}

            {/* Модалка ошибки */}
            {showErrorModal && (
                <div className={styles.modalOverlay} onClick={handleCloseErrorModal}>
                    <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                        <h2 className={styles.errorTitle}>Ошибка</h2>
                        <div className={styles.errorIcon}>
                            <img src="./error.png" alt="Ошибка"/>
                        </div>
                        <p className={styles.errorMessage}>{modalMessage}</p>
                        <button
                            className={styles.errorButton}
                            onClick={handleCloseErrorModal}
                        >
                            Понятно
                        </button>
                    </div>
                </div>
            )}

            {/* Модалка информации */}
            {showInfoModal && (
                <div className={styles.modalOverlay} onClick={handleCloseInfoModal}>
                    <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                        <h2 className={styles.infoTitle}>Информация</h2>
                        <p className={styles.infoMessage}>{modalMessage}</p>
                        <button
                            className={styles.infoButton}
                            onClick={handleCloseInfoModal}
                        >
                            Понятно
                        </button>
                    </div>
                </div>
            )}

        </div>
    );
}