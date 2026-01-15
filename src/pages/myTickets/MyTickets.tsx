import {useState, useEffect, useCallback} from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuthToken } from '../../utils/auth';
import styles from './MyTickets.module.scss';
import AuthModal from "../../features/auth/AuthModal.tsx";

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
    const [tickets, setTickets] = useState<FormattedTicket[]>([]);
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
    }, [activeTab]);

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

                // Фильтруем по активности в зависимости от выбранной вкладки
                const filteredTickets = myTickets.filter(ticket =>
                    activeTab === 'active' ? ticket.active : !ticket.active
                );

                const formattedTickets: FormattedTicket[] = filteredTickets.map(ticket => ({
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
                    timeAgo: getTimeAgo(ticket.createdAt),
                    category: ticket.category?.title || 'другое',
                    status: ticket.active ? 'Активно' : 'Завершено',
                    type: ticket.service ? 'master' : 'client',
                    authorImage: ticket.author?.image ? formatProfileImageUrl(ticket.author.image) : undefined,
                    active: ticket.active
                }));

                setTickets(formattedTickets);
            } else {
                console.error('Error fetching tickets, status:', response.status);
                setTickets([]);
            }
        } catch (error) {
            console.error('Error fetching tickets:', error);
            setTickets([]);
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

    const getTimeAgo = (dateString: string) => {
        try {
            if (!dateString) return 'недавно';
            const date = new Date(dateString);
            const now = new Date();
            const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
            if (diffInSeconds < 60) return 'только что';
            if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} ${getRussianWord(Math.floor(diffInSeconds / 60), ['минуту', 'минуты', 'минут'])} назад`;
            if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} ${getRussianWord(Math.floor(diffInSeconds / 3600), ['час', 'часа', 'часов'])} назад`;
            return `${Math.floor(diffInSeconds / 86400)} ${getRussianWord(Math.floor(diffInSeconds / 86400), ['день', 'дня', 'дней'])} назад`;
        } catch {
            return 'недавно';
        }
    };

    const getRussianWord = (number: number, words: [string, string, string]) => {
        const cases = [2, 0, 1, 1, 1, 2];
        return words[number % 100 > 4 && number % 100 < 20 ? 2 : cases[number % 10 < 5 ? number % 10 : 5]];
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
            navigate(`/order/${authorId}?ticket=${ticketId}&type=${type}`);
        if (masterId)
            navigate(`/order/${masterId}?ticket=${ticketId}&type=${type}`);
    }, [navigate]);

    const handleCreateNew = () => {
        const token = getAuthToken();

        if (!token) {
            setShowAuthModal(true);
            return;
        }

        navigate('/create-ad');
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
                    navigate(`/order/${authorId}?ticket=${ticketId}&type=${type}`);
                if (masterId)
                    navigate(`/order/${masterId}?ticket=${ticketId}&type=${type}`);

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
                    Активные ({tickets.filter(t => t.active).length})
                </button>
                <button
                    className={`${styles.tab} ${activeTab === 'inactive' ? styles.active : ''}`}
                    onClick={() => setActiveTab('inactive')}
                >
                    Завершенные ({tickets.filter(t => !t.active).length})
                </button>
            </div>

            {/* Список объявлений */}
            <div className={styles.ticketsList}>
                {isLoading ? (
                    <div className={styles.loading}><p>Загрузка ваших объявлений...</p></div>
                ) : tickets.length === 0 ? (
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
                    tickets.map((ticket) => (
                        <div key={ticket.id}
                             className={styles.ticketCard}
                             onClick={() => handleCardClick(ticket.type, ticket.id, ticket.authorId, ticket.masterId)}
                             style={{ cursor: 'pointer' }}
                        >
                            <div className={styles.ticketHeader}>
                                <div className={styles.ticketInfo}>
                                    <h3>{ticket.title}</h3>
                                    <span className={`${styles.status} ${ticket.active ? styles.active : styles.inactive}`}>
                                        {ticket.status}
                                    </span>
                                </div>
                                <span className={styles.price}>{ticket.price.toLocaleString('ru-RU')} TJS, {ticket.unit}</span>
                            </div>

                            {/*<div className={styles.ticketType}>*/}
                            {/*    /!*{getTicketTypeLabel(ticket.type)}*!/*/}
                            {/*</div>*/}

                            <p className={styles.description}>{ticket.description}</p>

                            <div className={styles.ticketDetails}>
                                <span className={styles.category}>
                                    {ticket.category}
                                </span>
                                <span className={styles.address}>
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" stroke="#3A54DA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                        <circle cx="12" cy="9" r="2.5" stroke="#3A54DA" strokeWidth="2"/>
                                    </svg>
                                    {ticket.address}
                                </span>
                                <span className={styles.date}>
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M3 8h18M21 6v14H3V6h18zM16 2v4M8 2v4" stroke="#3A54DA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                    {ticket.date}
                                </span>
                            </div>

                            <div className={styles.ticketFooter}>
                                <span className={styles.timeAgo}>{ticket.timeAgo}</span>
                            </div>
                        </div>
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