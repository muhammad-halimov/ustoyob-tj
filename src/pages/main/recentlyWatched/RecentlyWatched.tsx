import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Swiper, SwiperSlide } from 'swiper/react';
import type { Swiper as SwiperType } from 'swiper';
import { IoChevronBack, IoChevronForward } from 'react-icons/io5';
import 'swiper/css';
import styles from './RecentlyWatched.module.scss';
import { Card } from '../../../shared/ui/Ticket/Card/Card';
import { ROUTES } from '../../../app/routers/routes';
import { getUserRole } from '../../../utils/authUtils';
import { getRecentlyWatchedTickets } from '../../../utils/recentlyWatchedUtils';
import { ticketToTicketView } from '../../../utils/apiUtils';
import { textHelper } from '../../../utils/textUtils';
import { useLanguageChange } from '../../../hooks';
import type { TicketView } from '../../../entities';

const RECENTLY_WATCHED_LIMIT = 10;

/**
 * Home page "Недавно просмотренные" strip — GET /api/recently-watched (newest first).
 * Horizontal Swiper carousel (drag/swipe + prev/next arrows) of the compact (mobile-layout) Card
 * at every screen width. Works for guests
 * too (history kept in localStorage — see utils/recentlyWatchedUtils). Renders nothing while
 * empty/loading, so it never leaves a blank titled section behind.
 */
function RecentlyWatched() {
    const [tickets, setTickets] = useState<TicketView[]>([]);
    const navigate = useNavigate();
    const { t } = useTranslation(['components', 'common']);
    const userRole = getUserRole();

    const load = useCallback(async () => {
        try {
            const items = await getRecentlyWatchedTickets(RECENTLY_WATCHED_LIMIT);
            setTickets(items.map(ticketToTicketView));
        } catch (error) {
            // Не критично для главной — блок просто не показываем.
            console.error('Error fetching recently watched:', error);
            setTickets([]);
        }
    }, []);

    useEffect(() => { void load(); }, [load]);

    // Стрелки поверх Swiper: перетаскивание/свайп остаются, стрелки листают на "страницу"
    // (сколько карточек целиком помещается в ряд) и блокируются на краях.
    const swiperRef = useRef<SwiperType | null>(null);
    const [canPrev, setCanPrev] = useState(false);
    const [canNext, setCanNext] = useState(false);

    const syncArrows = useCallback((swiper: SwiperType) => {
        setCanPrev(!swiper.isBeginning);
        setCanNext(!swiper.isEnd);
    }, []);

    const slideByPage = (direction: 1 | -1) => {
        const swiper = swiperRef.current;
        if (!swiper) return;
        const perPage = Math.max(1, Math.floor((swiper.width + 16) / (340 + 16)));
        const target = swiper.activeIndex + direction * perPage;
        swiper.slideTo(Math.max(0, Math.min(target, swiper.slides.length - 1)));
    };

    // Заголовки/категории тикетов локализуются на бэке — перезапрашиваем при смене языка.
    useLanguageChange(() => { void load(); });

    if (tickets.length === 0) return null;

    return (
        <div className={styles.wrapper}>
            <div className={styles.head}>
                <h3 className={styles.title}>{t('pages.recentlyWatched.title')}</h3>
                {(canPrev || canNext) && (
                    <div className={styles.arrows}>
                        <button
                            type="button"
                            className={styles.arrow}
                            onClick={() => slideByPage(-1)}
                            disabled={!canPrev}
                            aria-label={t('common:app.previous')}
                        >
                            <IoChevronBack />
                        </button>
                        <button
                            type="button"
                            className={styles.arrow}
                            onClick={() => slideByPage(1)}
                            disabled={!canNext}
                            aria-label={t('common:app.next')}
                        >
                            <IoChevronForward />
                        </button>
                    </div>
                )}
            </div>
            <Swiper
                className={styles.slider}
                slidesPerView="auto"
                spaceBetween={16}
                grabCursor
                onSwiper={(swiper) => { swiperRef.current = swiper; syncArrows(swiper); }}
                onSlideChange={syncArrows}
                onReachBeginning={syncArrows}
                onReachEnd={syncArrows}
                onFromEdge={syncArrows}
                onResize={syncArrows}
                onUpdate={syncArrows}
            >
                {tickets.map(ticket => (
                    <SwiperSlide key={ticket.id} className={styles.slide}>
                        <Card
                            compact
                            ticketId={ticket.id}
                            title={ticket.title}
                            description={textHelper(ticket.description)}
                            price={ticket.price}
                            unit={ticket.unit}
                            address={ticket.address}
                            date={ticket.date}
                            author={ticket.author}
                            authorId={ticket.authorId}
                            category={ticket.category}
                            subcategory={ticket.subcategory}
                            timeAgo={ticket.timeAgo}
                            ticketType={ticket.type}
                            userRole={userRole}
                            userRating={ticket.userRating}
                            userReviewCount={ticket.userReviewCount}
                            responsesCount={ticket.responsesCount}
                            viewsCount={ticket.viewsCount}
                            photos={ticket.photos}
                            photoSources={ticket.photoSources}
                            authorImage={ticket.authorImage}
                            negotiableBudget={ticket.negotiableBudget}
                            onClick={() => navigate(ROUTES.TICKET_BY_ID(ticket.id))}
                        />
                    </SwiperSlide>
                ))}
            </Swiper>
        </div>
    );
}

export default RecentlyWatched;
