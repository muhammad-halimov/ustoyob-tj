import {useState, useEffect, useCallback} from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { getAuthToken, getUserRole, getUserData } from '../../../utils/auth.ts';
import { getStorageItem } from '../../../utils/storageHelper.ts';
import { Back } from '../../../shared/ui/Button/Back/Back.tsx';
import { useLanguageChange } from '../../../hooks';
import { createChatWithAuthor } from '../../../utils/chatUtils';
import Status from '../../../shared/ui/Modal/Status';
import FeedbackModal from '../../../shared/ui/Modal/Feedback';

import { EmptyState } from '../../../widgets/EmptyState';
import { ROUTES } from '../../../app/routers/routes';
import styles from './Category.module.scss';
import { Card } from '../../../shared/ui/Ticket/Card/Card.tsx';
import { ServiceTypeFilter } from '../../../widgets/Sorting/ServiceTypeFilter';
import { SortingFilter } from '../../../widgets/Sorting/SortingFilter';
import { useTranslation } from 'react-i18next';
import CookieConsentBanner from "../../../widgets/Banners/CookieConsentBanner/CookieConsentBanner.tsx";
import { getOccupations } from '../../../utils/dataCache.ts';
import { truncateText } from '../../../utils/textHelper.ts';

interface Occupation {
    id: number;
    title: string;
    image?: string;
    priority?: number;
    categories: { id: number; title: string }[];
}

interface Ticket {
    id: number;
    title: string;
    description: string;
    notice: string;
    budget: number;
    active: boolean;
    service: boolean; // true - услуга от специалиста, false - заказ от заказчика
    category: {
        id: number;
        title: string;
        image: string;
    };
    subcategory?: {
        id: number;
        title: string;
        image: string;
    } | null;
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
    images: Array<{
        id: number;
        image: string;
    }>;
    unit: {
        id: number;
        title: string;
    };
    district?: {
        id: number;
        title: string;
        image: string;
        city?: {
            id: number;
            title: string;
            image: string;
            province?: {
                id: number;
                title: string;
            };
        };
    };
    addresses?: Array<{
        id: number;
        province?: { id: number; title: string };
        district?: { id: number; title: string; image: string };
        city?: { id: number; title: string; image: string };
        settlement?: { id: number; title: string };
        community?: { id: number; title: string };
        village?: { id: number; title: string };
        suburb?: { id: number; title: string };
        title?: string; // Улица/дом/квартира
    }>;
    createdAt: string;
    updatedAt: string;
    reviewsCount?: number;
    negotiableBudget?: boolean;
}

interface FormattedTicket {
    id: number;
    title: string;
    price: number;
    unit: string;
    description: string;
    address: string;
    fullAddress: string; // Добавляем поле для полного адреса
    date: string;
    author: string;
    timeAgo: string;
    category: string;
    subcategory?: string;
    status: string;
    authorId: number;
    type: 'client' | 'master';
    authorImage?: string;
    userRating?: number;
    userReviewCount?: number;
    photos?: string[];
    negotiableBudget?: boolean;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

function getCatSession(catId: string | undefined): Record<string, unknown> | null {
    if (!catId) return null;
    try {
        const raw = sessionStorage.getItem(`cat-filters-${catId}`);
        return raw ? JSON.parse(raw) as Record<string, unknown> : null;
    } catch { return null; }
}

function Category() {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const location = useLocation();
    const [tickets, setTickets] = useState<FormattedTicket[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [categoryName, setCategoryName] = useState<string>(() => {
        const fromState = (location.state as any)?.categoryName;
        if (fromState) return fromState;
        const cached = sessionStorage.getItem(`cat-name-${id}`);
        if (cached) return cached;
        try {
            const list = JSON.parse(sessionStorage.getItem('categories-list') || '[]');
            const found = list.find((c: { id: number; title: string }) => String(c.id) === String(id));
            if (found?.title) {
                sessionStorage.setItem(`cat-name-${id}`, found.title);
                return found.title;
            }
        } catch {}
        return '';
    });
    const [userRole, setUserRole] = useState<'client' | 'master' | null>(null);
    const currentUserId = getUserData()?.id;
    const [occupations, setOccupations] = useState<Occupation[]>([]);
    const [subcategorySearchQuery, setSubcategorySearchQuery] = useState<string>('');
    // Filter & sort state — restored from sessionStorage on mount
    const [_catSession] = useState(() => getCatSession(id));
    const [selectedSubcategory, setSelectedSubcategory] = useState<number | null>(() => (_catSession?.selectedSubcategory as number | null) ?? null);
    const [showAllOccupations, setShowAllOccupations] = useState<boolean>(() => (_catSession?.showAllOccupations as boolean) ?? false);
    const [showOnlyServices, setShowOnlyServices] = useState<boolean>(() => (_catSession?.showOnlyServices as boolean) ?? false);
    const [showOnlyAnnouncements, setShowOnlyAnnouncements] = useState<boolean>(() => (_catSession?.showOnlyAnnouncements as boolean) ?? false);
    const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'price-asc' | 'price-desc' | 'reviews-asc' | 'reviews-desc' | 'rating-asc' | 'rating-desc'>(() => ((_catSession?.sortBy as string) || 'newest') as any);
    const [secondarySortBy, setSecondarySortBy] = useState<'none' | 'newest' | 'oldest' | 'price-asc' | 'price-desc' | 'reviews-asc' | 'reviews-desc' | 'rating-asc' | 'rating-desc'>(() => ((_catSession?.secondarySortBy as string) || 'none') as any);
    const [timeFilter, setTimeFilter] = useState<'all' | 'today' | 'yesterday' | 'week' | 'month'>(() => ((_catSession?.timeFilter as string) || 'all') as any);
    // Persist filter state to sessionStorage
    useEffect(() => {
        if (!id) return;
        try {
            sessionStorage.setItem(`cat-filters-${id}`, JSON.stringify({ showOnlyServices, showOnlyAnnouncements, sortBy, secondarySortBy, timeFilter, selectedSubcategory, showAllOccupations }));
        } catch { /* ignore */ }
    }, [id, showOnlyServices, showOnlyAnnouncements, sortBy, secondarySortBy, timeFilter, selectedSubcategory, showAllOccupations]);
    // Respond state
    const [respondedTickets, setRespondedTickets] = useState<Set<number>>(new Set());
    const [respondingTicketId, setRespondingTicketId] = useState<number | null>(null);
    const [respondModal, setRespondModal] = useState<{ open: boolean; type: 'success' | 'error'; message: string }>({ open: false, type: 'success', message: '' });
    const [cardReviewTarget, setCardReviewTarget] = useState<{ authorId: number; ticketId: number } | null>(null);
    const [cardComplaintTarget, setCardComplaintTarget] = useState<{ authorId: number; ticketId: number } | null>(null);
    // Check existing chats on mount
    useEffect(() => {
        const token = getAuthToken();
        if (!token) return;
        (async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/api/chats/me`, {
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
    }, []);
    const handleRespondCard = useCallback(async (ticketId: number, authorId: number) => {
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
    }, [respondedTickets, respondingTicketId]);
    const { t, i18n } = useTranslation(['components', 'category', 'ticket']);
    const locale = i18n.language;

    const setAndCacheCategoryName = (name: string) => {
        if (!name) return;
        if (id) sessionStorage.setItem(`cat-name-${id}`, name);
        setCategoryName(name);
    };

    useLanguageChange(() => {
        // При смене языка переполучаем данные для обновления локализованного контента
        if (id) {
            fetchCategoryName();
            fetchOccupations();
            // fetchTicketsByCategory вызовется автоматически через useEffect при изменении языка
        }
    });

    useEffect(() => {
        const role = getUserRole();
        const rawRole = typeof window !== 'undefined' ? localStorage.getItem('userRole') : null;
        console.log('🔥 Category - Initial mount');
        console.log('🔥 localStorage["userRole"]:', rawRole);
        console.log('🔥 getUserRole() returned:', role);
        setUserRole(role);

        if (id) {
            // НЕ вызываем fetchTicketsByCategory здесь, он вызовется из useEffect с зависимостью userRole
            fetchCategoryName();
            fetchOccupations();
        }
    }, [id]);

    // Отслеживаем изменения роли и перезагружаем данные
    useEffect(() => {
        const interval = setInterval(() => {
            const currentRole = getUserRole();
            const rawRole = typeof window !== 'undefined' ? localStorage.getItem('userRole') : null;
            if (currentRole !== userRole) {
                console.log('🔥 Category - Role changed from', userRole, 'to', currentRole);
                console.log('🔥 localStorage["userRole"]:', rawRole);
                setUserRole(currentRole);
            }
        }, 1000);
        
        return () => clearInterval(interval);
    }, [userRole]);

    // Перезагружаем данные при изменении роли или языка
    useEffect(() => {
        if (id) {
            const token = getAuthToken();
            
            // Загружаем данные если:
            // 1) userRole !== null (пользователь авторизован и роль загружена)
            // 2) !token (пользователь НЕ авторизован, userRole будет null - это нормально)
            // НЕ загружаем если: token && userRole === null (авторизован, но роль еще не загрузилась из localStorage)
            const shouldFetch = userRole !== null || !token;
            
            console.log('Category - Check if should fetch:', {
                id,
                userRole,
                hasToken: !!token,
                shouldFetch,
                locale
            });
            
            if (shouldFetch) {
                console.log('Category - Triggering data reload for role:', userRole, 'locale:', locale);
                fetchTicketsByCategory();
            } else {
                console.log('⏳ Category - Waiting for userRole to load from localStorage...');
            }
        }
    }, [userRole, id, locale, showOnlyServices, showOnlyAnnouncements, sortBy, secondarySortBy, timeFilter]);

    const formatProfileImageUrl = (imagePath: string): string => {
        if (!imagePath) return '';

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

    const formatOccupationImageUrl = (imagePath?: string): string => {
        if (!imagePath) return '/default_subcategory.png'; // Дефолтное изображение

        // Проверяем, начинается ли путь с /uploads/ или /images/
        if (imagePath.startsWith('/uploads/') || imagePath.startsWith('/images/')) {
            return `${API_BASE_URL}${imagePath}`;
        }

        // Если путь уже содержит http или просто имя файла
        if (imagePath.startsWith('http')) {
            return imagePath;
        }

        // По умолчанию используем путь из API для изображений профессий
        return `${API_BASE_URL}/uploads/occupations/${imagePath}`;
    };

    const fetchCategoryName = async () => {
        try {
            const token = getAuthToken();
            const locale = getStorageItem('i18nextLng') || 'ru';
            const headers: HeadersInit = {
                'Accept': 'application/json',
                ...(token && { 'Authorization': `Bearer ${token}` })
            };

            const response = await fetch(`${API_BASE_URL}/api/categories/${id}?locale=${locale}`, {
                headers: headers
            });

            if (response.ok) {
                const categoryData = await response.json();
                // Handle both direct object and Hydra collection / array responses
                const title =
                    categoryData?.title ||
                    (Array.isArray(categoryData) ? categoryData[0]?.title : null) ||
                    categoryData?.['hydra:member']?.[0]?.title ||
                    '';
                if (title) setAndCacheCategoryName(title);
            } else {
                // keep existing name
            }
        } catch (error) {
            console.error('Error fetching category name:', error);
            // keep whatever name we already have
        }
    };

    const fetchOccupations = async () => {
        try {
            const occupationsData = await getOccupations();
            
            const formatted: Occupation[] = occupationsData.filter((occ: { 
                id: number; 
                title: string;
                image?: string;
                priority?: number;
                categories?: { id: number; title: string }[] 
            }) => 
                occ.categories?.some(cat => cat.id.toString() === id) || false
            ).map((occ) => ({
                id: occ.id,
                title: occ.title,
                image: occ.image,
                priority: occ.priority,
                categories: occ.categories || []
            }));

            // Сортируем по priority (по возрастанию), элементы без priority — в конец
            formatted.sort((a, b) => {
                const pa = a.priority ?? Infinity;
                const pb = b.priority ?? Infinity;
                return pa - pb;
            });

            setOccupations(formatted);
        } catch (error) {
            console.error('Error fetching occupations:', error);
        }
    };

    // Функция для очистки текста
    const cleanText = useCallback((text: string): string => {
        if (!text) return '';

        let cleaned = text
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#039;/g, "'")
            .replace(/&hellip;/g, '...')
            .replace(/&mdash;/g, '—')
            .replace(/&laquo;/g, '«')
            .replace(/&raquo;/g, '»');

        cleaned = cleaned.replace(/&[a-z]+;/g, ' ');
        cleaned = cleaned.replace(/<[^>]*>/g, '');

        cleaned = cleaned
            .replace(/\s+/g, ' ')
            .replace(/\n\s*\n/g, '\n')
            .trim();

        return cleaned;
    }, []);

    // Функция для получения полного адреса
    const getFullAddress = useCallback((ticket: Ticket): string => {
        // Проверяем addresses массив (новый формат)
        if (ticket.addresses && ticket.addresses.length > 0) {
            const address = ticket.addresses[0];
            const parts: string[] = [];

            // Добавляем все компоненты адреса в правильном порядке
            if (address.province?.title) {
                parts.push(address.province.title);
            }
            if (address.city?.title) {
                parts.push(address.city.title);
            }
            if (address.district?.title) {
                parts.push(address.district.title);
            }
            if (address.settlement?.title) {
                parts.push(address.settlement.title);
            }
            if (address.community?.title) {
                parts.push(address.community.title);
            }
            if (address.village?.title) {
                parts.push(address.village.title);
            }
            if (address.suburb?.title) {
                parts.push(address.suburb.title);
            }
            // Конкретный адрес (улица, дом, квартира)
            if (address.title) {
                parts.push(address.title);
            }

            // Удаляем дубликаты и пустые значения
            const uniqueParts = Array.from(new Set(parts.filter(part => part && part.trim())));

            if (uniqueParts.length === 0) {
                return 'Адрес не указан';
            }

            return uniqueParts.join(', ');
        }

        return 'Адрес не указан';
    }, []);

    // Функция для получения краткого адреса (город, район)
    const getShortAddress = useCallback((ticket: Ticket): string => {
        // Проверяем addresses массив
        if (ticket.addresses && ticket.addresses.length > 0) {
            const address = ticket.addresses[0];
            const parts: string[] = [];

            // Только город и район
            if (address.city?.title) {
                parts.push(address.city.title);
            }
            if (address.district?.title) {
                parts.push(address.district.title);
            }

            const uniqueParts = Array.from(new Set(parts.filter(part => part && part.trim())));

            if (uniqueParts.length === 0) {
                return 'Адрес не указан';
            }

            return uniqueParts.join(', ');
        }

        // Проверяем устаревший формат
        if (ticket.district) {
            const parts: string[] = [];

            if (ticket.district.city?.title) {
                parts.push(ticket.district.city.title);
            }
            if (ticket.district?.title) {
                parts.push(ticket.district.title);
            }

            const uniqueParts = Array.from(new Set(parts.filter(part => part && part.trim())));

            if (uniqueParts.length === 0) {
                return 'Адрес не указан';
            }

            return uniqueParts.join(', ');
        }

        return 'Адрес не указан';
    }, []);

    const fetchTicketsByCategory = async () => {
        try {
            setIsLoading(true);
            const token = getAuthToken();
            const userData = getUserData();
            const currentUserId = userData?.id;
            const rawRole = typeof window !== 'undefined' ? localStorage.getItem('userRole') : null;

            console.log('============================================');
            console.log('🚀 Category - Fetching tickets for category:', id);
            console.log('🚀 Category - Selected subcategory:', selectedSubcategory);
            console.log('🚀 Category - locale:', locale);
            console.log('🚀 localStorage["userRole"]:', rawRole);
            console.log('🚀 Category - userRole STATE:', userRole);
            console.log('🚀 Category - getUserRole():', getUserRole());
            console.log('🚀 Category - Current user ID:', currentUserId);
            console.log('🚀 Category - Token exists:', !!token);
            console.log('============================================');

            if (!id) {
                console.error('Category - No category ID provided');
                setTickets([]);
                return;
            }

            // Если есть токен но роль еще не загрузилась - ждем
            if (token && userRole === null) {
                console.log('⏳ Category - Waiting for userRole to load...');
                setIsLoading(false);
                return;
            }

            // Формируем endpoint с учётом фильтров ServiceTypeFilter
            let serviceParam = '';
            if (showOnlyServices) {
                serviceParam = '&service=true';
            } else if (showOnlyAnnouncements) {
                serviceParam = '&service=false';
            }
            const endpoint = `/api/tickets?locale=${locale}&active=true&category=${id}${serviceParam}${selectedSubcategory ? `&subcategory=${selectedSubcategory}` : ''}${currentUserId ? `&author.id[ne]=${currentUserId}&master.id[ne]=${currentUserId}` : ''}`;

            console.log('✅ Category - Selected endpoint:', `${API_BASE_URL}${endpoint}`);

            const headers: HeadersInit = {
                'Accept': 'application/json',
                ...(token && { 'Authorization': `Bearer ${token}` })
            };

            const response = await fetch(`${API_BASE_URL}${endpoint}`, { headers });

            let ticketsData: Ticket[] = [];
            if (response.ok) {
                const data = await response.json();
                ticketsData = Array.isArray(data) ? data : [];
            } else {
                console.error('Category - Error fetching tickets:', response.status, response.statusText);
            }

            console.log('Category - Total tickets received:', ticketsData.length);

            // Форматируем тикеты
            const formattedTickets: FormattedTicket[] = ticketsData.map(ticket => {
                const isMasterTicket = ticket.service; // service: true - услуга от специалиста, false - заказ от заказчика 
                const author = isMasterTicket ? ticket.master : ticket.author;
                const authorId = author?.id || 0;
                const authorName = author ? `${author.surname || ''} ${author.name || ''}`.trim() : 'Пользователь';

                const fullAddress = getFullAddress(ticket);
                const shortAddress = getShortAddress(ticket);

                return {
                    id: ticket.id,
                    title: ticket.title || t('ticket:noTitle'),
                    price: ticket.budget || 0,
                    unit: ticket.unit?.title || 'TJS',
                    description: ticket.description || t('ticket:noDescription'),
                    address: shortAddress, // Краткий адрес для основного отображения
                    fullAddress: fullAddress, // Полный адрес
                    date: ticket.createdAt,
                    author: authorName,
                    authorId: authorId,
                    timeAgo: ticket.createdAt,
                    category: ticket.category?.title || 'другое',
                    subcategory: ticket.subcategory?.title,
                    status: ticket.active ? 'В работе' : 'Завершен',
                    type: isMasterTicket ? 'master' : 'client',
                    authorImage: author ? (author.image || author.imageExternalUrl ? formatProfileImageUrl(author.image || author.imageExternalUrl!) : undefined) : undefined,
                    userRating: author?.rating || 0,
                    userReviewCount: ticket.reviewsCount || 0,
                    photos: ticket.images?.map((img: { id: number; image: string }) => formatTicketImageUrl(img.image)),
                    negotiableBudget: ticket.negotiableBudget
                };
            });

            // Применяем фильтр по времени
            let filteredTickets = formattedTickets;
            if (timeFilter !== 'all') {
                const now = new Date();
                const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                const startOfYesterday = new Date(startOfToday);
                startOfYesterday.setDate(startOfYesterday.getDate() - 1);
                const startOfWeek = new Date(startOfToday);
                startOfWeek.setDate(startOfWeek.getDate() - 7);
                const startOfMonth = new Date(startOfToday);
                startOfMonth.setMonth(startOfMonth.getMonth() - 1);

                filteredTickets = formattedTickets.filter(ticket => {
                    const ticketDate = new Date(ticket.date);
                    
                    switch (timeFilter) {
                        case 'today':
                            return ticketDate >= startOfToday;
                        case 'yesterday':
                            return ticketDate >= startOfYesterday && ticketDate < startOfToday;
                        case 'week':
                            return ticketDate >= startOfWeek;
                        case 'month':
                            return ticketDate >= startOfMonth;
                        default:
                            return true;
                    }
                });
            }

            // Применяем сортировку
            const sortedTickets = [...filteredTickets].sort((a, b) => {
                // Вспомогательная функция для получения значения сортировки
                const getSortValue = (ticket: FormattedTicket, sortType: typeof sortBy | typeof secondarySortBy): number => {
                    switch (sortType) {
                        case 'newest':
                            return new Date(ticket.date).getTime();
                        case 'oldest':
                            return -new Date(ticket.date).getTime();
                        case 'price-asc':
                            return ticket.price;
                        case 'price-desc':
                            return -ticket.price;
                        case 'reviews-asc':
                            return ticket.userReviewCount || 0;
                        case 'reviews-desc':
                            return -(ticket.userReviewCount || 0);
                        case 'rating-asc':
                            return ticket.userRating || 0;
                        case 'rating-desc':
                            return -(ticket.userRating || 0);
                        default:
                            return 0;
                    }
                };

                // Основная сортировка
                const primaryDiff = getSortValue(b, sortBy) - getSortValue(a, sortBy);
                
                // Если значения равны и есть вторичная сортировка, применяем её
                if (primaryDiff === 0 && secondarySortBy !== 'none') {
                    return getSortValue(b, secondarySortBy) - getSortValue(a, secondarySortBy);
                }
                
                return primaryDiff;
            });

            setTickets(sortedTickets);

            // Fallback: if fetchCategoryName didn't populate the name yet, grab it from tickets
            if (ticketsData.length > 0) {
                const nameFromTicket = (ticketsData[0] as any)?.category?.title;
                if (nameFromTicket) {
                    setCategoryName((prev) => {
                        const next = prev || nameFromTicket;
                        if (!prev && id) sessionStorage.setItem(`cat-name-${id}`, next);
                        return next;
                    });
                }
            }
        } catch (error) {
            console.error('Error fetching tickets:', error);
            setTickets([]);
        } finally {
            setIsLoading(false);
        }
    };

    // Обработчики подкатегорий
    const handleSubcategoryClick = (subcategoryId: number | null) => {
        setSelectedSubcategory(subcategoryId);
    };

    const handleViewAllOccupations = () => {
        setShowAllOccupations(true);
    };

    const handleShowLessOccupations = () => {
        setShowAllOccupations(false);
    };

    const handleSubcategorySearch = (query: string) => {
        setSubcategorySearchQuery(query);
        // При поиске сбрасываем "показать все", чтобы показать все результаты поиска
        if (query.trim()) {
            setShowAllOccupations(false);
        }
    };

    const handleServiceToggle = () => {
        if (!showOnlyServices) {
            setShowOnlyServices(true);
            setShowOnlyAnnouncements(false);
        } else {
            setShowOnlyServices(false);
        }
    };

    const handleAnnouncementsToggle = () => {
        if (!showOnlyAnnouncements) {
            setShowOnlyAnnouncements(true);
            setShowOnlyServices(false);
        } else {
            setShowOnlyAnnouncements(false);
        }
    };

    // Определяем какие подкатегории показывать
    const getVisibleOccupations = () => {
        // Сначала фильтруем по поисковому запросу
        let filteredOccupations = occupations;
        
        if (subcategorySearchQuery.trim()) {
            const searchLower = subcategorySearchQuery.toLowerCase().trim();
            filteredOccupations = occupations.filter(occupation => 
                occupation.title.toLowerCase().includes(searchLower)
            );
        }
        
        // Потом с учетом состояния "showAllOccupations"
        if (showAllOccupations || subcategorySearchQuery.trim()) {
            return filteredOccupations;
        }
        
        // Показываем первые 8 подкатегорий
        return filteredOccupations.slice(0, Math.min(8, filteredOccupations.length));
    };

    const visibleOccupations = getVisibleOccupations();
    
    // Обновляем логику кнопок с учетом поиска
    const shouldShowViewAllOccupations = !showAllOccupations && !subcategorySearchQuery.trim() && occupations.length > 8;
    const shouldShowShowLessOccupations = showAllOccupations && occupations.length > 0;

    // Обновляем тикеты при изменении выбранной подкатегории
    useEffect(() => {
        if (id) {
            const token = getAuthToken();
            const shouldFetch = userRole !== null || !token;
            
            if (shouldFetch) {
                console.log('Category - Reloading due to subcategory change:', selectedSubcategory);
                fetchTicketsByCategory();
            } else {
                console.log('⏳ Category - Waiting for userRole before reloading subcategory...');
            }
        }
    }, [selectedSubcategory]);

    const handleCardClick = (ticketId: number) => {
        navigate(ROUTES.TICKET_BY_ID(ticketId));
    };


    const getPageTitle = () => {
        const name = categoryName ? `${truncateText(categoryName, 30)} - ` : '';
        return `${name}${t('category:allAds')}`;
    };

    // Если категория ID не передан
    if (!id) {
        return (
            <div className={styles.container}>
                <Back className={styles.backButtonSpacing} />
                <div className={styles.header}>
                    <h1>{t('category:errorTitle')}</h1>
                </div>
                <div className={styles.noResults}>
                    <p>{t('category:notSelected')}</p>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <Back className={styles.backButtonSpacing} />
            <div className={styles.header}>
                <h1>{getPageTitle()}</h1>
            </div>

            {/* Сетка подкатегорий */}
            {occupations.length > 0 && (
                <div className={styles.subcategories}>
                    <div className={styles.subcategories_header}>
                        {/* Поле поиска подкатегорий */}
                        <div className={styles.subcategory_search}>
                            <div className={styles.search_input_wrapper}>
                                <svg className={styles.search_icon} width="20" height="20" viewBox="0 0 24 24" fill="none">
                                    <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                                <input
                                    type="text"
                                    className={styles.search_input}
                                    placeholder={t('category:searchSubcategories', 'Поиск по профессиям...')}
                                    value={subcategorySearchQuery}
                                    onChange={(e) => handleSubcategorySearch(e.target.value)}
                                />
                                {subcategorySearchQuery && (
                                    <button 
                                        className={styles.clear_search}
                                        onClick={() => handleSubcategorySearch('')}
                                        aria-label="Очистить поиск"
                                    >
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                        </svg>
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className={styles.subcategory_item}>
                        {/* Кнопка "Все" */}
                        {!subcategorySearchQuery.trim() && (
                            <div
                                className={`${styles.subcategory_item_step} ${selectedSubcategory === null ? styles.active : ''}`}
                                onClick={() => handleSubcategoryClick(null)}
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        handleSubcategoryClick(null);
                                    }
                                }}
                            >
                                <img
                                    src="/default_all.png"
                                    alt={t('category:allSubcategories', 'Все')}
                                    className={styles.img_fallback}
                                    onError={(e) => {
                                        // Fallback изображение для кнопки "Все"
                                        e.currentTarget.src = '/default_all.png';
                                    }}
                                    loading="lazy"
                                />
                                <p>{t('category:allSubcategories', 'Все')}</p>
                            </div>
                        )}

                        {/* Подкатегории */}
                        {visibleOccupations.map((occupation) => (
                            <div
                                key={occupation.id}
                                className={`${styles.subcategory_item_step} ${selectedSubcategory === occupation.id ? styles.active : ''}`}
                                onClick={() => handleSubcategoryClick(occupation.id)}
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        handleSubcategoryClick(occupation.id);
                                    }
                                }}
                            >
                                <img
                                    src={formatOccupationImageUrl(occupation.image)}
                                    alt={occupation.title}
                                    className={!occupation.image ? styles.img_fallback : undefined}
                                    onError={(e) => {
                                        // Fallback изображение для профессий с первой буквой
                                        const firstLetter = occupation.title.charAt(0).toUpperCase();
                                        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
                                        const bg = isDark ? '3A54DA' : 'e0e0e0';
                                        const fg = isDark ? 'ffffff' : '555555';
                                        e.currentTarget.src = `https://ui-avatars.com/api/?name=${firstLetter}&background=${bg}&color=${fg}&size=64&font-size=0.5`;
                                        e.currentTarget.classList.add(styles.img_fallback);
                                    }}
                                    loading="lazy"
                                />
                                <p>{occupation.title}</p>
                            </div>
                        ))}
                    </div>

                    {/* Кнопка "Посмотреть все" */}
                    {shouldShowViewAllOccupations && (
                        <div className={styles.subcategory_btn_center}>
                            <button
                                className={styles.viewAllButton}
                                onClick={handleViewAllOccupations}
                            >
                                {t('category:viewAll', 'Посмотреть все')}
                            </button>
                        </div>
                    )}

                    {/* Кнопка "Свернуть" */}
                    {shouldShowShowLessOccupations && (
                        <div className={styles.subcategory_btn_center}>
                            <button
                                className={styles.viewAllButton}
                                onClick={handleShowLessOccupations}
                            >
                                {t('category:showLess', 'Свернуть')}
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Переключатель типа сервиса */}
            <div className={styles.service_filter_wrapper}>
                <ServiceTypeFilter
                    showOnlyServices={showOnlyServices}
                    showOnlyAnnouncements={showOnlyAnnouncements}
                    onServiceToggle={handleServiceToggle}
                    onAnnouncementsToggle={handleAnnouncementsToggle}
                />
            </div>

            {/* Блок сортировки и фильтрации */}
            <div className={styles.sorting_filter_wrapper}>
                <SortingFilter
                    sortBy={sortBy}
                    secondarySortBy={secondarySortBy}
                    timeFilter={timeFilter}
                    onSortChange={setSortBy}
                    onSecondarySortChange={setSecondarySortBy}
                    onTimeFilterChange={setTimeFilter}
                />
            </div>

            <div className={styles.searchResults}>
                {isLoading ? (
                    <EmptyState isLoading />
                ) : tickets.length === 0 ? (
                    <EmptyState
                        title={categoryName
                            ? t('category:noAdsInCategory', { name: categoryName })
                            : t('category:noAdsInSelected')
                        }
                        onRefresh={() => fetchTicketsByCategory()}
                    />
                ) : (
                    tickets.map((ticket) => (
                        <Card
                            key={ticket.id}
                            ticketId={ticket.id}
                            title={ticket.title}
                            description={cleanText(ticket.description)}
                            price={ticket.price}
                            unit={ticket.unit}
                            address={ticket.fullAddress}
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
                            photos={ticket.photos}
                            authorImage={ticket.authorImage}
                            negotiableBudget={ticket.negotiableBudget}
                            onClick={() => handleCardClick(ticket.id)}
                            onRespondClick={ticket.authorId !== currentUserId ? (e) => { e.stopPropagation(); handleRespondCard(ticket.id, ticket.authorId); } : undefined}
                            isResponded={respondedTickets.has(ticket.id)}
                            isRespondLoading={respondingTicketId === ticket.id}
                            onReviewClick={ticket.authorId !== currentUserId ? () => { const tok = getAuthToken(); if (!tok) { window.dispatchEvent(new CustomEvent('openAuthModal')); return; } setCardReviewTarget({ authorId: ticket.authorId, ticketId: ticket.id }); } : undefined}
                            onComplaintClick={ticket.authorId !== currentUserId ? () => { const tok = getAuthToken(); if (!tok) { window.dispatchEvent(new CustomEvent('openAuthModal')); return; } setCardComplaintTarget({ authorId: ticket.authorId, ticketId: ticket.id }); } : undefined}
                        />
                    ))
                )}
            </div>
            <CookieConsentBanner/>
            <Status
                type={respondModal.type}
                isOpen={respondModal.open}
                onClose={() => setRespondModal(prev => ({ ...prev, open: false }))}
                message={respondModal.message}
            />
            {cardReviewTarget && (
                <FeedbackModal
                    mode="review"
                    isOpen={!!cardReviewTarget}
                    onClose={() => setCardReviewTarget(null)}
                    onSuccess={() => setCardReviewTarget(null)}
                    onError={() => {}}
                    ticketId={cardReviewTarget.ticketId}
                    targetUserId={cardReviewTarget.authorId}
                    showServiceSelector={false}
                />
            )}
            {cardComplaintTarget && (
                <FeedbackModal
                    mode="complaint"
                    isOpen={!!cardComplaintTarget}
                    onClose={() => setCardComplaintTarget(null)}
                    onSuccess={() => setCardComplaintTarget(null)}
                    onError={() => {}}
                    targetUserId={cardComplaintTarget.authorId}
                    ticketId={cardComplaintTarget.ticketId}
                    complaintType="ticket"
                />
            )}
        </div>
    );
}

export default Category;