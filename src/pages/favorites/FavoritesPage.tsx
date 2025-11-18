import { useState, useEffect } from 'react';
import { getAuthToken, getUserRole } from '../../utils/auth';
import styles from './FavoritePage.module.scss';
import { useNavigate } from 'react-router-dom';

interface FavoriteTicket {
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

interface Favorite {
    id: number;
    user: { id: number };
    masters: Array<{
        id: number;
        name?: string;
        surname?: string;
        image?: string;
    }>;
    clients: Array<{
        id: number;
        name?: string;
        surname?: string;
        image?: string;
    }>;
    tickets: Array<{
        id: number;
        title: string;
        active: boolean;
        author: { id: number; name?: string; surname?: string; image?: string };
        master: { id: number; name?: string; surname?: string; image?: string };
        service: boolean;
    }>;
}

interface ApiTicket {
    id: number;
    title: string;
    description: string;
    budget: number;
    unit: { id: number; title: string };
    address: {
        title?: string;
        city?: { title?: string }
    } | null;
    district?: {
        title?: string;
        city?: { title?: string }
    } | null;
    createdAt: string;
    master: { id: number; name?: string; surname?: string; image?: string } | null;
    author: { id: number; name?: string; surname?: string; image?: string };
    category: { title: string };
    active: boolean;
    notice?: string;
    service: boolean;
    images?: { id: number; image: string }[];
}

const API_BASE_URL = 'https://admin.ustoyob.tj';

function FavoritesPage() {
    const [favoriteTickets, setFavoriteTickets] = useState<FavoriteTicket[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        fetchFavorites();
    }, []);

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

    const fetchFavorites = async () => {
        try {
            const token = getAuthToken();
            if (!token) return;

            const response = await fetch(`${API_BASE_URL}/api/favorites/me`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const favorite: Favorite = await response.json();
                const userRole = getUserRole();

                console.log('Favorite data:', favorite);
                console.log('User role:', userRole);

                let tickets: FavoriteTicket[] = [];

                // Обрабатываем мастеров в избранном (для клиентов)
                if (userRole === 'client' && favorite.masters && favorite.masters.length > 0) {
                    console.log('Processing favorite masters:', favorite.masters);
                    for (const master of favorite.masters) {
                        const masterTickets = await fetchUserTickets(master.id, 'master');
                        tickets.push(...masterTickets.map(ticket => ({
                            ...ticket,
                            authorImage: master.image ? formatProfileImageUrl(master.image) : undefined
                        })));
                    }
                }

                // Обрабатываем клиентов в избранном (для мастеров)
                if (userRole === 'master' && favorite.clients && favorite.clients.length > 0) {
                    console.log('Processing favorite clients:', favorite.clients);
                    for (const client of favorite.clients) {
                        const clientTickets = await fetchUserTickets(client.id, 'client');
                        tickets.push(...clientTickets.map(ticket => ({
                            ...ticket,
                            authorImage: client.image ? formatProfileImageUrl(client.image) : undefined
                        })));
                    }
                }

                // Обрабатываем тикеты в избранном
                if (favorite.tickets && favorite.tickets.length > 0) {
                    console.log('Processing favorite tickets:', favorite.tickets);
                    for (const ticket of favorite.tickets) {
                        const ticketDetails = await fetchTicketDetails(ticket.id);
                        if (ticketDetails) {
                            tickets.push({
                                ...ticketDetails,
                                authorImage: ticket.author?.image ? formatProfileImageUrl(ticket.author.image) :
                                    ticket.master?.image ? formatProfileImageUrl(ticket.master.image) : undefined
                            });
                        }
                    }
                }

                console.log('Final favorite tickets:', tickets);
                setFavoriteTickets(tickets);
            } else if (response.status === 404) {
                console.log('No favorites found');
                setFavoriteTickets([]);
            } else {
                console.error('Error fetching favorites, status:', response.status);
                setFavoriteTickets([]);
            }
        } catch (error) {
            console.error('Error fetching favorites:', error);
            setFavoriteTickets([]);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchUserTickets = async (userId: number, userType: 'master' | 'client'): Promise<FavoriteTicket[]> => {
        try {
            const token = getAuthToken();
            if (!token) return [];

            let endpoint = '';
            if (userType === 'master') {
                endpoint = `/api/tickets/masters/${userId}`;
            } else {
                endpoint = `/api/tickets/clients/${userId}`;
            }

            console.log(`Fetching ${userType} tickets from: ${endpoint}`);

            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                let ticketsData: ApiTicket[] = await response.json();

                // Если пришел один объект, а не массив - преобразуем в массив
                if (!Array.isArray(ticketsData)) {
                    ticketsData = [ticketsData];
                }

                console.log(`Received ${ticketsData.length} ${userType} tickets`);

                return ticketsData.map(ticket => ({
                    id: ticket.id,
                    title: ticket.title || (userType === 'master' ? 'Услуга мастера' : 'Заказ клиента'),
                    price: ticket.budget || 0,
                    unit: ticket.unit?.title || 'руб',
                    description: ticket.description || 'Описание отсутствует',
                    address: getFullAddress(ticket),
                    date: formatDate(ticket.createdAt),
                    author: userType === 'master'
                        ? `${ticket.master?.name || ''} ${ticket.master?.surname || ''}`.trim() || 'Мастер'
                        : `${ticket.author?.name || ''} ${ticket.author?.surname || ''}`.trim() || 'Клиент',
                    authorId: userId,
                    timeAgo: getTimeAgo(ticket.createdAt),
                    category: ticket.category?.title || (userType === 'master' ? 'услуга' : 'заказ'),
                    status: ticket.active ? 'В работе' : 'Завершен',
                    type: userType
                }));
            } else {
                console.log(`Error fetching ${userType} tickets, status:`, response.status);
            }
        } catch (error) {
            console.error(`Error fetching ${userType} tickets:`, error);
        }
        return [];
    };

    const fetchTicketDetails = async (ticketId: number): Promise<FavoriteTicket | null> => {
        try {
            const token = getAuthToken();
            if (!token) return null;

            // Пробуем оба endpoint'а
            const endpoints = [
                `/api/tickets/masters/${ticketId}`,
                `/api/tickets/clients/${ticketId}`
            ];

            for (const endpoint of endpoints) {
                try {
                    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        }
                    });

                    if (response.ok) {
                        let ticketData: ApiTicket[] = await response.json();

                        if (!Array.isArray(ticketData)) {
                            ticketData = [ticketData];
                        }

                        if (ticketData.length > 0) {
                            const ticket = ticketData[0];
                            const userType = endpoint.includes('masters') ? 'master' : 'client';

                            return {
                                id: ticket.id,
                                title: ticket.title || 'Без названия',
                                price: ticket.budget || 0,
                                unit: ticket.unit?.title || 'руб',
                                description: ticket.description || 'Описание отсутствует',
                                address: getFullAddress(ticket),
                                date: formatDate(ticket.createdAt),
                                author: userType === 'master'
                                    ? `${ticket.master?.name || ''} ${ticket.master?.surname || ''}`.trim() || 'Мастер'
                                    : `${ticket.author?.name || ''} ${ticket.author?.surname || ''}`.trim() || 'Клиент',
                                authorId: userType === 'master' ? ticket.master?.id || 0 : ticket.author?.id || 0,
                                timeAgo: getTimeAgo(ticket.createdAt),
                                category: ticket.category?.title || 'другое',
                                status: ticket.active ? 'В работе' : 'Завершен',
                                type: userType
                            };
                        }
                    }
                } catch (error) {
                    console.error(`Error fetching ticket from ${endpoint}:`, error);
                }
            }
        } catch (error) {
            console.error('Error fetching ticket details:', error);
        }
        return null;
    };

    const getFullAddress = (ticket: ApiTicket): string => {
        // Пробуем получить город из district
        const districtCity = ticket.district?.city?.title || '';
        const addressTitle = ticket.address?.title || '';
        const addressCity = ticket.address?.city?.title || '';

        const city = districtCity || addressCity;

        if (city && addressTitle) {
            return `${city}, ${addressTitle}`;
        }
        if (city) {
            return city;
        }
        if (addressTitle) {
            return addressTitle;
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

    const handleCardClick = (authorId: number) => {
        navigate(`/order/${authorId}`);
    };

    if (isLoading) {
        return <div className={styles.loading}>Загрузка избранного...</div>;
    }

    if (favoriteTickets.length === 0) {
        return (
            <div className={styles.recommendation}>
                <div className={styles.recommendation_wrap}>
                    <div className={styles.emptyState}>
                        <p>У вас пока нет избранных заказов</p>
                        <p>Добавляйте понравившиеся заказы в избранное, чтобы не потерять</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.recommendation}>
            <div className={styles.recommendation_wrap}>
                {favoriteTickets.map((ticket) => (
                    <div
                        key={`${ticket.id}-${ticket.type}`}
                        className={styles.recommendation_item}
                        onClick={() => handleCardClick(ticket.authorId)}
                        style={{ cursor: 'pointer' }}
                    >
                        <div className={styles.recommendation_item_title}>
                            <h4>{ticket.title}</h4>
                            <span className={styles.recommendation_item_price}>
                                {ticket.price.toLocaleString('ru-RU')} {ticket.unit}
                            </span>
                        </div>
                        <div className={styles.recommendation_item_status}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <g clipPath="url(#clip0_182_2657)">
                                    <g clipPath="url(#clip1_182_2657)">
                                        <path d="M12 22.5C17.799 22.5 22.5 17.799 22.5 12C22.5 6.20101 17.799 1.5 12 1.5C6.20101 1.5 1.5 6.20101 1.5 12C1.5 17.799 6.20101 22.5 12 22.5Z" stroke="black" strokeWidth="2" strokeMiterlimit="10"/>
                                        <path d="M11.9998 16.7698V10.0898H10.0898" stroke="black" strokeWidth="2" strokeMiterlimit="10"/>
                                        <path d="M10.0898 16.77H13.9098" stroke="black" strokeWidth="2" strokeMiterlimit="10"/>
                                        <path d="M11.0498 7.22998H12.9498" stroke="black" strokeWidth="2" strokeMiterlimit="10"/>
                                    </g>
                                </g>
                                <defs>
                                    <clipPath id="clip0_182_2657">
                                        <rect width="24" height="24" fill="white"/>
                                    </clipPath>
                                    <clipPath id="clip1_182_2657">
                                        <rect width="24" height="24" fill="white"/>
                                    </clipPath>
                                </defs>
                            </svg>
                            <p>{ticket.status}</p>
                        </div>
                        <div className={styles.recommendation_item_description}>
                            <p>{ticket.description}</p>
                            <div className={styles.recommendation_item_inform}>
                                <div className={styles.recommendation_item_locate}>
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <g clipPath="url(#clip0_324_1115)">
                                            <g clipPath="url(#clip1_324_1115)">
                                                <path d="M19.6404 9.14C19.6404 15.82 12.0004 22.5 12.0004 22.5C12.0004 22.5 4.36035 15.82 4.36035 9.14C4.36035 7.11375 5.16528 5.17048 6.59806 3.7377C8.03083 2.30493 9.9741 1.5 12.0004 1.5C14.0266 1.5 15.9699 2.30493 17.4026 3.7377C18.8354 5.17048 19.6404 7.11375 19.6404 9.14Z" stroke="#3A54DA" strokeWidth="2" strokeMiterlimit="10"/>
                                                <path d="M12.0006 11.9998C13.5802 11.9998 14.8606 10.7193 14.8606 9.13979C14.8606 7.56025 13.5802 6.27979 12.0006 6.27979C10.4211 6.27979 9.14062 7.56025 9.14062 9.13979C9.14062 10.7193 10.4211 11.9998 12.0006 11.9998Z" stroke="#3A54DA" strokeWidth="2" strokeMiterlimit="10"/>
                                            </g>
                                        </g>
                                        <defs>
                                            <clipPath id="clip0_324_1115">
                                                <rect width="24" height="24" fill="white"/>
                                            </clipPath>
                                            <clipPath id="clip1_324_1115">
                                                <rect width="24" height="24" fill="white"/>
                                            </clipPath>
                                        </defs>
                                    </svg>
                                    <p>{ticket.address}</p>
                                </div>
                                <div className={styles.recommendation_item_locate}>
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <g clipPath="url(#clip0_324_2851)">
                                            <g clipPath="url(#clip1_324_2851)">
                                                <path d="M22.5205 3.37012H1.48047V8.15012H22.5205V3.37012Z" stroke="#3A54DA" strokeWidth="2" strokeMiterlimit="10"/>
                                                <path d="M22.5205 8.15039H1.48047V22.5004H22.5205V8.15039Z" stroke="#3A54DA" strokeWidth="2" strokeMiterlimit="10"/>
                                                <path d="M5.2998 12.9297H7.2198" stroke="#3A54DA" strokeWidth="2" strokeMiterlimit="10"/>
                                                <path d="M9.12988 12.9297H11.0399" stroke="#3A54DA" strokeWidth="2" strokeMiterlimit="10"/>
                                                <path d="M12.96 12.9297H14.87" stroke="#3A54DA" strokeWidth="2" strokeMiterlimit="10"/>
                                                <path d="M16.7803 12.9297H18.7003" stroke="#3A54DA" strokeWidth="2" strokeMiterlimit="10"/>
                                                <path d="M16.7803 17.7197H18.7003" stroke="#3A54DA" strokeWidth="2" strokeMiterlimit="10"/>
                                                <path d="M5.2998 17.7197H7.2198" stroke="#3A54DA" strokeWidth="2" strokeMiterlimit="10"/>
                                                <path d="M9.12988 17.7197H11.0399" stroke="#3A54DA" strokeWidth="2" strokeMiterlimit="10"/>
                                                <path d="M12.96 17.7197H14.87" stroke="#3A54DA" strokeWidth="2" strokeMiterlimit="10"/>
                                                <path d="M6.25977 0.5V5.28" stroke="#3A54DA" strokeWidth="2" strokeMiterlimit="10"/>
                                                <path d="M12 0.5V5.28" stroke="#3A54DA" strokeWidth="2" strokeMiterlimit="10"/>
                                                <path d="M17.7402 0.5V5.28" stroke="#3A54DA" strokeWidth="2" strokeMiterlimit="10"/>
                                            </g>
                                        </g>
                                        <defs>
                                            <clipPath id="clip0_324_2851">
                                                <rect width="24" height="24" fill="white"/>
                                            </clipPath>
                                            <clipPath id="clip1_324_2851">
                                                <rect width="24" height="24" fill="white"/>
                                            </clipPath>
                                        </defs>
                                    </svg>
                                    <p>{ticket.date}</p>
                                </div>
                            </div>
                            <div className={styles.recommendation_item_who}>
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
                                <p>{ticket.author}</p>
                            </div>
                            <span className={styles.recommendation_item_time}>{ticket.timeAgo}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default FavoritesPage;