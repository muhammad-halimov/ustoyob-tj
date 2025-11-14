import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { getAuthToken } from '../../utils/auth';
import styles from './OrderPage.module.scss';

interface Order {
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
    additionalComments?: string;
    photos?: string[];
    notice?: string;
}

const API_BASE_URL = 'http://usto.tj.auto-schule.ru';

export default function OrderPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [order, setOrder] = useState<Order | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedOptions, setSelectedOptions] = useState({
        rating: false,
        review: false,
        documents: false
    });

    useEffect(() => {
        if (id) {
            fetchOrder(parseInt(id));
        }
    }, [id]);

    const fetchAuthor = async (authorId: number) => {
        try {
            const token = getAuthToken();
            if (!token) return null;

            const res = await fetch(`${API_BASE_URL}/api/users/${authorId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (!res.ok) return null;
            return await res.json(); // вернёт объект с name и surname
        } catch {
            return null;
        }
    };

    const fetchOrder = async (orderId: number) => {
        try {
            setIsLoading(true);
            const token = getAuthToken();
            if (!token) {
                setError('Требуется авторизация');
                return;
            }

            const response = await fetch(`${API_BASE_URL}/api/tickets/${orderId}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) throw new Error(`Ошибка загрузки: ${response.status}`);

            const ticketData = await response.json();

            let authorName = 'Неизвестный автор';
            if (ticketData.author && typeof ticketData.author === 'number') {
                const authorData = await fetchAuthor(ticketData.author);
                if (authorData) {
                    authorName = `${authorData.name} ${authorData.surname}`;
                }
            } else if (ticketData.author?.name) {
                authorName = `${ticketData.author.name} ${ticketData.author.surname}`;
            }

            const orderData: Order = {
                id: ticketData.id,
                title: ticketData.title,
                price: ticketData.budget,
                unit: ticketData.unit?.title || 'руб',
                description: ticketData.description,
                address: `${ticketData.address?.city?.title || ''}, ${ticketData.address?.title || ''}`.trim(),
                date: formatDate(ticketData.createdAt),
                author: authorName,
                timeAgo: getTimeAgo(ticketData.createdAt),
                category: ticketData.category?.title || 'другое',
                additionalComments: ticketData.notice,
                photos: ticketData.ticketImages?.map((img: any) => img.image) || []
            };

            setOrder(orderData);
        } catch (error) {
            console.error('Error fetching order:', error);
            setError('Не удалось загрузить данные заказа');
        } finally {
            setIsLoading(false);
        }
    };

    const formatDate = (dateString: string) => {
        try {
            return new Date(dateString).toLocaleDateString('ru-RU');
        } catch {
            return new Date().toLocaleDateString('ru-RU');
        }
    };

    const getTimeAgo = (dateString: string) => {
        try {
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

    const handleOptionChange = (option: keyof typeof selectedOptions) => {
        setSelectedOptions(prev => ({
            ...prev,
            [option]: !prev[option]
        }));
    };

    const handleRespond = () => {
        // Логика для отклика на заказ
        console.log('Отклик на заказ:', order?.id);
        alert('Отклик отправлен!');
    };

    const handleLeaveReview = () => {
        // Логика для оставления отзыва
        console.log('Оставить отзыв на заказ:', order?.id);
        alert('Переход к оставлению отзыва');
    };

    if (isLoading) {
        return <div className={styles.loading}>Загрузка...</div>;
    }

    if (error) {
        return (
            <div className={styles.error}>
                <p>{error}</p>
                <button onClick={() => navigate(-1)}>Назад</button>
            </div>
        );
    }

    if (!order) {
        return (
            <div className={styles.error}>
                <p>Заказ не найден</p>
                <button onClick={() => navigate(-1)}>Назад</button>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.orderCard}>
                {/* Заголовок и категория */}
                <div className={styles.orderHeader}>
                    <h1 className={styles.orderTitle}>{order.title}</h1>
                </div>
                <span className={styles.category}>{order.category}</span>
                {/* Цена */}
                <div className={styles.priceSection}>
                    <span className={styles.price}>{order.price} {order.unit}</span>
                </div>

                {/* Описание */}
                <section className={styles.section}>
                    <h2>Описание</h2>
                    <p className={styles.description}>{order.description}</p>
                </section>

                {/* Адрес и дата публикации */}
                <section className={styles.section}>
                    <h2>Адрес</h2>
                    <div className={styles.address}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" stroke="#3A54DA" strokeWidth="2"/>
                            <circle cx="12" cy="9" r="2.5" stroke="#3A54DA" strokeWidth="2"/>
                        </svg>
                        {order.address}
                    </div>
                    <div className={styles.published}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                            <path d="M3 8h18M21 6v14H3V6h18zM16 2v4M8 2v4" stroke="#3A54DA" strokeWidth="2"/>
                        </svg>
                        Опубликовано {order.date}
                    </div>
                </section>


                {/* Дополнительные комментарии */}
                <section className={styles.section}>
                    <h2>Дополнительные комментарии</h2>
                    <div className={styles.commentsContent}>
                        {order.additionalComments ? (
                            <p>{order.additionalComments}</p>
                        ) : (
                            <p className={styles.noComments}>Комментарии от заказчика (при наличии)</p>
                        )}
                    </div>
                </section>

                {/* Приложенные фото */}
                <section className={styles.section}>
                    <h2>Приложенные фото</h2>
                    <div className={styles.photosContent}>
                        {order.photos && order.photos.length > 0 ? (
                            <div className={styles.photos}>
                                {order.photos.map((photo, index) => (
                                    <img
                                        key={index}
                                        src={photo}
                                        alt={`Фото ${index + 1}`}
                                        className={styles.photo}
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).src = '/placeholder-image.jpg';
                                        }}
                                    />
                                ))}
                            </div>
                        ) : (
                            <p className={styles.noPhotos}>к данному заказу (при наличии)</p>
                        )}
                    </div>
                </section>

                {/* ФИО автора */}
                <section className={styles.section}>
                    <div className={styles.authorSection}>
                        <h2>ФИО</h2>
                        <div className={styles.authorInfo}>
                            <h3>{order.author}</h3>
                            <span className={styles.timeAgo}>{order.timeAgo}</span>
                        </div>
                    </div>
                </section>

                {/* Чекбоксы и кнопки действий */}
                <section className={styles.actions}>
                    <div className={styles.checkboxesSection}>
                        <h2>наличие заказа</h2>
                        <div className={styles.checkboxes}>
                            <label className={styles.checkbox}>
                                <input
                                    type="checkbox"
                                    checked={selectedOptions.rating}
                                    onChange={() => handleOptionChange('rating')}
                                />
                                <span className={styles.checkmark}></span>
                                Рейтинг
                            </label>
                            <label className={styles.checkbox}>
                                <input
                                    type="checkbox"
                                    checked={selectedOptions.review}
                                    onChange={() => handleOptionChange('review')}
                                />
                                <span className={styles.checkmark}></span>
                                Отзыв
                            </label>
                            <label className={styles.checkbox}>
                                <input
                                    type="checkbox"
                                    checked={selectedOptions.documents}
                                    onChange={() => handleOptionChange('documents')}
                                />
                                <span className={styles.checkmark}></span>
                                Проверка документов
                            </label>
                        </div>
                    </div>

                    <div className={styles.actionButtons}>
                        <button className={styles.respondButton} onClick={handleRespond}>
                            Откликнуться
                        </button>
                        <button className={styles.reviewButton} onClick={handleLeaveReview}>
                            Оставить отзыв
                        </button>
                    </div>
                </section>
            </div>
        </div>
    );
}