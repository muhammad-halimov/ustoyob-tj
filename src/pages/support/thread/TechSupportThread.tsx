import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type * as React from 'react';
import { useTranslation } from 'react-i18next';
import { IoSend, IoAttach, IoPricetagOutline, IoImages, IoBanOutline, IoPencilOutline, IoPersonOutline, IoHeadsetOutline } from 'react-icons/io5';
import styles from './TechSupportThread.module.scss';
import { universalApiRequest } from '../../../utils/apiUtils';
import { getUserData, isAdmin } from '../../../utils/authUtils';
import { getFormattedDateTime } from '../../../utils/timeUtils';
import { uploadPhotos, formatTechSupportImageUrl, formatTechSupportMessageImageUrl } from '../../../utils/imageUtils';
import { decodeHtmlEntities } from '../../../utils/textUtils';
import { getAppealReasons, getMyTechSupports } from '../../../utils/dataCacheUtils';
import { openMercureSource } from '../../../utils/mercureUtils';
import { useLanguageChange } from '../../../hooks';
import Grid, { type PhotoItem, buildOrderedImagePayload } from '../../../shared/ui/Photo/Grid';
import { Preview, usePreview } from '../../../shared/ui/Photo/Preview';
import { MediaSidebar } from '../../../shared/ui/Photo/MediaSidebar/MediaSidebar';
import { SelectSearch } from '../../../shared/ui/SelectSearch';
import { Marquee } from '../../../shared/ui/Text/Marquee';
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
    /**
     * Fired every time the local `ticket` state changes (initial load, admin edit-save, a
     * reply auto-reopening a closed/resolved ticket, …) — lets the parent tickets table
     * (TechSupport.tsx) mirror the change into its own list state instantly, instead of
     * only finding out on its next full refetch.
     */
    onTicketChange?: (ticket: SupportTicket) => void;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB — same cap as Chat's attach flow

// Always chronological by `createdAt`, never by `updatedAt` — editing an old message (see
// `saveEditMessage`) bumps its `updatedAt`, and if that were ever used for ordering (a GET
// response isn't guaranteed to keep insertion order once a row's been touched) the edited
// message would jump to the bottom as if it were brand new. Chat.tsx sorts its own message
// list by `createdAt` for the same reason — mirrored here.
const sortMessagesByCreatedAt = (messages: TechSupportMessage[]): TechSupportMessage[] =>
    [...messages].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

/**
 * Message thread for a single tech-support ticket — a full-width ticket/reply view
 * (not a chat-bubble layout). The composer (attach icon + single-line input + send,
 * with the photo grid appearing only once something's attached) mirrors Chat.tsx's
 * `.chatInput` exactly, reusing the same `Grid` / `usePreview` + `Preview` / `uploadPhotos`
 * building blocks rather than reinventing them.
 * Not real-time (no SSE/polling) by design, unlike the full Chat page.
 */
function TechSupportThread({ ticketId, onTicketChange }: TechSupportThreadProps) {
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
    // Admin-only per §11 (author's PATCH silently no-ops every field but `status`) — lets the
    // original request's screenshots be pruned the same way title/description already can be.
    const [editImages, setEditImages] = useState<PhotoItem[]>([]);

    // Own-message edit mode (either side — whoever actually wrote the message, mirrors Chat's
    // isMine-gated edit) — text + photo removal for a single already-sent reply. Admins don't
    // get this (they don't touch other people's message text) — their reach over other
    // people's photos is MediaSidebar-only, see `sentImages`/`deleteSentImage` below.
    const [editingMessageId, setEditingMessageId] = useState<number | null>(null);
    const [isSavingMessage, setIsSavingMessage] = useState(false);
    const [editMessageText, setEditMessageText] = useState('');
    const [editMessagePhotos, setEditMessagePhotos] = useState<PhotoItem[]>([]);

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
            setTicket({ ...data, messages: sortMessagesByCreatedAt(data.messages ?? []) });
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

    // Mirrors every local ticket change straight back to the parent's tickets table (see
    // `onTicketChange` doc) — covers the initial load, admin edit-save, and the
    // reply-reopens-a-closed-ticket flow alike, since all three just update `ticket` here.
    useEffect(() => {
        if (ticket) onTicketChange?.(ticket);
    }, [ticket, onTicketChange]);

    // Real-time delivery — subscribe to this ticket's private Mercure topic (§11) so
    // support replies *and* status changes show up instantly instead of waiting for a manual
    // refresh. Two event types on this topic: "created" (new TechSupportMessage) and "updated"
    // (the TechSupport entity itself, fired only on an actual status change — admin action or
    // an author self-transition like resolved/closed → renewed). Editing/deleting a message,
    // or PATCHing non-status fields alone, emit nothing — those still rely on the explicit
    // refetch after saveEditTicket / marking read.
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
                        const { type, data } = JSON.parse(event.data) as { type: string; data: TechSupportMessage | SupportTicket };

                        if (type === 'created') {
                            const msg = data as TechSupportMessage;
                            setTicket(prev => {
                                if (!prev) return prev;
                                if ((prev.messages ?? []).some(m => m.id === msg.id)) return prev;
                                // Re-sorted, not just appended — SSE delivery order isn't
                                // guaranteed to match `createdAt` order under all conditions.
                                return { ...prev, messages: sortMessagesByCreatedAt([...(prev.messages ?? []), msg]) };
                            });
                            // Thread is open — the incoming message is read the moment it arrives.
                            // (No-op server-side if it happens to be our own echoed-back message.)
                            markThreadRead();
                        } else if (type === 'updated') {
                            // Full TechSupport payload — keep our own (possibly further-ahead,
                            // e.g. just-appended via "created" above) `messages` list instead of
                            // trusting whatever snapshot rode along with the status change.
                            const updated = data as SupportTicket;
                            setTicket(prev => (prev
                                ? { ...prev, ...updated, messages: prev.messages ?? sortMessagesByCreatedAt(updated.messages ?? []) }
                                : { ...updated, messages: sortMessagesByCreatedAt(updated.messages ?? []) }));
                        }
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

            // Replying to a closed/resolved ticket reopens it — either side (author or admin)
            // picking the conversation back up means it isn't actually settled anymore.
            if (statusKey === 'closed' || statusKey === 'resolved') {
                try {
                    await universalApiRequest(`/api/tech-supports/${ticketId}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/merge-patch+json' },
                        body: { status: 'renewed' },
                        locale: false,
                    });
                    getMyTechSupports.clearCache();
                } catch {
                    // Non-critical — the message itself already went through either way.
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
    const ticketAuthorName = ticket?.author
        ? `${ticket.author.surname ?? ''} ${ticket.author.name ?? ''}`.trim()
        : '';
    // Counterpart info shown next to status/priority/category: an author looking at their own
    // ticket cares who's handling it ("Исполнитель"), an admin cares who filed it ("Автор").
    const counterpartLabel = isAdminUser ? t('thread.authorRole') : t('thread.executorRole');
    const counterpartName = isAdminUser ? ticketAuthorName : administrantName;
    // Terminal status — API_REFERENCE.md §11: author/guest posting is 403'd server-side once
    // banned, so the composer is replaced with a read-only notice. Admins are exempt — they're
    // the only ones still allowed to post messages/images on a banned ticket per the same doc.
    const isBanned = statusKey === 'banned';
    const canReply = !isBanned || isAdminUser;

    // Current user's own name, prefixed onto "Имя (Вы - роль)" on your own replies —
    // getUserData() returns the full cached profile, not just the id.
    const myName = useMemo(() => {
        const me = getUserData();
        return me ? `${me.surname ?? ''} ${me.name ?? ''}`.trim() : '';
    }, []);

    // Per-message role, for the message-header label ("Имя (Исполнитель)" / "Имя (Автор)").
    // Matched against the ticket's own author/administrant ids rather than just mirroring the
    // opposite of the viewer's own role — a ticket can be replied to by more than one admin
    // account, so "not the ticket author" isn't reliably "the admin who's assigned to it".
    // Falls back to the binary assumption only when neither id is known (e.g. a stale/partial
    // ticket payload).
    const getMessageRole = useCallback((msgAuthorId?: number | null): 'admin' | 'author' | null => {
        if (msgAuthorId == null) return null;
        if (ticket?.author?.id === msgAuthorId) return 'author';
        if (ticket?.administrant?.id === msgAuthorId) return 'admin';
        return null;
    }, [ticket?.author?.id, ticket?.administrant?.id]);

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
        setEditImages((ticket.images ?? []).map(img => ({ type: 'existing' as const, id: img.id, image: img.image })));
        setIsEditingTicket(true);
    };

    const cancelEditTicket = () => setIsEditingTicket(false);

    const saveEditTicket = async () => {
        setIsSavingTicket(true);
        try {
            // New files first (so their ids exist server-side), then re-fetch the ticket's own
            // image list to learn those ids before computing what to keep/drop — same two-step
            // dance as Chat's message edit (upload → refetch → buildOrderedImagePayload).
            const newFiles = editImages.filter((p): p is Extract<PhotoItem, { type: 'new' }> => p.type === 'new').map(p => p.file);
            if (newFiles.length > 0) {
                try {
                    await uploadPhotos('tech-supports', ticketId, newFiles);
                } catch {
                    // Non-critical — the rest of the edit still saves either way.
                }
            }
            let currentImages: { id: number; image: string }[] = ticket?.images ?? [];
            if (newFiles.length > 0) {
                try {
                    const fresh: SupportTicket = await universalApiRequest(`/api/tech-supports/${ticketId}`, { locale: false });
                    currentImages = fresh.images ?? [];
                } catch {
                    // Falls back to the pre-upload snapshot — newly uploaded files just won't
                    // be prunable until the next edit in that (unlikely) case.
                }
            }
            const orderedImages = buildOrderedImagePayload(editImages, currentImages);

            await universalApiRequest(`/api/tech-supports/${ticketId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/merge-patch+json' },
                body: {
                    title: editTitle.trim(),
                    description: editDescription.trim(),
                    ...(editReasonIri ? { reason: editReasonIri } : {}),
                    ...(editPriority ? { priority: editPriority } : {}),
                    ...(editStatus ? { status: editStatus } : {}),
                    images: orderedImages,
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

    // Own-message edit — mirrors Chat's `editMessageOnServer`: whoever actually wrote the
    // reply (author or admin, whichever it was) can go back and drop an attached screenshot,
    // same "each side manages their own content" model as chat.
    const startEditMessage = (msg: TechSupportMessage) => {
        setEditMessageText(msg.description ?? '');
        setEditMessagePhotos((msg.images ?? []).map(img => ({ type: 'existing' as const, id: img.id, image: img.image })));
        setEditingMessageId(msg.id);
    };

    const cancelEditMessage = () => {
        setEditingMessageId(null);
        setEditMessagePhotos([]);
    };

    const saveEditMessage = async () => {
        if (editingMessageId == null) return;
        setIsSavingMessage(true);
        try {
            const newFiles = editMessagePhotos.filter((p): p is Extract<PhotoItem, { type: 'new' }> => p.type === 'new').map(p => p.file);
            if (newFiles.length > 0) {
                try {
                    await uploadPhotos('tech-support-messages', editingMessageId, newFiles);
                } catch {
                    // Non-critical — text/photo removal below still saves either way.
                }
            }

            const existingBeforeSave = ticket?.messages?.find(m => m.id === editingMessageId)?.images ?? [];
            let currentImages: { id: number; image: string }[] = existingBeforeSave;
            if (newFiles.length > 0) {
                try {
                    const fresh: TechSupportMessage = await universalApiRequest(`/api/tech-support-messages/${editingMessageId}`, { locale: false });
                    currentImages = fresh.images ?? [];
                } catch {
                    // Falls back to the pre-upload snapshot — newly uploaded files just won't
                    // be prunable until the next edit in that (unlikely) case.
                }
            }
            const orderedImages = buildOrderedImagePayload(editMessagePhotos, currentImages);

            await universalApiRequest(`/api/tech-support-messages/${editingMessageId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/merge-patch+json' },
                body: { description: editMessageText.trim(), images: orderedImages },
                locale: false,
            });
            await fetchTicket();
            cancelEditMessage();
        } catch {
            setError(t('thread.editError'));
        } finally {
            setIsSavingMessage(false);
        }
    };

    // Flattened list of every already-uploaded image in the thread (original request +
    // each message — two different upload folders, see imageUtils.ts) — feeds both the
    // full-screen gallery and the MediaSidebar thumbnail panel, so clicking any sent
    // attachment (inline or from the sidebar) opens the gallery at the right position.
    // Each item also carries where it came from + whether the viewer may delete it straight
    // from the sidebar (see `deleteSentImage`). Admins can drop anything, anywhere in the
    // thread (§11: they're the moderators here) — ticket-level images only for an admin
    // either way, since author's PATCH silently no-ops `images` regardless. A non-admin can
    // only delete images off their own messages, same "each side manages their own" rule as
    // the inline per-message edit pencil.
    type SentImageSource = { type: 'ticket' } | { type: 'message'; messageId: number };
    const sentImages = useMemo(() => {
        if (!ticket) return [];
        const items: { id: number; url: string; deletable: boolean; source: SentImageSource }[] =
            (ticket.images ?? []).map(img => ({ id: img.id, url: formatTechSupportImageUrl(img.image), deletable: isAdminUser, source: { type: 'ticket' } }));
        (ticket.messages ?? []).forEach(m => {
            const mine = !!currentUserId && m.author?.id === currentUserId;
            (m.images ?? []).forEach(img => items.push({ id: img.id, url: formatTechSupportMessageImageUrl(img.image), deletable: isAdminUser || mine, source: { type: 'message', messageId: m.id } }));
        });
        return items;
    }, [ticket, isAdminUser, currentUserId]);
    const sentImageUrls = useMemo(() => sentImages.map(img => img.url), [sentImages]);
    const sentGallery = usePreview({ images: sentImageUrls });
    const openSentImage = (url: string) => {
        const index = sentImageUrls.indexOf(url);
        sentGallery.openGallery(index >= 0 ? index : 0);
    };

    // One-off delete straight from the sidebar (no need to enter the full inline edit mode
    // just to drop a single screenshot). Takes a plain MediaSidebarImage (that's the shared
    // component's callback shape) and looks its `source` back up from `sentImages` by id,
    // rather than widening MediaSidebar's own type for one caller's needs.
    //
    // Two different mechanisms depending on who's deleting (§14/§15 of API_REFERENCE.md):
    // - Admin: `DELETE /api/multiple-images/{id}` — ROLE_ADMIN-only, no ownership check at
    //   all, deletes by the photo's own id regardless of which entity (ticket or *any*
    //   message, even one the admin didn't write) owns it. This is what actually makes
    //   "admin deletes any photo" work — the PATCH-with-remaining-images route below is
    //   restricted to the entity's own author/participant, so an admin PATCHing someone
    //   else's message to prune its images 403s.
    // - Non-admin: PATCH-with-remaining-images on their own message, same mechanism as
    //   `saveEditMessage` — the only route available to them, and the only one that needs
    //   `source` at all now.
    const deleteSentImage = async (image: { id: number | string }) => {
        if (!ticket || !window.confirm(t('thread.deleteImageConfirm'))) return;
        try {
            if (isAdminUser) {
                await universalApiRequest(`/api/multiple-images/${image.id}`, { method: 'DELETE', locale: false });
            } else {
                const source = sentImages.find(i => i.id === image.id)?.source;
                if (!source || source.type !== 'message') return;
                const msg = ticket.messages?.find(m => m.id === source.messageId);
                const remaining = (msg?.images ?? []).filter(img => img.id !== image.id).map(img => ({ id: img.id, image: img.image }));
                await universalApiRequest(`/api/tech-support-messages/${source.messageId}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/merge-patch+json' },
                    body: { images: remaining },
                    locale: false,
                });
            }
            await fetchTicket();
            getMyTechSupports.clearCache();
        } catch {
            setError(t('thread.editError'));
        }
    };

    return (
        <div className={styles.thread}>
            <div className={styles.threadHeader}>
                {ticket && (
                    <div className={styles.threadHeaderInfo}>
                        {isEditingTicket ? (
                            <div className={styles.editTitleField} title={t('myTickets.table.title')}>
                                <span className={styles.editFieldLabel}>{t('myTickets.table.title')}</span>
                                <input
                                    type="text"
                                    className={styles.editTitleInput}
                                    value={editTitle}
                                    onChange={e => setEditTitle(e.target.value)}
                                    placeholder={t('form.titlePlaceholder')}
                                    disabled={isSavingTicket}
                                />
                            </div>
                        ) : (
                            <h2 className={styles.threadTitle}>
                                <Marquee text={ticket.title || t('myTickets.noTitle')} alwaysScroll threshold={16} />
                            </h2>
                        )}
                        <div className={styles.threadMeta}>
                            {isEditingTicket ? (
                                <>
                                    <div className={styles.editField} title={t('myTickets.table.status')}>
                                        <span className={styles.editFieldLabel}>{t('myTickets.table.status')}</span>
                                        <SelectSearch
                                            options={statusEditOptions}
                                            value={editStatus}
                                            onChange={setEditStatus}
                                            placeholder={t('myTickets.table.status')}
                                            disabled={isSavingTicket}
                                        />
                                    </div>
                                    <div className={styles.editField} title={t('myTickets.table.priority')}>
                                        <span className={styles.editFieldLabel}>{t('myTickets.table.priority')}</span>
                                        <SelectSearch
                                            options={priorityEditOptions}
                                            value={editPriority}
                                            onChange={setEditPriority}
                                            placeholder={t('myTickets.table.priority')}
                                            disabled={isSavingTicket}
                                        />
                                    </div>
                                    <div className={styles.editField} title={t('myTickets.table.category')}>
                                        <span className={styles.editFieldLabel}>{t('myTickets.table.category')}</span>
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
                                        <span
                                            className={`${styles.badge} ${styles.statusBadge} ${styles[`status_${statusKey}`] ?? ''}`}
                                            title={t('myTickets.table.status')}
                                        >
                                            {StatusIcon && <StatusIcon />}
                                            <span className={styles.badgeLabel}>{t('myTickets.table.status')}:</span>
                                            {statusLabel}
                                        </span>
                                    )}
                                    {priorityKey && (
                                        <span
                                            className={`${styles.badge} ${styles.statusBadge} ${styles[`priority_${priorityKey}`] ?? ''}`}
                                            title={t('myTickets.table.priority')}
                                        >
                                            {PriorityIcon && <PriorityIcon />}
                                            <span className={styles.badgeLabel}>{t('myTickets.table.priority')}:</span>
                                            {t(`priority.${priorityKey}`)}
                                        </span>
                                    )}
                                    {(() => {
                                        const reasonTitle = (ticket.reason?.id != null ? reasonTitleById.get(ticket.reason.id) : undefined) ?? ticket.reason?.title;
                                        return reasonTitle && (
                                            <span className={`${styles.badge} ${styles.statusBadge}`} title={t('myTickets.table.category')}>
                                                <IoPricetagOutline />
                                                <span className={styles.badgeLabel}>{t('myTickets.table.category')}:</span>
                                                <Marquee text={reasonTitle} className={styles.badgeMarquee} alwaysScroll threshold={16} />
                                            </span>
                                        );
                                    })()}
                                    {counterpartName && (
                                        <span className={`${styles.badge} ${styles.statusBadge}`} title={`${counterpartLabel}: ${counterpartName}`}>
                                            {isAdminUser ? <IoPersonOutline /> : <IoHeadsetOutline />}
                                            <span className={styles.badgeLabel}>{counterpartLabel}:</span>
                                            <Marquee text={counterpartName} className={styles.badgeMarquee} alwaysScroll threshold={16} />
                                        </span>
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
                            {isEditingTicket ? (
                                <Grid
                                    photos={editImages}
                                    onChange={setEditImages}
                                    getImageUrl={formatTechSupportImageUrl}
                                    inputId="ts-thread-edit-ticket-photos"
                                    photoAlt={t('form.photoAlt')}
                                    disabled={isSavingTicket}
                                />
                            ) : (ticket.images ?? []).length > 0 && (
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
                            // Role by ticket membership (author/administrant id match), falling
                            // back to the binary "not me ⇒ the other side" guess only when that's
                            // unresolvable — see getMessageRole above.
                            const msgRole = getMessageRole(msg.author?.id) ?? (isMine
                                ? (isAdminUser ? 'admin' : 'author')
                                : (isAdminUser ? 'author' : 'admin'));
                            const RoleIcon = msgRole === 'admin' ? IoHeadsetOutline : IoPersonOutline;
                            // Name always shown, own messages just get the "Вы - роль" variant
                            // of the tag instead of the plain role name — "Админ Админов (Вы -
                            // исполнитель)", not a bare "Вы - исполнитель" with the name dropped.
                            const roleTag = isMine
                                ? (msgRole === 'admin' ? t('thread.youExecutor') : t('thread.youAuthor'))
                                : (msgRole === 'admin' ? t('thread.executorRole') : t('thread.authorRole'));
                            const displayName = isMine ? (myName || authorName) : authorName;
                            const authorLabel = displayName ? `${displayName} (${roleTag})` : roleTag;

                            const isEditingThisMessage = editingMessageId === msg.id;

                            return (
                                <div key={msg.id} className={`${styles.message} ${isMine ? styles.messageMine : styles.messageSupport}`}>
                                    <div className={styles.messageHeader}>
                                        <RoleIcon title={msgRole === 'admin' ? t('thread.executorRole') : t('thread.authorRole')} />
                                        <span className={styles.messageAuthorName}>
                                            <Marquee text={authorLabel} alwaysScroll threshold={16} />
                                        </span>
                                        <span className={styles.messageTime}>{getFormattedDateTime(msg.createdAt)}</span>
                                        {isMine && (
                                            isEditingThisMessage ? (
                                                <EditActions
                                                    onSave={saveEditMessage}
                                                    onCancel={cancelEditMessage}
                                                    saveDisabled={isSavingMessage}
                                                    className={styles.messageEditActions}
                                                />
                                            ) : (
                                                <button
                                                    type="button"
                                                    className={styles.messageEditBtn}
                                                    onClick={() => startEditMessage(msg)}
                                                    aria-label={t('thread.editMessage')}
                                                    title={t('thread.editMessage')}
                                                >
                                                    <IoPencilOutline />
                                                </button>
                                            )
                                        )}
                                    </div>
                                    {isEditingThisMessage ? (
                                        <>
                                            <textarea
                                                className={styles.editTextarea}
                                                value={editMessageText}
                                                onChange={e => setEditMessageText(e.target.value)}
                                                placeholder={t('thread.placeholder')}
                                                rows={3}
                                                disabled={isSavingMessage}
                                            />
                                            <Grid
                                                photos={editMessagePhotos}
                                                onChange={setEditMessagePhotos}
                                                getImageUrl={formatTechSupportMessageImageUrl}
                                                inputId={`ts-thread-edit-message-${msg.id}-photos`}
                                                photoAlt={t('form.photoAlt')}
                                                disabled={isSavingMessage}
                                            />
                                        </>
                                    ) : (
                                        <>
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
                                        </>
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
                        onDeleteImage={deleteSentImage}
                        deleteButtonLabel={t('thread.deleteImage')}
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
