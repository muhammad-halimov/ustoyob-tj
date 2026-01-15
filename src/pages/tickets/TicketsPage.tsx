import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getAuthToken } from '../../utils/auth';
import styles from './TicketsPage.module.scss';

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
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

function TicketsPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [tickets, setTickets] = useState<FormattedTicket[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showResults, setShowResults] = useState(true);

    // Получаем параметры из URL
    const categoryId = searchParams.get('category') || localStorage.getItem('lastCreatedCategory');
    const type = searchParams.get('type');
    // const source = searchParams.get('source');

    useEffect(() => {
        fetchTicketsByCategory();
    }, [categoryId, type]);

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

    const fetchTicketsByCategory = async () => {
        try {
            setIsLoading(true);
            const token = getAuthToken();

            // Строим URL с фильтрами
            let url = `${API_BASE_URL}/api/tickets`;
            const params = new URLSearchParams();

            // Пробуем разные варианты фильтрации по категории
            if (categoryId) {
                // Вариант 1: category[id]
                params.append('category[id]', categoryId);
                // ИЛИ вариант 2: filter[category]
                // params.append('filter[category]', categoryId);
                // ИЛИ вариант 3: category.id
                // params.append('category.id', categoryId);
            }

            if (type === 'clients') {
                params.append('service', 'false'); // Заказы клиентов
            }

            // Добавляем фильтр по активности
            params.append('active', 'true');

            if (params.toString()) {
                url += `?${params.toString()}`;
            }

            console.log('Fetching tickets from:', url);
            console.log('Using categoryId:', categoryId);

            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const ticketsData: Ticket[] = await response.json();
                console.log('Received tickets:', ticketsData);

                // Если API все равно возвращает все тикеты, делаем фильтрацию на клиенте
                let filteredTickets = ticketsData.filter(ticket =>
                    ticket.service === false && // Только заказы клиентов
                    ticket.active === true // Только активные
                );

                // Дополнительная фильтрация по категории на клиенте
                if (categoryId) {
                    filteredTickets = filteredTickets.filter(ticket =>
                        ticket.category?.id === Number(categoryId)
                    );
                }

                console.log('Filtered tickets after client-side filtering:', filteredTickets);

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
                    status: ticket.active ? 'В работе' : 'Завершен',
                    type: ticket.service ? 'master' : 'client',
                    authorImage: ticket.author?.image ? formatProfileImageUrl(ticket.author.image) : undefined
                }));

                setTickets(formattedTickets);
                setShowResults(true);
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

    // const getTicketTypeLabel = (type: 'client' | 'master') => {
    //     return type === 'master' ? 'Услуга мастера' : 'Заказ клиента';
    // };

    const handleCardClick = (authorId: number) => {
        navigate(`/order/${authorId}`);
    };

    const handleClose = () => {
        navigate(-1);
    };

    // Динамический заголовок в зависимости от типа и категории
    const getPageTitle = () => {
        if (type === 'clients') {
            return categoryId ? 'Заказы клиентов' : 'Все заказы клиентов';
        } else if (type === 'masters') {
            return categoryId ? 'Услуги мастеров' : 'Все услуги мастеров';
        }
        return categoryId ? 'Тикеты по категории' : 'Все тикеты';
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1>{getPageTitle()}</h1>
                <button className={styles.closeButton} onClick={handleClose}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M18 6L6 18" stroke="#101010" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M6 6L18 18" stroke="#101010" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                </button>
            </div>

            {/* Информация о фильтрации */}
            {/*{(categoryId || type) && (*/}
            {/*    <div className={styles.filterInfo}>*/}
            {/*        <p>*/}
            {/*            {source === 'created' ? 'После создания вашей услуги найдены ' : 'Показываем '}*/}
            {/*            {type === 'clients' ? 'заказы клиентов' : type === 'masters' ? 'услуги мастеров' : 'тикеты'}*/}
            {/*            {categoryId && ' по выбранной категории'}*/}
            {/*        </p>*/}
            {/*    </div>*/}
            {/*)}*/}

            {/* Результаты поиска */}
            <div className={`${styles.searchResults} ${!showResults ? styles.hidden : ''}`}>
                {isLoading ? (
                    <div className={styles.loading}><p>Загрузка...</p></div>
                ) : tickets.length === 0 ? (
                    <div className={styles.noResults}>
                        <p>
                            {categoryId
                                ? `Нет ${type === 'clients' ? 'заказов клиентов' : 'услуг мастеров'} по выбранной категории`
                                : `Нет ${type === 'clients' ? 'заказов клиентов' : type === 'masters' ? 'услуг мастеров' : 'тикетов'}`
                            }
                        </p>
                    </div>
                ) : (
                    tickets.map((ticket) => (
                        <div key={ticket.id}
                             className={styles.resultCard}
                             onClick={() => handleCardClick(ticket.authorId)}
                             style={{ cursor: 'pointer' }}
                        >
                            {/* Показываем метку типа тикета */}
                            {/*<div className={styles.ticketType}>*/}
                            {/*    {getTicketTypeLabel(ticket.type)}*/}
                            {/*</div>*/}
                            <div className={styles.resultHeader}>
                                <h3>{ticket.title}</h3>
                                <span className={styles.price}>{ticket.price.toLocaleString('ru-RU')} TJS, {ticket.unit}</span>
                            </div>
                            <p className={styles.description}>{ticket.description}</p>
                            <div className={styles.resultDetails}>
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
                            <div className={styles.resultFooter}>
                                <span className={styles.author}>
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <g clipPath="url(#clip0_324_2870)">
                                            <g clipPath="url(#clip1_324_2870)">
                                                <path d="M11.9995 12.9795C15.1641 12.9795 17.7295 10.4141 17.7295 7.24953C17.7295 4.08494 15.1641 1.51953 11.9995 1.51953C8.83494 1.51953 6.26953 4.08494 6.26953 7.24953C6.26953 10.4141 8.83494 12.9795 11.9995 12.9795Z" stroke="#5D5D5D" strokeWidth="2" strokeMiterlimit="10"/>
                                                <path d="M1.5 23.48L1.87 21.43C2.3071 19.0625 3.55974 16.9229 5.41031 15.3828C7.26088 13.8428 9.59246 12.9997 12 13C14.4104 13.0006 16.7443 13.8465 18.5952 15.3905C20.4462 16.9345 21.6971 19.0788 22.13 21.45L22.5 23.5" stroke="#5D5D5D" strokeWidth="2" strokeMiterlimit="10"/>
                                            </g>
                                        </g>
                                        <defs>
                                            <clipPath id="clip0_324_2870">
                                                <rect width="24" height="24" fill="white"/>
                                            </clipPath>
                                            <clipPath id="clip1_324_2870">
                                                <rect width="24" height="24" fill="white"/>
                                            </clipPath>
                                        </defs>
                                    </svg>
                                    {ticket.author}
                                </span>
                                <span className={styles.timeAgo}>{ticket.timeAgo}</span>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

export default TicketsPage;