import {useState, useEffect, useCallback} from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../../../app/routers/routes';
import { getAuthToken, fetchCurrentUser } from '../../../utils/auth.ts';
import { getStorageItem } from '../../../utils/storageHelper';
import { useLanguageChange } from '../../../hooks';
import styles from './MyTickets.module.scss';
import { PageLoader } from '../../../widgets/PageLoader';
import { EmptyState } from '../../../widgets/EmptyState';
import AuthModal from '../../../features/auth/AuthModal.tsx';
import { Card } from '../../../shared/ui/Ticket/Card/Card.tsx';
import CookieConsentBanner from "../../../widgets/Banners/CookieConsentBanner/CookieConsentBanner.tsx";
import Status from '../../../shared/ui/Modal/Status';
import { Tabs } from '../../../shared/ui/Tabs';
import { SectionActions } from '../../../shared/ui/SectionActions';
import { IoCheckmarkCircleOutline, IoCloseCircleOutline } from 'react-icons/io5';

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
        imageExternalUrl?: string | null;
    };
    master: {
        id: number;
        email: string;
        name: string;
        surname: string;
        image: string;
        imageExternalUrl?: string | null;
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
    negotiableBudget?: boolean;
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
    photos?: string[];
    negotiableBudget?: boolean;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

function MyTickets() {
    const navigate = useNavigate();
    const { t } = useTranslation(['myTickets']);
    
    const [currentUser, setCurrentUser] = useState<ApiUser | null>(null);
    const [allTickets, setAllTickets] = useState<FormattedTicket[]>([]);
    const [displayedTickets, setDisplayedTickets] = useState<FormattedTicket[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isContentLoading, setIsContentLoading] = useState(false);
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

    // Загрузка текущего пользователя через централизованный кэш (auth.ts)
    const getCurrentUser = useCallback(async (): Promise<ApiUser | null> => {
        const userData = await fetchCurrentUser();
        if (!userData) {
            setIsLoading(false);
            return null;
        }
        setCurrentUser(userData as unknown as ApiUser);
        return userData as unknown as ApiUser;
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

            // Получаем все тикеты
            const url = `${API_BASE_URL}/api/tickets/me?locale=${getStorageItem('i18nextLng') || 'ru'}`;
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
                    // Для услуг специалиста (service = true) автор - это специалист (user в API)
                    // Для заказов заказчика (service = false) автор - это заказчик (author в API)
                    const isService = ticket.service;
                    const authorData = isService ? ticket.master : ticket.author;
                    const authorName = `${authorData?.surname || ''} ${authorData?.name || ''}`.trim() ||
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
                        master: `${ticket.master?.surname || ''} ${ticket.master?.name || ''}`.trim() ||
                            (ticket.service ? t('myTickets:master') : t('myTickets:client')),
                        authorId: ticket.author?.id || 0,
                        masterId: ticket.master?.id || 0,
                        timeAgo: ticket.createdAt,
                        category: ticket.category?.title || 'другое',
                        subcategory: ticket.subcategory?.title,
                        status: ticket.active ? t('myTickets:statusActive') : t('myTickets:statusDone'),
                        type: ticket.service ? 'master' : 'client',
                        authorImage: (() => {
                            const src = authorData?.image || (authorData as any)?.imageExternalUrl;
                            return src ? formatProfileImageUrl(src) : undefined;
                        })(),
                        active: ticket.active,
                        photos: ticket.images?.map(img => formatTicketImageUrl(img.image)),
                        negotiableBudget: ticket.negotiableBudget
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

                setAllTickets(formattedTickets);
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
                    { key: 'active' as const, label: <><IoCheckmarkCircleOutline />{t('myTickets:activeTab', { count: allTickets.filter(ticket => ticket.active).length })}</> },
                    { key: 'inactive' as const, label: <><IoCloseCircleOutline />{t('myTickets:inactiveTab', { count: allTickets.filter(ticket => !ticket.active).length })}</> },
                ]}
                activeTab={activeTab}
                onChange={setActiveTab}
            />

            {/* Список объявлений */}
            <div className={styles.ticketsList}>
                {isContentLoading ? (
                    <EmptyState isLoading />
                ) : displayedTickets.length === 0 ? (
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
                    displayedTickets.map((ticket) => (
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
                            isActive={ticket.active}
                            onActiveToggle={(e) => handleToggleTicketActive(e, ticket.id, ticket.active)}
                            photos={ticket.photos}
                            authorImage={ticket.authorImage}
                            negotiableBudget={ticket.negotiableBudget}
                        />
                    ))
                )}
            </div>

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