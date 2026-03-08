import { useState, useEffect, useRef } from 'react';
import { getAuthToken, getUserRole } from '../../utils/auth';
import styles from './Favorite.module.scss';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../../app/routers/routes';
import { createChatWithAuthor } from "../../utils/chatUtils";
import { textHelper } from '../../utils/textHelper.ts';
import { useTranslation } from 'react-i18next';
import { useLanguageChange } from '../../hooks';
import { Card } from '../../shared/ui/Ticket/Card/Card.tsx';
import CookieConsentBanner from "../../widgets/Banners/CookieConsentBanner/CookieConsentBanner.tsx";
import { ServiceTypeFilter } from '../../widgets/Sorting/ServiceTypeFilter';
import { SortingFilter } from '../../widgets/Sorting/SortingFilter';
import { PageLoader } from '../../widgets/PageLoader';
import { EmptyState } from '../../widgets/EmptyState';
import { ProfileHeader } from '../profile/shared/ui/ProfileHeader';
import Review from '../../shared/ui/Modal/Review';
import Complaint from '../../shared/ui/Modal/Complaint';
import { Back } from '../../shared/ui/Button/Back/Back.tsx';

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
    photos?: string[];
    negotiableBudget?: boolean;
}

interface FavoriteUser {
    id: number;
    email: string;
    name: string;
    surname: string;
    rating: number;
    image: string | null;
    role: 'master' | 'client';
    specialties: string[];
    reviewsCount?: number;
    gender?: string;
    isOnline?: boolean;
    lastSeen?: string | null;
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
        image: string | null;
        rating?: number;
        occupations?: Array<{ id: number; title: string }>;
    }>;
    clients: Array<{
        id: number;
        email: string;
        name: string;
        surname: string;
        image: string | null;
        rating?: number;
        occupations?: Array<{ id: number; title: string }>;
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
        images?: { id: number; image: string }[];
        negotiableBudget?: boolean;
        category: { title: string };
        subcategory?: { title: string } | null;
        author: {
            id: number;
            email: string;
            name: string;
            surname: string;
            image: string;
            imageExternalUrl?: string | null;
            rating?: number;
        } | null;
        master: {
            id: number;
            email: string;
            name: string;
            surname: string;
            image: string;
            imageExternalUrl?: string | null;
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
    const [favoriteUsers, setFavoriteUsers] = useState<FavoriteUser[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'orders' | 'masters'>('orders');
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
    const [selectedMasterId, setSelectedMasterId] = useState<number | null>(null);

    // Состояния для модального окна жалобы
    const [showComplaintModal, setShowComplaintModal] = useState(false);
    const [complaintUserId, setComplaintUserId] = useState<number | null>(null);

    const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const API_BASE_URL_REF = useRef(import.meta.env.VITE_API_BASE_URL);

    // Ping current user presence + refresh online status every 30s
    useEffect(() => {
        const token = getAuthToken();
        if (!token) return;

        const pingUrl = `${API_BASE_URL_REF.current}/api/users/ping`;
        const offlineUrl = `${API_BASE_URL_REF.current}/api/users/offline`;
        const doPing = () => fetch(pingUrl, { method: 'POST', headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
        const markOffline = () => fetch(offlineUrl, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, keepalive: true }).catch(() => {});

        doPing();
        heartbeatRef.current = setInterval(doPing, 30_000);
        const onVisibility = () => { if (document.visibilityState === 'hidden') markOffline(); else doPing(); };
        window.addEventListener('beforeunload', markOffline);
        document.addEventListener('visibilitychange', onVisibility);
        return () => {
            clearInterval(heartbeatRef.current!);
            heartbeatRef.current = null;
            window.removeEventListener('beforeunload', markOffline);
            document.removeEventListener('visibilitychange', onVisibility);
            markOffline();
        };
    }, []);

    // Fetch each user's full profile (isOnline, lastSeen, occupations)
    const fetchUserOnlineStatus = async (users: FavoriteUser[]) => {
        const token = getAuthToken();
        if (!users.length) return;
        const updated = await Promise.all(users.map(async (user) => {
            try {
                const response = await fetch(
                    `${API_BASE_URL_REF.current}/api/users/${user.id}`,
                    { headers: { 'Accept': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) } }
                );
                if (!response.ok) return user;
                const data = await response.json();
                return {
                    ...user,
                    isOnline: data.isOnline ?? user.isOnline,
                    lastSeen: data.lastSeen ?? user.lastSeen,
                };
            } catch {
                return user;
            }
        }));
        setFavoriteUsers(updated);
    };

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
            setLikedTickets(localFavorites.tickets);
        }
    }, []);

    const formatProfileImageUrl = (imagePath: string): string => {
        if (!imagePath) return './default_user.png';

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
        if (imagePath.startsWith('http')) return imagePath;
        if (imagePath.startsWith('/images/ticket_photos/')) return `${API_BASE_URL}${imagePath}`;
        return `${API_BASE_URL}/images/ticket_photos/${imagePath}`;
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

            const isMasterTicket = ticket.service;
            const userType = isMasterTicket ? 'master' : 'client';
            const authorId = isMasterTicket
                ? ticket.master?.id || 0
                : ticket.author?.id || 0;

            let authorName = 'Неизвестный';
            if (isMasterTicket && ticket.master) {
                authorName = `${ticket.master.surname || ''} ${ticket.master.name || ''}`.trim() || 'Мастер';
            } else if (ticket.author) {
                authorName = `${ticket.author.surname || ''} ${ticket.author.name || ''}`.trim() || 'Клиент';
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

                // Обрабатываем тикеты напрямую из /api/favorites/me
                if (favorite.tickets && favorite.tickets.length > 0) {
                    for (const ticket of favorite.tickets) {
                        const isMasterTicket = ticket.service;
                        const userType = isMasterTicket ? 'master' : 'client';
                        const authorId = isMasterTicket
                            ? ticket.master?.id || 0
                            : ticket.author?.id || 0;

                        let authorName = 'Неизвестный';
                        if (isMasterTicket && ticket.master) {
                            authorName = `${ticket.master.surname || ''} ${ticket.master.name || ''}`.trim() || 'Мастер';
                        } else if (ticket.author) {
                            authorName = `${ticket.author.surname || ''} ${ticket.author.name || ''}`.trim() || 'Клиент';
                        }

                        const authorImageSrc = isMasterTicket
                            ? (ticket.master?.image || ticket.master?.imageExternalUrl)
                            : (ticket.author?.image || ticket.author?.imageExternalUrl);
                        const authorImage = authorImageSrc ? formatProfileImageUrl(authorImageSrc) : undefined;

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
                            userReviewCount: ticket.reviewsCount || 0,
                            photos: ticket.images?.map(img => formatTicketImageUrl(img.image)),
                            negotiableBudget: ticket.negotiableBudget
                        });
                    }
                }

                // Обрабатываем мастеров напрямую из ответа API
                const mastersFromApi: FavoriteUser[] = (favorite.masters || []).map((m: any) => ({
                    id: m.id,
                    email: m.email || '',
                    name: m.name || '',
                    surname: m.surname || '',
                    rating: m.rating || 0,
                    image: m.image || null,
                    role: 'master' as const,
                    specialties: (m.occupation || m.occupations || []).map((o: any) => o.title),
                    reviewsCount: m.reviewsCount || 0,
                    gender: m.gender,
                }));

                // Обрабатываем клиентов напрямую из ответа API
                const clientsFromApi: FavoriteUser[] = (favorite.clients || []).map((c: any) => ({
                    id: c.id,
                    email: c.email || '',
                    name: c.name || '',
                    surname: c.surname || '',
                    rating: c.rating || 0,
                    image: c.image || null,
                    role: 'client' as const,
                    specialties: (c.occupation || c.occupations || []).map((o: any) => o.title),
                    reviewsCount: c.reviewsCount || 0,
                    gender: c.gender,
                }));

                // Объединяем мастеров и клиентов в один список пользователей (дедупликация по id)
                const userMap = new Map<number, FavoriteUser>();
                [...mastersFromApi, ...clientsFromApi].forEach(u => {
                    if (!userMap.has(u.id)) userMap.set(u.id, u);
                });

                const allUsers = Array.from(userMap.values());
                // Сортируем: сначала тикеты из выбранного города, затем остальные
                const selectedCity = localStorage.getItem('selectedCity') || '';
                const sortedTickets = selectedCity
                    ? [...tickets].sort((a, b) => {
                        const aRaw = favorite.tickets.find(ft => ft.id === a.id);
                        const bRaw = favorite.tickets.find(ft => ft.id === b.id);
                        const aMatch = aRaw?.addresses?.some(addr => addr.city?.title === selectedCity) ?? false;
                        const bMatch = bRaw?.addresses?.some(addr => addr.city?.title === selectedCity) ?? false;
                        return aMatch === bMatch ? 0 : aMatch ? -1 : 1;
                    })
                    : tickets;

                console.log('Final favorite tickets:', sortedTickets);
                setFavoriteTickets(sortedTickets);
                setFavoriteUsers(allUsers);
                // Fetch full profile data (isOnline, lastSeen, occupations)
                fetchUserOnlineStatus(allUsers);

                // Обновляем состояния лайков
                setLikedTickets(tickets.map(t => t.id));

            } else if (response.status === 404) {
                console.log('No favorites found (404)');
                setFavoriteTickets([]);
                setFavoriteUsers([]);
                setLikedTickets([]);
            } else {
                console.error('Error fetching favorites, status:', response.status);
                setFavoriteTickets([]);
                setFavoriteUsers([]);
                setLikedTickets([]);
            }
        } catch (error) {
            console.error('Error fetching favorites:', error);
            setFavoriteTickets([]);
            setFavoriteUsers([]);
            setLikedTickets([]);
        } finally {
            setIsLoading(false);
        }
    };

    // handleLikeUser — добавляет/удаляет пользователя из избранного (универсально для мастеров и клиентов)
    const handleLikeUser = async (userId: number) => {
        const token = getAuthToken();
        if (!token || !favoriteId) return;

        setIsLikeLoading(userId);
        try {
            const resp = await fetch(`${API_BASE_URL}/api/favorites/me`, {
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
            });
            if (!resp.ok) return;
            const current = await resp.json();

            const userIri = `/api/users/${userId}`;
            const existingMasters = (current.masters || []).map((m: MasterData) => `/api/users/${m.id}`);
            const existingClients = (current.clients || []).map((c: ClientData) => `/api/users/${c.id}`);
            const existingTickets = (current.tickets || []).map((tk: TicketData) => `/api/tickets/${tk.id}`);

            // Удаляем пользователя из обоих массивов (он мог быть в любом)
            const updatedMasters = existingMasters.filter((u: string) => u !== userIri);
            const updatedClients = existingClients.filter((u: string) => u !== userIri);

            const patchResp = await fetch(`${API_BASE_URL}/api/favorites/${favoriteId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/merge-patch+json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ masters: updatedMasters, clients: updatedClients, tickets: existingTickets })
            });

            if (patchResp.ok) {
                setFavoriteUsers(prev => prev.filter(u => u.id !== userId));
                window.dispatchEvent(new Event('favoritesUpdated'));
            } else {
                console.error('Error removing user from favorites:', await patchResp.text());
            }
        } catch (err) {
            console.error('Error removing user from favorites:', err);
        } finally {
            setIsLikeLoading(null);
        }
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

    const handleComplaintUser = (userId: number) => {
        const token = getAuthToken();
        if (!token) {
            alert('Пожалуйста, войдите в систему чтобы подать жалобу');
            return;
        }
        setComplaintUserId(userId);
        setShowComplaintModal(true);
    };

    const handleCloseComplaintModal = () => {
        setShowComplaintModal(false);
        setComplaintUserId(null);
    };

    const handleCloseModal = () => {
        setShowReviewModal(false);
        setSelectedMasterId(null);
    };

    if (isLoading) {
        return <PageLoader text={t('components:favorites.loading', 'Загрузка избранного...')} />;
    }

    const token = getAuthToken();
    const showTabs = !!token;
    const hasOrders = favoriteTickets.length > 0;
    const hasUsers = favoriteUsers.length > 0;
    const hasNoFavorites = !hasOrders && !hasUsers;
    const secondTabLabel = t('pages.favorites.users');
    const secondTabItems = favoriteUsers;
    const hasSecondTabItems = hasUsers;

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
        if (showOnlyServices) result = result.filter(t => t.service);
        else if (showOnlyAnnouncements) result = result.filter(t => !t.service);

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
    if (!token && hasNoFavorites) {
        return (
            <div className={styles.recommendation}>
                <div className={styles.recommendation_wrap}>
                    <EmptyState
                        title={t('messages.authRequired')}
                        subtitle={t('pages.favorites.noFavoritesHint')}
                    />
                </div>
            </div>
        );
    }

    if (hasNoFavorites) {
        return (
            <div className={styles.recommendation}>
                <div className={styles.recommendation_wrap}>
                    <EmptyState
                        title={t('pages.favorites.noFavorites')}
                        subtitle={t('pages.favorites.noFavoritesHint')}
                    />
                </div>
            </div>
        );
    }

    return (
        <div className={styles.recommendation}>
            <Back className={styles.backButtonSpacing} />
            {/* Переключатель вкладок: Объявления / Пользователи */}
            {showTabs && (
                <div className={styles.tabs}>
                    <button
                        className={`${styles.tab} ${styles.tabLeft} ${activeTab === 'orders' ? styles.active : ''}`}
                        onClick={() => setActiveTab('orders')}
                    >
                        {t('pages.favorites.announcements')}
                    </button>

                    <button
                        className={`${styles.tab} ${styles.tabRight} ${activeTab === 'masters' ? styles.active : ''}`}
                        onClick={() => setActiveTab('masters')}
                    >
                        {secondTabLabel}
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
                    <Card
                        key={`${ticket.id}-${ticket.type}-${index}`}
                        title={ticket.title}
                        description={textHelper(ticket.description)}
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
                        photos={ticket.photos}
                        authorImage={ticket.authorImage}
                        negotiableBudget={ticket.negotiableBudget}
                        onClick={() => handleCardClick(ticket.authorId, ticket.id)}
                    />
                ))}

                {/* Отображение пользователей (мастера + клиенты объединены) */}
                {activeTab === 'masters' && showTabs && hasSecondTabItems && secondTabItems.map((user) => (
                    <div
                        key={user.id}
                        onClick={() => navigate(ROUTES.PROFILE_BY_ID(user.id))}
                        style={{ cursor: 'pointer'}}
                    >
                        <ProfileHeader
                            readOnly
                            avatar={formatProfileImageUrl(user.image || '')}
                            fullName={[user.surname, user.name].filter(Boolean).join(' ')}
                            email={user.email}
                            specialty={user.specialties[0] || ''}
                            specialties={user.specialties}
                            rating={user.rating || 0}
                            reviewsCount={user.reviewsCount || 0}
                            editingField={null}
                            tempValue=""
                            occupations={[]}
                            isLoading={false}
                            userRole={user.role}
                            onAvatarClick={() => {}}
                            onFileChange={() => {}}
                            onImageError={() => {}}
                            onEditStart={() => {}}
                            onTempValueChange={() => {}}
                            onInputSave={() => {}}
                            onInputKeyPress={() => {}}
                            onSpecialtySave={() => {}}
                            onEditCancel={() => {}}
                            gender={user.gender}
                            isOnline={user.isOnline}
                            lastSeen={user.lastSeen ?? undefined}
                            isLiked
                            isLikeLoading={isLikeLoading === user.id}
                            onLike={() => handleLikeUser(user.id)}
                            onChat={() => handleMasterChat(user.id)}
                            onReview={() => handleMasterReview(user.id)}
                            onComplaint={() => handleComplaintUser(user.id)}
                        />
                    </div>
                ))}
            </div>

            <Review
                isOpen={showReviewModal}
                onClose={handleCloseModal}
                onSuccess={() => handleCloseModal()}
                onError={() => {}}
                ticketId={0}
                targetUserId={selectedMasterId || 0}
                showServiceSelector={true}
            />
            <CookieConsentBanner/>
            {showComplaintModal && complaintUserId !== null && (
                <Complaint
                    isOpen={showComplaintModal}
                    onClose={handleCloseComplaintModal}
                    onSuccess={() => handleCloseComplaintModal()}
                    onError={() => {}}
                    targetUserId={complaintUserId}
                />
            )}
        </div>
    );
}

export default Favorites;