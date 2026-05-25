import { useState, useEffect, useRef } from 'react';
import { getAuthToken, getUserRole, getUserData } from '../../utils/auth';
import styles from './Favorite.module.scss';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../../app/routers/routes';
import { createChatWithAuthor, getChatsMe } from "../../utils/chatUtils";
import { textHelper } from '../../utils/textHelper';
import { useTranslation } from 'react-i18next';
import { useLanguageChange, useShowMore } from '../../hooks';
import { Card } from '../../shared/ui/Ticket/Card/Card';
import CookieConsentBanner from "../../widgets/Banners/CookieConsentBanner/CookieConsentBanner";
import { ServiceTypeFilter } from '../../widgets/Sorting/TypeFilter';
import { SortingFilter } from '../../widgets/Sorting/CriteriaFilter';
import { PageLoader } from '../../widgets/PageLoader';
import { EmptyState } from '../../widgets/EmptyState';
import { ProfileHeader } from '../profile/shared/ui/ProfileHeader';
import Feedback from '../../shared/ui/Modal/Feedback';
import Status from '../../shared/ui/Modal/Status';
import { Tabs } from '../../shared/ui/Tabs';
import { IoListOutline, IoPeopleOutline } from 'react-icons/io5';
import { ShowMore } from '../../shared/ui/Button/ShowMore/ShowMore';
import { SelectSearch } from '../../shared/ui/SelectSearch';
import { getPageSize } from '../../utils/pageSize';
import { parsePagedResponse, getTicketFullAddress, applyFavoriteSort, universalApiRequest } from '../../utils/apiHelper';
import { formatTicketImageUrl, formatProfileImageUrl } from '../../utils/imageHelper';
import type { User, Ticket, SortByType, SecondarySortByType, TimeFilterType, LocalStorageFavorites, FavoriteEntry, FavoriteTicketView, FavoriteUserView } from '../../entities';
import { getSessionJSON } from '../../utils/storageHelper';
import { API_BASE_URL } from '../../utils/config';

// FavoriteTicketView and FavoriteUserView are defined in entities/Favorite
const FAV_FILTERS_KEY = 'fav-filters';

function Favorites() {
    const [favoriteTickets, setFavoriteTicketViews] = useState<FavoriteTicketView[]>([]);
    const [favoriteUsers, setFavoriteUserViews] = useState<FavoriteUserView[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isFavoritesRefreshing, setIsFavoritesRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState<'orders' | 'masters'>('orders');
    const [_likedTickets, setLikedTickets] = useState<number[]>([]);
    const [isLikeLoading, setIsLikeLoading] = useState<number | null>(null);
    const { page, setPage, appendRef: appendFavRef, skipFetchRef: skipFavFetchRef, setHasMore, showMoreProps: favShowMoreProps } = useShowMore<any>(() => {}, { initialSkip: true });
    const ticketsPerPageRef = useRef<number[]>([]);
    const usersPerPageRef = useRef<number[]>([]);
    const pageRef = useRef(1);
    useEffect(() => { pageRef.current = page; }, [page]);

    // Фильтры — восстанавливаем из sessionStorage
    const [_favSession] = useState(() => getSessionJSON(FAV_FILTERS_KEY));
    const [showOnlyServices, setShowOnlyServices] = useState<boolean>(() => (_favSession?.showOnlyServices as boolean) ?? false);
    const [showOnlyAnnouncements, setShowOnlyAnnouncements] = useState<boolean>(() => (_favSession?.showOnlyAnnouncements as boolean) ?? false);
    const [sortBy, setSortBy] = useState<SortByType>(() => ((_favSession?.sortBy as string) || 'newest') as SortByType);
    const [secondarySortBy, setSecondarySortBy] = useState<SecondarySortByType>(() => ((_favSession?.secondarySortBy as string) || 'none') as SecondarySortByType);
    const [timeFilter, setTimeFilter] = useState<TimeFilterType>(() => ((_favSession?.timeFilter as string) || 'all') as TimeFilterType);
    // Восстанавливаем позицию прокрутки и страницу при возврате
    const savedPageRef = useRef<number>(Math.max(1, (_favSession?._savedPage as number) || 1));
    const restoreScrollRef = useRef<number>((_favSession?._savedScrollY as number) || 0);
    // Персистенция фильтров
    useEffect(() => {
        try { sessionStorage.setItem(FAV_FILTERS_KEY, JSON.stringify({ showOnlyServices, showOnlyAnnouncements, sortBy, secondarySortBy, timeFilter })); } catch { /* ignore */ }
    }, [showOnlyServices, showOnlyAnnouncements, sortBy, secondarySortBy, timeFilter]);
    // Сохраняем позицию и страницу при уходе со страницы
    useEffect(() => {
        return () => {
            try {
                const existing = sessionStorage.getItem(FAV_FILTERS_KEY);
                const cur = existing ? JSON.parse(existing) : {};
                sessionStorage.setItem(FAV_FILTERS_KEY, JSON.stringify({
                    ...cur,
                    _savedPage: pageRef.current,
                    _savedScrollY: window.scrollY,
                }));
            } catch { /* ignore */ }
        };
    }, []);
    // Состояния отклика
    const [respondedTickets, setRespondedTickets] = useState<Set<number>>(new Set());
    const [respondingTicketId, setRespondingTicketId] = useState<number | null>(null);
    const [respondModal, setRespondModal] = useState<{ open: boolean; type: 'success' | 'error'; message: string }>({ open: false, type: 'success', message: '' });
    const [searchQuery, setSearchQuery] = useState('');

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

    // Загрузка избранного при монтировании (с восстановлением страниц и скролла)
    useEffect(() => {
        const doRestore = async () => {
            const targetPage = savedPageRef.current;
            if (targetPage > 1) {
                await fetchFavoritesRef.current(1);
                for (let p = 2; p <= targetPage; p++) {
                    appendFavRef.current = true;
                    await fetchFavoritesRef.current(p);
                }
                skipFavFetchRef.current = true;
                setPage(targetPage);
                if (restoreScrollRef.current > 0) {
                    requestAnimationFrame(() => {
                        window.scrollTo({ top: restoreScrollRef.current, behavior: 'instant' });
                    });
                }
            } else {
                await fetchFavoritesRef.current(1);
            }
            // Сбрасываем сохранённые значения, чтобы F5 не восстанавливал старое состояние
            try {
                const existing = sessionStorage.getItem(FAV_FILTERS_KEY);
                const cur = existing ? JSON.parse(existing) : {};
                delete cur._savedPage;
                delete cur._savedScrollY;
                sessionStorage.setItem(FAV_FILTERS_KEY, JSON.stringify(cur));
            } catch { /* ignore */ }
        };
        doRestore();
        const token = getAuthToken();
        if (token) {
            (async () => {
                try {
                    const data = await getChatsMe();
                    const chats: any[] = data;
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
        fetchFavoritesRef.current();
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
    const fetchFavoritesRef = useRef<(pageOverride?: number) => Promise<void>>(null!);
    const isInitialLoadRef = useRef(true);
    const isSortMountRef = useRef(false);

    // При смене страницы перезагружаем избранное
    useEffect(() => {
        if (skipFavFetchRef.current) {
            skipFavFetchRef.current = false;
            return;
        }
        fetchFavoritesRef.current?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page]);

    const handleLoadLessFavorites = () => {
        const lastTickets = ticketsPerPageRef.current[ticketsPerPageRef.current.length - 1] ?? 0;
        const lastUsers = usersPerPageRef.current[usersPerPageRef.current.length - 1] ?? 0;
        ticketsPerPageRef.current = ticketsPerPageRef.current.slice(0, -1);
        usersPerPageRef.current = usersPerPageRef.current.slice(0, -1);
        skipFavFetchRef.current = true;
        setPage(p => p - 1);
        setFavoriteTicketViews(prev => prev.slice(0, prev.length - lastTickets));
        setFavoriteUserViews(prev => prev.slice(0, prev.length - lastUsers));
        setHasMore(true);
    };

    const handleClearFavorites = () => {
        const firstTickets = ticketsPerPageRef.current[0] ?? 0;
        const firstUsers = usersPerPageRef.current[0] ?? 0;
        ticketsPerPageRef.current = [firstTickets];
        usersPerPageRef.current = [firstUsers];
        skipFavFetchRef.current = true;
        setPage(1);
        setFavoriteTicketViews(prev => prev.slice(0, firstTickets));
        setFavoriteUserViews(prev => prev.slice(0, firstUsers));
        setHasMore(true);
    };

    // Сбрасываем страницу при смене вкладки
    useEffect(() => {
        ticketsPerPageRef.current = [];
        usersPerPageRef.current = [];
        setPage(1);
    }, [activeTab]);

    // При смене сортировки — сбрасываем на страницу 1 и перезагружаем
    useEffect(() => {
        if (!isSortMountRef.current) { isSortMountRef.current = true; return; }
        ticketsPerPageRef.current = [];
        usersPerPageRef.current = [];
        appendFavRef.current = false;
        if (pageRef.current !== 1) {
            skipFavFetchRef.current = true;
        }
        setPage(1);
        fetchFavoritesRef.current(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sortBy, secondarySortBy]);

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

    // Загрузка избранного из localStorage для неавторизованных пользователей
    const loadLocalStorageFavorites = (): LocalStorageFavorites => {
        try {
            const stored = localStorage.getItem('favorites');
            if (stored) {
                const parsed = JSON.parse(stored);
                return {
                    tickets: Array.isArray(parsed.tickets) ? parsed.tickets : [],
                    users: Array.isArray(parsed.users) ? parsed.users : [] as number[],
                };
            }
        } catch { /* ignore */ }
        return { tickets: [], users: [] };
    };

    const saveLocalStorageFavorites = (favorites: LocalStorageFavorites) => {
        try {
            localStorage.setItem('favorites', JSON.stringify(favorites));
        } catch { /* ignore */ }
    };

    useEffect(() => {
        const handleFavoritesUpdate = () => {
            console.log('Favorites updated, refreshing...');
            fetchFavoritesRef.current();
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


    const fetchTicketDetails = async (ticketId: number): Promise<FavoriteTicketView | null> => {
        try {
            const ticket: Ticket = await universalApiRequest(`/api/tickets/${ticketId}`);

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
                price: ticket.budget ?? 0,
                unit: (typeof ticket.unit === 'object' ? ticket.unit?.title : ticket.unit) || 'tjs',
                description: ticket.description || 'Описание отсутствует',
                address: getTicketFullAddress(ticket),
                date: ticket.createdAt ?? '',
                author: authorName,
                authorId: authorId,
                timeAgo: ticket.createdAt ?? '',
                category: ticket.category?.title || 'другое',
                subcategory: ticket.subcategory?.title,
                status: getTicketStatus(ticket.active, ticket.service),
                type: userType,
                active: ticket.active,
                service: ticket.service,
                userRating: isMasterTicket ? (ticket.master?.rating || 0) : (ticket.author?.rating || 0),
                userReviewCount: ticket.reviewsCount || 0,
                responsesCount: ticket.responsesCount,
                viewsCount: ticket.viewsCount,
                photos: (ticket.images || ticket.ticketImages)?.map(img => formatTicketImageUrl(img.image)).filter(Boolean) as string[],
                negotiableBudget: ticket.negotiableBudget,
            };

        } catch (error) {
            console.error(`Error fetching ticket details for ID ${ticketId}:`, error);
            return null;
        }
    };

    // Алиас для обратной совместимости с вызовами для неавторизованных
    const fetchTicketDetailsForUnauthorized = fetchTicketDetails;

    const fetchUserProfile = async (userId: number): Promise<FavoriteUserView | null> => {
        try {
            const locale = localStorage.getItem('i18nextLng') || 'ru';
            const response = await fetch(`${API_BASE_URL}/api/users/${userId}?locale=${locale}`, {
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }
            });
            if (!response.ok) return null;
            const u: User = await response.json();
            const isMaster = u.roles?.includes('ROLE_MASTER') ?? false;
            return {
                entryId: 0,
                id: u.id,
                email: u.email || '',
                name: u.name || '',
                surname: u.surname || '',
                rating: u.rating || 0,
                image: u.image ? formatProfileImageUrl(String(u.image)) : (u.imageExternalUrl ? String(u.imageExternalUrl) : null),
                role: isMaster ? 'master' : 'client',
                specialties: ((u as { occupation?: Array<{ id: number; title: string }> }).occupation || []).map(o => o.title),
                reviewsCount: (u as { reviewsCount?: number }).reviewsCount || 0,
                gender: (u as { gender?: string }).gender,
                isOnline: u.isOnline,
                lastSeen: u.lastSeen,
            };
        } catch {
            return null;
        }
    };

    const fetchFavorites = async (pageOverride?: number) => {
        try {
            setIsFavoritesRefreshing(true);
            if (isInitialLoadRef.current) {
                setIsLoading(true);
            }
            const token = getAuthToken();

            // Для неавторизованных пользователей
            if (!token) {
                const localFavorites = loadLocalStorageFavorites();

                setLikedTickets(localFavorites.tickets);

                const tickets: FavoriteTicketView[] = [];
                for (const ticketId of localFavorites.tickets) {
                    const ticketDetails = await fetchTicketDetailsForUnauthorized(ticketId);
                    if (ticketDetails) tickets.push(ticketDetails);
                }

                const users: FavoriteUserView[] = [];
                for (const userId of (localFavorites.users ?? [])) {
                    const userProfile = await fetchUserProfile(userId);
                    if (userProfile) users.push(userProfile);
                }

                const sortedUnauthTickets = applyFavoriteSort(tickets, sortBy);
                const finalUnauthTickets = secondarySortBy !== 'none' ? applyFavoriteSort(sortedUnauthTickets, secondarySortBy) : sortedUnauthTickets;
                setFavoriteTicketViews(finalUnauthTickets);
                setFavoriteUserViews(users);
                setIsLoading(false);
                return;
            }

            // Авторизованные — новый flat-list API
            const locale = localStorage.getItem('i18nextLng') || 'ru';
            const pageSize = getPageSize();
            const currentPage = pageOverride ?? page;
            const response = await fetch(`${API_BASE_URL}/api/favorites/me?locale=${locale}&page=${currentPage}&itemsPerPage=${pageSize}`, {
                headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
            });

            if (response.ok) {
                const rawData = await response.json();
                const { items: entries, hasMore: fetchedHasMore } = parsePagedResponse<FavoriteEntry>(rawData, currentPage, pageSize);

                const tickets: FavoriteTicketView[] = [];
                const users: FavoriteUserView[] = [];

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
                            unit: (typeof ticket.unit === 'object' ? ticket.unit?.title : ticket.unit) || 'tjs',
                            description: ticket.description || '',
                            address: getTicketFullAddress(ticket),
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
                            responsesCount: ticket.responsesCount,
                            viewsCount: ticket.viewsCount,
                            photos: (ticket.images || ticket.ticketImages)?.map(img => formatTicketImageUrl(img.image)).filter(Boolean) as string[],
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
                            specialties: ((u as { occupation?: Array<{ id: number; title: string }> }).occupation || []).map(o => o.title),
                            reviewsCount: (u as { reviewsCount?: number }).reviewsCount ?? 0,
                            gender: u.gender,
                            isOnline: u.isOnline,
                            lastSeen: u.lastSeen,
                        });
                    }
                }

                // Sort per page so "Show More" appends sorted items at the end without re-mixing all pages
                const sortedPage = applyFavoriteSort(tickets, sortBy);
                const finalTickets = secondarySortBy !== 'none' ? applyFavoriteSort(sortedPage, secondarySortBy) : sortedPage;

                if (appendFavRef.current) {
                    appendFavRef.current = false;
                    setFavoriteTicketViews(prev => [...prev, ...finalTickets]);
                    setFavoriteUserViews(prev => [...prev, ...users]);
                    ticketsPerPageRef.current = [...ticketsPerPageRef.current, finalTickets.length];
                    usersPerPageRef.current = [...usersPerPageRef.current, users.length];
                    setLikedTickets(prev => [...prev, ...finalTickets.map(t => t.id)]);
                } else {
                    setFavoriteTicketViews(finalTickets);
                    setFavoriteUserViews(users);
                    ticketsPerPageRef.current = [finalTickets.length];
                    usersPerPageRef.current = [users.length];
                    setLikedTickets(finalTickets.map(t => t.id));
                }
                setHasMore(fetchedHasMore);
            } else {
                console.error('Favorites - Error fetching favorites:', response.status);
                setHasMore(false);
                setFavoriteTicketViews([]);
                setFavoriteUserViews([]);
                setLikedTickets([]);
            }
        } catch (error) {
            console.error('Error fetching favorites:', error);
            setFavoriteTicketViews([]);
            setFavoriteUserViews([]);
            setLikedTickets([]);
        } finally {
            isInitialLoadRef.current = false;
            setIsLoading(false);
            setIsFavoritesRefreshing(false);
        }
    };

    // Всегда держим ref актуальным, чтобы event listener не имел stale closure
    fetchFavoritesRef.current = fetchFavorites as () => Promise<void>;

    // Удалить / добавить пользователя в избранное
    const handleLikeUser = async (userId: number) => {
        const token = getAuthToken();

        // Неавторизованный: сохраняем в localStorage
        if (!token) {
            const localFavorites = loadLocalStorageFavorites();
            const isLiked = (localFavorites.users ?? []).includes(userId);
            const updatedUsers = isLiked
                ? (localFavorites.users ?? []).filter(id => id !== userId)
                : [...(localFavorites.users ?? []), userId];
            saveLocalStorageFavorites({ ...localFavorites, users: updatedUsers });
            if (isLiked) {
                setFavoriteUserViews(prev => prev.filter(u => u.id !== userId));
            }
            window.dispatchEvent(new Event('favoritesUpdated'));
            return;
        }

        const entry = favoriteUsers.find(u => u.id === userId);
        if (!entry) return;

        setIsLikeLoading(userId);
        try {
            const res = await fetch(`${API_BASE_URL}/api/favorites/${entry.entryId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` },
            });
            if (res.ok || res.status === 204) {
                setFavoriteUserViews(prev => prev.filter(u => u.id !== userId));
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
                setFavoriteTicketViews(prev => prev.filter(t => t.id !== ticketId));
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
                if (ticketDetails) setFavoriteTicketViews(prev => [...prev, ticketDetails]);
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
            setFavoriteTicketViews(prev => prev.filter(t => t.id !== ticketId));
        } else {
            updatedTickets = [...localFavorites.tickets, ticketId];
            setLikedTickets(prev => [...prev, ticketId]);
            const ticketDetails = await fetchTicketDetailsForUnauthorized(ticketId);
            if (ticketDetails) setFavoriteTicketViews(prev => [...prev, ticketDetails]);
        }

        saveLocalStorageFavorites({ ...localFavorites, tickets: updatedTickets });
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
        return (
            <div className={styles.recommendation}>
                <div className={styles.recommendation_empty}>
                    <PageLoader text={t('components:favorites.loading', 'Загрузка избранного...')} fullPage={false} />
                </div>
            </div>
        );
    }

    const token = getAuthToken();
    const showTabs = favoriteTickets.length > 0 || favoriteUsers.length > 0;
    const hasOrders = favoriteTickets.length > 0;
    const hasUsers = favoriteUsers.length > 0;
    const hasNoFavorites = !hasOrders && !hasUsers;
    const secondTabLabel = t('pages.favorites.users');
    const hasSecondTabItems = hasUsers;

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

        // Поиск
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            result = result.filter(t =>
                t.title?.toLowerCase().includes(q) ||
                t.description?.toLowerCase().includes(q) ||
                t.category?.toLowerCase().includes(q) ||
                t.author?.toLowerCase().includes(q)
            );
        }

        return result;
    })();

    const filteredUsers = searchQuery.trim()
        ? favoriteUsers.filter(u => {
            const q = searchQuery.toLowerCase();
            return (
                u.name?.toLowerCase().includes(q) ||
                u.surname?.toLowerCase().includes(q) ||
                u.specialties?.some(s => s.toLowerCase().includes(q))
            );
          })
        : favoriteUsers;

    // Для неавторизованных пользователей показываем сообщение о необходимости авторизации
    if (!token && hasNoFavorites) {
        return (
            <div className={styles.recommendation}>
                <div className={styles.recommendation_empty}>
                    <EmptyState
                        title={t('messages.authRequired')}
                        subtitle={t('pages.favorites.noFavoritesHint')}
                        isLoading={isFavoritesRefreshing}
                        actionText={t('header:login')}
                        onAction={() => window.dispatchEvent(new CustomEvent('openAuthModal'))}
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

            {/* Поиск */}
            <div className={styles.searchWrapper}>
                <SelectSearch
                    altMode
                    options={[]}
                    value={searchQuery}
                    onChange={setSearchQuery}
                    placeholder={t('common:search')}
                />
            </div>

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
                {activeTab === 'masters' && !hasSecondTabItems && (
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
                        responsesCount={ticket.responsesCount}
                        viewsCount={ticket.viewsCount}
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
                {activeTab === 'masters' && filteredUsers.length > 0 && filteredUsers.map((user) => (
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
                            isLiked={token ? true : (loadLocalStorageFavorites().users ?? []).includes(user.id)}
                            isLikeLoading={isLikeLoading === user.id}
                            onLike={() => handleLikeUser(user.id)}
                            onChat={token ? () => handleMasterChat(user.id) : undefined}
                            onReview={token ? () => handleMasterReview(user.id) : undefined}
                            onComplaint={token ? () => handleComplaintUser(user.id) : undefined}
                        />
                    </div>
                ))}
            </div>

            {((activeTab === 'orders' || !showTabs) ? hasOrders : hasSecondTabItems) && (
                <ShowMore
                    {...favShowMoreProps}
                    onShowLess={handleLoadLessFavorites}
                    onClear={handleClearFavorites}
                    showMoreText={t('common:app.showMore')}
                    showLessText={t('common:app.showLess')}
                    loading={isFavoritesRefreshing}
                    horizontal
                />
            )}

            <Feedback
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
                <Feedback
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