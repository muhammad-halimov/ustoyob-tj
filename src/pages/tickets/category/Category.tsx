import {useState, useEffect, useCallback} from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { getAuthToken, getUserRole, getUserData } from '../../../utils/auth';
import { useLanguageChange } from '../../../hooks';
import { createChatWithAuthor, getChatsMe } from '../../../utils/chatUtils';
import Status from '../../../shared/ui/Modal/Status';
import Feedback from '../../../shared/ui/Modal/Feedback';

import { EmptyState } from '../../../widgets/EmptyState';
import { ROUTES } from '../../../app/routers/routes';
import styles from './Category.module.scss';
import { Card } from '../../../shared/ui/Ticket/Card/Card';
import { ServiceTypeFilter } from '../../../widgets/Sorting/TypeFilter';
import { SortingFilter } from '../../../widgets/Sorting/CriteriaFilter';
import { useTranslation } from 'react-i18next';
import CookieConsentBanner from "../../../widgets/Banners/CookieConsentBanner/CookieConsentBanner";
import { getOccupations } from '../../../utils/dataCache';
import { truncateText } from '../../../utils/textHelper';
import { ShowMore } from '../../../shared/ui/Button/ShowMore/ShowMore';
import { SelectSearch } from '../../../shared/ui/SelectSearch';
import { getPageSize } from '../../../utils/pageSize';
import { parsePagedResponse, ticketToTicketView, getTicketFullAddress, getTicketShortAddress, universalApiRequest } from '../../../utils/apiHelper';
import { useShowMore } from '../../../hooks';
import type { Ticket, TicketView } from '../../../entities';
import type { Occupation } from '../../../entities';
import { API_BASE_URL } from '../../../utils/config';
import { getSessionJSON } from '../../../utils/storageHelper';



function getCatSession(catId: string | undefined): Record<string, unknown> | null {
    return catId ? getSessionJSON(`cat-filters-${catId}`) : null;
}

function Category() {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const location = useLocation();
    const [tickets, setTickets] = useState<TicketView[]>([]);
    const { page, setPage, appendRef: appendTicketsRef, skipFetchRef: skipTicketsFetchRef, applyFetch: applyTicketsFetch, showMoreProps: ticketsShowMoreProps } = useShowMore<TicketView>(setTickets);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
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
    const { t, i18n } = useTranslation(['components', 'category', 'ticket', 'common']);
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
        if (skipTicketsFetchRef.current) {
            skipTicketsFetchRef.current = false;
            return;
        }
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
    }, [userRole, id, locale, showOnlyServices, showOnlyAnnouncements, sortBy, secondarySortBy, timeFilter, page, selectedSubcategory]);

    const fetchCategoryName = async () => {
        try {
            const categoryData = await universalApiRequest(`/api/categories/${id}`);
            const title =
                categoryData?.title ||
                (Array.isArray(categoryData) ? categoryData[0]?.title : null) ||
                categoryData?.['hydra:member']?.[0]?.title ||
                '';
            if (title) setAndCacheCategoryName(title);
        } catch (error) {
            console.error('Error fetching category name:', error);
        }
    };

    const fetchOccupations = async () => {
        try {
            const occupationsData = await getOccupations();
            
            const formatted: Occupation[] = occupationsData.filter((occ: Occupation) => 
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
    const getFullAddress = getTicketFullAddress;

    // Функция для получения краткого адреса (город, район)
    const getShortAddress = getTicketShortAddress;

    const formatOccupationImageUrl = (imagePath?: string): string => {
        if (!imagePath) return '/default_subcategory.png';
        if (imagePath.startsWith('/uploads/') || imagePath.startsWith('/images/')) return `${API_BASE_URL}${imagePath}`;
        if (imagePath.startsWith('http')) return imagePath;
        return `${API_BASE_URL}/uploads/occupations/${imagePath}`;
    };

    const fetchTicketsByCategory = async () => {
        try {
            if (appendTicketsRef.current) {
                setIsLoadingMore(true);
            } else {
                setIsLoading(true);
            }
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
            const pageSize = getPageSize();
            const endpoint = `/api/tickets?active=true&category=${id}&page=${page}&itemsPerPage=${pageSize}${serviceParam}${selectedSubcategory ? `&subcategory=${selectedSubcategory}` : ''}${currentUserId ? `&author.id[ne]=${currentUserId}&master.id[ne]=${currentUserId}` : ''}`;

            let ticketsData: Ticket[] = [];
            let fetchedHasMore = false;
            try {
                const data = await universalApiRequest(endpoint);
                const parsed = parsePagedResponse<Ticket>(data, page, pageSize);
                ticketsData = parsed.items;
                fetchedHasMore = parsed.hasMore;
            } catch (err) {
                console.error('Category - Error fetching tickets:', err);
            }

            console.log('Category - Total tickets received:', ticketsData.length);

            // Форматируем тикеты
            const formattedTickets: TicketView[] = ticketsData.map(ticket => {
                return {
                    ...ticketToTicketView(ticket),
                    id: ticket.id,
                    fullAddress: getFullAddress(ticket),
                    address: getShortAddress(ticket),
                    status: ticket.active ? 'В работе' : 'Завершен',
                    responsesCount: ticket.responsesCount,
                    viewsCount: ticket.viewsCount,
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
                const getSortValue = (ticket: TicketView, sortType: typeof sortBy | typeof secondarySortBy): number => {
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

            applyTicketsFetch(sortedTickets, fetchedHasMore);

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
            setIsLoadingMore(false);
        }
    };



    // Обработчики подкатегорий
    const handleSubcategoryClick = (subcategoryId: number | null) => {
        appendTicketsRef.current = false;
        setPage(1);
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
        setPage(1);
        appendTicketsRef.current = false;
    };

    const handleAnnouncementsToggle = () => {
        if (!showOnlyAnnouncements) {
            setShowOnlyAnnouncements(true);
            setShowOnlyServices(false);
        } else {
            setShowOnlyAnnouncements(false);
        }
        setPage(1);
        appendTicketsRef.current = false;
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
            <div className={styles.header}>
                <h1>{getPageTitle()}</h1>
            </div>

            {/* Сетка подкатегорий */}
            {occupations.length > 0 && (
                <div className={styles.subcategories}>
                    <div className={styles.subcategories_header}>
                        {/* Поле поиска подкатегорий */}
                        <div className={styles.subcategory_search}>
                            <SelectSearch
                                altMode
                                options={[]}
                                value={subcategorySearchQuery}
                                onChange={(val) => handleSubcategorySearch(val)}
                                placeholder={t('category:searchSubcategories')}
                                className={styles.search_input_wrapper}
                            />
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
                                    src={formatOccupationImageUrl(occupation.image ?? undefined)}
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

                    {/* Кнопка показать больше/меньше для подкатегорий */}
                    {(shouldShowViewAllOccupations || shouldShowShowLessOccupations) && (
                        <div className={styles.subcategory_btn_center}>
                            <ShowMore
                                expanded={showAllOccupations}
                                canLoadMore={!showAllOccupations}
                                onShowMore={handleViewAllOccupations}
                                onShowLess={handleShowLessOccupations}
                                onClear={handleShowLessOccupations}
                                showMoreText={t('common:app.showMore')}
                                showLessText={t('common:app.showLess')}
                                horizontal
                            />
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
                {isLoading && tickets.length === 0 ? (
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
                            address={ticket.fullAddress ?? ticket.address}
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
                            photos={ticket.photos}
                            authorImage={ticket.authorImage}
                            negotiableBudget={ticket.negotiableBudget}
                            onClick={() => handleCardClick(ticket.id)}
                            onRespondClick={ticket.authorId !== currentUserId ? (e) => { e.stopPropagation(); handleRespondCard(ticket.id, ticket.authorId ?? 0); } : undefined}
                            isResponded={respondedTickets.has(ticket.id)}
                            isRespondLoading={respondingTicketId === ticket.id}
                            onReviewClick={ticket.authorId !== currentUserId ? () => { const tok = getAuthToken(); if (!tok) { window.dispatchEvent(new CustomEvent('openAuthModal')); return; } setCardReviewTarget({ authorId: ticket.authorId ?? 0, ticketId: ticket.id }); } : undefined}
                            onComplaintClick={ticket.authorId !== currentUserId ? () => { setCardComplaintTarget({ authorId: ticket.authorId ?? 0, ticketId: ticket.id }); } : undefined}
                        />
                    ))
                )}
            </div>
            <ShowMore
                {...ticketsShowMoreProps}
                showMoreText={t('common:app.showMore')}
                showLessText={t('common:app.showLess')}
                loading={isLoadingMore}
                horizontal
            />
            <CookieConsentBanner/>
            <Status
                type={respondModal.type}
                isOpen={respondModal.open}
                onClose={() => setRespondModal(prev => ({ ...prev, open: false }))}
                message={respondModal.message}
            />
            {cardReviewTarget && (
                <Feedback
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
                <Feedback
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