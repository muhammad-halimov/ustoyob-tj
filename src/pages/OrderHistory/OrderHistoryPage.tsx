import styles from './OrderHistoryPage.module.scss';
import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { getAuthToken } from '../../utils/auth';
import AuthModalWrapper from '../../shared/ui/AuthModal/AuthModal.tsx';

// Интерфейсы для тикетов
interface Category {
    id: number;
    title: string;
    image?: string;
}

interface UserInfo {
    id: number;
    email?: string;
    name?: string;
    surname?: string;
    rating?: number;
    image?: string;
    imageExternalUrl?: string;
}

interface Image {
    id: number;
    image: string;
}

interface Unit {
    id: number;
    title: string;
}

interface AddressPart {
    id: number;
    title: string;
    image?: string;
}

interface Address {
    id: number;
    province?: AddressPart;
    city?: AddressPart;
    suburb?: AddressPart;
    district?: AddressPart;
    settlement?: AddressPart;
    community?: AddressPart;
    village?: AddressPart;
}

interface Ticket {
    id: number;
    title: string;
    description: string;
    notice?: string;
    budget: number;
    service: boolean;
    active: boolean;
    category?: Category;
    author: UserInfo;
    master?: UserInfo;
    images: Image[];
    unit?: Unit;
    addresses: Address[];
    createdAt: string;
    updatedAt: string;
}


const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// Функция для получения текущего пользователя через API
const getCurrentUser = async (): Promise<{ id: number; email?: string; name?: string; surname?: string } | null> => {
    const token = getAuthToken();
    if (!token) return null;

    try {
        const response = await fetch(`${API_BASE_URL}/api/users/me`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
        });

        if (response.ok) {
            const userData = await response.json();
            return {
                id: userData.id,
                email: userData.email,
                name: userData.name,
                surname: userData.surname
            };
        }
    } catch (error) {
        console.error('Ошибка при получении текущего пользователя:', error);
    }
    return null;
};

const OrderHistoryPage = () => {
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [currentUser, setCurrentUser] = useState<{ id: number; email?: string; name?: string; surname?: string } | null>(null);

    const isAuthenticated = !!getAuthToken();

    // Получаем данные пользователя при загрузке компонента
    useEffect(() => {
        const loadUser = async () => {
            if (isAuthenticated) {
                const user = await getCurrentUser();
                if (user) {
                    setCurrentUser(user);
                } else {
                    setError('Не удалось загрузить данные пользователя');
                }
            } else {
                setCurrentUser(null);
                setTickets([]);
            }
        };
        loadUser();
    }, [isAuthenticated]);

    // Загружаем тикеты, когда появится данные пользователя
    useEffect(() => {
        if (currentUser?.id) {
            fetchUserTickets(currentUser.id);
        } else if (isAuthenticated && !currentUser) {
            // Если пользователь авторизован, но данные еще не получены
            setIsLoading(true);
        }
    }, [currentUser, isAuthenticated]);

    // Функция для загрузки тикетов пользователя
    const fetchUserTickets = async (userId: number) => {
        try {
            setIsLoading(true);
            setError(null);

            const token = getAuthToken();
            if (!token) {
                throw new Error('Токен авторизации не найден');
            }

            // Используем endpoint с фильтром по автору
            const url = `${API_BASE_URL}/api/tickets?author.id=${userId}&order[createdAt]=desc`;
            console.log('Загружаем тикеты по URL:', url);

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
            });

            if (response.status === 401) {
                throw new Error('Неавторизованный доступ');
            }

            if (!response.ok) {
                throw new Error(`Ошибка сервера: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();

            // Обрабатываем разные форматы ответа (гидра или обычный массив)
            let ticketsArray: Ticket[] = [];

            if (Array.isArray(data)) {
                ticketsArray = data;
            } else if (data && typeof data === 'object') {
                if (data['hydra:member'] && Array.isArray(data['hydra:member'])) {
                    ticketsArray = data['hydra:member'];
                } else if (data.id) {
                    ticketsArray = [data];
                }
            }

            console.log(`Получено ${ticketsArray.length} тикетов`);

            // Фильтруем только тикеты, созданные текущим пользователем
            const userTickets = ticketsArray.filter(ticket => {
                // Проверяем, что автор тикета - текущий пользователь
                const isUserTicket = ticket.author && ticket.author.id === userId;

                // Дополнительная проверка: убеждаемся, что email автора совпадает
                if (currentUser?.email && ticket.author?.email) {
                    return isUserTicket && ticket.author.email === currentUser.email;
                }

                return isUserTicket;
            });

            console.log(`Отфильтровано ${userTickets.length} тикетов текущего пользователя`);
            setTickets(userTickets);

        } catch (err) {
            console.error('Ошибка при загрузке тикетов:', err);
            setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
            setTickets([]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateOrderClick = (e: React.MouseEvent) => {
        if (!isAuthenticated) {
            e.preventDefault();
            setShowAuthModal(true);
        }
    };

    const closeAuthModal = () => {
        setShowAuthModal(false);
    };

    // Функция для форматирования даты
    const formatDate = (dateString: string): string => {
        try {
            const date = new Date(dateString);
            return new Intl.DateTimeFormat('ru-RU', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            }).format(date);
        } catch {
            return dateString;
        }
    };

    // Функция для получения статуса тикета
    const getTicketStatus = (ticket: Ticket): string => {
        if (!ticket.active) {
            return 'Завершен';
        }
        if (ticket.master) {
            return 'Актуальный';
        }
        return 'Актуальный';
    };

    // Функция для получения форматированного бюджета
    const getFormattedBudget = (ticket: Ticket): string => {
        if (!ticket.budget || ticket.budget === 0) {
            return 'Договорная';
        }
        const unit = ticket.unit?.title || 'TJS';
        return `${ticket.budget} ${unit}`;
    };

    // Обработка клика для кнопки "Попробовать снова"
    const handleRetry = () => {
        if (currentUser?.id) {
            fetchUserTickets(currentUser.id);
        } else if (isAuthenticated) {
            // Перезагружаем страницу для получения нового токена
            window.location.reload();
        }
    };

    // Функция для проверки, является ли тикет созданным текущим пользователем
    const isUserTicket = (ticket: Ticket): boolean => {
        if (!currentUser) return false;
        return ticket.author?.id === currentUser.id;
    };

    // Функция для отображения имени автора
    const getAuthorName = (ticket: Ticket): string => {
        if (isUserTicket(ticket)) {
            return 'Вы';
        }
        if (ticket.author?.name && ticket.author?.surname) {
            return `${ticket.author.name} ${ticket.author.surname}`;
        }
        if (ticket.author?.name) {
            return ticket.author.name;
        }
        if (ticket.author?.email) {
            return ticket.author.email;
        }
        return 'Аноним';
    };

    return (
        <div className={styles.container}>
            <Link
                to="/create-ad"
                className={styles.create_order}
                onClick={handleCreateOrderClick}
            >
                <span>Создать предложение/заказ</span>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <g clipPath="url(#clip0_115_4364)">
                        <g clipPath="url(#clip1_115_4364)">
                            <g clipPath="url(#clip2_115_4364)">
                                <path d="M12 22.5C17.799 22.5 22.5 17.799 22.5 12C22.5 6.20101 17.799 1.5 12 1.5C6.20101 1.5 1.5 6.20101 1.5 12C1.5 17.799 6.20101 22.5 12 22.5Z" stroke="#101010" strokeWidth="2" strokeMiterlimit="10"/>
                                <path d="M18.7463 11.9997H5.25469" stroke="#101010" strokeWidth="2" strokeMiterlimit="10"/>
                                <path d="M12.0005 5.25391V18.7455" stroke="#101010" strokeWidth="2" strokeMiterlimit="10"/>
                            </g>
                        </g>
                    </g>
                    <defs>
                        <clipPath id="clip0_115_4364">
                            <rect width="24" height="24" fill="white"/>
                        </clipPath>
                        <clipPath id="clip1_115_4364">
                            <rect width="24" height="24" fill="white"/>
                        </clipPath>
                        <clipPath id="clip2_115_4364">
                            <rect width="24" height="24" fill="white"/>
                        </clipPath>
                    </defs>
                </svg>
            </Link>

            {/* Модалка авторизации */}
            <AuthModalWrapper
                isOpen={showAuthModal}
                onClose={closeAuthModal}
            />

            {/* Показываем блок с заказами только авторизованным пользователям */}
            {isAuthenticated ? (
                <>
                    <h3>Мои заказы</h3>

                    {isLoading && !currentUser ? (
                        <div className={styles.loading}>
                            <div className={styles.spinner}></div>
                            <p>Загрузка данных пользователя...</p>
                        </div>
                    ) : isLoading ? (
                        <div className={styles.loading}>
                            <div className={styles.spinner}></div>
                            <p>Загрузка заказов...</p>
                        </div>
                    ) : error ? (
                        <div className={styles.error}>
                            <div className={styles.error_icon}>!</div>
                            <p>{error}</p>
                            <button
                                onClick={handleRetry}
                                className={styles.retry_button}
                            >
                                Попробовать снова
                            </button>
                        </div>
                    ) : tickets.length === 0 ? (
                        <div className={styles.no_tickets}>
                            {/*<div className={styles.empty_icon}>📋</div>*/}
                            <p>У вас пока нет созданных заказов</p>
                        </div>
                    ) : (
                        <div className={styles.order_history}>
                            {tickets.map((ticket) => {
                                const isMyTicket = isUserTicket(ticket);
                                return (
                                    <div key={ticket.id} className={`${styles.order_item} ${isMyTicket ? styles.my_ticket : ''}`}>
                                        <div className={styles.order_item_header}>
                                            <div className={styles.order_item_title}>
                                                <h4>{ticket.title}</h4>
                                                <div className={styles.order_meta}>
                                                    <span className={styles.order_author}>
                                                        {getAuthorName(ticket)}
                                                    </span>
                                                    <span className={styles.order_date}>
                                                        {formatDate(ticket.createdAt)}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className={styles.order_item_status}>
                                                <span className={`${styles.status_badge} ${
                                                    ticket.active
                                                        ? (ticket.master ? styles.status_in_progress : styles.status_searching)
                                                        : styles.status_completed
                                                }`}>
                                                    {getTicketStatus(ticket)}
                                                </span>
                                                {/*{isMyTicket && (*/}
                                                {/*    <span className={styles.my_ticket_badge}>*/}
                                                {/*        Ваш заказ*/}
                                                {/*    </span>*/}
                                                {/*)}*/}
                                            </div>
                                        </div>

                                        <div className={styles.order_item_content}>
                                            <div className={styles.order_description}>
                                                <p>{ticket.description}</p>
                                            </div>

                                            <div className={styles.order_details}>
                                                <div className={styles.detail_item}>
                                                    <span className={styles.detail_label}>Бюджет:</span>
                                                    <span className={styles.detail_value}>{getFormattedBudget(ticket)}</span>
                                                </div>
                                                {ticket.category && (
                                                    <div className={styles.detail_item}>
                                                        <span className={styles.detail_label}>Категория:</span>
                                                        <span className={styles.detail_value}>{ticket.category.title}</span>
                                                    </div>
                                                )}
                                                {ticket.master && (
                                                    <div className={styles.detail_item}>
                                                        <span className={styles.detail_label}>Исполнитель:</span>
                                                        <span className={styles.detail_value}>
                                                            {ticket.master.name} {ticket.master.surname}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>

                                            <div className={styles.order_actions}>
                                                <Link
                                                    to={`/order/${ticket.id}`}
                                                    className={styles.view_details_button}
                                                >
                                                    Посмотреть подробности
                                                </Link>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </>
            ) : (
                <div className={styles.not_authenticated}>
                    <div className={styles.not_authenticated_icon}>🔐</div>
                    <p>Войдите в систему, чтобы увидеть свои заказы</p>
                </div>
            )}
        </div>
    );
};

export default OrderHistoryPage;