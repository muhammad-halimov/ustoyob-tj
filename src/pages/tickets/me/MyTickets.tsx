import {useState, useEffect, useCallback} from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../../../app/routers/routes';
import { getAuthToken } from '../../../utils/auth.ts';
import { getStorageItem } from '../../../utils/storageHelper';
import { useLanguageChange } from '../../../hooks/useLanguageChange';
import styles from './MyTickets.module.scss';
import { PageLoader } from '../../../widgets/PageLoader';
import AuthModal from '../../../features/auth/AuthModal.tsx';
import { TicketCard } from '../../../shared/ui/TicketCard/TicketCard.tsx';
import CookieConsentBanner from "../../../widgets/Banners/CookieConsentBanner/CookieConsentBanner.tsx";
import StatusModal from '../../../shared/ui/Modal/StatusModal';

interface ApiUser {
    id: number;
    email: string;
    name: string;
    surname: string;
    phone1: string;
    phone2: string;
    image?: string;
    isOnline?: boolean;
    lastSeen?: string;
    approved?: boolean;
    active?: boolean;
}

interface Ticket {
    id: number;
    title: string;
    description: string;
    notice: string;
    budget: number;
    active: boolean;
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
    };
    master: {
        id: number;
        email: string;
        name: string;
        surname: string;
        image: string;
    } | null;
    images: Array<{
        id: number;
        image: string;
    }>;
    unit: {
        id: number;
        title: string;
    };
    service: boolean;
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
    updatedAt: string;
}

interface FormattedTicket {
    id: number;
    title: string;
    price: number;
    unit: string;
    description: string;
    address: string;
    date: string;
    author: string;
    master: string;
    timeAgo: string;
    category: string;
    subcategory?: string;
    status: string;
    authorId: number;
    masterId: number;
    type: 'client' | 'master';
    authorImage?: string;
    active: boolean;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

function MyTickets() {
    const navigate = useNavigate();
    const { t } = useTranslation(['myTickets']);
    
    const [currentUser, setCurrentUser] = useState<ApiUser | null>(null);
    const [allTickets, setAllTickets] = useState<FormattedTicket[]>([]);
    const [displayedTickets, setDisplayedTickets] = useState<FormattedTicket[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'active' | 'inactive'>('active');

    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [showErrorModal, setShowErrorModal] = useState(false);
    const [modalMessage, setModalMessage] = useState('');

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
        const filtered = activeTab === 'active' 
            ? allTickets.filter(t => t.active)
            : allTickets.filter(t => !t.active);
        setDisplayedTickets(filtered);
    }, [activeTab, allTickets]);

    // ТОЧНО КАК В Chat.tsx - загрузка текущего пользователя
    const getCurrentUser = useCallback(async (): Promise<ApiUser | null> => {
        try {
            const token = getAuthToken();
            if (!token) {
                console.log('No auth token available');
                setIsLoading(false);
                return null;
            }

            const response = await fetch(`${API_BASE_URL}/api/users/me`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                },
            });

            if (response.ok) {
                const userData = await response.json();
                console.log('Current user loaded successfully:', {
                    id: userData.id,
                    name: userData.name
                });
                setCurrentUser(userData);
                return userData;
            } else {
                console.error('Failed to fetch current user:', response.status);
                setIsLoading(false);
                return null;
            }
        } catch (err) {
            console.error('Error fetching current user:', err);
            setIsLoading(false);
            return null;
        }
    }, []);

    const fetchMyTickets = async () => {
        if (!currentUser) {
            console.log('No current user, skipping fetch');
            return;
        }

        try {
            setIsLoading(true);
            const token = getAuthToken();

            if (!token) {
                console.error('Token not found in fetchMyTickets');
                setIsLoading(false);
                return;
            }

            // Получаем все тикеты
            const url = `${API_BASE_URL}/api/tickets?locale=${getStorageItem('i18nextLng') || 'ru'}`;
            console.log('Fetching tickets from:', url);

            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const ticketsData: Ticket[] = await response.json();
                console.log('Received tickets:', ticketsData);

                // Фильтруем тикеты текущего пользователя
                const myTickets = ticketsData.filter(ticket =>
                    ticket.author?.id === currentUser.id ||
                    ticket.master?.id === currentUser.id
                );

                console.log('My tickets:', myTickets);

                const formattedTickets: FormattedTicket[] = myTickets.map(ticket => {
                    // Для услуг мастера (service = true) автор - это мастер (user в API)
                    // Для заказов клиента (service = false) автор - это клиент (author в API)
                    const isService = ticket.service;
                    const authorData = isService ? ticket.master : ticket.author;
                    const authorName = `${authorData?.name || ''} ${authorData?.surname || ''}`.trim() ||
                        (isService ? t('myTickets:master') : t('myTickets:client'));
                    
                    return {
                        id: ticket.id,
                        title: ticket.title || t('myTickets:noTitle'),
                        price: ticket.budget || 0,
                        unit: ticket.unit?.title || 'N/A',
                        description: ticket.description || t('myTickets:noDescription'),
                        address: getFullAddress(ticket),
                        date: ticket.createdAt,
                        author: authorName,
                        master: `${ticket.master?.name || ''} ${ticket.master?.surname || ''}`.trim() ||
                            (ticket.service ? t('myTickets:master') : t('myTickets:client')),
                        authorId: ticket.author?.id || 0,
                        masterId: ticket.master?.id || 0,
                        timeAgo: ticket.createdAt,
                        category: ticket.category?.title || 'другое',
                        subcategory: ticket.subcategory?.title,
                        status: ticket.active ? t('myTickets:statusActive') : t('myTickets:statusDone'),
                        type: ticket.service ? 'master' : 'client',
                        authorImage: authorData?.image ? formatProfileImageUrl(authorData.image) : undefined,
                        active: ticket.active
                    };
                });

                // Сортируем по дате создания (новые первыми)
                formattedTickets.sort((a, b) => {
                    const dateA = new Date(a.timeAgo).getTime();
                    const dateB = new Date(b.timeAgo).getTime();
                    return dateB - dateA;
                });

                setAllTickets(formattedTickets);
            } else {
                console.error('Error fetching tickets, status:', response.status);
                setAllTickets([]);
            }
        } catch (error) {
            console.error('Error fetching tickets:', error);
            setAllTickets([]);
        } finally {
            setIsLoading(false);
        }
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

    const getFullAddress = (ticketData: Ticket): string => {
        if (!ticketData.addresses || ticketData.addresses.length === 0) {
            return t('myTickets:addrNotSpecified');
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

        const result = parts.length > 0 ? parts.join(', ') : t('myTickets:addrNotSpecified');
        console.log('Formatted address:', result);
        return result;
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

    const handleClose = () => {
        navigate(-1);
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
    //     return type === 'master' ? 'Услуга мастера' : 'Заказ клиента';
    // };

    // Пока загружается currentUser или тикеты - показать загрузку
    if (isLoading) {
        return <PageLoader text={t('myTickets:loading')} />;
    }

    // Если нет currentUser после загрузки - показать AuthModal
    if (!currentUser) {
        return (
            <AuthModal
                isOpen={true}
                onClose={() => navigate(ROUTES.HOME)}
                onLoginSuccess={() => window.location.reload()}
            />
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1>{t('myTickets:myAds')}</h1>
                <div className={styles.headerActions}>
                    <button className={styles.createButton} onClick={handleCreateNew}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 5v14M5 12h14" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                        </svg>
                        {t('myTickets:createNew')}
                    </button>
                    <button className={styles.closeButton} onClick={handleClose}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                    </button>
                </div>
            </div>

            {/* Табы для фильтрации */}
            <div className={styles.tabs}>
                <button
                    className={`${styles.tab} ${activeTab === 'active' ? styles.active : ''}`}
                    onClick={() => setActiveTab('active')}
                >
                    {t('myTickets:activeTab', { count: allTickets.filter(ticket => ticket.active).length })}
                </button>
                <button
                    className={`${styles.tab} ${activeTab === 'inactive' ? styles.active : ''}`}
                    onClick={() => setActiveTab('inactive')}
                >
                    {t('myTickets:inactiveTab', { count: allTickets.filter(ticket => !ticket.active).length })}
                </button>
            </div>

            {/* Список объявлений */}
            <div className={styles.ticketsList}>
                {isLoading ? (
                    <div className={styles.loading}><p>{t('myTickets:loadingAds')}</p></div>
                ) : displayedTickets.length === 0 ? (
                    <div className={styles.noResults}>
                        <p>
                            {activeTab === 'active'
                                ? t('myTickets:noActiveAds')
                                : t('myTickets:noInactiveAds')
                            }
                        </p>
                        {activeTab === 'active' && (
                            <button className={styles.createEmptyButton} onClick={handleCreateNew}>
                                {t('myTickets:createFirst')}
                            </button>
                        )}
                    </div>
                ) : (
                    displayedTickets.map((ticket) => (
                        <TicketCard
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
                            isActive={ticket.active}
                            onActiveToggle={(e) => handleToggleTicketActive(e, ticket.id, ticket.active)}
                        />
                    ))
                )}
            </div>

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
            <CookieConsentBanner/>
        </div>
    );
}

export default MyTickets;