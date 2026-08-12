import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type * as React from 'react';
import { useTranslation } from 'react-i18next';
import { IoSend, IoAttach, IoPricetagOutline, IoImages, IoBanOutline, IoPencilOutline } from 'react-icons/io5';
import styles from './TechSupportThread.module.scss';
import { universalApiRequest } from '../../../utils/apiUtils';
import { getUserData, isAdmin } from '../../../utils/authUtils';
import { getFormattedDateTime } from '../../../utils/timeUtils';
import { uploadPhotos, formatTechSupportImageUrl, formatTechSupportMessageImageUrl } from '../../../utils/imageUtils';
import { decodeHtmlEntities } from '../../../utils/textUtils';
import { getAppealReasons, getMyTechSupports } from '../../../utils/dataCacheUtils';
import { openMercureSource } from '../../../utils/mercureUtils';
import { useLanguageChange } from '../../../hooks';
import Grid, { type PhotoItem } from '../../../shared/ui/Photo/Grid';
import { Preview, usePreview } from '../../../shared/ui/Photo/Preview';
import { MediaSidebar } from '../../../shared/ui/Photo/MediaSidebar/MediaSidebar';
import { SelectSearch } from '../../../shared/ui/SelectSearch';
import { EditActions } from '../../profile/shared/ui/EditActions/EditActions';
import { EmptyState } from '../../../widgets/EmptyState';
import {
    STATUS_ICONS,
    PRIORITY_ICONS,
    TECH_SUPPORT_STATUSES,
    PRIORITY_KEYS,
    type AppealReason,
    type SupportTicket,
    type TechSupportMessage,
    type TechSupportStatus,
} from '../types';

interface TechSupportThreadProps {
    ticketId: number;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB — same cap as Chat's attach flow

/**
 * Message thread for a single tech-support ticket — a full-width ticket/reply view
 * (not a chat-bubble layout). The composer (attach icon + single-line input + send,
 * with the photo grid appearing only once something's attached) mirrors Chat.tsx's
 * `.chatInput` exactly, reusing the same `Grid` / `usePreview` + `Preview` / `uploadPhotos`
 * building blocks rather than reinventing them.
 * Not real-time (no SSE/polling) by design, unlike the full Chat page.
 */
function TechSupportThread({ ticketId }: TechSupportThreadProps) {
    const { t } = useTranslation('techSupport');
    const currentUserId = getUserData()?.id;
    // Admin-only ticket-fields editing (§11: PATCH accepts title/reason/priority/description/
    // status for admins, silently no-ops everything but `status` for the author).
    const isAdminUser = isAdmin();

    const [ticket, setTicket] = useState<SupportTicket | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    // `ticket.reason.title` comes embedded in the ticket response and doesn't seem to respect
    // ?locale= the way a direct GET /api/appeal-reasons?locale= does — look the title up by id
    // from that (correctly locale-fetched, cached) list instead, same fix as the tickets table.
    const [reasonTitleById, setReasonTitleById] = useState<Map<number, string>>(new Map());
    // Scoped list for the admin edit dropdown — only `applicableTo=support` reasons are valid
    // choices when editing (same restriction as the create form's picker in TechSupport.tsx).
    // Separate from `reasonTitleById` above, which stays unscoped on purpose to resolve
    // *display* titles for tickets that may carry a non-support reason from elsewhere.
    const [supportReasons, setSupportReasons] = useState<AppealReason[]>([]);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [message, setMessage] = useState('');
    const [photos, setPhotos] = useState<PhotoItem[]>([]);
    const [isSending, setIsSending] = useState(false);
    const [isMediaOpen, setIsMediaOpen] = useState(false);
    const composePreviewUrls = photos.filter((p): p is Extract<PhotoItem, { type: 'new' }> => p.type === 'new').map(p => p.previewUrl);
    const composeGallery = usePreview({ images: composePreviewUrls });

    // Admin edit mode — title/description/reason/priority/status, populated from `ticket` on entry.
    const [isEditingTicket, setIsEditingTicket] = useState(false);
    const [isSavingTicket, setIsSavingTicket] = useState(false);
    const [editTitle, setEditTitle] = useState('');
    const [editDescription, setEditDescription] = useState('');
    const [editReasonIri, setEditReasonIri] = useState('');
    const [editPriority, setEditPriority] = useState('');
    const [editStatus, setEditStatus] = useState('');

    // Marks every unread reply on this ticket as read server-side (§11: `author != caller &&
    // readAt == null`). Fire-and-forget — a failure here just leaves the tickets-list bubble
    // stale until the next successful call, nothing in this view depends on the result.
    const markThreadRead = useCallback(() => {
        universalApiRequest(`/api/tech-supports/${ticketId}/read`, { method: 'POST', locale: false }).catch(() => {});
    }, [ticketId]);

    const fetchTicket = useCallback(async () => {
        try {
            setError('');
            const data: SupportTicket = await universalApiRequest(`/api/tech-supports/${ticketId}`);
            setTicket(data);
            // Viewing the thread marks everything currently in it as read — clears the
            // "new messages" bubble on the tickets list for this ticket.
            markThreadRead();
        } catch {
            setError(t('thread.loadError'));
        } finally {
            setIsLoading(false);
        }
    }, [ticketId, t, markThreadRead]);

    // Unfiltered — a ticket's `reason` isn't restricted to `applicableTo=support` server-side
    // (e.g. tickets created from a report/complaint flow can carry an "overall"-tagged reason),
    // so scoping this to just the support reasons would leave those ids unresolved.
    const fetchReasons = useCallback(async () => {
        try {
            const list = await getAppealReasons();
            setReasonTitleById(new Map(list.map(r => [r.id, r.title])));
        } catch {
            // Non-critical — falls back to the (possibly unlocalized) embedded ticket.reason.title.
        }
    }, []);

    const fetchSupportReasons = useCallback(async () => {
        if (!isAdminUser) return;
        try {
            const list = await getAppealReasons(undefined, 'applicableTo=support');
            setSupportReasons(list);
        } catch {
            // Non-critical — edit dropdown just stays empty until a retry succeeds.
        }
    }, [isAdminUser]);

    useEffect(() => {
        fetchTicket();
        fetchReasons();
        fetchSupportReasons();
    }, [fetchTicket, fetchReasons, fetchSupportReasons]);

    // ticket.reason.title (like Category/Occupation/etc.) is localized server-side — it
    // doesn't update just because i18next's UI strings do, so re-fetch on language switch.
    useLanguageChange(() => {
        fetchTicket();
        fetchReasons();
        fetchSupportReasons();
    });

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, [ticket?.messages?.length]);

    // Real-time delivery — subscribe to this ticket's private Mercure topic (§11) so
    // support replies show up instantly instead of waiting for a manual refresh.
    // Only "created" events are ever published (no edit/delete), so that's all we handle.
    useEffect(() => {
        let cancelled = false;
        let source: EventSource | null = null;

        (async () => {
            try {
                const { token } = await universalApiRequest(`/api/tech-supports/${ticketId}/subscribe`, { locale: false }) as { token: string | null };
                if (cancelled || !token) return;

                source = openMercureSource([`tech-support:${ticketId}`], token);
                source.onmessage = (event) => {
                    try {
                        const { type, data }: { type: string; data: TechSupportMessage } = JSON.parse(event.data);
                        if (type !== 'created') return;

                        setTicket(prev => {
                            if (!prev) return prev;
                            if ((prev.messages ?? []).some(m => m.id === data.id)) return prev;
                            return { ...prev, messages: [...(prev.messages ?? []), data] };
                        });
                        // Thread is open — the incoming message is read the moment it arrives.
                        // (No-op server-side if it happens to be our own echoed-back message.)
                        markThreadRead();
                    } catch {
                        // ignore malformed events
                    }
                };
            } catch {
                // Real-time is a progressive enhancement — sending/refetching still works without it.
            }
        })();

        return () => {
            cancelled = true;
            source?.close();
        };
    }, [ticketId, markThreadRead]);

    const triggerFileInput = () => fileInputRef.current?.click();

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            const newItems: PhotoItem[] = Array.from(files)
                .filter(file => file.type.startsWith('image/') && file.size <= MAX_FILE_SIZE)
                .map(file => ({ type: 'new' as const, file, previewUrl: URL.createObjectURL(file) }));
            setPhotos(prev => [...prev, ...newItems]);
        }
        e.target.value = '';
    };

    const handleSend = async () => {
        const text = message.trim();
        if ((!text && photos.length === 0) || isSending || !canReply) return;
        setIsSending(true);
        try {
            const body: Record<string, string> = { techSupport: `/api/tech-supports/${ticketId}` };
            if (text) body.description = text;

            const result: TechSupportMessage = await universalApiRequest('/api/tech-support-messages', {
                method: 'POST',
                body,
            });

            const newFiles = photos.filter((p): p is Extract<PhotoItem, { type: 'new' }> => p.type === 'new').map(p => p.file);
            if (newFiles.length > 0 && result?.id) {
                try {
                    await uploadPhotos('tech-support-messages', result.id, newFiles);
                } catch {
                    // Photo upload failures are non-critical
                }
            }

            setMessage('');
            setPhotos([]);
            await fetchTicket();
        } catch {
            setError(t('thread.sendError'));
        } finally {
            setIsSending(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleSend();
        }
    };

    // Normalized defensively in case the API ever sends different casing than our
    // 'new'|'renewed'|'in_progress'|'resolved'|'closed' assumption — otherwise the status
    // badge would silently get neither its color/icon nor its translation.
    const statusKey = ticket?.status ? (ticket.status.toLowerCase() as TechSupportStatus) : null;
    const statusLabel = statusKey && ticket?.status ? t(`myTickets.statuses.${statusKey}`, ticket.status) : '';
    const StatusIcon = statusKey ? STATUS_ICONS[statusKey] : null;
    const priorityKey = ticket?.priority != null ? String(ticket.priority) : null;
    const PriorityIcon = priorityKey ? PRIORITY_ICONS[priorityKey] : null;
    const administrantName = ticket?.administrant
        ? `${ticket.administrant.surname ?? ''} ${ticket.administrant.name ?? ''}`.trim()
        : '';
    // Terminal status — API_REFERENCE.md §11: author/guest posting is 403'd server-side once
    // banned, so the composer is replaced with a read-only notice. Admins are exempt — they're
    // the only ones still allowed to post messages/images on a banned ticket per the same doc.
    const isBanned = statusKey === 'banned';
    const canReply = !isBanned || isAdminUser;

    // Current user's own name, for "имя (роль)" labels on your own replies — getUserData()
    // returns the full cached profile, not just the id.
    const myName = useMemo(() => {
        const me = getUserData();
        return me ? `${me.surname ?? ''} ${me.name ?? ''}`.trim() : '';
    }, []);

    // Admin ticket-fields editing — option lists. Category is scoped to `applicableTo=support`
    // (see `fetchSupportReasons`), same restriction as the create form's picker — a ticket's
    // *current* reason may still be a non-support one inherited from elsewhere, in which case
    // it just won't appear pre-selected here unless changed. Priority/status come from the
    // shared constants (types.ts) that back the create form / tickets-table filters.
    const reasonEditOptions = useMemo(
        () => supportReasons.map(r => ({ value: `/api/appeal-reasons/${r.id}`, label: r.title })),
        [supportReasons],
    );
    const priorityEditOptions = useMemo(
        () => PRIORITY_KEYS.map(k => ({ value: k, label: t(`priority.${k}`) })),
        [t],
    );
    const statusEditOptions = useMemo(
        () => TECH_SUPPORT_STATUSES.map(s => ({ value: s, label: t(`myTickets.statuses.${s}`) })),
        [t],
    );

    const startEditTicket = () => {
        if (!ticket) return;
        setEditTitle(ticket.title ?? '');
        setEditDescription(ticket.description ?? '');
        setEditReasonIri(ticket.reason?.id != null ? `/api/appeal-reasons/${ticket.reason.id}` : '');
        setEditPriority(ticket.priority != null ? String(ticket.priority) : '');
        setEditStatus(statusKey ?? '');
        setIsEditingTicket(true);
    };

    const cancelEditTicket = () => setIsEditingTicket(false);

    const saveEditTicket = async () => {
        setIsSavingTicket(true);
        try {
            await universalApiRequest(`/api/tech-supports/${ticketId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/merge-patch+json' },
                body: {
                    title: editTitle.trim(),
                    description: editDescription.trim(),
                    ...(editReasonIri ? { reason: editReasonIri } : {}),
                    ...(editPriority ? { priority: editPriority } : {}),
                    ...(editStatus ? { status: editStatus } : {}),
                },
                locale: false,
            });
            await fetchTicket();
            // The cached "my tickets" / admin "all tickets" list is now stale — next visit
            // should see the edit instead of the snapshot from before it.
            getMyTechSupports.clearCache();
            setIsEditingTicket(false);
        } catch {
            setError(t('thread.editError'));
        } finally {
            setIsSavingTicket(false);
        }
    };

    // Flattened list of every already-uploaded image in the thread (original request +
    // each message — two different upload folders, see imageUtils.ts) — feeds both the
    // full-screen gallery and the MediaSidebar thumbnail panel, so clicking any sent
    // attachment (inline or from the sidebar) opens the gallery at the right position.
    const sentImages = useMemo(() => {
        if (!ticket) return [];
        const items: { id: number; url: string }[] = (ticket.images ?? []).map(img => ({ id: img.id, url: formatTechSupportImageUrl(img.image) }));
        (ticket.messages ?? []).forEach(m => (m.images ?? []).forEach(img => items.push({ id: img.id, url: formatTechSupportMessageImageUrl(img.image) })));
        return items;
    }, [ticket]);
    const sentImageUrls = useMemo(() => sentImages.map(img => img.url), [sentImages]);
    const sentGallery = usePreview({ images: sentImageUrls });
    const openSentImage = (url: string) => {
        const index = sentImageUrls.indexOf(url);
        sentGallery.openGallery(index >= 0 ? index : 0);
    };

    return (
        <div className={styles.thread}>
            <div className={styles.threadHeader}>
                {ticket && (
                    <div className={styles.threadHeaderInfo}>
                        {isEditingTicket ? (
                            <input
                                type="text"
                                className={styles.editTitleInput}
                                value={editTitle}
                                onChange={e => setEditTitle(e.target.value)}
                                placeholder={t('form.titlePlaceholder')}
                                disabled={isSavingTicket}
                            />
                        ) : (
                            <h2 className={styles.threadTitle}>{ticket.title || t('myTickets.noTitle')}</h2>
                        )}
                        <div className={styles.threadMeta}>
                            {isEditingTicket ? (
                                <>
                                    <div className={styles.editField}>
                                        <SelectSearch
                                            options={statusEditOptions}
                                            value={editStatus}
                                            onChange={setEditStatus}
                                            placeholder={t('myTickets.table.status')}
                                            disabled={isSavingTicket}
                                        />
                                    </div>
                                    <div className={styles.editField}>
                                        <SelectSearch
                                            options={priorityEditOptions}
                                            value={editPriority}
                                            onChange={setEditPriority}
                                            placeholder={t('myTickets.table.priority')}
                                            disabled={isSavingTicket}
                                        />
                                    </div>
                                    <div className={styles.editField}>
                                        <SelectSearch
                                            options={reasonEditOptions}
                                            value={editReasonIri}
                                            onChange={setEditReasonIri}
                                            placeholder={t('myTickets.table.category')}
                                            disabled={isSavingTicket}
                                        />
                                    </div>
                                </>
                            ) : (
                                <>
                                    {statusKey && (
                                        <span className={`${styles.badge} ${styles.statusBadge} ${styles[`status_${statusKey}`] ?? ''}`}>
                                            {StatusIcon && <StatusIcon />}
                                            {statusLabel}
                                        </span>
                                    )}
                                    {priorityKey && (
                                        <span className={`${styles.badge} ${styles.statusBadge} ${styles[`priority_${priorityKey}`] ?? ''}`}>
                                            {PriorityIcon && <PriorityIcon />}
                                            {t(`priority.${priorityKey}`)}
                                        </span>
                                    )}
                                    {(() => {
                                        const reasonTitle = (ticket.reason?.id != null ? reasonTitleById.get(ticket.reason.id) : undefined) ?? ticket.reason?.title;
                                        return reasonTitle && (
                                            <span className={`${styles.badge} ${styles.statusBadge}`}>
                                                <IoPricetagOutline />
                                                {reasonTitle}
                                            </span>
                                        );
                                    })()}
                                    {administrantName && (
                                        <span className={styles.reasonTag}>{t('thread.support')}: {administrantName}</span>
                                    )}
                                </>
                            )}

                            <div className={styles.threadMetaActions}>
                                {sentImages.length > 0 && (
                                    <button
                                        type="button"
                                        className={styles.mediaToggleBtn}
                                        onClick={() => setIsMediaOpen(prev => !prev)}
                                        aria-label={`${t('thread.media')} (${sentImages.length})`}
                                        title={`${t('thread.media')} (${sentImages.length})`}
                                    >
                                        <IoImages />
                                        <span>{sentImages.length}</span>
                                    </button>
                                )}
                                {isAdminUser && (
                                    isEditingTicket ? (
                                        <EditActions
                                            onSave={saveEditTicket}
                                            onCancel={cancelEditTicket}
                                            saveDisabled={isSavingTicket}
                                        />
                                    ) : (
                                        <button
                                            type="button"
                                            className={styles.mediaToggleBtn}
                                            onClick={startEditTicket}
                                            aria-label={t('thread.editTicket')}
                                            title={t('thread.editTicket')}
                                        >
                                            <IoPencilOutline />
                                        </button>
                                    )
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {isLoading ? (
                <EmptyState isLoading />
            ) : !ticket ? (
                <EmptyState title={error || t('thread.loadError')} onRefresh={fetchTicket} />
            ) : (
                <>
                    <div className={styles.threadBody}>
                    <div className={styles.messages}>
                        <div className={styles.message}>
                            <div className={styles.messageHeader}>
                                <span className={styles.messageAuthorName}>{t('thread.originalRequest')}</span>
                                <span className={styles.messageTime}>{getFormattedDateTime(ticket.createdAt)}</span>
                            </div>
                            {isEditingTicket ? (
                                <textarea
                                    className={styles.editTextarea}
                                    value={editDescription}
                                    onChange={e => setEditDescription(e.target.value)}
                                    placeholder={t('form.descriptionPlaceholder')}
                                    rows={4}
                                    disabled={isSavingTicket}
                                />
                            ) : (
                                <div className={styles.messageBody}>{decodeHtmlEntities(ticket.description)}</div>
                            )}
                            {(ticket.images ?? []).length > 0 && (
                                <div className={styles.messageImages}>
                                    {ticket.images!.map(img => {
                                        const url = formatTechSupportImageUrl(img.image);
                                        return (
                                            <img
                                                key={img.id}
                                                src={url}
                                                alt=""
                                                className={styles.messageImage}
                                                onClick={() => openSentImage(url)}
                                            />
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {(ticket.messages ?? []).map(msg => {
                            const isMine = !!currentUserId && msg.author?.id === currentUserId;
                            const authorName = msg.author
                                ? `${msg.author.surname ?? ''} ${msg.author.name ?? ''}`.trim()
                                : '';
                            // Name shown next to the role, not instead of it — falls back to
                            // just the role label when the name isn't known.
                            const authorLabel = isMine
                                ? (myName ? `${myName} (${t('thread.you')})` : t('thread.you'))
                                : (authorName ? `${authorName} (${t('thread.support')})` : t('thread.support'));

                            return (
                                <div key={msg.id} className={`${styles.message} ${isMine ? styles.messageMine : styles.messageSupport}`}>
                                    <div className={styles.messageHeader}>
                                        <span className={styles.messageAuthorName}>{authorLabel}</span>
                                        <span className={styles.messageTime}>{getFormattedDateTime(msg.createdAt)}</span>
                                    </div>
                                    {msg.description && <div className={styles.messageBody}>{decodeHtmlEntities(msg.description)}</div>}
                                    {(msg.images ?? []).length > 0 && (
                                        <div className={styles.messageImages}>
                                            {msg.images.map(img => {
                                                const url = formatTechSupportMessageImageUrl(img.image);
                                                return (
                                                    <img
                                                        key={img.id}
                                                        src={url}
                                                        alt=""
                                                        className={styles.messageImage}
                                                        onClick={() => openSentImage(url)}
                                                    />
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        })}

                        {(ticket.messages ?? []).length === 0 && (
                            <div className={styles.noMessages}>{t('thread.noMessages')}</div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    <MediaSidebar
                        images={sentImages}
                        isOpen={isMediaOpen}
                        onClose={() => setIsMediaOpen(false)}
                        onOpenGallery={index => sentGallery.openGallery(index)}
                        title={`${t('thread.media')} (${sentImages.length})`}
                        galleryButtonLabel={t('thread.openGallery')}
                        thumbnailAlt={index => t('thread.mediaThumbnail', { index: index + 1 })}
                        className={styles.mediaSidebar}
                    />
                    </div>

                    {error && <div className={styles.threadError}>{error}</div>}

                    {isBanned && (
                        <div className={styles.bannedNotice}>
                            <IoBanOutline />
                            <span>{isAdminUser ? t('thread.bannedNoticeAdmin') : t('thread.bannedNotice')}</span>
                        </div>
                    )}

                    {canReply && (
                        <>
                            <input
                                type="file"
                                ref={fileInputRef}
                                style={{ display: 'none' }}
                                onChange={handleFileSelect}
                                multiple
                                accept="image/*"
                            />

                            <div className={styles.chatInput}>
                                <button
                                    type="button"
                                    className={styles.attachButton}
                                    onClick={triggerFileInput}
                                    disabled={isSending}
                                    aria-label={t('form.photosLabel')}
                                >
                                    <IoAttach />
                                </button>

                                <input
                                    type="text"
                                    placeholder={t('thread.placeholder')}
                                    className={styles.inputField}
                                    value={message}
                                    onChange={e => setMessage(e.target.value)}
                                    onKeyPress={handleKeyPress}
                                    disabled={isSending}
                                />

                                <button
                                    type="button"
                                    className={styles.sendBtn}
                                    onClick={handleSend}
                                    disabled={isSending || (!message.trim() && photos.length === 0)}
                                    aria-label={t('thread.send')}
                                >
                                    <IoSend />
                                </button>
                            </div>

                            {photos.length > 0 && (
                                <Grid
                                    photos={photos}
                                    onChange={setPhotos}
                                    getImageUrl={formatTechSupportMessageImageUrl}
                                    onClickPhoto={index => composeGallery.openGallery(index)}
                                    inputId="ts-thread-compose-photos"
                                    photoAlt={t('form.photoAlt')}
                                    disabled={isSending}
                                />
                            )}
                        </>
                    )}
                </>
            )}

            <Preview
                isOpen={composeGallery.isOpen}
                images={composePreviewUrls}
                currentIndex={composeGallery.currentIndex}
                onClose={composeGallery.closeGallery}
                onNext={composeGallery.goToNext}
                onPrevious={composeGallery.goToPrevious}
                onSelectImage={composeGallery.selectImage}
            />
            <Preview
                isOpen={sentGallery.isOpen}
                images={sentImageUrls}
                currentIndex={sentGallery.currentIndex}
                onClose={sentGallery.closeGallery}
                onNext={sentGallery.goToNext}
                onPrevious={sentGallery.goToPrevious}
                onSelectImage={sentGallery.selectImage}
            />
        </div>
    );
}

export default TechSupportThread;
