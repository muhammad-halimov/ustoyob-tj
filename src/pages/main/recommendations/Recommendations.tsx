import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUserRole, getAuthToken, getUserData } from '../../../utils/auth';
import { getStorageItem } from '../../../utils/storageHelper';
import { useLanguageChange } from '../../../hooks';
import { Card } from '../../../shared/ui/Ticket/Card/Card';
import styles from './Recommendations.module.scss';
import { useTranslation } from 'react-i18next';
import { ROUTES } from '../../../app/routers/routes';
import { createChatWithAuthor, getChatsMe } from '../../../utils/chatUtils';
import Status from '../../../shared/ui/Modal/Status';
import Feedback from '../../../shared/ui/Modal/Feedback';

import { EmptyState } from '../../../widgets/EmptyState';
import { ShowMore } from '../../../shared/ui/Button/ShowMore/ShowMore';
import type { Ticket } from '../../../entities';
import { formatTicketImageUrl, formatProfileImageUrl } from '../../../utils/imageHelper';
import { getTicketFullAddress, universalApiRequest } from '../../../utils/apiHelper';

const RECS_INITIAL_SIZE = 6;
const RECS_PAGE_SIZE = 12;

/** Props for the Recommendations section. */
interface RecommendationsProps {
    /** When provided, uses this data instead of fetching from the API. */
    customData?: Ticket[];
    customLoading?: boolean;
    /** Whether to render the "Show more" button. Default: true. */
    showMoreButton?: boolean;
    initialLimit?: number;
    onItemClick?: (id: number) => void;
}

/**
 * Ticket recommendations section.
 * Fetches recommended tickets from /api/tickets filtered by the user's selected
 * city. Supports "show more" pagination. Can be fed custom data (e.g. for tests).
 */
function Recommendations({ 
    customData, 
    customLoading = false,
    showMoreButton = true,
    initialLimit = 3,
    onItemClick
}: RecommendationsProps = {}) {
    const [announcements, setAnnouncements] = useState<Ticket[]>([]);
    const [visibleCount, setVisibleCount] = useState(customData ? initialLimit : RECS_INITIAL_SIZE);
    const [isLoading, setIsLoading] = useState(true);
    const [userRole, setUserRole] = useState<'client' | 'master' | null>(getUserRole());
    const navigate = useNavigate();
    const { t, i18n } = useTranslation(['components', 'common']);
    const locale = i18n.language;
    
    // Reset visibleCount when initialLimit or customData changes
    useEffect(() => {
        setVisibleCount(initialLimit);
    }, [initialLimit, customData]);

    // Use custom data if provided
    const displayData = customData || announcements;
    const displayLoading = customData ? customLoading : isLoading;
    
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
                const res = await getChatsMe();
                const chats: any[] = res;
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
            
            const endpoint = `/api/tickets?active=true&page=1&itemsPerPage=${RECS_PAGE_SIZE}${currentUserId ? `&author.id[ne]=${currentUserId}&master.id[ne]=${currentUserId}` : ''}`;

            const responseData = await universalApiRequest(endpoint);
            let data: Ticket[];

            data = Array.isArray(responseData) ? responseData as Ticket[]
                : (responseData?.['hydra:member'] as Ticket[] | undefined) ?? [];

            // Сортируем: сначала тикеты из выбранного города
            const selectedCity = getStorageItem('selectedCity') || '';
            if (selectedCity) {
                data = data.sort((a, b) => {
                    const aMatchesCity = a.addresses?.some(addr => addr.city?.title === selectedCity) ?? false;
                    const bMatchesCity = b.addresses?.some(addr => addr.city?.title === selectedCity) ?? false;
                    if (aMatchesCity !== bMatchesCity) return aMatchesCity ? -1 : 1;
                    return 0;
                });
            }

            setAnnouncements(data);
            setVisibleCount(RECS_INITIAL_SIZE);
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
        // Skip fetch if custom data is provided
        if (customData) {
            setIsLoading(false);
            return;
        }
        
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
    }, [userRole, locale, fetchRecentAnnouncements, customData]);

    const getFullAddress = getTicketFullAddress;

    const getAuthorName = (announcement: Ticket): string => {
        if (announcement.service && announcement.master) {
            return `${announcement.master.surname || ''} ${announcement.master.name || ''}`.trim() || 'Специалист';
        }
        if (!announcement.service && announcement.author) {
            return `${announcement.author.surname || ''} ${announcement.author.name || ''}`.trim() || 'Заказчик';
        }
        return 'Автор';
    };

    const getAuthorId = (announcement: Ticket): number | undefined => {
        if (announcement.service && announcement.master) {
            return announcement.master.id;
        }
        if (!announcement.service && announcement.author) {
            return announcement.author.id;
        }
        return undefined;
    };

    // Функция для получения рейтинга пользователя
    const getUserRating = (announcement: Ticket): number => {
        if (announcement.service && announcement.master?.rating) {
            return announcement.master.rating;
        } else if (!announcement.service && announcement.author?.rating) {
            return announcement.author.rating;
        }
        return 0;
    };

    // Функция для получения количества отзывов
    const getUserReviewCount = (announcement: Ticket): number => {
        if (announcement.reviewsCount !== undefined) {
            return announcement.reviewsCount;
        }
        if (announcement.service && announcement.master?.reviewsCount !== undefined) {
            return announcement.master.reviewsCount;
        } else if (!announcement.service && announcement.author?.reviewsCount !== undefined) {
            return announcement.author.reviewsCount;
        }
        return 0;
    };

    const handleCardClick = (announcementId: number) => {
        if (onItemClick) {
            onItemClick(announcementId);
        } else {
            navigate(ROUTES.TICKET_BY_ID(announcementId));
        }
    };

    return (
    <>
        <div className={styles.recommendation}>
            <div className={styles.recommendation__wrap}>
                {displayLoading ? (
                    <EmptyState isLoading />
                ) : displayData.length > 0 ? (
                    <div className={styles.recommendation__list}>
                        {displayData.slice(0, visibleCount).map((announcement) => (
                            <Card
                                key={announcement.id}
                                ticketId={announcement.id}
                                title={announcement.title}
                                description={announcement.description ?? ''}
                                price={announcement.budget ?? 0}
                                unit={(typeof announcement.unit === 'object' ? announcement.unit?.title : announcement.unit) || ''}
                                address={getFullAddress(announcement)}
                                date={announcement.createdAt ?? ''}
                                author={getAuthorName(announcement)}
                                authorId={getAuthorId(announcement) ?? 0}
                                category={announcement.category?.title}
                                subcategory={announcement.subcategory?.title}
                                timeAgo={announcement.createdAt ?? ''}
                                ticketType={announcement.service}
                                userRole={userRole}
                                userRating={getUserRating(announcement)}
                                userReviewCount={getUserReviewCount(announcement)}
                                responsesCount={announcement.responsesCount}
                                viewsCount={announcement.viewsCount}
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
                                onComplaintClick={getAuthorId(announcement) !== currentUserId ? () => { setCardComplaintTarget({ authorId: getAuthorId(announcement)!, ticketId: announcement.id }); } : undefined}
                            />
                        ))}
                    </div>
                ) : (
                    <EmptyState onRefresh={customData ? undefined : fetchRecentAnnouncements} />
                )}
                {customData ? (
                    !displayLoading && displayData.length > initialLimit && showMoreButton && (
                        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16 }}>
                            <ShowMore
                                expanded={visibleCount > initialLimit}
                                canLoadMore={visibleCount < displayData.length}
                                onShowMore={() => setVisibleCount(c => Math.min(c + initialLimit, displayData.length))}
                                onShowLess={() => setVisibleCount(c => Math.max(c - initialLimit, initialLimit))}
                                onClear={() => setVisibleCount(initialLimit)}
                                showMoreText={t('common:app.showMore')}
                                showLessText={t('common:app.showLess')}
                                horizontal
                            />
                        </div>
                    )
                ) : (
                    !displayLoading && displayData.length > RECS_INITIAL_SIZE && (
                        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16 }}>
                            <ShowMore
                                expanded={visibleCount > RECS_INITIAL_SIZE}
                                canLoadMore={visibleCount < displayData.length}
                                onShowMore={() => setVisibleCount(v => Math.min(v + RECS_PAGE_SIZE, displayData.length))}
                                onShowLess={() => setVisibleCount(RECS_INITIAL_SIZE)}
                                onClear={() => setVisibleCount(RECS_INITIAL_SIZE)}
                                showMoreText={t('common:app.showMore')}
                                showLessText={t('common:app.showLess')}
                                horizontal
                            />
                        </div>
                    )
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
            <Feedback
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
            <Feedback
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