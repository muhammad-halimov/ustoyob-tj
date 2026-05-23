import {useState, useEffect, useCallback} from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../../../app/routers/routes';
import { getAuthToken, fetchCurrentUser } from '../../../utils/auth';
import { getStorageItem } from '../../../utils/storageHelper';
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
import { getPageSize } from '../../../utils/pageSize';
import { parsePagedResponse, ticketToTicketView } from '../../../utils/apiHelper';
import { useShowMore } from '../../../hooks';
import type { Ticket, TicketView, User } from '../../../entities';
import { API_BASE_URL } from '../../../utils/config';


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
    }, []);

    useLanguageChange(() => {
        if (currentUser) fetchMyTickets();
    });

    // Загрузка тикетов ТОЛЬКО ПОСЛЕ загрузки пользователя
    useEffect(() => {
        if (currentUser) {
            fetchMyTickets();
        }
    }, [currentUser]);

    useEffect(() => {
        if (skipTicketsFetchRef.current) {
            skipTicketsFetchRef.current = false;
            return;
        }
        if (currentUser) fetchMyTickets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page]);



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
            const url = `${API_BASE_URL}/api/tickets/me?locale=${getStorageItem('i18nextLng') || 'ru'}${activeParam}&page=${page}&itemsPerPage=${pageSize}`;
            console.log('Fetching tickets from:', url);

            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const responseData = await response.json();
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

                // Сортируем: сначала тикеты из выбранного города, затем по дате (новые первыми)
                const selectedCity = localStorage.getItem('selectedCity') || '';
                formattedTickets.sort((a, b) => {
                    const aCity = myTickets.find(t => t.id === a.id)?.addresses?.[0]?.city?.title || '';
                    const bCity = myTickets.find(t => t.id === b.id)?.addresses?.[0]?.city?.title || '';
                    const aMatch = selectedCity ? aCity === selectedCity : false;
                    const bMatch = selectedCity ? bCity === selectedCity : false;
                    if (aMatch !== bMatch) return aMatch ? -1 : 1;
                    return new Date(b.timeAgo).getTime() - new Date(a.timeAgo).getTime();
                });

                applyTicketsFetch(formattedTickets, fetchedHasMore);
            } else {
                console.error('Error fetching tickets, status:', response.status);
                setAllTickets([]);
            }
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

            const response = await fetch(`${API_BASE_URL}/api/tickets/${ticketId}`, {
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
                // Обновляем все тикеты со статусом
                setAllTickets(prev => prev.map(ticket => 
                    ticket.id === ticketId
                        ? { ...ticket, active: newActiveStatus, status: newActiveStatus ? t('myTickets:statusActive') : t('myTickets:statusDone') }
                        : ticket
                ));

                setModalMessage(newActiveStatus ? t('myTickets:activated') : t('myTickets:deactivated'));
                setShowSuccessModal(true);
                setTimeout(() => setShowSuccessModal(false), 3000);
            } else {
                const errorText = await response.text();
                console.error('Error toggling ticket active status:', errorText);
                throw new Error(newActiveStatus ? t('myTickets:activateOperError') : t('myTickets:deactivateOperError'));
            }
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