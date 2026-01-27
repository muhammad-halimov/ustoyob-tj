import styles from './OrderHistoryPage.module.scss';
import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import {getAuthToken, getUserRole} from '../../utils/auth';
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
    negotiableBudget?: boolean;
    service: boolean;
    active: boolean;
    category?: Category;
    subcategory?: Category;
    author: UserInfo;
    master?: UserInfo;
    images: Image[];
    unit?: Unit;
    addresses: Address[];
    createdAt: string;
    updatedAt: string;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const OrderHistoryPage = () => {
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [error, setError] = useState<string | null>(null);

    const isAuthenticated = !!getAuthToken();

    // Загружаем тикеты при изменении статуса авторизации
    useEffect(() => {
        if (isAuthenticated) {
            fetchUserTickets();
        } else {
            setTickets([]);
            setError(null);
        }
    }, [isAuthenticated]);

    // Функция для загрузки тикетов текущего пользователя
    const fetchUserTickets = async () => {
        try {
            setIsLoading(true);
            setError(null);

            const token = getAuthToken();
            if (!token) {
                throw new Error('Токен авторизации не найден');
            }

            // Используем специальный endpoint для получения тикетов текущего пользователя
            const url = `${API_BASE_URL}/api/tickets/me`;
            console.log('Загружаем тикеты текущего пользователя по URL:', url);

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
            });

            if (response.status === 401) {
                throw new Error('Неавторизованный доступ. Пожалуйста, войдите снова.');
            }

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Ошибка сервера:', errorText);
                throw new Error(`Ошибка сервера: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();

            // Обрабатываем разные форматы ответа
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

            console.log(`Получено ${ticketsArray.length} тикетов текущего пользователя`);

            // Сортируем по дате создания (новые первыми)
            ticketsArray.sort((a, b) =>
                new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );

            setTickets(ticketsArray);

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
        return 'Поиск исполнителя';
    };

    // Функция для получения класса статуса
    const getStatusClass = (ticket: Ticket): string => {
        if (!ticket.active) {
            return styles.status_completed;
        }
        if (ticket.master) {
            return styles.status_in_progress;
        }
        return styles.status_searching;
    };

    // Функция для получения форматированного бюджета
    const getFormattedBudget = (ticket: Ticket): string => {
        if (ticket.negotiableBudget || !ticket.budget || ticket.budget === 0) {
            return 'Договорная';
        }
        const unit = ticket.unit?.title || 'TJS';
        return `${ticket.budget} ${unit}`;
    };

    // Обработка клика для кнопки "Попробовать снова"
    const handleRetry = () => {
        if (isAuthenticated) {
            fetchUserTickets();
        }
    };

    // Функция для отображения имени автора
    const getAuthorName = (): string => {
        return 'Вы';
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
                    {getUserRole() !== 'master' ? (
                        <h3>Мои услуги</h3>
                    ) : (
                        <h3>Мои объявления</h3>
                    )}


                    {isLoading ? (
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
                            <p>У вас пока нет созданных заказов</p>
                            <Link to="/create-ad" className={styles.create_first_button}>
                                Создать первый заказ
                            </Link>
                        </div>
                    ) : (
                        <div className={styles.order_history}>
                            {tickets.map((ticket) => (
                                <div key={ticket.id} className={styles.order_item}>
                                    <div className={styles.order_item_header}>
                                        <div className={styles.order_item_title}>
                                            <h4>{ticket.title}</h4>
                                            <div className={styles.order_meta}>
                                                <span className={styles.order_author}>
                                                    {getAuthorName()}
                                                </span>
                                                <span className={styles.order_date}>
                                                    {formatDate(ticket.createdAt)}
                                                </span>
                                            </div>
                                        </div>

                                        <div className={styles.order_item_status}>
                                            <span className={`${styles.status_badge} ${getStatusClass(ticket)}`}>
                                                {getTicketStatus(ticket)}
                                            </span>
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
                                            {ticket.subcategory && (
                                                <div className={styles.detail_item}>
                                                    <span className={styles.detail_label}>Подкатегория:</span>
                                                    <span className={styles.detail_value}>{ticket.subcategory.title}</span>
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
                            ))}
                        </div>
                    )}
                </>
            ) : (
                <div className={styles.not_authenticated}>
                    <div className={styles.not_authenticated_icon}>🔐</div>
                    <p>Войдите в систему, чтобы увидеть свои заказы</p>
                    <button
                        onClick={() => setShowAuthModal(true)}
                        className={styles.login_button}
                    >
                        Войти
                    </button>
                </div>
            )}
        </div>
    );
};

export default OrderHistoryPage;