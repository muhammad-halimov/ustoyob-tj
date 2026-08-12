import {useState, useEffect, useCallback} from 'react';
import type * as React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../../../app/routers/routes';
import { getAuthToken, fetchCurrentUser } from '../../../utils/authUtils';
import { useLanguageChange } from '../../../hooks';
import styles from './MyTickets.module.scss';
import { PageLoader } from '../../../widgets/PageLoader';
import { EmptyState } from '../../../widgets/EmptyState';
import Auth from '../../../shared/ui/Modal/Auth/Auth';
import { Card } from '../../../shared/ui/Ticket/Card/Card';
import CookieConsentBanner from "../../../widgets/Banners/CookieConsentBanner/CookieConsentBanner";
import Status from '../../../shared/ui/Modal/Status';
import { Tabs } from '../../../shared/ui/Tabs';
import { SectionActions } from '../../../shared/ui/SectionActions';
import { IoCheckmarkCircleOutline, IoCloseCircleOutline } from 'react-icons/io5';
import { ShowMore } from '../../../shared/ui/Button/ShowMore/ShowMore';
import { SelectSearch } from '../../../shared/ui/SelectSearch';
import { SortingFilter } from '../../../widgets/Sorting/CriteriaFilter';
import { getPageSize } from '../../../utils/pageSizeUtils';
import { parsePagedResponse, ticketToTicketView, universalApiRequest } from '../../../utils/apiUtils';
import { useShowMore } from '../../../hooks';
import type { Ticket, TicketView, User } from '../../../entities';
import type { SortByType, SecondarySortByType, TimeFilterType } from '../../../types/common';


/**
 * "My Tickets" page — lists tickets belonging to the current user.
 * - Masters see their service tickets (offers).
 * - Clients see their request tickets.
 * - Supports active/archived tabs, city filter, and "show more" pagination.
 * - Guards the route: redirects to home if not authenticated.
 */
function MyTickets() {
    const navigate = useNavigate();
    const { t } = useTranslation(['myTickets', 'common']);
    
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [allTickets, setAllTickets] = useState<TicketView[]>([]);
    const [displayedTickets, setDisplayedTickets] = useState<TicketView[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isContentLoading, setIsContentLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'active' | 'inactive'>('active');
    const { page, setPage, appendRef: appendTicketsRef, skipFetchRef: skipTicketsFetchRef, applyFetch: applyTicketsFetch, showMoreProps: ticketsShowMoreProps } = useShowMore<TicketView>(setAllTickets);
    const [activeTabTotal, setActiveTabTotal] = useState(0);
    const [inactiveTabTotal, setInactiveTabTotal] = useState(0);

    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [showErrorModal, setShowErrorModal] = useState(false);
    const [modalMessage, setModalMessage] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    // Сортировка и фильтр по времени — как в категориях
    const [sortBy, setSortBy] = useState<SortByType>('newest');
    const [secondarySortBy, setSecondarySortBy] = useState<SecondarySortByType>('none');
    const [timeFilter, setTimeFilter] = useState<TimeFilterType>('all');

    const handleCloseSuccessModal = () => {
        setShowSuccessModal(false);
    };

    const handleCloseErrorModal = () => {
        setShowErrorModal(false);
    };

    // Инициализация - ТОЧНО КАК В Chat.tsx
    useEffect(() => {
        const initializeMyTickets = async () => {
            console.log('Initializing My Tickets...');
            await getCurrentUser();
        };
        initializeMyTickets();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useLanguageChange(() => {
        if (currentUser) fetchMyTickets();
    });

    // Загрузка тикетов ТОЛЬКО ПОСЛЕ загрузки пользователя
    useEffect(() => {
        if (currentUser) {
            fetchMyTickets();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentUser]);

    useEffect(() => {
        if (skipTicketsFetchRef.current) {
            skipTicketsFetchRef.current = false;
            return;
        }
        if (currentUser) fetchMyTickets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, sortBy, secondarySortBy, timeFilter]);



    useEffect(() => {
        const filtered = activeTab === 'active' 
            ? allTickets.filter(t => t.active)
            : allTickets.filter(t => !t.active);
        setDisplayedTickets(filtered);
    }, [activeTab, allTickets]);

    // Сбрасываем страницу при смене вкладки
    useEffect(() => {
        appendTicketsRef.current = false;
        skipTicketsFetchRef.current = false;
        setPage(1);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab]);

    // Загрузка текущего пользователя через централизованный кэш (auth.ts)
    const getCurrentUser = useCallback(async (): Promise<User | null> => {
        const userData = await fetchCurrentUser();
        if (!userData) {
            setIsLoading(false);
            return null;
        }
        setCurrentUser(userData as unknown as User);
        return userData as unknown as User;
    }, []);

    const fetchMyTickets = async () => {
        if (!currentUser) {
            console.log('No current user, skipping fetch');
            return;
        }

        try {
            setIsContentLoading(true);
            const token = getAuthToken();

            if (!token) {
                console.error('Token not found in fetchMyTickets');
                setIsContentLoading(false);
                setIsLoading(false);
                return;
            }

            // Получаем тикеты с пагинацией и фильтром по active
            const pageSize = getPageSize();
            const activeParam = `&active=${activeTab === 'active' ? 'true' : 'false'}`;
            const responseData = await universalApiRequest(`/api/tickets/me?${activeParam.slice(1)}&page=${page}&itemsPerPage=${pageSize}`);
            let ticketsData: Ticket[];

                if (Array.isArray(responseData)) {
                    ticketsData = responseData;
                } else if (responseData && 'hydra:member' in responseData) {
                    ticketsData = responseData['hydra:member'];
                    const totalItems: number = responseData['hydra:totalItems'] ?? ticketsData.length;
                    if (activeTab === 'active') {
                        setActiveTabTotal(totalItems);
                    } else {
                        setInactiveTabTotal(totalItems);
                    }
                } else {
                    ticketsData = [];
                }
                const { hasMore: fetchedHasMore } = parsePagedResponse<Ticket>(responseData, page, pageSize);
                console.log('Received tickets:', ticketsData);

                // Фильтруем тикеты текущего пользователя (на сервере /me уже фильтрует, но дополнительная проверка)
                const myTickets = ticketsData.filter(ticket =>
                    ticket.author?.id === currentUser.id ||
                    ticket.master?.id === currentUser.id
                );

                console.log('My tickets:', myTickets);

                const formattedTickets: TicketView[] = myTickets.map(ticket => {
                    const base = ticketToTicketView(ticket);
                    return {
                        ...base,
                        master: `${ticket.master?.surname || ''} ${ticket.master?.name || ''}`.trim()
                            || (ticket.service ? t('myTickets:master') : t('myTickets:client')),
                        masterId: ticket.master?.id || 0,
                        status: ticket.active ? t('myTickets:statusActive') : t('myTickets:statusDone'),
                    };
                });

                // Применяем фильтр по времени (как в категориях)
                let timeFilteredTickets = formattedTickets;
                if (timeFilter !== 'all') {
                    const now = new Date();
                    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                    const startOfYesterday = new Date(startOfToday);
                    startOfYesterday.setDate(startOfYesterday.getDate() - 1);
                    const startOfWeek = new Date(startOfToday);
                    startOfWeek.setDate(startOfWeek.getDate() - 7);
                    const startOfMonth = new Date(startOfToday);
                    startOfMonth.setMonth(startOfMonth.getMonth() - 1);

                    timeFilteredTickets = formattedTickets.filter(ticket => {
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

                // Применяем сортировку (как в категориях)
                const getSortValue = (ticket: TicketView, sortType: SortByType | SecondarySortByType): number => {
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

                const sortedTickets = [...timeFilteredTickets].sort((a, b) => {
                    const primaryDiff = getSortValue(b, sortBy) - getSortValue(a, sortBy);

                    if (primaryDiff === 0 && secondarySortBy !== 'none') {
                        return getSortValue(b, secondarySortBy) - getSortValue(a, secondarySortBy);
                    }

                    return primaryDiff;
                });

                applyTicketsFetch(sortedTickets, fetchedHasMore);
        } catch (error) {
            console.error('Error fetching tickets:', error);
            setAllTickets([]);
        } finally {
            setIsContentLoading(false);
            setIsLoading(false);
        }
    };

    const handleCardClick = useCallback((ticketId?: number, authorId?: number, masterId?: number) => {
        if (!ticketId) return;
        // Авторизация проверена в начале компонента
        if (authorId || masterId) navigate(ROUTES.TICKET_BY_ID(ticketId));
    }, [navigate]);

    const handleCreateNew = () => {
        // Авторизация проверена в начале компонента
        navigate(ROUTES.TICKET_CREATE);
    };
    const handleToggleTicketActive = async (e: React.ChangeEvent<HTMLInputElement>, ticketId: number, currentActive: boolean) => {
        e.stopPropagation();

        const token = getAuthToken();
        if (!token) {
            // Не должно произойти, так как проверка в начале компонента
            console.error('Token not found in handleToggleTicketActive');
            return;
        }

        try {
            const newActiveStatus = !currentActive;
            await universalApiRequest(`/api/tickets/${ticketId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/merge-patch+json' },
                body: { active: newActiveStatus },
                locale: false,
            });
            setAllTickets(prev => prev.map(ticket =>
                ticket.id === ticketId
                    ? { ...ticket, active: newActiveStatus, status: newActiveStatus ? t('myTickets:statusActive') : t('myTickets:statusDone') }
                    : ticket
            ));
            setModalMessage(newActiveStatus ? t('myTickets:activated') : t('myTickets:deactivated'));
            setShowSuccessModal(true);
            setTimeout(() => setShowSuccessModal(false), 3000);
        } catch (error) {
            console.error('Error toggling ticket active status:', error);
            setModalMessage(currentActive ? t('myTickets:deactivateError') : t('myTickets:activateError'));
            setShowErrorModal(true);
            setTimeout(() => setShowErrorModal(false), 3000);
        }
    };

    const handleEditTicket = async (e: React.MouseEvent, ticketId: number) => {
        e.stopPropagation();

        const token = getAuthToken();
        if (!token) {
            // Не должно произойти, так как проверка в начале компонента
            console.error('Token not found in handleEditTicket');
            return;
        }

        // Просто переходим на страницу редактирования
        // CreateEdit сам загрузит данные по ID из URL
        navigate(ROUTES.TICKET_EDIT_BY_ID(ticketId));
    };

    // const getTicketTypeLabel = (type: 'client' | 'master') => {
    //     return type === 'master' ? 'Услуга специалиста' : 'Заказ от заказчика';
    // };

    // Пока загружается currentUser или тикеты - показать загрузку
    if (isLoading) {
        return <PageLoader text={t('myTickets:loading')} />;
    }

    // Если нет currentUser после загрузки - показать Auth
    if (!currentUser) {
        return (
            <Auth
                isOpen={true}
                onClose={() => navigate(ROUTES.HOME)}
                onLoginSuccess={() => window.location.reload()}
            />
        );
    }

    const searchedTickets = searchQuery.trim()
        ? displayedTickets.filter(ticket => {
            const q = searchQuery.toLowerCase();
            return (
                ticket.title?.toLowerCase().includes(q) ||
                ticket.description?.toLowerCase().includes(q) ||
                ticket.category?.toLowerCase().includes(q)
            );
          })
        : displayedTickets;

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1>{t('myTickets:myAds')}</h1>
                <SectionActions
                    onAdd={handleCreateNew}
                    showDeleteAll={false}
                    addTitle={t('myTickets:createNew')}
                    size="lg"
                />
            </div>

            {/* Табы для фильтрации */}
            <Tabs
                tabs={[
                    { key: 'active' as const, label: <><IoCheckmarkCircleOutline />{t('myTickets:activeTab', { count: activeTabTotal })}</> },
                    { key: 'inactive' as const, label: <><IoCloseCircleOutline />{t('myTickets:inactiveTab', { count: inactiveTabTotal })}</> },
                ]}
                activeTab={activeTab}
                onChange={setActiveTab}
            />

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

            {/* Блок сортировки и фильтрации — как в категориях */}
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

            {/* Список объявлений */}
            <div className={styles.ticketsList}>
                {isContentLoading && searchedTickets.length === 0 ? (
                    <EmptyState isLoading />
                ) : searchedTickets.length === 0 ? (
                    <EmptyState
                        title={activeTab === 'active'
                            ? t('myTickets:noActiveAds')
                            : t('myTickets:noInactiveAds')
                        }
                        actionText={activeTab === 'active' ? t('myTickets:createFirst') : undefined}
                        onAction={activeTab === 'active' ? handleCreateNew : undefined}
                        onRefresh={fetchMyTickets}
                    />
                ) : (
                    searchedTickets.map((ticket) => (
                        <Card
                            key={ticket.id}
                            ticketId={ticket.id}
                            title={ticket.title}
                            description={ticket.description}
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
                            onClick={() => handleCardClick(ticket.id, ticket.authorId, ticket.masterId)}
                            showEditButton={true}
                            onEditClick={(e) => handleEditTicket(e, ticket.id)}
                            showActiveToggle={true}
                            isActive={ticket.active ?? false}
                            onActiveToggle={(e) => handleToggleTicketActive(e, ticket.id, ticket.active ?? false)}
                            photos={ticket.photos}
                            authorImage={ticket.authorImage}
                            negotiableBudget={ticket.negotiableBudget}
                            approved={ticket.approved}
                            banned={ticket.banned}
                        />
                    ))
                )}
            </div>
            {searchedTickets.length > 0 && (
                <ShowMore
                    {...ticketsShowMoreProps}
                    showMoreText={t('common:app.showMore', { defaultValue: 'Показать больше' })}
                    showLessText={t('common:app.showLess', { defaultValue: 'Показать меньше' })}
                    loading={isContentLoading}
                    horizontal
                />
            )}

            <Status
                type="success"
                isOpen={showSuccessModal}
                onClose={handleCloseSuccessModal}
                message={modalMessage}
            />

            <Status
                type="error"
                isOpen={showErrorModal}
                onClose={handleCloseErrorModal}
                message={modalMessage}
            />
            <CookieConsentBanner/>
        </div>
    );
}

export default MyTickets;