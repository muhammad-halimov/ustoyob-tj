import { useParams, useNavigate } from 'react-router-dom';
import {useState, useEffect, useRef} from 'react';
import { getAuthToken, getUserData } from '../../../utils/auth.ts';
import styles from './Ticket.module.scss';
import {createChatWithAuthor, initChatModals} from "../../../utils/chatUtils.ts";
import AuthModal from "../../../features/auth/AuthModal.tsx";
import {cleanText} from "../../../utils/cleanText.ts";
import CookieConsentBanner from "../../../widgets/CookieConsentBanner/CookieConsentBanner.tsx";
import StatusModal from '../../../shared/ui/Modal/StatusModal';
import ReviewModal from '../../../shared/ui/Modal/ReviewModal';
import { PhotoGallery } from '../../../shared/ui/PhotoGallery/PhotoGallery';
import { usePhotoGallery } from '../../../shared/ui/PhotoGallery/usePhotoGallery';
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
    master: { 
        id: number; 
        name?: string; 
        surname?: string; 
        image?: string; 
        rating?: number;
        education?: {
            id: number;
            uniTitle: string;
            beginning: number;
            ending: number;
            graduated: boolean;
            occupation: {
                id: number;
                title: string | null;
                image: string | null;
            };
        }[];
    } | null;
    author: { id: number; name?: string; surname?: string; image?: string; rating?: number };
    category: { id: number; title: string };
    notice?: string;
    images?: { id: number; image: string }[];
    ticketImages?: { id: number; image: string }[];
    active: boolean;
    service: boolean;
    reviewsCount?: number;
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
    active?: boolean;
    hasEducation?: boolean;
}

interface Favorite {
    id: number;
    tickets?: { id: number }[];
    masters?: { id: number }[];
    clients?: { id: number }[];
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export function Ticket() {
    const {id} = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [order, setOrder] = useState<Order | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [isLiked, setIsLiked] = useState(false);
    const [isLikeLoading, setIsLikeLoading] = useState(false);
    const [favoriteId, setFavoriteId] = useState<number | null>(null);
    const [rating, setRating] = useState<number>(0);

    const [showReviewModal, setShowReviewModal] = useState(false);
    const [showAuthModal, setShowAuthModal] = useState(false);

    const [reviewCount, setReviewCount] = useState<number>(0);

    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [showErrorModal, setShowErrorModal] = useState(false);
    const [showInfoModal, setShowInfoModal] = useState(false);
    const [modalMessage, setModalMessage] = useState('');

    // States for ticket deactivation
    const [isTicketActive, setIsTicketActive] = useState(true);
    const [currentUserId, setCurrentUserId] = useState<number | null>(null);
    const [isTogglingActive, setIsTogglingActive] = useState(false);
    const isLoadingRef = useRef<boolean>(false); // Отслеживаем текущие запросы

    // Photo gallery
    const photoGallery = usePhotoGallery({
        images: order?.photos || [],
    });

    useEffect(() => {
        console.log('Ticket useEffect triggered with id:', id);
        
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

        const loadData = async () => {
            // Проверяем что нет активного запроса
            if (isLoadingRef.current) {
                console.log('Fetch already in progress, skipping duplicate request for ID:', id);
                return;
            }

            // Получаем ID текущего пользователя из localStorage (без API запроса)
            const userData = getUserData();
            setCurrentUserId(userData?.id || null);
            
            // Загружаем тикет если есть ID
            if (id) {
                console.log('Starting fetchOrder for ticket ID:', id);
                isLoadingRef.current = true;
                try {
                    await fetchOrder(parseInt(id));
                } finally {
                    isLoadingRef.current = false;
                }
            }
        };

        loadData();
    }, [id]); // Убираем isLoading из зависимостей

    useEffect(() => {
        if (order) {
            checkFavoriteStatus();
        }
    }, [order]);



    const handleCloseSuccessModal = () => {
        setShowSuccessModal(false);
    };

    const handleCloseErrorModal = () => {
        setShowErrorModal(false);
    };

    const handleCloseInfoModal = () => {
        setShowInfoModal(false);
    };

    const handleCloseReviewModal = () => {
        setShowReviewModal(false);
    };

    const handleReviewSuccess = (message: string) => {
        setModalMessage(message);
        setShowSuccessModal(true);
        setTimeout(() => setShowSuccessModal(false), 3000);
    };

    const handleReviewError = (message: string) => {
        setModalMessage(message);
        setShowErrorModal(true);
        setTimeout(() => setShowErrorModal(false), 3000);
    };

    const handleReviewSubmitted = (updatedCount: number) => {
        setReviewCount(updatedCount);
    };

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

    const fetchOrder = async (ticketId: number) => {
        const fetchTime = Date.now();
        console.log(`[${fetchTime}] fetchOrder STARTED for ticket ID:`, ticketId);
        
        try {
            setIsLoading(true);
            setError(null);

            console.log('Fetching ticket with ID:', ticketId);

            const headers: HeadersInit = {
                'Content-Type': 'application/json',
            };

            const token = getAuthToken();
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const response = await fetch(`${API_BASE_URL}/api/tickets/${ticketId}`, {
                method: 'GET',
                headers: headers,
            });

            if (!response.ok) {
                if (response.status === 404) {
                    setError('Тикет не найден');
                    return;
                } else if (response.status === 403) {
                    setError('Нет доступа к этому объявлению');
                    return;
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const responseData = await response.json();
        console.log('Raw API response:', responseData);

        // API может возвращать как объект, так и массив с одним элементом
        let ticketData: ApiTicket;
        
        if (Array.isArray(responseData)) {
            if (responseData.length === 0) {
                setError('Тикет не найден');
                return;
            }
            ticketData = responseData[0];
        } else {
            ticketData = responseData;
        }

        console.log('Processed ticket data:', ticketData);

        // Проверяем что у нас есть валидные данные тикета
        if (!ticketData || !ticketData.id) {
            setError('Неверный формат данных тикета');
            return;
        }

            // Проверяем доступ к неактивным объявлениям
            // Неактивные объявления видны только их владельцам
            if (!ticketData.active && currentUserId) {
                const isOwner = ticketData.author?.id === currentUserId || ticketData.master?.id === currentUserId;
                if (!isOwner) {
                    setError('Это объявление неактивно и недоступно для просмотра');
                    return;
                }
            }

            // Определяем кого показывать: мастера или клиента
            // Если есть master - это заявка клиента, показываем мастера
            // Если master === null - это услуга мастера, показываем автора (клиента)
            let displayUserId: number;
            let displayUserName: string;
            let displayUserImage: string;
            let userTypeForRating: string | null;
            let userRating: number = 0; // Рейтинг берем из данных тикета

            if (ticketData.master) {
                // Заявка клиента - показываем мастера
                displayUserId = ticketData.master.id;
                displayUserName = `${ticketData.master.name || ''} ${ticketData.master.surname || ''}`.trim() || 'Мастер';
                displayUserImage = ticketData.master.image ? formatProfileImageUrl(ticketData.master.image) : '';
                userTypeForRating = 'master';
                userRating = ticketData.master.rating || 0; // Рейтинг мастера из тикета
            } else {
                // Услуга мастера - показываем автора
                displayUserId = ticketData.author.id;
                displayUserName = `${ticketData.author.name || ''} ${ticketData.author.surname || ''}`.trim() || 'Клиент';
                displayUserImage = ticketData.author.image ? formatProfileImageUrl(ticketData.author.image) : '';
                userTypeForRating = 'client';
                userRating = ticketData.author.rating || 0; // Рейтинг автора из тикета
            }

            console.log('Display user info:', {
                displayUserId,
                displayUserName,
                userTypeForRating,
                displayUserImage,
                userRating
            });

            // Используем reviewsCount из API тикета если есть
            const reviewCountForUser = ticketData.reviewsCount || 0;
            setReviewCount(reviewCountForUser);

            // Используем рейтинг из данных тикета (БЕЗ дополнительного API запроса)
            setRating(userRating);

            const fullAddress = getFullAddress(ticketData);

            // Собираем фото из разных источников
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

            // Проверяем есть ли образование у пользователя (только для мастеров)
            const hasEducation = ticketData.master && 
                                ticketData.master.education && 
                                ticketData.master.education.length > 0;

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
                active: ticketData.active,
                hasEducation: hasEducation || false,
            };

            console.log('Final order data:', orderData);
            setOrder(orderData);
            setIsTicketActive(ticketData.active);

        } catch (error) {
            const fetchTime = Date.now();
            console.error(`[${fetchTime}] fetchOrder ERROR for ticket:`, error);
            setError('Не удалось загрузить данные тикета');
        } finally {
            const fetchTime = Date.now();
            console.log(`[${fetchTime}] fetchOrder COMPLETED, setting isLoading to false`);
            setIsLoading(false);
        }
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

    const handleToggleActive = async () => {
        const token = getAuthToken();
        if (!token) {
            navigate('/login');
            return;
        }

        if (!order) return;

        try {
            setIsTogglingActive(true);
            const newActiveStatus = !isTicketActive;

            const response = await fetch(`${API_BASE_URL}/api/tickets/${order.id}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/merge-patch+json',
                },
                body: JSON.stringify({
                    active: newActiveStatus
                }),
            });

            if (response.ok) {
                setIsTicketActive(newActiveStatus);
                setOrder(prev => prev ? { ...prev, active: newActiveStatus } : null);

                setModalMessage(`Объявление успешно ${newActiveStatus ? 'активировано' : 'деактивировано'}!`);
                setShowSuccessModal(true);
                setTimeout(() => setShowSuccessModal(false), 3000);
            } else {
                const errorText = await response.text();
                console.error('Error toggling active status:', errorText);
                throw new Error(`Не удалось ${newActiveStatus ? 'активировать' : 'деактивировать'} объявление`);
            }
        } catch (error) {
            console.error('Error toggling active status:', error);
            setModalMessage(`Ошибка при ${isTicketActive ? 'деактивации' : 'активации'} объявления`);
            setShowErrorModal(true);
            setTimeout(() => setShowErrorModal(false), 3000);
        } finally {
            setIsTogglingActive(false);
        }
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
                    navigate(`/profile/${userId}`);
                } else if (userInfo.roles.includes('ROLE_CLIENT')) {
                    console.log('Navigating to client profile');
                    navigate(`/profile/${userId}`);
                } else {
                    console.log('Unknown role, defaulting to profile');
                    navigate(`/profile/${userId}`);
                }
            } else {
                console.log('Could not determine role, defaulting to profile');
                navigate(`/profile/${userId}`);
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

    const getReviewWord = (count: number) => {
        if (count === 1) return 'отзыв';
        if (count >= 2 && count <= 4) return 'отзыва';
        return 'отзывов';
    };

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
                    {currentUserId === order.authorId && (
                        <div className={styles.service_active_toggle}>
                            <label className={styles.switch}>
                                <input
                                    type="checkbox"
                                    checked={isTicketActive}
                                    onChange={handleToggleActive}
                                    disabled={isTogglingActive}
                                />
                                <span className={styles.slider}></span>
                            </label>
                            <span className={styles.toggle_label}>
                                {isTicketActive ? 'Активно' : 'Неактивно'}
                            </span>
                        </div>
                    )}
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
                                        onClick={() => photoGallery.openGallery(index)}
                                        style={{cursor: 'pointer'}}
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
                            src={order.authorImage || '../default_user.png'}
                            alt="authorImage"
                            onClick={() => handleProfileClick(order.authorId)}
                            style={{cursor: 'pointer'}}
                            onError={(e) => {
                                (e.target as HTMLImageElement).src = '../default_user.png';
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
                            <p>{rating} (рейтинг)</p>
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
                            <p>{reviewCount} {getReviewWord(reviewCount)}</p>
                        </div>
                        {order.hasEducation && (
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
                        )}
                    </div>
                </section>

                <section className={styles.actionButtons}>
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
                </section>
            </div>

            <ReviewModal
                isOpen={showReviewModal}
                onClose={handleCloseReviewModal}
                onSuccess={handleReviewSuccess}
                onError={handleReviewError}
                ticketId={order?.id || 0}
                targetUserId={order?.authorId || 0}
                onReviewSubmitted={handleReviewSubmitted}
            />

            {showAuthModal && (
                <AuthModal
                    isOpen={showAuthModal}
                    onClose={() => setShowAuthModal(false)}
                    onLoginSuccess={handleLoginSuccess}
                />
            )}
            <StatusModal
                type="success"
                isOpen={showSuccessModal}
                onClose={handleCloseSuccessModal}
                message={modalMessage}
            />

            <StatusModal
                type="error"
                isOpen={showErrorModal}
                onClose={handleCloseErrorModal}
                message={modalMessage}
            />

            <StatusModal
                type="info"
                isOpen={showInfoModal}
                onClose={handleCloseInfoModal}
                message={modalMessage}
            />

            {order?.photos && order.photos.length > 0 && (
                <PhotoGallery
                    isOpen={photoGallery.isOpen}
                    images={order.photos}
                    currentIndex={photoGallery.currentIndex}
                    onClose={photoGallery.closeGallery}
                    onNext={photoGallery.goToNext}
                    onPrevious={photoGallery.goToPrevious}
                    onSelectImage={photoGallery.selectImage}
                />
            )}

            <CookieConsentBanner/>
        </div>
    );
}