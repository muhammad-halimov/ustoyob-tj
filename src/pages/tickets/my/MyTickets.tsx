import {useState, useEffect, useCallback} from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuthToken } from '../../../utils/auth.ts';
import styles from './MyTickets.module.scss';
import AuthModal from "../../../features/auth/AuthModal.tsx";
import { AnnouncementCard } from '../../../shared/ui/AnnouncementCard/AnnouncementCard.tsx';

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
    const [allTickets, setAllTickets] = useState<FormattedTicket[]>([]);
    const [displayedTickets, setDisplayedTickets] = useState<FormattedTicket[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'active' | 'inactive'>('active');

    const [showAuthModal, setShowAuthModal] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [showErrorModal, setShowErrorModal] = useState(false);
    const [modalMessage, setModalMessage] = useState('');

    const handleCloseSuccessModal = () => {
        setShowSuccessModal(false);
    };

    const handleCloseErrorModal = () => {
        setShowErrorModal(false);
    };

    useEffect(() => {
        fetchMyTickets();
    }, []);

    useEffect(() => {
        const filtered = activeTab === 'active' 
            ? allTickets.filter(t => t.active)
            : allTickets.filter(t => !t.active);
        setDisplayedTickets(filtered);
    }, [activeTab, allTickets]);

    const fetchMyTickets = async () => {
        try {
            setIsLoading(true);
            const token = getAuthToken();

            if (!token) {
                setShowAuthModal(true);
                return;
            }

            // Получаем информацию о текущем пользователе
            const userResponse = await fetch(`${API_BASE_URL}/api/users/me`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json',
                },
            });

            if (!userResponse.ok) {
                throw new Error('Не удалось получить информацию о пользователе');
            }

            const userData = await userResponse.json();

            // Получаем все тикеты
            const url = `${API_BASE_URL}/api/tickets?locale=${localStorage.getItem('i18nextLng') || 'ru'}`;
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
                    ticket.author?.id === userData.id ||
                    ticket.master?.id === userData.id
                );

                console.log('My tickets:', myTickets);

                const formattedTickets: FormattedTicket[] = myTickets.map(ticket => ({
                    id: ticket.id,
                    title: ticket.title || 'Без названия',
                    price: ticket.budget || 0,
                    unit: ticket.unit?.title || 'N/A',
                    description: ticket.description || 'Описание отсутствует',
                    address: getFullAddress(ticket),
                    date: formatDate(ticket.createdAt),
                    author: `${ticket.author?.name || ''} ${ticket.author?.surname || ''}`.trim() ||
                        (ticket.service ? 'Мастер' : 'Клиент'),
                    master: `${ticket.master?.name || ''} ${ticket.master?.surname || ''}`.trim() ||
                        (ticket.service ? 'Мастер' : 'Клиент'),
                    authorId: ticket.author?.id || 0,
                    masterId: ticket.master?.id || 0,
                    timeAgo: ticket.createdAt,
                    category: ticket.category?.title || 'другое',
                    status: ticket.active ? 'Активно' : 'Завершено',
                    type: ticket.service ? 'master' : 'client',
                    authorImage: ticket.author?.image ? formatProfileImageUrl(ticket.author.image) : undefined,
                    active: ticket.active
                }));

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
            return 'Адрес не указан';
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

        const result = parts.length > 0 ? parts.join(', ') : 'Адрес не указан';
        console.log('Formatted address:', result);
        return result;
    };

    const formatDate = (dateString: string) => {
        try {
            if (!dateString) return 'Дата не указана';
            return new Date(dateString).toLocaleDateString('ru-RU', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            });
        } catch {
            return 'Дата не указана';
        }
    };

    const handleCardClick = useCallback((type: string, ticketId?: number, authorId?: number, masterId?: number) => {
        if (!ticketId) return;

        const token = getAuthToken();

        if (!token) {
            setShowAuthModal(true);
            return;
        }

        // Если авторизован, выполняем переход
        if (authorId)
            navigate(`/ticket/${authorId}?ticket=${ticketId}&type=${type}`);
        if (masterId)
            navigate(`/ticket/${masterId}?ticket=${ticketId}&type=${type}`);
    }, [navigate]);

    const handleCreateNew = () => {
        const token = getAuthToken();

        if (!token) {
            setShowAuthModal(true);
            return;
        }

        navigate('/create-ticket');
    };

    const handleClose = () => {
        navigate(-1);
    };

    const handleLoginSuccess = (token: string, email?: string) => {
        console.log('Login successful, token:', token);
        if (email) {
            console.log('User email:', email);
        }
        setShowAuthModal(false);

        // Получаем сохраненные данные для редиректа
        const redirectData = sessionStorage.getItem('redirectAfterAuth');

        if (redirectData) {
            try {
                const { type, ticketId, authorId, masterId } = JSON.parse(redirectData);

                // Выполняем переход
                if (authorId)
                    navigate(`/ticket/${authorId}?ticket=${ticketId}&type=${type}`);
                if (masterId)
                    navigate(`/ticket/${masterId}?ticket=${ticketId}&type=${type}`);

                // Очищаем сохраненные данные
                sessionStorage.removeItem('redirectAfterAuth');
            } catch (error) {
                console.error('Error parsing redirect data:', error);
                // Если произошла ошибка, показываем сообщение
                setModalMessage('Ошибка при переходе к объявлению');
                setShowErrorModal(true);
                setTimeout(() => setShowErrorModal(false), 3000);
            }
        } else {
            // Если нет сохраненных данных, просто закрываем модалку
            setShowAuthModal(false);
        }
    };

    const handleToggleTicketActive = async (e: React.ChangeEvent<HTMLInputElement>, ticketId: number, currentActive: boolean) => {
        e.stopPropagation();

        const token = getAuthToken();
        if (!token) {
            navigate('/login');
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
                        ? { ...ticket, active: newActiveStatus, status: newActiveStatus ? 'Активно' : 'Завершено' }
                        : ticket
                ));

                setModalMessage(`Объявление успешно ${newActiveStatus ? 'активировано' : 'деактивировано'}!`);
                setShowSuccessModal(true);
                setTimeout(() => setShowSuccessModal(false), 3000);
            } else {
                const errorText = await response.text();
                console.error('Error toggling ticket active status:', errorText);
                throw new Error(`Не удалось ${newActiveStatus ? 'активировать' : 'деактивировать'} объявление`);
            }
        } catch (error) {
            console.error('Error toggling ticket active status:', error);
            setModalMessage(`Ошибка при ${currentActive ? 'деактивации' : 'активации'} объявления`);
            setShowErrorModal(true);
            setTimeout(() => setShowErrorModal(false), 3000);
        }
    };

    const handleEditTicket = async (e: React.MouseEvent, ticketId: number) => {
        e.stopPropagation();

        const token = getAuthToken();
        if (!token) {
            setShowAuthModal(true);
            return;
        }

        try {
            // Загружаем все тикеты и находим нужный по id
            const url = `${API_BASE_URL}/api/tickets?locale=${localStorage.getItem('i18nextLng') || 'ru'}`;
            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Не удалось загрузить данные тикетов');
            }

            const ticketsData: Ticket[] = await response.json();
            
            // Находим нужный тикет по id
            const ticketData = ticketsData.find(ticket => ticket.id === ticketId);

            if (!ticketData) {
                throw new Error('Тикет не найден');
            }

            // Преобразуем Ticket в формат ServiceData для Edit
            const serviceData = {
                id: ticketData.id,
                title: ticketData.title || '',
                description: ticketData.description || '',
                notice: ticketData.notice || '',
                budget: String(ticketData.budget || 0),
                category: ticketData.category ? {
                    id: ticketData.category.id,
                    title: ticketData.category.title
                } : undefined,
                unit: ticketData.unit ? {
                    id: ticketData.unit.id,
                    title: ticketData.unit.title
                } : undefined,
                addresses: ticketData.addresses || [],
                images: ticketData.images || []
            };

            navigate('/edit-ticket', {
                state: {
                    serviceData: serviceData
                }
            });
        } catch (error) {
            console.error('Error loading ticket data:', error);
            setModalMessage('Ошибка при загрузке данных тикета');
            setShowErrorModal(true);
            setTimeout(() => setShowErrorModal(false), 3000);
        }
    };

    // const getTicketTypeLabel = (type: 'client' | 'master') => {
    //     return type === 'master' ? 'Услуга мастера' : 'Заказ клиента';
    // };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1>Мои объявления/услуги</h1>
                <div className={styles.headerActions}>
                    <button className={styles.createButton} onClick={handleCreateNew}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 5v14M5 12h14" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                        </svg>
                        Создать новое
                    </button>
                    <button className={styles.closeButton} onClick={handleClose}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M18 6L6 18" stroke="#101010" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M6 6L18 18" stroke="#101010" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
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
                    Активные ({allTickets.filter(t => t.active).length})
                </button>
                <button
                    className={`${styles.tab} ${activeTab === 'inactive' ? styles.active : ''}`}
                    onClick={() => setActiveTab('inactive')}
                >
                    Завершенные ({allTickets.filter(t => !t.active).length})
                </button>
            </div>

            {/* Список объявлений */}
            <div className={styles.ticketsList}>
                {isLoading ? (
                    <div className={styles.loading}><p>Загрузка ваших объявлений...</p></div>
                ) : displayedTickets.length === 0 ? (
                    <div className={styles.noResults}>
                        <p>
                            {activeTab === 'active'
                                ? 'У вас нет активных объявлений'
                                : 'У вас нет завершенных объявлений'
                            }
                        </p>
                        {activeTab === 'active' && (
                            <button className={styles.createEmptyButton} onClick={handleCreateNew}>
                                Создать первое объявление
                            </button>
                        )}
                    </div>
                ) : (
                    displayedTickets.map((ticket) => (
                        <AnnouncementCard
                            key={ticket.id}
                            title={ticket.title}
                            description={ticket.description}
                            price={ticket.price}
                            unit={ticket.unit}
                            address={ticket.address}
                            date={ticket.date}
                            author={ticket.author}
                            category={ticket.category}
                            timeAgo={ticket.timeAgo}
                            ticketType={ticket.type}
                            onClick={() => handleCardClick(ticket.type, ticket.id, ticket.authorId, ticket.masterId)}
                            showEditButton={true}
                            onEditClick={(e) => handleEditTicket(e, ticket.id)}
                            showActiveToggle={true}
                            isActive={ticket.active}
                            onActiveToggle={(e) => handleToggleTicketActive(e, ticket.id, ticket.active)}
                        />
                    ))
                )}
            </div>
            {/* Модальное окно авторизации */}
            {showAuthModal && (
                <AuthModal
                    isOpen={showAuthModal}
                    onClose={() => setShowAuthModal(false)}
                    onLoginSuccess={handleLoginSuccess}
                />
            )}

            {/* Модалка успеха */}
            {showSuccessModal && (
                <div className={styles.modalOverlay} onClick={handleCloseSuccessModal}>
                    <div className={`${styles.modalContent} ${styles.successModal}`} onClick={(e) => e.stopPropagation()}>
                        <h2 className={styles.successTitle}>Успешно!</h2>
                        <div className={styles.successIcon}>
                            <img src="../uspeh.png" alt="Успех"/>
                        </div>
                        <p className={styles.successMessage}>{modalMessage}</p>
                        <button
                            className={styles.successButton}
                            onClick={handleCloseSuccessModal}
                        >
                            Понятно
                        </button>
                    </div>
                </div>
            )}

            {/* Модалка ошибки */}
            {showErrorModal && (
                <div className={styles.modalOverlay} onClick={handleCloseErrorModal}>
                    <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                        <h2 className={styles.errorTitle}>Ошибка</h2>
                        <div className={styles.errorIcon}>
                            <img src="../error.png" alt="Ошибка"/>
                        </div>
                        <p className={styles.errorMessage}>{modalMessage}</p>
                        <button
                            className={styles.errorButton}
                            onClick={handleCloseErrorModal}
                        >
                            Понятно
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default MyTickets;