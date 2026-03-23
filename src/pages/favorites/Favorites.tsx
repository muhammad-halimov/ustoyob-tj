import { useState, useEffect, useRef } from 'react';
import { getAuthToken, getUserRole, getUserData } from '../../utils/auth';
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
import FeedbackModal from '../../shared/ui/Modal/Feedback';
import Status from '../../shared/ui/Modal/Status';
import { Back } from '../../shared/ui/Button/Back/Back.tsx';
import { Tabs } from '../../shared/ui/Tabs';
import { IoListOutline, IoPeopleOutline } from 'react-icons/io5';

// ── New flat-entry shape from the API ──────────────────────────────────────────
// GET /api/favorites/me  →  array of FavoriteEntry (hydra:member)
// POST /api/favorites    →  { user: IRI } | { ticket: IRI }   → FavoriteEntry
// DELETE /api/favorites/{id}

interface ApiUser {
    id: number;
    email?: string;
    name?: string;
    surname?: string;
    image?: string | null;
    imageExternalUrl?: string | null;
    rating?: number;
    roles?: string[];
    occupation?: Array<{ id: number; title: string }>;
    reviewsCount?: number;
    gender?: string;
    isOnline?: boolean;
    lastSeen?: string | null;
}

interface ApiTicketAddress {
    id: number;
    province?: { id: number; title: string };
    city?: { id: number; title: string; image?: string | null };
    district?: { id: number; title: string };
    suburb?: { id: number; title: string };
    village?: { id: number; title: string };
    settlement?: { id: number; title: string };
    community?: { id: number; title: string };
}

interface ApiTicketInEntry {
    id: number;
    title?: string;
    description?: string;
    budget?: number;
    unit?: { id: number; title: string };
    active: boolean;
    service: boolean;
    createdAt?: string;
    reviewsCount?: number;
    images?: { id: number; image: string }[];
    negotiableBudget?: boolean;
    category?: { title: string };
    subcategory?: { title: string } | null;
    author?: ApiUser | null;
    master?: ApiUser | null;
    addresses?: ApiTicketAddress[];
    address?: { title?: string; city?: { title?: string } } | null;
    district?: { title?: string; city?: { title?: string } } | null;
}

// One row returned by GET /api/favorites/me
interface FavoriteEntry {
    id: number;            // entry id (used for DELETE)
    type: 'user' | 'ticket';
    user: ApiUser | null;
    ticket: ApiTicketInEntry | null;
}

// ── Local view-model shapes ───────────────────────────────────────────────────

interface FavoriteTicket {
    entryId: number;       // entry id for DELETE
    id: number;            // ticket id
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
    entryId: number;       // entry id for DELETE
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

// Legacy API ticket shape (kept for standalone fetchTicketDetails used by unauth users)
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
    tickets: number[];
}

type SortByType = 'newest' | 'oldest' | 'price-asc' | 'price-desc' | 'reviews-asc' | 'reviews-desc' | 'rating-asc' | 'rating-desc';
type SecondarySortByType = 'none' | SortByType;
type TimeFilterType = 'all' | 'today' | 'yesterday' | 'week' | 'month';

const FAV_FILTERS_KEY = 'fav-filters';
function getFavSession(): Record<string, unknown> | null {
    try { const r = sessionStorage.getItem(FAV_FILTERS_KEY); return r ? JSON.parse(r) : null; } catch { return null; }
}

function Favorites() {
    const [favoriteTickets, setFavoriteTickets] = useState<FavoriteTicket[]>([]);
    const [favoriteUsers, setFavoriteUsers] = useState<FavoriteUser[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isFavoritesRefreshing, setIsFavoritesRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState<'orders' | 'masters'>('orders');
    const [_likedTickets, setLikedTickets] = useState<number[]>([]);
    const [isLikeLoading, setIsLikeLoading] = useState<number | null>(null);

    // Фильтры — восстанавливаем из sessionStorage
    const [_favSession] = useState(() => getFavSession());
    const [showOnlyServices, setShowOnlyServices] = useState<boolean>(() => (_favSession?.showOnlyServices as boolean) ?? false);
    const [showOnlyAnnouncements, setShowOnlyAnnouncements] = useState<boolean>(() => (_favSession?.showOnlyAnnouncements as boolean) ?? false);
    const [sortBy, setSortBy] = useState<SortByType>(() => ((_favSession?.sortBy as string) || 'newest') as SortByType);
    const [secondarySortBy, setSecondarySortBy] = useState<SecondarySortByType>(() => ((_favSession?.secondarySortBy as string) || 'none') as SecondarySortByType);
    const [timeFilter, setTimeFilter] = useState<TimeFilterType>(() => ((_favSession?.timeFilter as string) || 'all') as TimeFilterType);
    // Персистенция фильтров
    useEffect(() => {
        try { sessionStorage.setItem(FAV_FILTERS_KEY, JSON.stringify({ showOnlyServices, showOnlyAnnouncements, sortBy, secondarySortBy, timeFilter })); } catch { /* ignore */ }
    }, [showOnlyServices, showOnlyAnnouncements, sortBy, secondarySortBy, timeFilter]);
    // Состояния отклика
    const [respondedTickets, setRespondedTickets] = useState<Set<number>>(new Set());
    const [respondingTicketId, setRespondingTicketId] = useState<number | null>(null);
    const [respondModal, setRespondModal] = useState<{ open: boolean; type: 'success' | 'error'; message: string }>({ open: false, type: 'success', message: '' });

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
    const currentUserId = getUserData()?.id;
    const { t } = useTranslation(['components', 'common']);
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

    // Загрузка избранного при монтировании
    useEffect(() => {
        fetchFavorites();
        const token = getAuthToken();
        if (token) {
            (async () => {
                try {
                    const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/chats/me`, {
                        headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
                    });
                    if (!res.ok) return;
                    const data = await res.json();
                    const chats: any[] = data['hydra:member'] || (Array.isArray(data) ? data : []);
                    const ids = new Set<number>();
                    chats.forEach((chat: any) => {
                        const t = chat.ticket;
                        const cid = t?.id ?? (() => { const m = String(t?.['@id'] || '').match(/\/\d+$/); return m ? parseInt(m[0].slice(1)) : null; })();
                        if (cid) ids.add(cid);
                    });
                    if (ids.size > 0) setRespondedTickets(ids);
                } catch { /* ignore */ }
            })();
        }
    }, []);

    const handleRespondCard = async (ticketId: number, authorId: number) => {
        const token = getAuthToken();
        if (!token) {
            window.dispatchEvent(new CustomEvent('openAuthModal'));
            return;
        }
        if (respondedTickets.has(ticketId) || respondingTicketId === ticketId) return;
        setRespondingTicketId(ticketId);
        try {
            const chat = await createChatWithAuthor(authorId, ticketId);
            if (chat) {
                setRespondedTickets(prev => new Set(prev).add(ticketId));
                setRespondModal({ open: true, type: 'success', message: 'Вы успешно откликнулись!' });
            } else {
                setRespondModal({ open: true, type: 'error', message: 'Не удалось откликнуться. Попробуйте ещё раз.' });
            }
        } catch (e) {
            const msg = e instanceof Error ? e.message : 'Не удалось откликнуться. Попробуйте ещё раз.';
            setRespondModal({ open: true, type: 'error', message: msg });
        } finally {
            setRespondingTicketId(null);
        }
    };
    
    // Хук для реактивного обновления при смене языка
    useLanguageChange(() => {
        fetchFavorites();
    });

    // Состояния для модального окна отзыва
    const [showReviewModal, setShowReviewModal] = useState(false);
    const [selectedMasterId, setSelectedMasterId] = useState<number | null>(null);
    const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);

    // Состояния для модального окна жалобы
    const [showComplaintModal, setShowComplaintModal] = useState(false);
    const [complaintUserId, setComplaintUserId] = useState<number | null>(null);
    const [complaintTicketId, setComplaintTicketId] = useState<number | null>(null);

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
                const parsed = JSON.parse(stored);
                return { tickets: Array.isArray(parsed.tickets) ? parsed.tickets : [] };
            }
        } catch { /* ignore */ }
        return { tickets: [] };
    };

    const saveLocalStorageFavorites = (favorites: LocalStorageFavorites) => {
        try {
            localStorage.setItem('favorites', JSON.stringify(favorites));
        } catch { /* ignore */ }
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

        if (imagePath.startsWith('/uploads/') || imagePath.startsWith('/images/')) {
            return `${API_BASE_URL}${imagePath}`;
        } else if (imagePath.startsWith('http')) {
            return imagePath;
        } else {
            return `${API_BASE_URL}/uploads/users/${imagePath}`;
        }
    };

    const formatTicketImageUrl = (imagePath: string): string => {
        if (!imagePath) return '';
        if (imagePath.startsWith('http')) return imagePath;
        if (imagePath.startsWith('/uploads/') || imagePath.startsWith('/images/')) return `${API_BASE_URL}${imagePath}`;
        return `${API_BASE_URL}/uploads/tickets/${imagePath}`;
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
                authorName = `${ticket.master.surname || ''} ${ticket.master.name || ''}`.trim() || 'Специалист';
            } else if (ticket.author) {
                authorName = `${ticket.author.surname || ''} ${ticket.author.name || ''}`.trim() || 'Заказчик';
            }

            return {
                entryId: 0,  // unauth — no server entry id
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
            setIsFavoritesRefreshing(true);
            const token = getAuthToken();
            console.log('Fetching favorites, token exists:', !!token);

            // Для неавторизованных пользователей
            if (!token) {
                const localFavorites = loadLocalStorageFavorites();

                setLikedTickets(localFavorites.tickets);

                const tickets: FavoriteTicket[] = [];
                for (const ticketId of localFavorites.tickets) {
                    const ticketDetails = await fetchTicketDetailsForUnauthorized(ticketId);
                    if (ticketDetails) tickets.push(ticketDetails);
                }
                setFavoriteTickets(tickets);
                setIsLoading(false);
                return;
            }

            // Авторизованные — новый flat-list API
            const locale = localStorage.getItem('i18nextLng') || 'ru';
            const response = await fetch(`${API_BASE_URL}/api/favorites/me?locale=${locale}`, {
                headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
            });

            if (response.ok) {
                const data = await response.json();
                const entries: FavoriteEntry[] = data['hydra:member'] ?? (Array.isArray(data) ? data : []);

                const tickets: FavoriteTicket[] = [];
                const users: FavoriteUser[] = [];

                for (const entry of entries) {
                    if (entry.type === 'ticket' && entry.ticket) {
                        const ticket = entry.ticket;
                        const isMasterTicket = ticket.service;
                        const person = isMasterTicket ? ticket.master : ticket.author;
                        const authorId = person?.id || 0;
                        const authorName = person
                            ? `${person.surname || ''} ${person.name || ''}`.trim() || (isMasterTicket ? 'Специалист' : 'Заказчик')
                            : 'Неизвестный';
                        const authorImageSrc = person?.image || person?.imageExternalUrl;
                        tickets.push({
                            entryId: entry.id,
                            id: ticket.id,
                            title: ticket.title || 'Без названия',
                            price: ticket.budget || 0,
                            unit: ticket.unit?.title || 'tjs',
                            description: ticket.description || '',
                            address: getFullAddress(ticket as unknown as ApiTicket),
                            date: ticket.createdAt || '',
                            author: authorName,
                            authorId,
                            timeAgo: ticket.createdAt || '',
                            category: ticket.category?.title || 'другое',
                            subcategory: ticket.subcategory?.title,
                            status: getTicketStatus(ticket.active, ticket.service),
                            type: isMasterTicket ? 'master' : 'client',
                            active: ticket.active,
                            service: ticket.service,
                            authorImage: authorImageSrc ? formatProfileImageUrl(authorImageSrc) : undefined,
                            userRating: person?.rating || 0,
                            userReviewCount: ticket.reviewsCount || 0,
                            photos: ticket.images?.map(img => formatTicketImageUrl(img.image)),
                            negotiableBudget: ticket.negotiableBudget,
                        });
                    } else if (entry.type === 'user' && entry.user) {
                        const u = entry.user;
                        const isMaster = u.roles?.includes('ROLE_MASTER') ?? false;
                        users.push({
                            entryId: entry.id,
                            id: u.id,
                            email: u.email || '',
                            name: u.name || '',
                            surname: u.surname || '',
                            rating: u.rating || 0,
                            image: u.image || null,
                            role: isMaster ? 'master' : 'client',
                            specialties: (u.occupation || []).map(o => o.title),
                            reviewsCount: u.reviewsCount || 0,
                            gender: u.gender,
                            isOnline: u.isOnline,
                            lastSeen: u.lastSeen,
                        });
                    }
                }

                setFavoriteTickets(tickets);
                setFavoriteUsers(users);
                setLikedTickets(tickets.map(t => t.id));
                fetchUserOnlineStatus(users);
            } else {
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
            setIsFavoritesRefreshing(false);
        }
    };

    // Удалить пользователя из избранного — DELETE /api/favorites/{entryId}
    const handleLikeUser = async (userId: number) => {
        const token = getAuthToken();
        if (!token) return;

        const entry = favoriteUsers.find(u => u.id === userId);
        if (!entry) return;

        setIsLikeLoading(userId);
        try {
            const res = await fetch(`${API_BASE_URL}/api/favorites/${entry.entryId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` },
            });
            if (res.ok || res.status === 204) {
                setFavoriteUsers(prev => prev.filter(u => u.id !== userId));
                window.dispatchEvent(new Event('favoritesUpdated'));
            } else {
                console.error('Error removing user from favorites:', await res.text());
            }
        } catch (err) {
            console.error('Error removing user from favorites:', err);
        } finally {
            setIsLikeLoading(null);
        }
    };

    const getFullAddress = (ticket: ApiTicket): string => {
        if (ticket.addresses && ticket.addresses.length > 0) {
            const address = ticket.addresses[0];
            const parts: string[] = [];
            if (address.city?.title) parts.push(address.city.title);
            if (address.province?.title) parts.push(address.province.title);
            if (address.district?.title) parts.push(address.district.title);
            if (address.suburb?.title) parts.push(address.suburb.title);
            if (address.village?.title) parts.push(address.village.title);
            if (address.settlement?.title) parts.push(address.settlement.title);
            if (address.community?.title) parts.push(address.community.title);
            return parts.join(', ') || 'Адрес не указан';
        }
        const districtTitle = ticket.district?.title || '';
        const districtCity = ticket.district?.city?.title || '';
        const addressTitle = ticket.address?.title || '';
        const addressCity = ticket.address?.city?.title || '';
        const city = districtCity || addressCity;
        const parts: string[] = [];
        if (city) parts.push(city);
        if (districtTitle) parts.push(districtTitle);
        if (addressTitle && !districtTitle) parts.push(addressTitle);
        return parts.length > 0 ? parts.join(', ') : 'Адрес не указан';
    };

    const handleCardClick = (authorId?: number, ticketId?: number) => {
        if (!authorId || !ticketId) return;
        navigate(ROUTES.TICKET_BY_ID(ticketId));
    };

    // Удалить тикет из избранного — DELETE /api/favorites/{entryId}
    const handleUnlikeTicket = async (ticketId: number) => {
        const token = getAuthToken();
        if (!token) return;

        const entry = favoriteTickets.find(t => t.id === ticketId);
        if (!entry) return;

        try {
            const res = await fetch(`${API_BASE_URL}/api/favorites/${entry.entryId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` },
            });
            if (res.ok || res.status === 204) {
                setLikedTickets(prev => prev.filter(id => id !== ticketId));
                setFavoriteTickets(prev => prev.filter(t => t.id !== ticketId));
                window.dispatchEvent(new Event('favoritesUpdated'));
            } else {
                setRespondModal({ open: true, type: 'error', message: 'Ошибка при удалении из избранного' });
            }
        } catch {
            setRespondModal({ open: true, type: 'error', message: 'Ошибка при удалении из избранного' });
        }
    };

    // Добавить тикет в избранное — POST /api/favorites { ticket: IRI }
    const handleTicketLike = async (ticketId: number) => {
        const token = getAuthToken();
        if (!token) {
            window.dispatchEvent(new CustomEvent('openAuthModal'));
            return;
        }

        const isLiked = favoriteTickets.some(t => t.id === ticketId);
        if (isLiked) {
            await handleUnlikeTicket(ticketId);
            return;
        }

        setIsLikeLoading(ticketId);
        try {
            const res = await fetch(`${API_BASE_URL}/api/favorites`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ ticket: `/api/tickets/${ticketId}` }),
            });
            if (res.ok) {
                setLikedTickets(prev => [...prev, ticketId]);
                const ticketDetails = await fetchTicketDetails(ticketId);
                if (ticketDetails) setFavoriteTickets(prev => [...prev, ticketDetails]);
                window.dispatchEvent(new Event('favoritesUpdated'));
            } else if (res.status === 409) {
                setLikedTickets(prev => [...prev, ticketId]);
            } else {
                setRespondModal({ open: true, type: 'error', message: 'Ошибка при добавлении в избранное' });
            }
        } catch {
            setRespondModal({ open: true, type: 'error', message: 'Ошибка при добавлении в избранное' });
        } finally {
            setIsLikeLoading(null);
        }
    };

    // Для неавторизованных пользователей
    const handleTicketLikeUnauthorized = async (ticketId: number) => {
        const localFavorites = loadLocalStorageFavorites();
        const isCurrentlyLiked = localFavorites.tickets.includes(ticketId);
        let updatedTickets: number[];

        if (isCurrentlyLiked) {
            updatedTickets = localFavorites.tickets.filter(id => id !== ticketId);
            setLikedTickets(prev => prev.filter(id => id !== ticketId));
            setFavoriteTickets(prev => prev.filter(t => t.id !== ticketId));
        } else {
            updatedTickets = [...localFavorites.tickets, ticketId];
            setLikedTickets(prev => [...prev, ticketId]);
            const ticketDetails = await fetchTicketDetailsForUnauthorized(ticketId);
            if (ticketDetails) setFavoriteTickets(prev => [...prev, ticketDetails]);
        }

        saveLocalStorageFavorites({ tickets: updatedTickets });
        window.dispatchEvent(new Event('favoritesUpdated'));
    };

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
            window.dispatchEvent(new CustomEvent('openAuthModal'));
            return;
        }

        try {
            const chat = await createChatWithAuthor(authorId);
            if (chat) {
                navigate(`${ROUTES.CHATS}?chatId=${chat.id}`);
            }
        } catch (e) {
            const msg = e instanceof Error ? e.message : 'Не удалось создать чат';
            setRespondModal({ open: true, type: 'error', message: msg });
        }
    };

    // Функции для модального окна отзыва
    const handleMasterReview = (masterId: number) => {
        const token = getAuthToken();
        if (!token) {
            window.dispatchEvent(new CustomEvent('openAuthModal'));
            return;
        }

        setSelectedMasterId(masterId);
        setShowReviewModal(true);
    };

    const handleComplaintUser = (userId: number, ticketId?: number) => {
        const token = getAuthToken();
        if (!token) {
            window.dispatchEvent(new CustomEvent('openAuthModal'));
            return;
        }
        setComplaintUserId(userId);
        setComplaintTicketId(ticketId ?? null);
        setShowComplaintModal(true);
    };

    const handleCloseComplaintModal = () => {
        setShowComplaintModal(false);
        setComplaintUserId(null);
        setComplaintTicketId(null);
    };

    const handleCloseModal = () => {
        setShowReviewModal(false);
        setSelectedMasterId(null);
        setSelectedTicketId(null);
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
                <div className={styles.recommendation_empty}>
                    <EmptyState
                        title={t('messages.authRequired')}
                        subtitle={t('pages.favorites.noFavoritesHint')}
                        onRefresh={fetchFavorites}
                    />
                </div>
            </div>
        );
    }

    if (hasNoFavorites) {
        return (
            <div className={styles.recommendation}>
                <div className={styles.recommendation_empty}>
                    <EmptyState
                        isLoading={isFavoritesRefreshing}
                        title={t('pages.favorites.noFavorites')}
                        subtitle={t('pages.favorites.noFavoritesHint')}
                        onRefresh={fetchFavorites}
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
                <Tabs
                    tabs={[
                        { key: 'orders' as const, label: <><IoListOutline />{t('pages.favorites.announcements')}</> },
                        { key: 'masters' as const, label: <><IoPeopleOutline />{secondTabLabel}</> },
                    ]}
                    activeTab={activeTab}
                    onChange={setActiveTab}
                />
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
                    <EmptyState
                        isLoading={isFavoritesRefreshing}
                        title={t('common:emptyState.title')}
                        subtitle={t('pages.favorites.noFavoritesHint')}
                        onRefresh={fetchFavorites}
                    />
                )}

                {/* Пустая вкладка объявлений (есть пользователи, но нет заказов) */}
                {(activeTab === 'orders' || !showTabs) && !hasOrders && (
                    <EmptyState isLoading={isFavoritesRefreshing} title={t('pages.favorites.noFavorites')} onRefresh={fetchFavorites} />
                )}

                {/* Пустая вкладка пользователей */}
                {activeTab === 'masters' && showTabs && !hasSecondTabItems && (
                    <EmptyState isLoading={isFavoritesRefreshing} onRefresh={fetchFavorites} />
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
                        onRespondClick={ticket.authorId !== currentUserId ? (e) => { e.stopPropagation(); handleRespondCard(ticket.id, ticket.authorId); } : undefined}
                        isResponded={respondedTickets.has(ticket.id)}
                        isRespondLoading={respondingTicketId === ticket.id}
                        onReviewClick={ticket.authorId !== currentUserId ? () => { handleMasterReview(ticket.authorId); setSelectedTicketId(ticket.id); } : undefined}
                        onComplaintClick={ticket.authorId !== currentUserId ? () => handleComplaintUser(ticket.authorId, ticket.id) : undefined}
                    />
                ))}

                {/* Отображение пользователей (специалисты + заказчики объединены) */}
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

            <FeedbackModal
                mode="review"
                isOpen={showReviewModal}
                onClose={handleCloseModal}
                onSuccess={() => handleCloseModal()}
                onError={() => {}}
                ticketId={selectedTicketId || 0}
                targetUserId={selectedMasterId || 0}
                showServiceSelector={!selectedTicketId}
            />
            <CookieConsentBanner/>
            {showComplaintModal && complaintUserId !== null && (
                <FeedbackModal
                    mode="complaint"
                    isOpen={showComplaintModal}
                    onClose={handleCloseComplaintModal}
                    onSuccess={() => handleCloseComplaintModal()}
                    onError={() => {}}
                    targetUserId={complaintUserId}
                    ticketId={complaintTicketId ?? undefined}
                />
            )}
            <Status
                type={respondModal.type}
                isOpen={respondModal.open}
                onClose={() => setRespondModal(prev => ({ ...prev, open: false }))}
                message={respondModal.message}
            />
        </div>
    );
}

export default Favorites;