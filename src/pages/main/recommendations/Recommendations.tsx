import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUserRole, getAuthToken, getUserData } from '../../../utils/auth.ts';
import { useLanguageChange } from '../../../hooks';
import { Card } from '../../../shared/ui/Ticket/Card/Card.tsx';
import styles from './Recommendations.module.scss';
import { useTranslation } from 'react-i18next';
import { ROUTES } from '../../../app/routers/routes.ts';
import { createChatWithAuthor } from '../../../utils/chatUtils';
import Status from '../../../shared/ui/Modal/Status';
import FeedbackModal from '../../../shared/ui/Modal/Feedback';

import { EmptyState } from '../../../widgets/EmptyState';
import { ShowMore } from '../../../shared/ui/Button/ShowMore/ShowMore.tsx';

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
        image?: string | null;
        imageExternalUrl?: string | null;
    };
    master?: {
        id?: number;
        name?: string;
        surname?: string;
        rating?: number;
        reviewCount?: number;
        image?: string | null;
        imageExternalUrl?: string | null;
    };
    reviewsCount?: number;
    images?: { id: number; image: string }[];
    negotiableBudget?: boolean;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const formatTicketImageUrl = (imagePath: string): string => {
    if (!imagePath) return '';
    if (imagePath.startsWith('http')) return imagePath;
    if (imagePath.startsWith('/uploads/') || imagePath.startsWith('/images/')) return `${API_BASE_URL}${imagePath}`;
    return `${API_BASE_URL}/uploads/tickets/${imagePath}`;
};

const formatProfileImageUrl = (imagePath: string): string => {
    if (!imagePath) return '';
    if (imagePath.startsWith('http')) return imagePath;
    return `${API_BASE_URL}/uploads/users/${imagePath}`;
};

function Recommendations() {
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [showAll, setShowAll] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [userRole, setUserRole] = useState<'client' | 'master' | null>(getUserRole());
    const navigate = useNavigate();
    const { t, i18n } = useTranslation('components');
    const locale = i18n.language;
    // Respond state
    const [respondedTickets, setRespondedTickets] = useState<Set<number>>(new Set());
    const [respondingTicketId, setRespondingTicketId] = useState<number | null>(null);
    const [respondModal, setRespondModal] = useState<{ open: boolean; type: 'success' | 'error'; message: string }>({ open: false, type: 'success', message: '' });
    const [cardReviewTarget, setCardReviewTarget] = useState<{ authorId: number; ticketId: number } | null>(null);
    const [cardComplaintTarget, setCardComplaintTarget] = useState<{ authorId: number; ticketId: number } | null>(null);
    const currentUserId = getUserData()?.id;
    // Check existing chats on mount
    useEffect(() => {
        const token = getAuthToken();
        if (!token) return;
        (async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/api/chats/me`, {
                    headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
                });
                if (!res.ok) return;
                const data = await res.json();
                const chats: any[] = data['hydra:member'] || (Array.isArray(data) ? data : []);
                const ids = new Set<number>();
                chats.forEach((chat: any) => {
                    const t = chat.ticket;
                    const cid = t?.id ?? (() => { const m = String(t?.['@id'] || '').match(/\/\d+$/); return m ? parseInt(m[0].slice(1)) : null; })();
                    if (cid) ids.add(cid);
                });
                if (ids.size > 0) setRespondedTickets(ids);
            } catch { /* ignore */ }
        })();
    }, []);
    const handleRespondCard = async (ticketId: number, authorId: number) => {
        const token = getAuthToken();
        if (!token) {
            window.dispatchEvent(new CustomEvent('openAuthModal'));
            return;
        }
        if (respondedTickets.has(ticketId) || respondingTicketId === ticketId) return;
        setRespondingTicketId(ticketId);
        try {
            const chat = await createChatWithAuthor(authorId, ticketId);
            if (chat) {
                setRespondedTickets(prev => new Set(prev).add(ticketId));
                setRespondModal({ open: true, type: 'success', message: 'Вы успешно откликнулись!' });
            } else {
                setRespondModal({ open: true, type: 'error', message: 'Не удалось откликнуться. Попробуйте ещё раз.' });
            }
        } catch (e) {
            const msg = e instanceof Error ? e.message : 'Не удалось откликнуться. Попробуйте ещё раз.';
            setRespondModal({ open: true, type: 'error', message: msg });
        } finally {
            setRespondingTicketId(null);
        }
    };

    const fetchRecentAnnouncements = useCallback(async () => {
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
            
            const endpoint = `/api/tickets?locale=${locale}&active=true${currentUserId ? `&author.id[ne]=${currentUserId}&master.id[ne]=${currentUserId}` : ''}`;
            
            console.log('Recommendations - Endpoint:', `${API_BASE_URL}${endpoint}`);
            console.log('============================================');

            const headers: HeadersInit = {
                'Accept': 'application/json',
                ...(token && { 'Authorization': `Bearer ${token}` })
            };

            const response = await fetch(`${API_BASE_URL}${endpoint}`, { headers });

            if (response.ok) {
                let data: Announcement[] = await response.json();

                // Сортируем: сначала тикеты из выбранного города, затем по дате (новые первыми)
                const selectedCity = localStorage.getItem('selectedCity') || '';
                data = data.sort((a, b) => {
                    const aMatchesCity = selectedCity
                        ? a.addresses?.some(addr => addr.city?.title === selectedCity) ?? false
                        : false;
                    const bMatchesCity = selectedCity
                        ? b.addresses?.some(addr => addr.city?.title === selectedCity) ?? false
                        : false;
                    if (aMatchesCity !== bMatchesCity) return aMatchesCity ? -1 : 1;
                    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                });

                setAnnouncements(data);
                setShowAll(false);
            }
        } catch (error) {
            console.error('Error fetching announcements:', error);
        } finally {
            setIsLoading(false);
        }
    }, [locale, userRole]);

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
            setIsLoading(false);
        }
    }, [userRole, locale, fetchRecentAnnouncements]);

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
            return `${announcement.master.surname || ''} ${announcement.master.name || ''}`.trim() || 'Специалист';
        }
        if (!announcement.service && announcement.author) {
            return `${announcement.author.surname || ''} ${announcement.author.name || ''}`.trim() || 'Заказчик';
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
    <>
        <div className={styles.recommendation}>
            <div className={styles.recommendation__wrap}>
                <h3 className={styles.recommendation__title}>{t('pages.recommendations.title')}</h3>
                {isLoading ? (
                    <EmptyState isLoading />
                ) : announcements.length > 0 ? (
                    <div className={styles.recommendation__list}>
                        {announcements.slice(0, showAll ? announcements.length : 3).map((announcement) => (
                            <Card
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
                                photos={announcement.images?.map(img => formatTicketImageUrl(img.image))}
                                authorImage={(() => {
                                    const person = announcement.service ? announcement.master : announcement.author;
                                    const src = person?.image || person?.imageExternalUrl;
                                    return src ? formatProfileImageUrl(src) : undefined;
                                })()}
                                negotiableBudget={announcement.negotiableBudget}
                                onClick={() => handleCardClick(announcement.id)}
                                onRespondClick={getAuthorId(announcement) !== currentUserId ? (e) => { e.stopPropagation(); handleRespondCard(announcement.id, getAuthorId(announcement)!); } : undefined}
                                isResponded={respondedTickets.has(announcement.id)}
                                isRespondLoading={respondingTicketId === announcement.id}
                                onReviewClick={getAuthorId(announcement) !== currentUserId ? () => { const tok = getAuthToken(); if (!tok) { window.dispatchEvent(new CustomEvent('openAuthModal')); return; } setCardReviewTarget({ authorId: getAuthorId(announcement)!, ticketId: announcement.id }); } : undefined}
                                onComplaintClick={getAuthorId(announcement) !== currentUserId ? () => { const tok = getAuthToken(); if (!tok) { window.dispatchEvent(new CustomEvent('openAuthModal')); return; } setCardComplaintTarget({ authorId: getAuthorId(announcement)!, ticketId: announcement.id }); } : undefined}
                            />
                        ))}
                    </div>
                ) : (
                    <EmptyState onRefresh={fetchRecentAnnouncements} />
                )}
                {!isLoading && announcements.length > 3 && (
                    <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16 }}>
                        <ShowMore
                            expanded={showAll}
                            onToggle={() => setShowAll(prev => !prev)}
                            showMoreText={t('pages.recommendations.showMore', 'Показать еще')}
                            showLessText={t('pages.recommendations.showLess', 'Свернуть')}
                        />
                    </div>
                )}
            </div>
        </div>
        <Status
            type={respondModal.type}
            isOpen={respondModal.open}
            onClose={() => setRespondModal(prev => ({ ...prev, open: false }))}
            message={respondModal.message}
        />
        {cardReviewTarget && (
            <FeedbackModal
                mode="review"
                isOpen={!!cardReviewTarget}
                onClose={() => setCardReviewTarget(null)}
                onSuccess={() => setCardReviewTarget(null)}
                onError={() => {}}
                ticketId={cardReviewTarget.ticketId}
                targetUserId={cardReviewTarget.authorId}
                showServiceSelector={false}
            />
        )}
        {cardComplaintTarget && (
            <FeedbackModal
                mode="complaint"
                isOpen={!!cardComplaintTarget}
                onClose={() => setCardComplaintTarget(null)}
                onSuccess={() => setCardComplaintTarget(null)}
                onError={() => {}}
                targetUserId={cardComplaintTarget.authorId}
                ticketId={cardComplaintTarget.ticketId}
                complaintType="ticket"
            />
        )}
    </>
    );
}

export default Recommendations;