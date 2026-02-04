import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUserRole } from '../../utils/auth.ts';
import { useLanguageChange } from '../../hooks/useLanguageChange';
import { AnnouncementCard } from '../../shared/ui/AnnouncementCard/AnnouncementCard';
import styles from './Recommendations.module.scss';
import { useTranslation } from 'react-i18next';

interface Announcement {
    id: number;
    title: string;
    description: string;
    budget: number;
    unit: {
        id: number;
        title: string;
    };
    service: boolean;
    authorId?: number;
    category?: {
        id?: number;
        title?: string;
    };
    addresses: Array<{
        title?: string;
        city?: {
            title?: string;
        };
        district?: {
            title?: string;
        };
        province?: {
            title?: string;
        };
    }>;
    createdAt: string;
    author?: {
        name?: string;
        surname?: string;
    };
    master?: {
        name?: string;
        surname?: string;
    };
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

function Recommendations() {
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const userRole = getUserRole();
    const navigate = useNavigate();
    const { t } = useTranslation('components');

    const fetchRecentAnnouncements = async () => {
        try {
            const locale = localStorage.getItem('i18nextLng') || 'ru';
            const response = await fetch(`${API_BASE_URL}/api/tickets?locale=${locale}&limit=10`, {
                headers: {
                    'Accept': 'application/json',
                }
            });

            if (response.ok) {
                let data: Announcement[] = await response.json();
                
                // Фильтруем по роли пользователя
                if (userRole === 'master') {
                    // Мастер видит только услуги (service: true)
                    data = data.filter(item => item.service === true);
                } else if (userRole === 'client') {
                    // Клиент видит только заказы (service: false)
                    data = data.filter(item => item.service === false);
                }
                // Если не авторизован или неизвестная роль - показываем все
                
                setAnnouncements(data.slice(0, 3));
            }
        } catch (error) {
            console.error('Error fetching announcements:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useLanguageChange(() => {
        // При смене языка переполучаем данные для обновления локализованного контента
        fetchRecentAnnouncements();
    });

    useEffect(() => {
        fetchRecentAnnouncements();
    }, [userRole]);

    const getFullAddress = (announcement: Announcement): string => {
        if (!announcement.addresses || announcement.addresses.length === 0) {
            return 'Адрес не указан';
        }

        const address = announcement.addresses[0];
        const parts: string[] = [];

        if (address.province?.title) {
            parts.push(address.province.title);
        }

        if (address.city?.title) {
            parts.push(address.city.title);
        }

        if (address.district?.title) {
            parts.push(address.district.title);
        }

        if (address.title) {
            parts.push(address.title);
        }

        return parts.length > 0 ? parts.join(', ') : 'Адрес не указан';
    };

    const getAuthorName = (announcement: Announcement): string => {
        if (announcement.service && announcement.master) {
            return `${announcement.master.name || ''} ${announcement.master.surname || ''}`.trim() || 'Мастер';
        }
        if (!announcement.service && announcement.author) {
            return `${announcement.author.name || ''} ${announcement.author.surname || ''}`.trim() || 'Клиент';
        }
        return 'Автор';
    };

    const getTicketTypeLabel = (service: boolean): string => {
        return service ? 'Услуга от мастера' : 'Заказ от клиента';
    };

    const getRussianWord = (number: number, words: [string, string, string]) => {
        const cases = [2, 0, 1, 1, 1, 2];
        return words[number % 100 > 4 && number % 100 < 20 ? 2 : cases[number % 10 < 5 ? number % 10 : 5]];
    };

    const formatLocalizedDate = (dateString: string): string => {
        try {
            const date = new Date(dateString);
            const months = t('time.months', { returnObjects: true }) as string[] || [
                'January', 'February', 'March', 'April', 'May', 'June',
                'July', 'August', 'September', 'October', 'November', 'December'
            ];
            const day = date.getDate();
            const month = months[date.getMonth()];
            const year = date.getFullYear();
            return `${day} ${month} ${year}`;
        } catch {
            return '';
        }
    };

    const formatDate = (dateString: string) => {
        try {
            if (!dateString) return t('time.recentlyAgo');
            const date = new Date(dateString);
            const now = new Date();
            const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
            const ago = t('time.ago');
            
            if (diffInSeconds < 60) return t('time.justNow');
            
            if (diffInSeconds < 3600) {
                const minutes = Math.floor(diffInSeconds / 60);
                const minuteWords = t('time.minuteWords', { returnObjects: true }) as string[] || ['minute', 'minutes', 'minutes'];
                return `${minutes} ${getRussianWord(minutes, minuteWords as [string, string, string])} ${ago}`;
            }
            
            if (diffInSeconds < 86400) {
                const hours = Math.floor(diffInSeconds / 3600);
                const hourWords = t('time.hourWords', { returnObjects: true }) as string[] || ['hour', 'hours', 'hours'];
                return `${hours} ${getRussianWord(hours, hourWords as [string, string, string])} ${ago}`;
            }
            
            const days = Math.floor(diffInSeconds / 86400);
            const dayWords = t('time.dayWords', { returnObjects: true }) as string[] || ['day', 'days', 'days'];
            return `${days} ${getRussianWord(days, dayWords as [string, string, string])} ${ago}`;
        } catch {
            return t('time.recentlyAgo');
        }
    };

    const handleCardClick = (announcementId: number, authorId: number) => {
        navigate(`/order/${authorId}?ticket=${announcementId}`);
    };

    return (
        <div className={styles.recommendation}>
            <div className={styles.recommendation__wrap}>
                <h3 className={styles.recommendation__title}>{t('pages.recommendations.title')}</h3>
                {isLoading ? (
                    <p className={styles.recommendation__loading}>Загрузка...</p>
                ) : announcements.length > 0 ? (
                    <div className={styles.recommendation__list}>
                        {announcements.map((announcement) => (
                            <AnnouncementCard
                                key={announcement.id}
                                title={announcement.title}
                                description={announcement.description}
                                price={announcement.budget}
                                unit={announcement.unit?.title || ''}
                                address={getFullAddress(announcement)}
                                date={formatLocalizedDate(announcement.createdAt)}
                                author={getAuthorName(announcement)}
                                category={announcement.category?.title}
                                timeAgo={formatDate(announcement.createdAt)}
                                ticketType={userRole === null ? getTicketTypeLabel(announcement.service) : undefined}
                                onClick={() => handleCardClick(announcement.id, announcement.authorId || 0)}
                            />
                        ))}
                    </div>
                ) : (
                    <p className={styles.recommendation__empty}>Объявления отсутствуют</p>
                )}
            </div>
        </div>
    );
}

export default Recommendations;