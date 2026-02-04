import {useState, useEffect, useCallback} from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getAuthToken, getUserRole } from '../../utils/auth';
import styles from './CategoryTicketsPage.module.scss';
import { AnnouncementCard } from '../../shared/ui/AnnouncementCard/AnnouncementCard';

interface Ticket {
    id: number;
    title: string;
    description: string;
    notice: string;
    budget: number;
    active: boolean;
    service: boolean; // true - услуга от мастера, false - заказ от клиента
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
    } | null;
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
    status: string;
    authorId: number;
    type: 'client' | 'master';
    authorImage?: string;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

function CategoryTicketsPage() {
    const navigate = useNavigate();
    const { categoryId } = useParams<{ categoryId: string }>();
    const [tickets, setTickets] = useState<FormattedTicket[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [categoryName, setCategoryName] = useState<string>('');
    const [userRole, setUserRole] = useState<'client' | 'master' | null>(null);

    useEffect(() => {
        const role = getUserRole();
        setUserRole(role);

        if (categoryId) {
            fetchTicketsByCategory();
            fetchCategoryName();
        }
    }, [categoryId]);

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

    const fetchCategoryName = async () => {
        try {
            const headers: HeadersInit = {
                'Accept': 'application/json'
            };
            const token = getAuthToken();

            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const response = await fetch(`${API_BASE_URL}/api/categories/${categoryId}?locale=${localStorage.getItem('i18nextLng') || 'ru'}`, {
                headers: headers
            });

            if (response.ok) {
                const categoryData = await response.json();
                setCategoryName(categoryData.title);
            } else {
                setCategoryName('Категория');
            }
        } catch (error) {
            console.error('Error fetching category name:', error);
            setCategoryName('Категория');
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
            const role = getUserRole();

            console.log('Fetching tickets for category:', categoryId);
            console.log('User role:', role);
            console.log('Token exists:', !!token);

            // Убеждаемся, что categoryId есть
            if (!categoryId) {
                console.error('No category ID provided');
                setTickets([]);
                return;
            }

            let ticketsData: Ticket[] = [];

            if (!token || role === null) {
                // Для неавторизованных - получаем все тикеты (и услуги и заказы)
                console.log('Fetching all tickets for unauthorized user');
                const [masterTickets, clientTickets] = await Promise.all([
                    fetchTicketsWithParams({
                        active: 'true',
                        service: 'true',
                        'exists[master]': 'true',
                        'category': categoryId
                    }),
                    fetchTicketsWithParams({
                        active: 'true',
                        service: 'false',
                        'exists[author]': 'true',
                        'category': categoryId
                    })
                ]);
                ticketsData = [...masterTickets, ...clientTickets];
            } else if (role === 'client') {
                // Для клиентов - получаем тикеты мастеров (услуги)
                console.log('Fetching master tickets for client');
                ticketsData = await fetchTicketsWithParams({
                    active: 'true',
                    service: 'true',
                    'exists[master]': 'true',
                    'category': categoryId
                }, token);
            } else if (role === 'master') {
                // Для мастеров - получаем тикеты клиентов (заказы)
                console.log('Fetching client tickets for master');
                ticketsData = await fetchTicketsWithParams({
                    active: 'true',
                    service: 'false',
                    'exists[author]': 'true',
                    'category': categoryId
                }, token);
            }

            console.log('Total tickets received:', ticketsData.length);

            // Форматируем тикеты
            const formattedTickets: FormattedTicket[] = ticketsData.map(ticket => {
                const isMasterTicket = ticket.service; // service: true - услуга от мастера
                const author = isMasterTicket ? ticket.master : ticket.author;
                const authorId = author?.id || 0;
                const authorName = author ? `${author.name || ''} ${author.surname || ''}`.trim() : 'Пользователь';

                const fullAddress = getFullAddress(ticket);
                const shortAddress = getShortAddress(ticket);

                return {
                    id: ticket.id,
                    title: ticket.title || 'Без названия',
                    price: ticket.budget || 0,
                    unit: ticket.unit?.title || 'TJS',
                    description: ticket.description || 'Описание отсутствует',
                    address: shortAddress, // Краткий адрес для основного отображения
                    fullAddress: fullAddress, // Полный адрес
                    date: formatDate(ticket.createdAt),
                    author: authorName,
                    authorId: authorId,
                    timeAgo: getTimeAgo(ticket.createdAt),
                    category: ticket.category?.title || 'другое',
                    status: ticket.active ? 'В работе' : 'Завершен',
                    type: isMasterTicket ? 'master' : 'client',
                    authorImage: author?.image ? formatProfileImageUrl(author.image) : undefined
                };
            });

            setTickets(formattedTickets);
        } catch (error) {
            console.error('Error fetching tickets:', error);
            setTickets([]);
        } finally {
            setIsLoading(false);
        }
    };

    // Универсальная функция для получения тикетов с query-параметрами
    const fetchTicketsWithParams = async (params: Record<string, string>, token?: string): Promise<Ticket[]> => {
        try {
            const headers: HeadersInit = {
                'Accept': 'application/json'
            };

            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            // Создаем URL с query-параметрами
            const url = new URL(`${API_BASE_URL}/api/tickets?locale=${localStorage.getItem('i18nextLng') || 'ru'}`);

            // Добавляем параметры, убедившись, что они не undefined
            Object.entries(params).forEach(([key, value]) => {
                if (value !== undefined && value !== null) {
                    url.searchParams.append(key, value);
                }
            });

            console.log('Fetching from URL:', url.toString());

            const response = await fetch(url.toString(), {
                headers: headers
            });

            if (response.ok) {
                const data = await response.json();
                console.log(`Tickets fetched with params:`, data.length);
                return Array.isArray(data) ? data : [];
            } else {
                console.error(`Error fetching tickets: ${response.status} ${response.statusText}`);
                return [];
            }
        } catch (error) {
            console.error(`Error fetching tickets with params:`, error);
            return [];
        }
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

    const handleCardClick = (ticketId: number, authorId: number) => {
        navigate(`/order/${authorId}?ticket=${ticketId}`);
    };

    const handleClose = () => {
        navigate(-1);
    };

    const getPageTitle = () => {
        if (!categoryName) return 'По категории';

        let roleText: string;

        if (userRole === 'client') {
            roleText = ' - Услуги мастеров';
        } else if (userRole === 'master') {
            roleText = ' - Заказы клиентов';
        } else {
            roleText = ' - Все объявления';
        }

        return `${categoryName}${roleText}`;
    };

    const getTicketTypeLabel = (type: 'client' | 'master') => {
        return type === 'client' ? 'Заказ от клиента' : 'Услуга от мастера';
    };

    // Если категория ID не передан
    if (!categoryId) {
        return (
            <div className={styles.container}>
                <div className={styles.header}>
                    <h1>Ошибка</h1>
                    <button className={styles.closeButton} onClick={handleClose}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M18 6L6 18" stroke="#101010" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M6 6L18 18" stroke="#101010" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                    </button>
                </div>
                <div className={styles.noResults}>
                    <p>Категория не выбрана</p>
                </div>
            </div>
        );
    }

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

            <div className={styles.searchResults}>
                {isLoading ? (
                    <div className={styles.loading}><p>Загрузка...</p></div>
                ) : tickets.length === 0 ? (
                    <div className={styles.noResults}>
                        <p>
                            {categoryName
                                ? `Нет объявлений в категории "${categoryName}"`
                                : 'Нет объявлений в выбранной категории'
                            }
                        </p>
                        <button
                            className={styles.refreshButton}
                            onClick={() => fetchTicketsByCategory()}
                        >
                            Обновить
                        </button>
                    </div>
                ) : (
                    tickets.map((ticket) => (
                        <AnnouncementCard
                            key={ticket.id}
                            title={ticket.title}
                            description={cleanText(ticket.description)}
                            price={ticket.price}
                            unit={ticket.unit}
                            address={ticket.fullAddress}
                            date={ticket.date}
                            author={ticket.author}
                            category={ticket.category}
                            timeAgo={ticket.timeAgo}
                            ticketType={userRole === null ? getTicketTypeLabel(ticket.type) : undefined}
                            onClick={() => handleCardClick(ticket.id, ticket.authorId)}
                        />
                    ))
                )}
            </div>
        </div>
    );
}

export default CategoryTicketsPage;