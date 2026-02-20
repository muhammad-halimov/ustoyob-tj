import { useState, useEffect } from 'react';
import { getAuthToken, getUserRole } from '../../utils/auth';
import styles from './Favorite.module.scss';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../../app/routers/routes';
import { createChatWithAuthor } from "../../utils/chatUtils";
import { cleanText } from '../../utils/cleanText';
import { useTranslation } from 'react-i18next';
import { useLanguageChange } from '../../hooks/useLanguageChange';
import { TicketCard } from '../../shared/ui/TicketCard/TicketCard.tsx';
import CookieConsentBanner from "../../widgets/Banners/CookieConsentBanner/CookieConsentBanner.tsx";
import { ServiceTypeFilter } from '../../widgets/Sorting/ServiceTypeFilter/ServiceTypeFilter';
import { SortingFilter } from '../../widgets/Sorting/SortingFilter/SortingFilter';

interface FavoriteTicket {
    id: number;
    title: string;
    price: number;
    unit: string;
    description: string;
    address: string;
    date: string;
    author: string;
    timeAgo: string;
    category: string;
    subcategory?: string;
    status: string;
    authorId: number;
    type: 'client' | 'master';
    authorImage?: string;
    active: boolean;
    service: boolean;
    userRating?: number;
    userReviewCount?: number;
}

interface Master {
    id: number;
    email: string;
    bio: string;
    name: string;
    surname: string;
    image: string;
    categories: Array<{
        id: number;
        title: string;
    }>;
    districts: Array<{
        id: number;
        title: string;
        city: {
            id: number;
            title: string;
            province?: {
                id: number;
                title: string;
            };
        };
    }>;
    rating: number;
    reviewCount: number;
}

interface Favorite {
    id: number;
    user: {
        id: number;
        email: string;
        name: string;
        surname: string;
        image: string;
    };
    masters: Array<{
        id: number;
        email: string;
        name: string;
        surname: string;
        image: string;
    }>;
    clients: Array<{
        id: number;
        email: string;
        name: string;
        surname: string;
        image: string;
    }>;
    tickets: Array<{
        id: number;
        title: string;
        description: string;
        budget: number;
        unit: { id: number; title: string };
        active: boolean;
        service: boolean;
        createdAt: string;
        reviewsCount?: number;
        category: { title: string };
        subcategory?: { title: string } | null;
        author: {
            id: number;
            email: string;
            name: string;
            surname: string;
            image: string;
            rating?: number;
        } | null;
        master: {
            id: number;
            email: string;
            name: string;
            surname: string;
            image: string;
            rating?: number;
        } | null;
        addresses?: Array<{
            id: number;
            province?: { id: number; title: string };
            city?: { image: string | null; id: number; title: string };
            district?: { id: number; title: string };
            suburb?: { id: number; title: string };
            village?: { id: number; title: string };
            settlement?: { id: number; title: string };
            community?: { id: number; title: string };
        }>;
    }>;
}

interface ApiTicket {
    id: number;
    title: string;
    description: string;
    budget: number;
    unit: { id: number; title: string };
    addresses?: Array<{
        id: number;
        province?: { id: number; title: string };
        city?: { image: string | null; id: number; title: string };
        district?: { id: number; title: string };
        suburb?: { id: number; title: string };
        village?: { id: number; title: string };
        settlement?: { id: number; title: string };
        community?: { id: number; title: string };
    }>;
    address?: {
        title?: string;
        city?: { title?: string }
    } | null;
    district?: {
        title?: string;
        city?: { title?: string }
    } | null;
    createdAt: string;
    master: { id: number; name?: string; surname?: string; image?: string; rating?: number } | null;
    author: { id: number; name?: string; surname?: string; image?: string; rating?: number };
    category: { title: string };
    subcategory?: { title: string } | null;
    active: boolean;
    notice?: string;
    service: boolean;
    reviewsCount?: number;
    images?: { id: number; image: string }[];
}

interface LocalStorageFavorites {
    masters: number[];
    tickets: number[];
}

interface MasterData {
    id: number;
    email?: string;
    name?: string;
    surname?: string;
    image?: string;
}

interface ClientData {
    id: number;
    email?: string;
    name?: string;
    surname?: string;
    image?: string;
}

interface TicketData {
    id: number;
    title?: string;
    active?: boolean;
    author?: MasterData;
    master?: ClientData;
    service?: boolean;
}

type SortByType = 'newest' | 'oldest' | 'price-asc' | 'price-desc' | 'reviews-asc' | 'reviews-desc' | 'rating-asc' | 'rating-desc';
type SecondarySortByType = 'none' | SortByType;
type TimeFilterType = 'all' | 'today' | 'yesterday' | 'week' | 'month';

function Favorites() {
    const [favoriteTickets, setFavoriteTickets] = useState<FavoriteTicket[]>([]);
    const [favoriteMasters, setFavoriteMasters] = useState<Master[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'orders' | 'masters'>('orders');
    const [likedMasters, setLikedMasters] = useState<number[]>([]);
    const [likedTickets, setLikedTickets] = useState<number[]>([]);
    const [isLikeLoading, setIsLikeLoading] = useState<number | null>(null);
    const [favoriteId, setFavoriteId] = useState<number | null>(null);

    // Фильтры
    const [showOnlyServices, setShowOnlyServices] = useState(false);
    const [showOnlyAnnouncements, setShowOnlyAnnouncements] = useState(false);
    const [sortBy, setSortBy] = useState<SortByType>('newest');
    const [secondarySortBy, setSecondarySortBy] = useState<SecondarySortByType>('none');
    const [timeFilter, setTimeFilter] = useState<TimeFilterType>('all');

    const handleServiceToggle = () => {
        setShowOnlyServices(prev => !prev);
        if (!showOnlyServices) setShowOnlyAnnouncements(false);
    };

    const handleAnnouncementsToggle = () => {
        setShowOnlyAnnouncements(prev => !prev);
        if (!showOnlyAnnouncements) setShowOnlyServices(false);
    };
    const navigate = useNavigate();
    const userRole = getUserRole();
    const { t } = useTranslation(['components', 'common']);
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
    
    // Загрузка избранного при монтировании
    useEffect(() => {
        fetchFavorites();
    }, []);
    
    // Хук для реактивного обновления при смене языка
    useLanguageChange(() => {
        fetchFavorites();
    });

    // Состояния для модального окна отзыва
    const [showReviewModal, setShowReviewModal] = useState(false);
    const [reviewText, setReviewText] = useState('');
    const [selectedStars, setSelectedStars] = useState(0);
    const [reviewPhotos, setReviewPhotos] = useState<File[]>([]);
    const [selectedMasterId, setSelectedMasterId] = useState<number | null>(null);

    // Загрузка избранного из localStorage для неавторизованных пользователей
    const loadLocalStorageFavorites = (): LocalStorageFavorites => {
        try {
            const stored = localStorage.getItem('favorites');
            if (stored) {
                return JSON.parse(stored);
            }
        } catch (error) {
            console.error('Error loading favorites from localStorage:', error);
        }
        return { masters: [], tickets: [] };
    };

    // Сохранение избранного в localStorage для неавторизованных пользователей
    const saveLocalStorageFavorites = (favorites: LocalStorageFavorites) => {
        try {
            localStorage.setItem('favorites', JSON.stringify(favorites));
        } catch (error) {
            console.error('Error saving favorites to localStorage:', error);
        }
    };

    useEffect(() => {
        const handleFavoritesUpdate = () => {
            console.log('Favorites updated, refreshing...');
            fetchFavorites();
        };

        window.addEventListener('favoritesUpdated', handleFavoritesUpdate);

        return () => {
            window.removeEventListener('favoritesUpdated', handleFavoritesUpdate);
        };
    }, []);

    useEffect(() => {
        // Загружаем лайки из localStorage для неавторизованных пользователей
        const token = getAuthToken();
        if (!token) {
            const localFavorites = loadLocalStorageFavorites();
            setLikedMasters(localFavorites.masters);
            setLikedTickets(localFavorites.tickets);
        }
    }, []);

    useEffect(() => {
        if (favoriteMasters.length > 0) {
            const token = getAuthToken();
            if (token) {
                // Для авторизованных пользователей используем данные с сервера
                const masterIds = favoriteMasters.map(master => master.id);
                setLikedMasters(masterIds);
            }
        }
    }, [favoriteMasters]);

    const formatProfileImageUrl = (imagePath: string): string => {
        if (!imagePath) return './profileTest.png';

        if (imagePath.startsWith('/images/profile_photos/')) {
            return `${API_BASE_URL}${imagePath}`;
        } else if (imagePath.startsWith('http')) {
            return imagePath;
        } else {
            return `${API_BASE_URL}/images/profile_photos/${imagePath}`;
        }
    };

    // Функция для определения реального статуса тикета
    const getTicketStatus = (active: boolean, service: boolean): string => {
        if (!active) {
            return 'не актуально';
        }

        if (service) {
            return 'услуга';
        }

        return 'актуально';
    };


    const fetchTicketDetails = async (ticketId: number): Promise<FavoriteTicket | null> => {
        try {
            const token = getAuthToken();
            const locale = localStorage.getItem('i18nextLng') || 'ru';

            const response = await fetch(`${API_BASE_URL}/api/tickets/${ticketId}?locale=${locale}`, {
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    ...(token && { 'Authorization': `Bearer ${token}` })
                }
            });

            if (!response.ok) {
                console.error(`Error fetching ticket ${ticketId}, status:`, response.status);
                return null;
            }

            const ticket: ApiTicket = await response.json();

            const isMasterTicket = ticket.service === true;
            const userType = isMasterTicket ? 'master' : 'client';
            const authorId = isMasterTicket
                ? ticket.master?.id || 0
                : ticket.author?.id || 0;

            let authorName = 'Неизвестный';
            if (isMasterTicket && ticket.master) {
                authorName = `${ticket.master.name || ''} ${ticket.master.surname || ''}`.trim() || 'Мастер';
            } else if (ticket.author) {
                authorName = `${ticket.author.name || ''} ${ticket.author.surname || ''}`.trim() || 'Клиент';
            }

            return {
                id: ticket.id,
                title: ticket.title || 'Без названия',
                price: ticket.budget || 0,
                unit: ticket.unit?.title || 'tjs',
                description: ticket.description || 'Описание отсутствует',
                address: getFullAddress(ticket),
                date: ticket.createdAt,
                author: authorName,
                authorId: authorId,
                timeAgo: ticket.createdAt,
                category: ticket.category?.title || 'другое',
                subcategory: ticket.subcategory?.title,
                status: getTicketStatus(ticket.active, ticket.service),
                type: userType,
                active: ticket.active,
                service: ticket.service,
                userRating: isMasterTicket ? (ticket.master?.rating || 0) : (ticket.author?.rating || 0),
                userReviewCount: ticket.reviewsCount || 0
            };

        } catch (error) {
            console.error(`Error fetching ticket details for ID ${ticketId}:`, error);
            return null;
        }
    };

    // Алиас для обратной совместимости с вызовами для неавторизованных
    const fetchTicketDetailsForUnauthorized = fetchTicketDetails;

    const fetchFavorites = async () => {
        try {
            const token = getAuthToken();
            console.log('Fetching favorites, token exists:', !!token);

            // Для неавторизованных пользователей
            if (!token) {
                const localFavorites = loadLocalStorageFavorites();
                console.log('Local favorites for unauthorized user:', localFavorites);

                setLikedMasters(localFavorites.masters);
                setLikedTickets(localFavorites.tickets);

                // Загружаем детали тикетов
                const tickets: FavoriteTicket[] = [];
                for (const ticketId of localFavorites.tickets) {
                    const ticketDetails = await fetchTicketDetailsForUnauthorized(ticketId);
                    if (ticketDetails) {
                        tickets.push(ticketDetails);
                    }
                }
                setFavoriteTickets(tickets);
                console.log('Loaded tickets for unauthorized user:', tickets);

                setIsLoading(false);
                return;
            }

            // Для авторизованных пользователей
            console.log('Fetching favorites from API...');
            const response = await fetch(`${API_BASE_URL}/api/favorites/me?locale=${localStorage.getItem('i18nextLng') || 'ru'}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            console.log('API response status:', response.status);

            if (response.ok) {
                const favorite: Favorite = await response.json();
                console.log('Favorite data from API:', favorite);
                setFavoriteId(favorite.id);

                const tickets: FavoriteTicket[] = [];
                const masters: Master[] = [];

                // Обрабатываем тикеты напрямую из /api/favorites/me
                if (favorite.tickets && favorite.tickets.length > 0) {
                    for (const ticket of favorite.tickets) {
                        const isMasterTicket = ticket.service === true;
                        const userType = isMasterTicket ? 'master' : 'client';
                        const authorId = isMasterTicket
                            ? ticket.master?.id || 0
                            : ticket.author?.id || 0;

                        let authorName = 'Неизвестный';
                        if (isMasterTicket && ticket.master) {
                            authorName = `${ticket.master.name || ''} ${ticket.master.surname || ''}`.trim() || 'Мастер';
                        } else if (ticket.author) {
                            authorName = `${ticket.author.name || ''} ${ticket.author.surname || ''}`.trim() || 'Клиент';
                        }

                        const authorImage = isMasterTicket && ticket.master?.image
                            ? formatProfileImageUrl(ticket.master.image)
                            : !isMasterTicket && ticket.author?.image
                                ? formatProfileImageUrl(ticket.author.image)
                                : undefined;

                        tickets.push({
                            id: ticket.id,
                            title: ticket.title || 'Без названия',
                            price: ticket.budget || 0,
                            unit: ticket.unit?.title || 'tjs',
                            description: ticket.description || 'Описание отсутствует',
                            address: getFullAddress(ticket as unknown as ApiTicket),
                            date: ticket.createdAt,
                            author: authorName,
                            authorId: authorId,
                            timeAgo: ticket.createdAt,
                            category: ticket.category?.title || 'другое',
                            subcategory: ticket.subcategory?.title,
                            status: getTicketStatus(ticket.active, ticket.service),
                            type: userType,
                            active: ticket.active,
                            service: ticket.service,
                            authorImage: authorImage,
                            userRating: isMasterTicket ? (ticket.master?.rating || 0) : (ticket.author?.rating || 0),
                            userReviewCount: ticket.reviewsCount || 0
                        });
                    }
                }

                // Обрабатываем мастеров
                if (favorite.masters && favorite.masters.length > 0) {
                    console.log(`Found ${favorite.masters.length} favorite masters`);
                    for (const master of favorite.masters) {
                        const masterDetails = await fetchMasterDetails(master.id);
                        if (masterDetails) {
                            masters.push(masterDetails);
                        }
                    }
                }

                console.log('Final favorite tickets:', tickets);
                console.log('Final favorite masters:', masters);
                setFavoriteTickets(tickets);
                setFavoriteMasters(masters);

                // Обновляем состояния лайков
                setLikedTickets(tickets.map(t => t.id));
                setLikedMasters(masters.map(m => m.id));

            } else if (response.status === 404) {
                console.log('No favorites found (404)');
                setFavoriteTickets([]);
                setFavoriteMasters([]);
                setLikedMasters([]);
                setLikedTickets([]);
            } else {
                console.error('Error fetching favorites, status:', response.status);
                setFavoriteTickets([]);
                setFavoriteMasters([]);
                setLikedMasters([]);
                setLikedTickets([]);
            }
        } catch (error) {
            console.error('Error fetching favorites:', error);
            setFavoriteTickets([]);
            setFavoriteMasters([]);
            setLikedMasters([]);
            setLikedTickets([]);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchMasterDetails = async (masterId: number): Promise<Master | null> => {
        try {
            const token = getAuthToken();
            if (!token) return null;

            const response = await fetch(`${API_BASE_URL}/api/users/masters/${masterId}?locale=${localStorage.getItem('i18nextLng') || 'ru'}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const mastersData = await response.json();
                const master = Array.isArray(mastersData) ? mastersData[0] : mastersData;

                if (master) {
                    return {
                        id: master.id,
                        email: master.email || '',
                        name: master.name || '',
                        bio: master.bio || '',
                        surname: master.surname || '',
                        image: master.image || '',
                        categories: master.categories || [],
                        districts: master.districts || [],
                        rating: master.rating || 0,
                        reviewCount: master.reviewCount || 0
                    };
                }
            }
        } catch (error) {
            console.error(`Error fetching master details for ID ${masterId}:`, error);
        }
        return null;
    };

    const getFullAddress = (ticket: ApiTicket): string => {
        // Проверяем новый формат с addresses
        if (ticket.addresses && ticket.addresses.length > 0) {
            const address = ticket.addresses[0];
            const parts = [];

            if (address.city?.title) parts.push(address.city.title);
            if (address.province?.title) parts.push(address.province.title);
            if (address.district?.title) parts.push(address.district.title);
            if (address.suburb?.title) parts.push(address.suburb.title);
            if (address.village?.title) parts.push(address.village.title);
            if (address.settlement?.title) parts.push(address.settlement.title);
            if (address.community?.title) parts.push(address.community.title);

            return parts.join(', ') || 'Адрес не указан';
        }

        // Старый формат (для обратной совместимости)
        const districtTitle = ticket.district?.title || '';
        const districtCity = ticket.district?.city?.title || '';
        const addressTitle = ticket.address?.title || '';
        const addressCity = ticket.address?.city?.title || '';

        const city = districtCity || addressCity;
        const parts = [];
        if (city) parts.push(city);
        if (districtTitle) parts.push(districtTitle);
        if (addressTitle && !districtTitle) parts.push(addressTitle);

        return parts.length > 0 ? parts.join(', ') : 'Адрес не указан';
    };

    const handleCardClick = (authorId?: number, ticketId?: number) => {
        if (!authorId || !ticketId) {
            console.log('No author ID or ticket ID available');
            return;
        }
        console.log('Navigating to ticket:', ticketId, 'of author:', authorId);
        navigate(ROUTES.TICKET_BY_ID(ticketId));
    };

    // Функция для снятия лайка с тикета
    const handleUnlikeTicket = async (ticketId: number) => {
        const token = getAuthToken();
        if (!favoriteId || !token) return;

        // ИСПРАВЛЕННАЯ СТРОКА: используем полный URL
        const ticketIri = `${API_BASE_URL}/api/tickets/${ticketId}`;

        try {
            const currentFavoritesResponse = await fetch(`${API_BASE_URL}/api/favorites/me`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (currentFavoritesResponse.ok) {
                const currentFavorite = await currentFavoritesResponse.json();

                // ИСПРАВЛЕННЫЕ СТРОКИ: используем полные URL
                const existingMasters = currentFavorite.masters?.map((master: MasterData) => `${API_BASE_URL}/api/users/${master.id}`) || [];
                const existingClients = currentFavorite.clients?.map((client: ClientData) => `${API_BASE_URL}/api/users/${client.id}`) || [];
                const existingTickets = currentFavorite.tickets?.map((ticket: TicketData) => `${API_BASE_URL}/api/tickets/${ticket.id}`) || [];

                const updatedTickets = existingTickets.filter((ticket: string) => ticket !== ticketIri);

                const updateData = {
                    masters: existingMasters,
                    clients: existingClients,
                    tickets: updatedTickets
                };

                console.log("PATCH UNLIKE TICKET:", updateData);

                const patchResponse = await fetch(`${API_BASE_URL}/api/favorites/${favoriteId}`, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/merge-patch+json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(updateData)
                });

                if (patchResponse.ok) {
                    setLikedTickets(prev => prev.filter(id => id !== ticketId));
                    // Удаляем из локального состояния
                    setFavoriteTickets(prev => prev.filter(ticket => ticket.id !== ticketId));
                    console.log('Successfully removed ticket from favorites');
                    window.dispatchEvent(new Event('favoritesUpdated'));
                } else {
                    const errorText = await patchResponse.text();
                    console.error("PATCH error:", errorText);
                    alert('Ошибка при удалении из избранного');
                }
            }
        } catch (error) {
            console.error('Error removing ticket from favorites:', error);
            alert('Ошибка при удалении из избранного');
        }
    };

    // Обновленная функция для лайка тикетов
    const handleTicketLike = async (ticketId: number) => {
        const token = getAuthToken();

        if (!token) {
            alert('Пожалуйста, войдите в систему чтобы добавить в избранное');
            return;
        }

        const isLiked = likedTickets.includes(ticketId) || favoriteTickets.some(ticket => ticket.id === ticketId);

        if (isLiked && favoriteId) {
            await handleUnlikeTicket(ticketId);
            return;
        }

        setIsLikeLoading(ticketId);

        try {
            const currentFavoritesResponse = await fetch(`${API_BASE_URL}/api/favorites/me?locale=${localStorage.getItem('i18nextLng') || 'ru'}`, {
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
                const currentFavorite = await currentFavoritesResponse.json();
                console.log('Current favorite data:', currentFavorite);
                existingFavoriteId = currentFavorite.id;

                // Преобразуем в правильный формат IRI
                existingMasters = currentFavorite.masters?.map((master: MasterData) => `${API_BASE_URL}/api/users/${master.id}`) || [];
                existingClients = currentFavorite.clients?.map((client: ClientData) => `${API_BASE_URL}/api/users/${client.id}`) || [];
                existingTickets = currentFavorite.tickets?.map((ticket: TicketData) => `${API_BASE_URL}/api/tickets/${ticket.id}`) || [];

                console.log('Existing favorites:', {
                    masters: existingMasters,
                    clients: existingClients,
                    tickets: existingTickets
                });
            } else if (currentFavoritesResponse.status === 404) {
                console.log('No favorites found, will create new');
            }

            const favoriteIdToUse = existingFavoriteId;
            // ИСПРАВЛЕННАЯ СТРОКА: используем полный URL вместо относительного пути
            const ticketIri = `${API_BASE_URL}/api/tickets/${ticketId}`;

            console.log('Ticket IRI to add:', ticketIri);

            // Проверяем, не добавлен ли уже тикет
            if (existingTickets.includes(ticketIri)) {
                console.log('Ticket already in favorites');
                setLikedTickets(prev => [...prev, ticketId]);
                return;
            }

            if (favoriteIdToUse) {
                // Обновляем существующее избранное
                const updateData = {
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
                    const updatedFavorite = await patchResponse.json();
                    console.log('Successfully added ticket to favorites:', updatedFavorite);

                    // Обновляем состояние
                    setLikedTickets(prev => [...prev, ticketId]);

                    // Добавляем тикет в локальный стейт
                    const ticketDetails = await fetchTicketDetails(ticketId);
                    if (ticketDetails) {
                        setFavoriteTickets(prev => [...prev, ticketDetails]);
                    }

                    window.dispatchEvent(new Event('favoritesUpdated'));
                } else {
                    const errorText = await patchResponse.text();
                    console.error('Failed to update favorite:', patchResponse.status, errorText);
                    alert('Ошибка при добавлении в избранное');
                }
            } else {
                // Создаем новое избранное
                const createData = {
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
                    const newFavorite = await createResponse.json();
                    console.log('Successfully created favorite:', newFavorite);

                    setLikedTickets(prev => [...prev, ticketId]);
                    setFavoriteId(newFavorite.id);

                    // Добавляем тикет в локальный стейт
                    const ticketDetails = await fetchTicketDetails(ticketId);
                    if (ticketDetails) {
                        setFavoriteTickets(prev => [...prev, ticketDetails]);
                    }

                    window.dispatchEvent(new Event('favoritesUpdated'));
                } else {
                    const errorText = await createResponse.text();
                    console.error('Failed to create favorite:', createResponse.status, errorText);
                    alert('Ошибка при создании избранного');
                }
            }

        } catch (error) {
            console.error('Error adding to favorites:', error);
            alert('Ошибка при добавлении в избранное');
        } finally {
            setIsLikeLoading(null);
        }
    };

    // Функция для лайка тикетов для неавторизованных пользователей
    const handleTicketLikeUnauthorized = async (ticketId: number) => {
        const localFavorites = loadLocalStorageFavorites();

        const isCurrentlyLiked = localFavorites.tickets.includes(ticketId);
        let updatedTickets: number[];

        if (isCurrentlyLiked) {
            updatedTickets = localFavorites.tickets.filter(id => id !== ticketId);
            setLikedTickets(prev => prev.filter(id => id !== ticketId));
            setFavoriteTickets(prev => prev.filter(ticket => ticket.id !== ticketId));
        } else {
            updatedTickets = [...localFavorites.tickets, ticketId];
            setLikedTickets(prev => [...prev, ticketId]);

            // Добавляем детали тикета
            const ticketDetails = await fetchTicketDetailsForUnauthorized(ticketId);
            if (ticketDetails) {
                setFavoriteTickets(prev => [...prev, ticketDetails]);
            }
        }

        saveLocalStorageFavorites({
            ...localFavorites,
            tickets: updatedTickets
        });

        window.dispatchEvent(new Event('favoritesUpdated'));
    };

    // Общая функция для лайка тикетов
    const handleTicketLikeWrapper = (ticketId: number) => {
        const token = getAuthToken();

        if (!token) {
            handleTicketLikeUnauthorized(ticketId);
            return;
        }

        // Просто вызываем handleTicketLike - он сам проверит текущий статус
        handleTicketLike(ticketId);
    };

    const handleLike = async (masterId: number) => {
        const token = getAuthToken();

        if (!token) {
            // Для неавторизованных пользователей сохраняем в localStorage
            setIsLikeLoading(masterId);
            const localFavorites = loadLocalStorageFavorites();

            const isCurrentlyLiked = localFavorites.masters.includes(masterId);
            let updatedMasters: number[];

            if (isCurrentlyLiked) {
                updatedMasters = localFavorites.masters.filter(id => id !== masterId);
                setLikedMasters(prev => prev.filter(id => id !== masterId));
            } else {
                updatedMasters = [...localFavorites.masters, masterId];
                setLikedMasters(prev => [...prev, masterId]);
            }

            saveLocalStorageFavorites({
                ...localFavorites,
                masters: updatedMasters
            });

            setIsLikeLoading(null);
            window.dispatchEvent(new Event('favoritesUpdated'));
            return;
        }

        setIsLikeLoading(masterId);

        try {
            const currentFavoritesResponse = await fetch(`${API_BASE_URL}/api/favorites/me?locale=${localStorage.getItem('i18nextLng') || 'ru'}`, {
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
                const currentFavorite = await currentFavoritesResponse.json();
                existingFavoriteId = currentFavorite.id;

                existingMasters = currentFavorite.masters?.map((master: MasterData) => `/api/users/${master.id}`) || [];
                existingClients = currentFavorite.clients?.map((client: ClientData) => `/api/users/${client.id}`) || [];
                existingTickets = currentFavorite.tickets?.map((ticket: TicketData) => `/api/tickets/${ticket.id}`) || [];

                console.log('Existing favorites:', {
                    masters: existingMasters,
                    clients: existingClients,
                    tickets: existingTickets
                });
            }

            const favoriteIdToUse = existingFavoriteId;
            const masterIri = `${API_BASE_URL}/api/users/${masterId}`;

            // Проверяем, есть ли уже мастер в избранном
            const isCurrentlyLiked = existingMasters.includes(masterIri);

            if (isCurrentlyLiked) {
                // Удаляем мастера из избранного
                await handleUnlikeMaster(masterId, favoriteIdToUse, existingMasters, existingClients, existingTickets);
            } else {
                // Добавляем мастера в избранное
                await handleLikeMaster(masterId, favoriteIdToUse, existingMasters, existingClients, existingTickets);
            }

        } catch (error) {
            console.error('Error toggling master like:', error);
            alert('Ошибка при изменении избранного');
        } finally {
            setIsLikeLoading(null);
        }
    };

    const handleLikeMaster = async (masterId: number, favoriteId: number | null, existingMasters: string[], existingClients: string[], existingTickets: string[]) => {
        const token = getAuthToken();
        if (!token) return;

        const masterIri = `/api/users/${masterId}`;

        if (existingMasters.includes(masterIri)) {
            console.log('Master already in favorites');
            setLikedMasters(prev => [...prev, masterId]);
            return;
        }

        if (favoriteId) {
            const updateData = {
                masters: [...existingMasters, masterIri],
                clients: existingClients,
                tickets: existingTickets
            };

            console.log('Updating favorite with data:', updateData);

            const patchResponse = await fetch(`${API_BASE_URL}/api/favorites/${favoriteId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/merge-patch+json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(updateData)
            });

            if (patchResponse.ok) {
                setLikedMasters(prev => [...prev, masterId]);
                console.log('Successfully added master to favorites');
                window.dispatchEvent(new Event('favoritesUpdated'));
            } else {
                const errorText = await patchResponse.text();
                console.error('Failed to update favorite:', errorText);
                alert('Ошибка при добавлении в избранное');
            }
        } else {
            const createData = {
                masters: [masterIri],
                clients: [],
                tickets: []
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
                await createResponse.json();
                setLikedMasters(prev => [...prev, masterId]);
                console.log('Successfully created favorite with master');
                window.dispatchEvent(new Event('favoritesUpdated'));
            } else {
                const errorText = await createResponse.text();
                console.error('Failed to create favorite:', errorText);
                alert('Ошибка при создании избранного');
            }
        }
    };

    const handleUnlikeMaster = async (masterId: number, favoriteId: number | null, existingMasters: string[], existingClients: string[], existingTickets: string[]) => {
        const token = getAuthToken();
        if (!favoriteId) return;

        const masterIri = `/api/users/${masterId}`;
        const updatedMasters = existingMasters.filter((master: string) => master !== masterIri);

        const updateData = {
            masters: updatedMasters,
            clients: existingClients,
            tickets: existingTickets
        };

        console.log("PATCH UNLIKE MASTER:", updateData);

        const patchResponse = await fetch(`${API_BASE_URL}/api/favorites/${favoriteId}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/merge-patch+json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(updateData)
        });

        if (patchResponse.ok) {
            setLikedMasters(prev => prev.filter(id => id !== masterId));
            console.log('Successfully removed master from favorites');
            window.dispatchEvent(new Event('favoritesUpdated'));

            // Обновляем список мастеров в избранном
            setFavoriteMasters(prev => prev.filter(master => master.id !== masterId));
        } else {
            console.error("PATCH error:", await patchResponse.text());
            alert('Ошибка при удалении из избранного');
        }
    };

    const getMasterAddress = (master: Master) => {
        const d = master.districts?.[0];
        if (!d) return 'Адрес не указан';

        const province = d.city?.province?.title || '';
        const city = d.city?.title || '';
        const district = d.title || '';

        return [province, city, district].filter(Boolean).join(', ');
    };

    const handleMasterChat = async (authorId: number) => {
        const token = getAuthToken();
        if (!token) {
            alert('Пожалуйста, войдите в систему чтобы написать мастеру');
            return;
        }

        const chat = await createChatWithAuthor(authorId);
        if (chat) {
            navigate(`${ROUTES.CHATS}?chatId=${chat.id}`);
        } else {
            alert('Не удалось создать чат');
        }
    };

    // Функции для модального окна отзыва
    const handleMasterReview = (masterId: number) => {
        const token = getAuthToken();
        if (!token) {
            alert('Пожалуйста, войдите в систему чтобы оставить отзыв');
            return;
        }

        setSelectedMasterId(masterId);
        setShowReviewModal(true);
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

    const handleCloseModal = () => {
        setShowReviewModal(false);
        setReviewText('');
        setSelectedStars(0);
        setReviewPhotos([]);
        setSelectedMasterId(null);
    };

    const getCurrentUserId = async (): Promise<number | null> => {
        try {
            const token = getAuthToken();
            if (!token) return null;

            const response = await fetch(`${API_BASE_URL}/api/users/me?locale=${localStorage.getItem('i18nextLng') || 'ru'}`, {
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

    const handleSubmitReview = async () => {
        if (!reviewText.trim()) {
            alert('Пожалуйста, напишите комментарий');
            return;
        }

        if (selectedStars === 0) {
            alert('Пожалуйста, поставьте оценку');
            return;
        }

        if (!selectedMasterId) {
            alert('Мастер не выбран');
            return;
        }

        try {
            const token = getAuthToken();
            if (!token) {
                alert('Необходима авторизация');
                return;
            }

            const currentUserId = await getCurrentUserId();

            if (!currentUserId) {
                alert('Не удалось определить пользователя');
                return;
            }

            // Для отзыва на мастера всегда используем тип client_to_master
            const reviewType = 'client_to_master';

            const reviewData = {
                type: reviewType,
                rating: selectedStars,
                description: reviewText,
                master: `/api/users/${selectedMasterId}`,
                client: `/api/users/${currentUserId}`
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

                // Загружаем фото асинхронно
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

            } else {
                const errorText = await response.text();
                console.error('Error creating review. Status:', response.status, 'Response:', errorText);

                let errorMessage = 'Ошибка при отправке отзыва';
                if (response.status === 422) {
                    errorMessage = 'Ошибка валидации данных. Проверьте введенные данные.';
                } else if (response.status === 400) {
                    errorMessage = 'Неверные данные для отправки отзыва.';
                } else if (response.status === 404) {
                    errorMessage = 'Ресурс не найден. Возможно, мастер или пользователь не существуют.';
                }

                alert(errorMessage);
            }

        } catch (error) {
            console.error('Error submitting review:', error);
            alert('Произошла непредвиденная ошибка при отправке отзыва');
        }
    };

    if (isLoading) {
        return <div className={styles.loading}>Загрузка избранного...</div>;
    }

    const showTabs = userRole === 'client';
    const hasOrders = favoriteTickets.length > 0;
    const hasMasters = favoriteMasters.length > 0;
    const hasNoFavorites = !hasOrders && !hasMasters;

    // Применяем фильтры и сортировку к тикетам
    const applySort = (tickets: FavoriteTicket[], sort: SortByType): FavoriteTicket[] => {
        return [...tickets].sort((a, b) => {
            switch (sort) {
                case 'newest': return new Date(b.date).getTime() - new Date(a.date).getTime();
                case 'oldest': return new Date(a.date).getTime() - new Date(b.date).getTime();
                case 'price-asc': return (a.price || 0) - (b.price || 0);
                case 'price-desc': return (b.price || 0) - (a.price || 0);
                case 'reviews-asc': return (a.userReviewCount || 0) - (b.userReviewCount || 0);
                case 'reviews-desc': return (b.userReviewCount || 0) - (a.userReviewCount || 0);
                case 'rating-asc': return (a.userRating || 0) - (b.userRating || 0);
                case 'rating-desc': return (b.userRating || 0) - (a.userRating || 0);
                default: return 0;
            }
        });
    };

    const filteredTickets = (() => {
        let result = [...favoriteTickets];

        // Фильтр по типу
        if (showOnlyServices) result = result.filter(t => t.service === true);
        else if (showOnlyAnnouncements) result = result.filter(t => t.service === false);

        // Фильтр по времени
        const now = new Date();
        if (timeFilter !== 'all') {
            result = result.filter(t => {
                const d = new Date(t.date);
                if (timeFilter === 'today') {
                    return d.toDateString() === now.toDateString();
                } else if (timeFilter === 'yesterday') {
                    const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
                    return d.toDateString() === yesterday.toDateString();
                } else if (timeFilter === 'week') {
                    const week = new Date(now); week.setDate(now.getDate() - 7);
                    return d >= week;
                } else if (timeFilter === 'month') {
                    const month = new Date(now); month.setDate(now.getDate() - 30);
                    return d >= month;
                }
                return true;
            });
        }

        // Основная сортировка
        result = applySort(result, sortBy);

        // Вторичная сортировка
        if (secondarySortBy !== 'none') {
            const primary = applySort(result, sortBy);
            result = applySort(primary, secondarySortBy);
        }

        return result;
    })();

    // Для неавторизованных пользователей показываем сообщение о необходимости авторизации
    const token = getAuthToken();
    if (!token && hasNoFavorites) {
        return (
            <div className={styles.recommendation}>
                <div className={styles.recommendation_wrap}>
                    <div className={styles.emptyState}>
                        <p>{t('messages.authRequired')}</p>
                        <p>{t('pages.favorites.noFavoritesHint')}</p>
                    </div>
                </div>
            </div>
        );
    }

    if (hasNoFavorites) {
        return (
            <div className={styles.recommendation}>
                <div className={styles.recommendation_wrap}>
                    <div className={styles.emptyState}>
                        <p>{t('pages.favorites.noFavorites')}</p>
                        <p>{t('pages.favorites.noFavoritesHint')}</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.recommendation}>
            {/* Переключатель только для клиентов */}
            {showTabs && (
                <div className={styles.tabs}>
                    <button
                        className={`
                ${styles.tab} 
                ${styles.tabLeft} 
                ${activeTab === 'orders' ? styles.activeLeft : ''}
            `}
                        onClick={() => setActiveTab('orders')}
                    >
                        {t('pages.favorites.orders')}
                    </button>

                    <button
                        className={`
                ${styles.tab} 
                ${styles.tabRight} 
                ${activeTab === 'masters' ? styles.activeRight : ''}
            `}
                        onClick={() => setActiveTab('masters')}
                    >
                        {t('pages.favorites.masters')}
                    </button>
                </div>
            )}

            {/* Фильтры для вкладки заказов */}
            {(activeTab === 'orders' || !showTabs) && hasOrders && (
                <div className={styles.filtersWrapper}>
                    <ServiceTypeFilter
                        showOnlyServices={showOnlyServices}
                        showOnlyAnnouncements={showOnlyAnnouncements}
                        onServiceToggle={handleServiceToggle}
                        onAnnouncementsToggle={handleAnnouncementsToggle}
                    />
                    <SortingFilter
                        sortBy={sortBy}
                        secondarySortBy={secondarySortBy}
                        timeFilter={timeFilter}
                        onSortChange={setSortBy}
                        onSecondarySortChange={setSecondarySortBy}
                        onTimeFilterChange={setTimeFilter}
                    />
                </div>
            )}

            <div className={styles.recommendation_wrap}>
                {/* Сообщение об отсутствии результатов после фильтрации */}
                {(activeTab === 'orders' || !showTabs) && hasOrders && filteredTickets.length === 0 && (
                    <p className={styles.noResults}>Ничего не найдено. Попробуйте изменить фильтры.</p>
                )}

                {/* Отображение заказов */}
                {(activeTab === 'orders' || !showTabs) && hasOrders && filteredTickets.map((ticket, index) => (
                    <TicketCard
                        key={`${ticket.id}-${ticket.type}-${index}`}
                        title={ticket.title}
                        description={cleanText(ticket.description)}
                        price={ticket.price}
                        unit={ticket.unit}
                        address={ticket.address}
                        date={ticket.date}
                        author={ticket.author}
                        authorId={ticket.authorId}
                        category={ticket.category}
                        subcategory={ticket.subcategory}
                        timeAgo={ticket.timeAgo}
                        ticketType={ticket.type}
                        userRole={userRole}
                        userRating={ticket.userRating}
                        userReviewCount={ticket.userReviewCount}
                        isFavorite={favoriteTickets.some(favTicket => favTicket.id === ticket.id)}
                        onFavoriteClick={(e) => {
                            e.stopPropagation();
                            handleTicketLikeWrapper(ticket.id);
                        }}
                        isLikeLoading={isLikeLoading === ticket.id}
                        onClick={() => handleCardClick(ticket.authorId, ticket.id)}
                    />
                ))}

                {/* Отображение мастеров */}
                {activeTab === 'masters' && showTabs && hasMasters && favoriteMasters.map((master) => (
                    <div key={master.id} className={styles.masterCard}>
                        <div className={styles.mastersList_header}>
                            <img
                                src={formatProfileImageUrl(master.image)}
                                alt={master.name}
                                onError={(e) => {
                                    (e.target as HTMLImageElement).src = './profileTest.png';
                                }}
                            />
                            <div className={styles.mastersList_title}>
                                <h3>{master.surname} {master.name}</h3>
                                <div className={styles.mastersList_title_reviews}>
                                    <div className={styles.mastersList_title_grade}>
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
                                                  fill="#FFD700" stroke="#FFD700"/>
                                        </svg>
                                        <span>{master.rating || 'Нет оценок'}</span>
                                    </div>
                                    <div className={styles.mastersList_title_review}>
                                        <p><span>{master.reviewCount || 0}</span> Отзывов</p>
                                    </div>
                                </div>
                                <div className={styles.categories}>
                                    {master.categories?.map(cat => (
                                        <span key={cat.id} className={styles.categoryTag}>
                                            {cat.title}
                                        </span>
                                    ))}
                                </div>
                                <div className={styles.mastersList_title_btns}>
                                    <button
                                        className={styles.chatButton}
                                        onClick={() => handleMasterChat(master.id)}
                                    >
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M12 1.5C6.2 1.5 1.5 5.77 1.5 11.02C1.52866 13.0353 2.23294 14.9826 3.5 16.55L2.5 21.55L9.16 20.22C10.1031 20.4699 11.0744 20.5976 12.05 20.6C17.85 20.6 22.55 16.32 22.55 11.05C22.55 5.78 17.8 1.5 12 1.5Z"
                                                  stroke="#FFFFFF" strokeWidth="2" strokeMiterlimit="10"/>
                                        </svg>
                                        Написать
                                    </button>
                                    <button
                                        className={styles.reviewButton}
                                        onClick={() => handleMasterReview(master.id)}
                                    >
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M12 2.5L15.09 8.76L22 9.77L17 14.64L18.18 21.52L12 18.27L5.82 21.52L7 14.64L2 9.77L8.91 8.76L12 2.5Z"
                                                  stroke="black" strokeWidth="2" strokeMiterlimit="10"/>
                                        </svg>
                                        Оставить отзыв
                                    </button>
                                </div>
                            </div>

                            {/* Кнопка лайка */}
                            <button
                                className={`${styles.container_like} ${isLikeLoading === master.id ? styles.loading : ''}`}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleLike(master.id);
                                }}
                                disabled={isLikeLoading === master.id}
                                title={likedMasters.includes(master.id) ? "Удалить из избранного" : "Добавить в избранное"}
                            >
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path
                                        d="M16.77 2.45C15.7961 2.47092 14.8444 2.74461 14.0081 3.24424C13.1719 3.74388 12.4799 4.45229 12 5.3C11.5201 4.45229 10.8281 3.74388 9.99186 3.24424C9.15563 2.74461 8.2039 2.47092 7.23 2.45C4.06 2.45 1.5 5.3 1.5 8.82C1.5 15.18 12 21.55 12 21.55C12 21.55 22.5 15.18 22.5 8.82C22.5 5.3 19.94 2.45 16.77 2.45Z"
                                        fill={likedMasters.includes(master.id) ? "#3A54DA" : "none"}
                                        stroke="#3A54DA"
                                        strokeWidth="2"
                                        strokeMiterlimit="10"
                                    />
                                </svg>
                            </button>
                        </div>

                        <div className={styles.mastersList_about}>
                            <p className={styles.mastersList_about_welcome}>О мастере</p>
                            <p className={styles.mastersList_about_title}>
                                {master.bio || 'Нет информации'}
                            </p>

                            <div className={styles.mastersList_about_atHome}>
                                <p>Мастер принимает у себя</p>
                                <div className={styles.mastersList_about_atHome_addresses}>
                                    <span>Адрес: {getMasterAddress(master)}</span>
                                </div>
                            </div>

                            <div className={styles.mastersList_about_departure}>
                                <p>Мастер готов приехать</p>
                                <div className={styles.mastersList_about_atHome_addresses}>
                                    <span>По всему городу</span>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Модальное окно отзыва */}
            {showReviewModal && (
                <div className={styles.modalOverlay}>
                    <div className={styles.reviewModal}>
                        <div className={styles.modalHeader}>
                            <h2>Оставьте отзыв о мастере</h2>
                        </div>

                        <div className={styles.modalContent}>
                            {/* Поле для комментария */}
                            <div className={styles.commentSection}>
                                <textarea
                                    value={reviewText}
                                    onChange={(e) => setReviewText(e.target.value)}
                                    placeholder="Расскажите о вашем опыте работы с мастером..."
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
            <CookieConsentBanner/>
        </div>
    );
}

export default Favorites;