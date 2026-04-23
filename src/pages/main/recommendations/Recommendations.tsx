import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUserRole, getAuthToken, getUserData } from '../../../utils/auth.ts';
import { useLanguageChange } from '../../../hooks';
import { Card } from '../../../shared/ui/Ticket/Card/Card.tsx';
import styles from './Recommendations.module.scss';
import { useTranslation } from 'react-i18next';
import { ROUTES } from '../../../app/routers/routes.ts';
import { createChatWithAuthor } from '../../../utils/chatUtils';
import Status from '../../../shared/ui/Modal/Status';
import Feedback from '../../../shared/ui/Modal/Feedback';

import { EmptyState } from '../../../widgets/EmptyState';
import { ShowMore } from '../../../shared/ui/Button/ShowMore/ShowMore.tsx';
import { getPageSize } from '../../../utils/pageSize.ts';

export interface Announcement {
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
    responsesCount?: number;
    viewsCount?: number;
    images?: { id: number; image: string }[];
    negotiableBudget?: boolean;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export const formatTicketImageUrl = (imagePath: string): string => {
    if (!imagePath) return '';
    if (imagePath.startsWith('http')) return imagePath;
    if (imagePath.startsWith('/uploads/') || imagePath.startsWith('/images/')) return `${API_BASE_URL}${imagePath}`;
    return `${API_BASE_URL}/uploads/tickets/${imagePath}`;
};

export const formatProfileImageUrl = (imagePath: string): string => {
    if (!imagePath) return '';
    if (imagePath.startsWith('http')) return imagePath;
    return `${API_BASE_URL}/uploads/users/${imagePath}`;
};

interface RecommendationsProps {
    customData?: Announcement[];
    customLoading?: boolean;
    showMoreButton?: boolean;
    initialLimit?: number;
    onItemClick?: (id: number) => void;
}

function Recommendations({ 
    customData, 
    customLoading = false,
    showMoreButton = true,
    initialLimit = 3,
    onItemClick
}: RecommendationsProps = {}) {
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const appendAnnouncementsRef = useRef(false);
    const skipAnnouncementsFetchRef = useRef(false);
    const [showAll, setShowAll] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [userRole, setUserRole] = useState<'client' | 'master' | null>(getUserRole());
    const navigate = useNavigate();
    const { t, i18n } = useTranslation(['components', 'common']);
    const locale = i18n.language;
    
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
            
            const pageSize = getPageSize();
            const endpoint = `/api/tickets?locale=${locale}&active=true&page=${page}&itemsPerPage=${pageSize}${currentUserId ? `&author.id[ne]=${currentUserId}&master.id[ne]=${currentUserId}` : ''}`;
            
            console.log('Recommendations - Endpoint:', `${API_BASE_URL}${endpoint}`);
            console.log('============================================');

            const headers: HeadersInit = {
                'Accept': 'application/json',
                ...(token && { 'Authorization': `Bearer ${token}` })
            };

            const response = await fetch(`${API_BASE_URL}${endpoint}`, { headers });

            if (response.ok) {
                const responseData = await response.json();
                let data: Announcement[];

                if (Array.isArray(responseData)) {
                    data = responseData;
                } else if (responseData && 'hydra:member' in responseData) {
                    data = responseData['hydra:member'];
                    const totalItems: number = responseData['hydra:totalItems'] ?? data.length;
                    setTotalPages(Math.max(1, Math.ceil(totalItems / pageSize)));
                } else {
                    data = [];
                }

                // Сортируем: сначала тикеты из выбранного города
                const selectedCity = localStorage.getItem('selectedCity') || '';
                if (selectedCity) {
                    data = data.sort((a, b) => {
                        const aMatchesCity = a.addresses?.some(addr => addr.city?.title === selectedCity) ?? false;
                        const bMatchesCity = b.addresses?.some(addr => addr.city?.title === selectedCity) ?? false;
                        if (aMatchesCity !== bMatchesCity) return aMatchesCity ? -1 : 1;
                        return 0;
                    });
                }

                if (appendAnnouncementsRef.current) {
                    appendAnnouncementsRef.current = false;
                    setAnnouncements(prev => [...prev, ...data]);
                } else {
                    setAnnouncements(data);
                }
            }
        } catch (error) {
            console.error('Error fetching announcements:', error);
        } finally {
            setIsLoading(false);
        }
    }, [locale, userRole, page]);

    const handleLoadMoreAnnouncements = () => {
        appendAnnouncementsRef.current = true;
        setPage(p => p + 1);
    };

    const handleLoadLessAnnouncements = () => {
        const pageSize = getPageSize();
        const prevPage = page - 1;
        skipAnnouncementsFetchRef.current = true;
        setPage(prevPage);
        setAnnouncements(prev => prev.slice(0, prevPage * pageSize));
    };

    const handleClearAnnouncements = () => {
        const pageSize = getPageSize();
        skipAnnouncementsFetchRef.current = true;
        setPage(1);
        setAnnouncements(prev => prev.slice(0, pageSize));
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

    useEffect(() => {
        if (skipAnnouncementsFetchRef.current) {
            skipAnnouncementsFetchRef.current = false;
            return;
        }
        if (customData) return;
        fetchRecentAnnouncements();
    }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

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
                        {(customData ? displayData.slice(0, showAll ? displayData.length : initialLimit) : displayData).map((announcement) => (
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
                                onComplaintClick={getAuthorId(announcement) !== currentUserId ? () => { const tok = getAuthToken(); if (!tok) { window.dispatchEvent(new CustomEvent('openAuthModal')); return; } setCardComplaintTarget({ authorId: getAuthorId(announcement)!, ticketId: announcement.id }); } : undefined}
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
                                expanded={showAll}
                                canLoadMore={!showAll}
                                onShowMore={() => setShowAll(true)}
                                onShowLess={() => setShowAll(false)}
                                onClear={() => setShowAll(false)}
                                showMoreText={t('common:app.showMore')}
                                showLessText={t('common:app.showLess')}
                            />
                        </div>
                    )
                ) : (
                    !customData && (
                        <ShowMore
                            expanded={page > 1}
                            canLoadMore={page < totalPages}
                            onShowMore={handleLoadMoreAnnouncements}
                            onShowLess={handleLoadLessAnnouncements}
                            onClear={handleClearAnnouncements}
                            showMoreText={t('common:app.showMore')}
                            showLessText={t('common:app.showLess')}
                        />
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