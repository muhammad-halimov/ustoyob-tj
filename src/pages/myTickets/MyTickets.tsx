import {useState, useEffect, useCallback} from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuthToken } from '../../utils/auth';
import styles from './MyTickets.module.scss';

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
    district: {
        id: number;
        title: string;
        image: string;
        city: {
            id: number;
            title: string;
            image: string;
            province: {
                id: number;
                title: string;
            };
        };
    };
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
    timeAgo: string;
    category: string;
    status: string;
    authorId: number;
    type: 'client' | 'master';
    authorImage?: string;
    active: boolean;
}

const API_BASE_URL = 'https://admin.ustoyob.tj';

function MyTickets() {
    const navigate = useNavigate();
    const [tickets, setTickets] = useState<FormattedTicket[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'active' | 'inactive'>('active');

    useEffect(() => {
        fetchMyTickets();
    }, [activeTab]);

    const fetchMyTickets = async () => {
        try {
            setIsLoading(true);
            const token = getAuthToken();

            if (!token) {
                alert('Пожалуйста, войдите в систему');
                navigate('/login');
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
            const url = `${API_BASE_URL}/api/tickets`;
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
                    ticket.author?.id === userData.id
                );

                console.log('My tickets:', myTickets);

                // Фильтруем по активности в зависимости от выбранной вкладки
                const filteredTickets = myTickets.filter(ticket =>
                    activeTab === 'active' ? ticket.active === true : ticket.active === false
                );

                const formattedTickets: FormattedTicket[] = filteredTickets.map(ticket => ({
                    id: ticket.id,
                    title: ticket.title || 'Без названия',
                    price: ticket.budget || 0,
                    unit: ticket.unit?.title || 'tjs',
                    description: ticket.description || 'Описание отсутствует',
                    address: getFullAddress(ticket),
                    date: formatDate(ticket.createdAt),
                    author: `${ticket.author?.name || ''} ${ticket.author?.surname || ''}`.trim() ||
                        (ticket.service ? 'Мастер' : 'Клиент'),
                    authorId: ticket.author?.id || 0,
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

    const getFullAddress = (ticket: Ticket): string => {
        const city = ticket.district?.city?.title || '';
        const district = ticket.district?.title || '';

        if (city && district) {
            return `${city}, ${district}`;
        }
        if (city) {
            return city;
        }
        if (district) {
            return district;
        }
        return 'Адрес не указан';
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

    const handleCardClick = useCallback((ticketId?: number, authorId?: number) => {
        if (!ticketId) return;
        const targetAuthorId = authorId || ticketId;
        navigate(`/order/${targetAuthorId}?ticket=${ticketId}`);
    }, [navigate]);

    const handleCreateNew = () => {
        navigate('/create-ad');
    };

    const handleClose = () => {
        navigate(-1);
    };

    // const getTicketTypeLabel = (type: 'client' | 'master') => {
    //     return type === 'master' ? 'Услуга мастера' : 'Заказ клиента';
    // };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1>Мои объявления</h1>
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
                             onClick={() => handleCardClick(ticket.id)}
                             style={{ cursor: 'pointer' }}
                        >
                            <div className={styles.ticketHeader}>
                                <div className={styles.ticketInfo}>
                                    <h3>{ticket.title}</h3>
                                    <span className={`${styles.status} ${ticket.active ? styles.active : styles.inactive}`}>
                                        {ticket.status}
                                    </span>
                                </div>
                                <span className={styles.price}>{ticket.price.toLocaleString('ru-RU')} {ticket.unit}</span>
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
        </div>
    );
}

export default MyTickets;