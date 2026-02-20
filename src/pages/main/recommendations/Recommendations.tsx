import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUserRole, getAuthToken, getUserData } from '../../../utils/auth.ts';
import { useLanguageChange } from '../../../hooks/useLanguageChange.ts';
import { TicketCard } from '../../../shared/ui/TicketCard/TicketCard.tsx';
import styles from './Recommendations.module.scss';
import { useTranslation } from 'react-i18next';
import { ROUTES } from '../../../app/routers/routes.ts';

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
    subcategory?: {
        id?: number;
        title?: string;
    } | null;
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
        id?: number;
        name?: string;
        surname?: string;
        rating?: number;
        reviewCount?: number;
    };
    master?: {
        id?: number;
        name?: string;
        surname?: string;
        rating?: number;
        reviewCount?: number;
    };
    reviewsCount?: number;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

function Recommendations() {
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [userRole, setUserRole] = useState<'client' | 'master' | null>(getUserRole());
    const navigate = useNavigate();
    const { t, i18n } = useTranslation('components');
    const locale = i18n.language;

    const fetchRecentAnnouncements = async () => {
        try {
            const token = getAuthToken();
            const userData = getUserData();
            const currentUserId = userData?.id;
            
            // Предотвращаем fetch если роль еще не загружена из localStorage
            if (token && userRole === null) {
                console.log('⏳ Recommendations - Waiting for userRole to load...');
                setIsLoading(false);
                return;
            }
            
            console.log('============================================');
            console.log('Recommendations - userRole:', userRole);
            console.log('Recommendations - Current user ID:', currentUserId);
            console.log('Recommendations - Token exists:', !!token);
            
            const endpoint = userRole === 'master'
                ? `/api/tickets?locale=${locale}&active=true&service=false&exists[master]=false&exists[author]=true${currentUserId ? `&author.id[ne]=${currentUserId}` : ''}`
                : userRole === 'client'
                ? `/api/tickets?locale=${locale}&active=true&service=true&exists[master]=true&exists[author]=false${currentUserId ? `&master.id[ne]=${currentUserId}` : ''}`
                : `/api/tickets?locale=${locale}&active=true&service=true`;
            
            console.log('Recommendations - Endpoint:', `${API_BASE_URL}${endpoint}`);
            console.log('============================================');

            const headers: HeadersInit = {
                'Accept': 'application/json',
                ...(token && { 'Authorization': `Bearer ${token}` })
            };

            const response = await fetch(`${API_BASE_URL}${endpoint}`, { headers });

            if (response.ok) {
                let data: Announcement[] = await response.json();
                
                // Сортируем по дате создания (новые первыми)
                data = data.sort((a, b) => {
                    const dateA = new Date(a.createdAt).getTime();
                    const dateB = new Date(b.createdAt).getTime();
                    return dateB - dateA; // От новых к старым
                });
                
                setAnnouncements(data.slice(0, 3));
            }
        } catch (error) {
            console.error('Error fetching announcements:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useLanguageChange(() => {
        // Обновление данных при смене языка происходит через useEffect ниже
    });

    useEffect(() => {
        // Инициализация роли (fetch происходит во втором useEffect)
        const currentRole = getUserRole();
        setUserRole(currentRole);
        
        // Проверяем изменение роли при каждом монтировании
        const interval = setInterval(() => {
            const newRole = getUserRole();
            if (newRole !== userRole) {
                console.log('Recommendations - Role changed from', userRole, 'to', newRole);
                setUserRole(newRole);
            }
        }, 1000);
        
        return () => clearInterval(interval);
    }, [userRole]);

    // Перезагружаем данные при изменении роли или языка
    useEffect(() => {
        const token = getAuthToken();
        
        // Загружаем данные если:
        // 1) userRole !== null (авторизован и роль загружена)
        // 2) !token (НЕ авторизован, userRole будет null - это нормально)
        const shouldFetch = userRole !== null || !token;
        
        console.log('Recommendations - Check if should fetch:', {
            userRole,
            hasToken: !!token,
            shouldFetch,
            locale
        });
        
        if (shouldFetch) {
            console.log('Recommendations - Triggering data reload for role:', userRole);
            fetchRecentAnnouncements();
        } else {
            console.log('⏳ Recommendations - Waiting for userRole to load...');
        }
    }, [userRole, locale]);

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

    const getAuthorId = (announcement: Announcement): number | undefined => {
        if (announcement.service && announcement.master) {
            return announcement.master.id;
        }
        if (!announcement.service && announcement.author) {
            return announcement.author.id;
        }
        return undefined;
    };

    // Функция для получения рейтинга пользователя
    const getUserRating = (announcement: Announcement): number => {
        if (announcement.service && announcement.master?.rating) {
            return announcement.master.rating;
        } else if (!announcement.service && announcement.author?.rating) {
            return announcement.author.rating;
        }
        return 0;
    };

    // Функция для получения количества отзывов
    const getUserReviewCount = (announcement: Announcement): number => {
        if (announcement.reviewsCount !== undefined) {
            return announcement.reviewsCount;
        }
        if (announcement.service && announcement.master?.reviewCount !== undefined) {
            return announcement.master.reviewCount;
        } else if (!announcement.service && announcement.author?.reviewCount !== undefined) {
            return announcement.author.reviewCount;
        }
        return 0;
    };

    const handleCardClick = (announcementId: number) => {
        navigate(ROUTES.TICKET_BY_ID(announcementId));
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
                            <TicketCard
                                key={announcement.id}
                                ticketId={announcement.id}
                                title={announcement.title}
                                description={announcement.description}
                                price={announcement.budget}
                                unit={announcement.unit?.title || ''}
                                address={getFullAddress(announcement)}
                                date={announcement.createdAt}
                                author={getAuthorName(announcement)}
                                authorId={getAuthorId(announcement)}
                                category={announcement.category?.title}
                                subcategory={announcement.subcategory?.title}
                                timeAgo={announcement.createdAt}
                                ticketType={announcement.service}
                                userRole={userRole}
                                userRating={getUserRating(announcement)}
                                userReviewCount={getUserReviewCount(announcement)}
                                onClick={() => handleCardClick(announcement.id)}
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