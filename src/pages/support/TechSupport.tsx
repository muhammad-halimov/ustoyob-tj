import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import type * as React from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import styles from './TechSupport.module.scss';
import { universalApiRequest } from '../../utils/apiUtils';
import { getAppealReasons, getMyTechSupports } from '../../utils/dataCacheUtils';
import { uploadPhotos, formatTechSupportImageUrl } from '../../utils/imageUtils';
import { isAuthenticated, getUserData, isAdmin } from '../../utils/authUtils';
import { openMercureSource } from '../../utils/mercureUtils';
import { textHelper } from '../../utils/textUtils';
import { getFormattedDateTime } from '../../utils/timeUtils';
import { Marquee } from '../../shared/ui/Text/Marquee';
import { SelectSearch } from '../../shared/ui/SelectSearch';
import Grid, { type PhotoItem } from '../../shared/ui/Photo/Grid';
import { Preview, usePreview } from '../../shared/ui/Photo/Preview';
import Status from '../../shared/ui/Modal/Status';
import { EmptyState } from '../../widgets/EmptyState';
import { EditActions } from '../profile/shared/ui/EditActions/EditActions';
import { Tabs } from '../../shared/ui/Tabs';
import { InfoBanner } from '../../widgets/Banners/InfoBanner/InfoBanner';
import { useLanguageChange } from '../../hooks';
import { TechSupportSortingFilter } from '../../widgets/Sorting/TechSupportCriteriaFilter';
import TechSupportThread from './thread/TechSupportThread';
import { IoPencilOutline, IoListOutline, IoPricetagOutline, IoInformationCircleOutline } from 'react-icons/io5';
import {
    TECH_SUPPORT_STATUSES,
    PRIORITY_KEYS,
    getLastActivityAt,
    getUnreadCount,
    STATUS_ICONS,
    PRIORITY_ICONS,
    type AppealReason,
    type SupportTicket,
    type TechSupportMessage,
} from './types';
import type { TechSupportSortOrder } from '../../types/common';

type SupportTab = 'create' | 'my';
type SortField = 'createdAt' | 'updatedAt';

export interface TechSupportProps {
    /** When true, skips the outer container padding and page title (used when embedded in tabs). */
    embedded?: boolean;
}

function TechSupport({ embedded = false }: TechSupportProps) {
    const { t } = useTranslation('techSupport');
    const isAuth = isAuthenticated();
    const currentUserId = getUserData()?.id;
    // Admins don't file their own support tickets here — the "create" tab stays visible
    // (so the tab bar doesn't shift under them) but shows a notice instead of the form, and
    // "my tickets" is relabeled "all tickets" since that's the queue they actually work from.
    const isAdminUser = isAdmin();
    const formRef = useRef<HTMLFormElement>(null);

    const [activeTab, setActiveTab] = useState<SupportTab>(() => isAdminUser ? 'my' : 'create');

    // Deep-linked open ticket — ?ticket=<id>. Pushed (not replaced) so the header's
    // universal Back button (which pops window.history) closes it back to the table.
    const [searchParams, setSearchParams] = useSearchParams();
    const openTicketId = useMemo(() => {
        const raw = searchParams.get('ticket');
        const parsed = raw ? parseInt(raw, 10) : NaN;
        return Number.isFinite(parsed) ? parsed : null;
    }, [searchParams]);

    // My tickets state
    const [myTickets, setMyTickets] = useState<SupportTicket[]>([]);
    const [loadingMyTickets, setLoadingMyTickets] = useState(false);
    const [myTicketsError, setMyTicketsError] = useState('');

    // My tickets — filters & sort (client-side, over the already-fetched list)
    const [sortField, setSortField] = useState<SortField>('createdAt');
    const [sortOrder, setSortOrder] = useState<TechSupportSortOrder>('newest');
    const [filterReason, setFilterReason] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [filterPriority, setFilterPriority] = useState('');
    // Free-text search — same for admin ("all tickets") and regular users, matches
    // whatever's actually visible in the row (title/description/category).
    const [searchQuery, setSearchQuery] = useState('');

    // Form fields
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [reasonIri, setReasonIri] = useState('');
    const [priority, setPriority] = useState('');
    const [guestEmail, setGuestEmail] = useState('');
    const [photos, setPhotos] = useState<PhotoItem[]>([]);

    // UI state
    const [reasons, setReasons] = useState<AppealReason[]>([]);
    const [loadingReasons, setLoadingReasons] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [showError, setShowError] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [warningMessage, setWarningMessage] = useState('');
    const [showWarning, setShowWarning] = useState(false);

    // Photo gallery — blob URLs for newly added photos (same pattern as CreateEdit for existing photos)
    const photoUrls = photos
        .filter((p): p is Extract<PhotoItem, { type: 'new' }> => p.type === 'new')
        .map(p => p.previewUrl);
    const gallery = usePreview({ images: photoUrls });

    // Load appeal reasons — cached (dataCacheUtils, locale-partitioned internally), shared
    // between the form select and the "my tickets" category filter. Only `applicableTo=support`
    // reasons are valid choices when creating a ticket, so the form/filter stay scoped to those.
    const fetchReasons = useCallback(async () => {
        try {
            setLoadingReasons(true);
            const list = await getAppealReasons(undefined, 'applicableTo=support');
            setReasons(list);
        } catch {
            setErrorMessage(t('loadError'));
            setShowError(true);
        } finally {
            setLoadingReasons(false);
        }
    }, [t]);

    // A ticket's own `reason` isn't restricted to `applicableTo=support` server-side (e.g. tickets
    // created from a report/complaint flow can carry an "overall"-tagged reason) — so the table/
    // thread's id→title lookup needs the full unfiltered list, separate from the form's scoped one.
    const [allReasons, setAllReasons] = useState<AppealReason[]>([]);
    const fetchAllReasons = useCallback(async () => {
        try {
            const list = await getAppealReasons();
            setAllReasons(list);
        } catch {
            // Non-critical — table falls back to the ticket's own embedded reason.title.
        }
    }, []);

    useEffect(() => {
        fetchReasons();
        fetchAllReasons();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const fetchMyTickets = useCallback(async (force = false) => {
        try {
            setLoadingMyTickets(true);
            setMyTicketsError('');
            const data = await getMyTechSupports(force);
            const list: SupportTicket[] = Array.isArray(data)
                ? data
                : (data as { 'hydra:member'?: SupportTicket[] })?.['hydra:member'] ?? [];
            setMyTickets(list);
        } catch {
            setMyTicketsError(t('myTickets.loadError'));
        } finally {
            setLoadingMyTickets(false);
        }
    }, [t]);

    useEffect(() => {
        if (activeTab !== 'my' || !isAuth) return;
        fetchMyTickets();
    }, [activeTab, isAuth, fetchMyTickets]);

    // Real-time — one Mercure connection covering every ticket the user is party to
    // (as author or administrant, §11), so new replies land in `myTickets` instantly:
    // updates "last activity" sort and feeds the unread bubble, without polling.
    // Kept alive for as long as the user is authed, independent of which tab is active,
    // since switching tabs here doesn't unmount this component.
    const inboxSourceRef = useRef<EventSource | null>(null);
    const startInboxSSE = useCallback(async () => {
        inboxSourceRef.current?.close();
        inboxSourceRef.current = null;
        try {
            const { token, topics } = await universalApiRequest('/api/tech-supports/inbox-token', { locale: false }) as { token: string | null; topics: string[] };
            if (!token || !topics?.length) return;

            const source = openMercureSource(topics, token);
            inboxSourceRef.current = source;
            source.onmessage = (event) => {
                try {
                    const { type, data } = JSON.parse(event.data) as {
                        type: string;
                        data: (TechSupportMessage & { techSupport?: { id: number } }) | SupportTicket;
                    };

                    if (type === 'created') {
                        const msg = data as TechSupportMessage & { techSupport?: { id: number } };
                        const ticketId = msg.techSupport?.id;
                        if (!ticketId) return;

                        setMyTickets(prev => prev.map(ticket => {
                            if (ticket.id !== ticketId) return ticket;
                            if ((ticket.messages ?? []).some(m => m.id === msg.id)) return ticket;
                            return { ...ticket, messages: [...(ticket.messages ?? []), msg] };
                        }));
                    } else if (type === 'updated') {
                        // Status changed elsewhere (own self-transition on another tab, or an
                        // admin action) — same instant sync the open-thread view gets, but here
                        // for every row in the table at once, without needing to open any of them.
                        const updated = data as SupportTicket;
                        if (updated?.id == null) return;

                        setMyTickets(prev => prev.map(ticket => (
                            ticket.id === updated.id ? { ...ticket, ...updated, messages: ticket.messages ?? updated.messages } : ticket
                        )));
                    }
                } catch {
                    // ignore malformed events
                }
            };
        } catch {
            // Real-time is a progressive enhancement — the list still works via manual refresh.
        }
    }, []);

    useEffect(() => {
        if (!isAuth) return;
        startInboxSSE();
        // Refresh before the hour-long subscriber token expires (same cadence as Chat's inbox SSE).
        const refreshInterval = setInterval(startInboxSSE, 50 * 60 * 1000);
        return () => {
            clearInterval(refreshInterval);
            inboxSourceRef.current?.close();
            inboxSourceRef.current = null;
        };
    }, [isAuth, startInboxSSE]);

    // Keeps the tickets table in sync the instant something changes inside an open thread —
    // an admin's inline edit-save, or a reply auto-reopening a closed/resolved ticket (see
    // TechSupportThread) — instead of leaving this row stale until the next full
    // /tech-supports/me refetch (cache-clearing alone only affects *future* loads, not the
    // list already sitting in state here).
    const handleTicketChange = useCallback((updated: SupportTicket) => {
        setMyTickets(prev => prev.some(t => t.id === updated.id)
            ? prev.map(t => (t.id === updated.id ? { ...t, ...updated } : t))
            : prev);
    }, []);

    // TechSupportThread marks a ticket's messages read server-side the moment it's opened,
    // but marking read doesn't emit a Mercure event (§11) — so mirror that locally here too,
    // the instant the thread closes (or deep-links straight to a different ticket), instead
    // of waiting for the next `/tech-supports/me` refetch to notice the bubble should clear.
    const prevOpenTicketIdRef = useRef<number | null>(null);
    useEffect(() => {
        const closedTicketId = prevOpenTicketIdRef.current;
        if (closedTicketId != null && closedTicketId !== openTicketId) {
            const readAt = new Date().toISOString();
            setMyTickets(prev => prev.map(ticket => {
                if (ticket.id !== closedTicketId) return ticket;
                return {
                    ...ticket,
                    messages: (ticket.messages ?? []).map(m =>
                        m.author?.id !== currentUserId && !m.readAt ? { ...m, readAt } : m
                    ),
                };
            }));
        }
        prevOpenTicketIdRef.current = openTicketId;
    }, [openTicketId, currentUserId]);

    // Reason/category titles (like Category/Occupation/etc.) are localized server-side —
    // they don't update just because i18next's UI strings do, so re-fetch on language switch.
    useLanguageChange(() => {
        fetchReasons();
        fetchAllReasons();
        if (activeTab === 'my') fetchMyTickets(true);
    });

    const priorityOptions = PRIORITY_KEYS.map(k => ({
        value: k,
        label: t(`priority.${k}`),
    }));

    const reasonOptions = reasons.map(r => ({
        value: `/api/appeal-reasons/${r.id}`,
        label: r.title,
    }));

    // Filter dropdown option lists (with a leading "any" option)
    const reasonFilterOptions = useMemo(() => [
        { value: '', label: t('myTickets.filters.categoryAll') },
        ...reasons.map(r => ({ value: String(r.id), label: r.title })),
    ], [reasons, t]);

    // `ticket.reason.title` comes embedded in /tech-supports/me and doesn't seem to respect
    // ?locale= the way a direct GET /api/appeal-reasons?locale= does — so look the title up by
    // id from the (correctly locale-fetched) `allReasons` list instead, falling back to the
    // embedded value only when the reason isn't in that list for some reason.
    const reasonTitleById = useMemo(
        () => new Map(allReasons.map(r => [r.id, r.title])),
        [allReasons],
    );

    const statusFilterOptions = useMemo(() => [
        { value: '', label: t('myTickets.filters.statusAll') },
        ...TECH_SUPPORT_STATUSES.map(s => ({ value: s, label: t(`myTickets.statuses.${s}`) })),
    ], [t]);

    const priorityFilterOptions = useMemo(() => [
        { value: '', label: t('myTickets.filters.priorityAll') },
        ...priorityOptions,
    ], [priorityOptions, t]);

    // Label for each table-header quick filter — the visible text is a Marquee sitting on top of
    // an invisible native <select> that handles the actual interaction (a real <option> list can't
    // render a Marquee itself, and a custom dropdown would get clipped by the table's own
    // `overflow: hidden`). Shows the compact column title until a filter is picked — the verbose
    // "Любой приоритет"/"Любой статус"/"Все категории" placeholders (fine as <option> text in the
    // panel below) were long enough to crowd the narrow header columns against their neighbours.
    const selectedReasonLabel = filterReason
        ? reasonFilterOptions.find(o => o.value === filterReason)?.label ?? ''
        : t('myTickets.table.category');
    const selectedStatusLabel = filterStatus
        ? statusFilterOptions.find(o => o.value === filterStatus)?.label ?? ''
        : t('myTickets.table.status');
    const selectedPriorityLabel = filterPriority
        ? priorityFilterOptions.find(o => o.value === filterPriority)?.label ?? ''
        : t('myTickets.table.priority');

    const filteredTickets = useMemo(() => {
        let list = myTickets;
        if (filterReason) list = list.filter(ticket => String(ticket.reason?.id ?? '') === filterReason);
        if (filterStatus) list = list.filter(ticket => ticket.status === filterStatus);
        if (filterPriority) list = list.filter(ticket => String(ticket.priority ?? '') === filterPriority);

        const query = searchQuery.trim().toLowerCase();
        if (query) {
            list = list.filter(ticket => {
                const reasonTitle = (ticket.reason?.id != null ? reasonTitleById.get(ticket.reason.id) : undefined) ?? ticket.reason?.title ?? '';
                return (ticket.title ?? '').toLowerCase().includes(query)
                    || (ticket.description ?? '').toLowerCase().includes(query)
                    || reasonTitle.toLowerCase().includes(query);
            });
        }

        return [...list].sort((a, b) => {
            // "updatedAt" sorts by last activity (ticket's own updatedAt, or its latest
            // message if that's more recent) rather than the raw field — see getLastActivityAt.
            const aValue = sortField === 'updatedAt' ? getLastActivityAt(a) : a.createdAt;
            const bValue = sortField === 'updatedAt' ? getLastActivityAt(b) : b.createdAt;
            const aTime = aValue ? new Date(aValue).getTime() : 0;
            const bTime = bValue ? new Date(bValue).getTime() : 0;
            return sortOrder === 'newest' ? bTime - aTime : aTime - bTime;
        });
    }, [myTickets, filterReason, filterStatus, filterPriority, searchQuery, reasonTitleById, sortField, sortOrder]);

    const resetFilters = () => {
        setSearchQuery('');
        setFilterReason('');
        setFilterStatus('');
        setFilterPriority('');
        setSortField('createdAt');
        setSortOrder('newest');
    };

    // Clicking the Created/Updated column header sorts by that column — a second
    // click on the same column flips the direction.
    const handleSortByColumn = (field: SortField) => {
        if (sortField === field) {
            setSortOrder(prev => (prev === 'newest' ? 'oldest' : 'newest'));
        } else {
            setSortField(field);
            setSortOrder('newest');
        }
    };

    const handleOpenTicket = (id: number) => {
        setSearchParams(prev => {
            const next = new URLSearchParams(prev);
            next.set('ticket', String(id));
            return next;
        });
    };

    const openWarning = (msg: string) => {
        setWarningMessage(msg);
        setShowWarning(true);
    };

    const resetForm = () => {
        setTitle('');
        setDescription('');
        setReasonIri('');
        setPriority('');
        setGuestEmail('');
        setPhotos([]);
    };

    const submitForm = async () => {
        if (!title.trim()) { openWarning(t('validation.titleRequired')); return; }
        if (!description.trim()) { openWarning(t('validation.descriptionRequired')); return; }
        if (!reasonIri) { openWarning(t('validation.reasonRequired')); return; }
        if (!priority) { openWarning(t('validation.priorityRequired')); return; }
        if (!isAuth) {
            if (!guestEmail.trim()) { openWarning(t('validation.emailRequired')); return; }
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail.trim())) {
                openWarning(t('validation.emailInvalid'));
                return;
            }
        }

        try {
            setIsSubmitting(true);

            const payload: Record<string, string> = {
                title: title.trim(),
                description: description.trim(),
                reason: reasonIri,
                priority,
            };
            if (!isAuth && guestEmail.trim()) {
                payload.guestEmail = guestEmail.trim();
            }

            const result: SupportTicket = await universalApiRequest('/api/tech-supports', {
                method: 'POST',
                body: payload,
            });

            // Upload photos if any.
            // For guests, the server returns a one-time guestAccessToken in the
            // create response — it must be sent with each upload to prove ownership
            // of this specific ticket (anonymous requests can't rely on JWT auth).
            const newFiles = photos
                .filter((p): p is Extract<PhotoItem, { type: 'new' }> => p.type === 'new')
                .map(p => p.file);

            if (newFiles.length > 0 && result?.id) {
                const guestToken = !isAuth ? result.guestAccessToken : undefined;

                try {
                    await uploadPhotos('tech-supports', result.id, newFiles, guestToken);
                } catch {
                    // Photo upload failures are non-critical
                }
            }

            // The "my tickets" cache is now stale — next visit to that tab should see the new ticket.
            getMyTechSupports.clearCache();

            setShowSuccess(true);
            resetForm();
        } catch (err) {
            setErrorMessage(err instanceof Error ? err.message : t('error'));
            setShowError(true);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        submitForm();
    };

    const supportTabs = [
        { key: 'create' as SupportTab, icon: <IoPencilOutline />, label: t('tabs.create') },
        ...(isAuth ? [{ key: 'my' as SupportTab, icon: <IoListOutline />, label: isAdminUser ? t('tabs.allTickets') : t('tabs.my') }] : []),
    ];

    return (
        <div className={embedded ? styles.embeddedContainer : styles.container}>
            {!embedded && !openTicketId && (
                <div className={styles.header}>
                    <h1 className={styles.title}>{t('pageTitle')}</h1>
                    <p className={styles.subtitle}>{t('pageSubtitle')}</p>
                </div>
            )}

            {openTicketId ? (
                <TechSupportThread ticketId={openTicketId} onTicketChange={handleTicketChange} />
            ) : (
                <>
                    <div className={styles.tabsWrapper}>
                        <Tabs tabs={supportTabs} activeTab={activeTab} onChange={setActiveTab} />
                    </div>

                    {activeTab === 'my' ? (
                        <div className={styles.myTicketsSection}>
                            {myTickets.length > 0 && (
                                <>
                                    <div className={styles.ticketsSearchBar}>
                                        <SelectSearch
                                            altMode
                                            options={[]}
                                            value={searchQuery}
                                            onChange={setSearchQuery}
                                            placeholder={t('myTickets.searchPlaceholder')}
                                        />
                                    </div>

                                    <TechSupportSortingFilter
                                        sortOrder={sortOrder}
                                        filterReason={filterReason}
                                        filterStatus={filterStatus}
                                        filterPriority={filterPriority}
                                        reasonOptions={reasonFilterOptions}
                                        statusOptions={statusFilterOptions}
                                        priorityOptions={priorityFilterOptions}
                                        onSortChange={setSortOrder}
                                        onReasonChange={setFilterReason}
                                        onStatusChange={setFilterStatus}
                                        onPriorityChange={setFilterPriority}
                                    />
                                </>
                            )}

                            {loadingMyTickets && myTickets.length === 0 ? (
                                <div className={styles.myTicketsStateWrap}><EmptyState isLoading /></div>
                            ) : myTicketsError ? (
                                <div className={styles.myTicketsStateWrap}>
                                    <EmptyState title={myTicketsError} onRefresh={() => fetchMyTickets(true)} />
                                </div>
                            ) : myTickets.length === 0 ? (
                                <div className={styles.myTicketsStateWrap}>
                                    <EmptyState title={t('myTickets.empty')} />
                                </div>
                            ) : filteredTickets.length === 0 ? (
                                <div className={styles.myTicketsStateWrap}>
                                    <EmptyState
                                        title={t('myTickets.noResults')}
                                        actionText={t('myTickets.resetFilters')}
                                        onAction={resetFilters}
                                    />
                                </div>
                            ) : (
                                <div className={styles.ticketsTable}>
                                    <div className={styles.ticketsTableHead}>
                                        <span>{t('myTickets.table.title')}</span>
                                        <div className={styles.headFilterCell}>
                                            <span className={styles.headFilterLabel}>
                                                <Marquee text={selectedReasonLabel} alwaysScroll />
                                            </span>
                                            <span className={styles.headFilterArrow} aria-hidden="true">▾</span>
                                            <select
                                                className={styles.headFilterNative}
                                                value={filterReason}
                                                onChange={e => setFilterReason(e.target.value)}
                                                aria-label={t('myTickets.table.category')}
                                            >
                                                {reasonFilterOptions.map(opt => (
                                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className={styles.headFilterCell}>
                                            <span className={styles.headFilterLabel}>
                                                <Marquee text={selectedStatusLabel} alwaysScroll />
                                            </span>
                                            <span className={styles.headFilterArrow} aria-hidden="true">▾</span>
                                            <select
                                                className={styles.headFilterNative}
                                                value={filterStatus}
                                                onChange={e => setFilterStatus(e.target.value)}
                                                aria-label={t('myTickets.table.status')}
                                            >
                                                {statusFilterOptions.map(opt => (
                                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className={styles.headFilterCell}>
                                            <span className={styles.headFilterLabel}>
                                                <Marquee text={selectedPriorityLabel} alwaysScroll />
                                            </span>
                                            <span className={styles.headFilterArrow} aria-hidden="true">▾</span>
                                            <select
                                                className={styles.headFilterNative}
                                                value={filterPriority}
                                                onChange={e => setFilterPriority(e.target.value)}
                                                aria-label={t('myTickets.table.priority')}
                                            >
                                                {priorityFilterOptions.map(opt => (
                                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div
                                            className={styles.sortableHead}
                                            role="button"
                                            tabIndex={0}
                                            onClick={() => handleSortByColumn('createdAt')}
                                            onKeyDown={e => {
                                                if (e.key === 'Enter' || e.key === ' ') {
                                                    e.preventDefault();
                                                    handleSortByColumn('createdAt');
                                                }
                                            }}
                                        >
                                            {t('myTickets.table.created')}
                                            {sortField === 'createdAt' && (
                                                <span className={styles.sortArrow}>{sortOrder === 'newest' ? '↓' : '↑'}</span>
                                            )}
                                        </div>
                                        <div
                                            className={styles.sortableHead}
                                            role="button"
                                            tabIndex={0}
                                            onClick={() => handleSortByColumn('updatedAt')}
                                            onKeyDown={e => {
                                                if (e.key === 'Enter' || e.key === ' ') {
                                                    e.preventDefault();
                                                    handleSortByColumn('updatedAt');
                                                }
                                            }}
                                        >
                                            {t('myTickets.table.updated')}
                                            {sortField === 'updatedAt' && (
                                                <span className={styles.sortArrow}>{sortOrder === 'newest' ? '↓' : '↑'}</span>
                                            )}
                                        </div>
                                    </div>
                                    {filteredTickets.map(ticket => (
                                        <div
                                            key={ticket.id}
                                            className={styles.ticketRow}
                                            onClick={() => handleOpenTicket(ticket.id)}
                                            role="button"
                                            tabIndex={0}
                                            onKeyDown={e => {
                                                if (e.key === 'Enter' || e.key === ' ') {
                                                    e.preventDefault();
                                                    handleOpenTicket(ticket.id);
                                                }
                                            }}
                                        >
                                            <div className={styles.ticketCellTitle}>
                                                <div className={styles.ticketTitleRow}>
                                                    {(() => {
                                                        const unread = getUnreadCount(ticket, currentUserId);
                                                        return unread > 0 && (
                                                            <span className={styles.unreadBadge}>{unread > 99 ? '99+' : unread}</span>
                                                        );
                                                    })()}
                                                    <Marquee
                                                        text={ticket.title || t('myTickets.noTitle')}
                                                        alwaysScroll
                                                        className={styles.ticketRowTitle}
                                                    />
                                                </div>
                                                {ticket.description && (
                                                    <Marquee
                                                        text={textHelper(ticket.description)}
                                                        alwaysScroll
                                                        className={styles.ticketRowDesc}
                                                    />
                                                )}
                                            </div>
                                            <div className={styles.ticketCell} data-label={t('myTickets.table.category')}>
                                                <div className={styles.cellRow}>
                                                    <IoPricetagOutline className={styles.cellIcon} />
                                                    <Marquee
                                                        text={(ticket.reason?.id != null ? reasonTitleById.get(ticket.reason.id) : undefined) ?? ticket.reason?.title ?? '—'}
                                                        alwaysScroll
                                                    />
                                                </div>
                                            </div>
                                            <div className={styles.ticketCell} data-label={t('myTickets.table.status')}>
                                                {(() => {
                                                    const statusKey = ticket.status ? (ticket.status.toLowerCase() as typeof ticket.status) : null;
                                                    const StatusIcon = statusKey ? STATUS_ICONS[statusKey] : null;
                                                    return statusKey ? (
                                                        <span className={`${styles.badge} ${styles.statusBadge} ${styles[`status_${statusKey}`] ?? ''}`}>
                                                            {StatusIcon && <StatusIcon />}
                                                            {t(`myTickets.statuses.${statusKey}`, ticket.status ?? '')}
                                                        </span>
                                                    ) : '—';
                                                })()}
                                            </div>
                                            <div className={styles.ticketCell} data-label={t('myTickets.table.priority')}>
                                                {(() => {
                                                    const priorityKey = ticket.priority != null ? String(ticket.priority) : null;
                                                    const PriorityIcon = priorityKey ? PRIORITY_ICONS[priorityKey] : null;
                                                    return (
                                                        <span className={`${styles.badge} ${styles.statusBadge} ${priorityKey ? styles[`priority_${priorityKey}`] ?? '' : ''}`}>
                                                            {PriorityIcon && <PriorityIcon />}
                                                            {t(`priority.${ticket.priority}`, String(ticket.priority))}
                                                        </span>
                                                    );
                                                })()}
                                            </div>
                                            <div className={styles.ticketCell} data-label={t('myTickets.table.created')}>
                                                {ticket.createdAt ? getFormattedDateTime(ticket.createdAt) : '—'}
                                            </div>
                                            <div className={styles.ticketCell} data-label={t('myTickets.table.updated')}>
                                                {(() => {
                                                    const lastActivity = getLastActivityAt(ticket);
                                                    return lastActivity ? getFormattedDateTime(lastActivity) : '—';
                                                })()}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className={styles.formWrapper}>

                        {isAdminUser && (
                            <InfoBanner
                                icon={<IoInformationCircleOutline />}
                                message={t('adminCreateDisabled')}
                                className={styles.adminNotice}
                            />
                        )}

                        <form ref={formRef} onSubmit={handleFormSubmit} className={styles.form} noValidate>

                            {/* Subject */}
                            <div className={styles.section}>
                                <h2>{t('form.titleLabel')}</h2>
                                <input
                                    type="text"
                                    className={styles.textInput}
                                    placeholder={t('form.titlePlaceholder')}
                                    value={title}
                                    onChange={e => setTitle(e.target.value)}
                                    disabled={isSubmitting}
                                />
                            </div>

                            {/* Reason */}
                            <div className={styles.section}>
                                <h2>{t('form.reasonLabel')}</h2>
                                <SelectSearch
                                    options={reasonOptions}
                                    value={reasonIri}
                                    onChange={setReasonIri}
                                    placeholder={t('form.reasonPlaceholder')}
                                    loading={loadingReasons}
                                    disabled={isSubmitting}
                                />
                            </div>

                            {/* Priority */}
                            <div className={styles.section}>
                                <h2>{t('form.priorityLabel')}</h2>
                                <SelectSearch
                                    options={priorityOptions}
                                    value={priority}
                                    onChange={setPriority}
                                    placeholder={t('form.priorityPlaceholder')}
                                    disabled={isSubmitting}
                                />
                            </div>

                            {/* Guest email — only for unauthenticated users */}
                            {!isAuth && (
                                <div className={styles.section}>
                                    <h2>{t('form.emailLabel')}</h2>
                                    <input
                                        type="email"
                                        className={styles.textInput}
                                        placeholder={t('form.emailPlaceholder')}
                                        value={guestEmail}
                                        onChange={e => setGuestEmail(e.target.value)}
                                        disabled={isSubmitting}
                                    />
                                </div>
                            )}

                            {/* Description */}
                            <div className={styles.section}>
                                <h2>{t('form.descriptionLabel')}</h2>
                                <textarea
                                    className={styles.textarea}
                                    placeholder={t('form.descriptionPlaceholder')}
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                    rows={5}
                                    disabled={isSubmitting}
                                />
                            </div>

                            {/* Photos */}
                            <div className={styles.section}>
                                <h2>{t('form.photosLabel')}</h2>
                                <Grid
                                    photos={photos}
                                    onChange={setPhotos}
                                    getImageUrl={url => formatTechSupportImageUrl(url)}
                                    onClickPhoto={index => gallery.openGallery(
                                        photos.slice(0, index).filter(p => p.type === 'new').length
                                    )}
                                    inputId="tech-support-photos"
                                    photoAlt={t('form.photoAlt')}
                                    disabled={isSubmitting}
                                />
                            </div>

                            {/* Submit */}
                            <div className={styles.submitSection}>
                                <EditActions
                                    onSave={submitForm}
                                    onCancel={resetForm}
                                    saveDisabled={isSubmitting || isAdminUser}
                                    className={styles.editActionsLarge}
                                />
                            </div>
                        </form>
                        </div>
                    )}
                </>
            )}

            {/* Preview for uploaded photos */}
            {photoUrls.length > 0 && (
                <Preview
                    isOpen={gallery.isOpen}
                    images={photoUrls}
                    currentIndex={gallery.currentIndex}
                    onClose={gallery.closeGallery}
                    onNext={gallery.goToNext}
                    onPrevious={gallery.goToPrevious}
                    onSelectImage={gallery.selectImage}
                />
            )}

            <Status
                type="success"
                isOpen={showSuccess}
                onClose={() => setShowSuccess(false)}
                message={t('success')}
            />
            <Status
                type="error"
                isOpen={showError}
                onClose={() => setShowError(false)}
                message={errorMessage}
            />
            <Status
                type="warning"
                isOpen={showWarning}
                onClose={() => setShowWarning(false)}
                message={warningMessage}
            />
        </div>
    );
}

export default TechSupport;
