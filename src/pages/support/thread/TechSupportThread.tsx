import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type * as React from 'react';
import { useTranslation } from 'react-i18next';
import { IoSend, IoAttach, IoPricetagOutline, IoImages, IoBanOutline, IoPencilOutline, IoPersonOutline, IoHeadsetOutline, IoTrashOutline } from 'react-icons/io5';
import styles from './TechSupportThread.module.scss';
import { universalApiRequest } from '../../../utils/apiUtils';
import { API_ROUTES } from '../../../app/routers/routes';
import { resolveApiError } from '../../../utils/appMessagesUtils';
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

// §11/§14: `images` on every one of these Patch DTOs (`TechSupportPatchInput`,
// `TechSupportMessagePatchInput`, and every other entity's) is documented as
// `{ image: string }[]` — filename only, matched/reordered/pruned by filename, no `id`
// anywhere in the shape. `buildOrderedImagePayload`'s `{ id, image }` return is convenient
// for the client-side PhotoItem bookkeeping (drag-reorder keys, dedup) but was going out on
// the wire as-is with the extra `id` — which is what was actually silently swallowing every
// photo add/remove here (title/description saved fine, images never did): strip it down to
// the documented shape right before it's sent.
const toImagePayload = (images: { image: string }[]): { image: string }[] =>
    images.map(({ image }) => ({ image }));

// Backend physically rejects PATCH /tech-support-messages/{id} past this window
// (`edit_window_expired`, 403) — 15 minutes from the message's own `createdAt`, same as
// ChatMessage. Hiding the pencil once it's expired avoids a "clicked it — turns out you
// can't" round trip; the server call would still 403 if this were ever bypassed. Doesn't
// gate delete (soft delete has no time limit) and doesn't replicate the separate
// `tech_support_message_edit_locked` rule (author locked out once the operator reacted) —
// that one's left to the server's own 403, surfaced via `resolveApiError`.
const MESSAGE_EDIT_WINDOW_MS = 15 * 60 * 1000;
const isWithinMessageEditWindow = (createdAt: string): boolean =>
    Date.now() - new Date(createdAt).getTime() < MESSAGE_EDIT_WINDOW_MS;

// §11: `title`/`description`/`images` on `PATCH /tech-supports/{id}` share the same
// isPastEditWindow() mechanism, but a 24h window (like Review's) instead of the message
// window above — and, unlike `reason`/`priority` (admin-only, no time limit), it applies
// equally to the author and an admin. Same "hide once it's expired" reasoning as the message
// pencil — the server would still 403 `edit_window_expired` if this were ever bypassed.
const TICKET_EDIT_WINDOW_MS = 24 * 60 * 60 * 1000;
const isWithinTicketEditWindow = (createdAt?: string): boolean =>
    !!createdAt && Date.now() - new Date(createdAt).getTime() < TICKET_EDIT_WINDOW_MS;

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
    // §11: PATCH /tech-supports/{id} — author gets `status` (state machine) + `title`/
    // `description`/`images` (24h edit window, see TICKET_EDIT_WINDOW_MS below); admin gets
    // all of that plus `reason`/`priority`, unrestricted by time. `isAdminUser` alone still
    // decides the reason/priority/status editing UI further down (see canEditTicket for the
    // combined "can this viewer open the ticket editor at all" gate).
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
    /** A 'created' SSE event for the other side's message can arrive before their images are
     *  attached (images upload separately, after the message itself is created) — this
     *  schedules one delayed `fetchTicket` to pick up any photos that land shortly after. */
    const messageImagesRefreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const [message, setMessage] = useState('');
    const [photos, setPhotos] = useState<PhotoItem[]>([]);
    const [isSending, setIsSending] = useState(false);
    const [isMediaOpen, setIsMediaOpen] = useState(false);
    const composePreviewUrls = photos.filter((p): p is Extract<PhotoItem, { type: 'new' }> => p.type === 'new').map(p => p.previewUrl);
    const composeGallery = usePreview({ images: composePreviewUrls });

    // Ticket edit mode — title/description/reason/priority/status, populated from `ticket` on
    // entry. Reachable by an admin any time, or the ticket's own author within the 24h window
    // (see canEditTicket) — reason/priority/status stay admin-only once inside, see the JSX.
    const [isEditingTicket, setIsEditingTicket] = useState(false);
    const [isSavingTicket, setIsSavingTicket] = useState(false);
    const [editTitle, setEditTitle] = useState('');
    const [editDescription, setEditDescription] = useState('');
    const [editReasonIri, setEditReasonIri] = useState('');
    const [editPriority, setEditPriority] = useState('');
    const [editStatus, setEditStatus] = useState('');
    // Available to whoever can open the editor at all (see canEditTicket) — lets the original
    // request's screenshots be pruned the same way title/description already can be.
    const [editImages, setEditImages] = useState<PhotoItem[]>([]);

    // Own-message edit mode (either side — whoever actually wrote the message, mirrors Chat's
    // isMine-gated edit) — text + photo removal for a single already-sent reply. Admins don't
    // get this (they don't touch other people's message text) — their reach over other
    // people's photos is MediaSidebar-only, see `sentImages`/`deleteSentImage` below.
    const [editingMessageId, setEditingMessageId] = useState<number | null>(null);
    const [isSavingMessage, setIsSavingMessage] = useState(false);
    const [editMessageText, setEditMessageText] = useState('');
    const [editMessagePhotos, setEditMessagePhotos] = useState<PhotoItem[]>([]);
    // Soft delete (§11) — author of the message, or any admin (moderation). In-flight id only
    // (no confirm-then-nothing state needed) — the button disables itself while its own call runs.
    const [deletingMessageId, setDeletingMessageId] = useState<number | null>(null);

    // Marks every unread reply on this ticket as read server-side (§11: `author != caller &&
    // readAt == null`). Fire-and-forget — a failure here just leaves the tickets-list bubble
    // stale until the next successful call, nothing in this view depends on the result.
    const markThreadRead = useCallback(() => {
        universalApiRequest(API_ROUTES.TECH_SUPPORT_READ(ticketId), { method: 'POST', locale: false }).catch(() => {});
    }, [ticketId]);

    const fetchTicket = useCallback(async () => {
        try {
            setError('');
            const data: SupportTicket = await universalApiRequest(API_ROUTES.TECH_SUPPORT_BY_ID(ticketId));
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
    // support replies, status changes, and the ticket's own photo set all show up instantly
    // instead of waiting for a manual refresh. Three event types on this topic: "created" (new
    // TechSupportMessage), "updated" (the TechSupport entity itself, fired only on an actual
    // status change — admin action or an author self-transition like resolved/closed →
    // renewed), and "images_updated" (the ticket's own — not a message's — photo set changed:
    // upload, PATCH-detach, or admin moderation delete). Editing/deleting a message's text, or
    // a message's own photos changing, still emit nothing (§11 explicitly excludes
    // TechSupportMessage photos from images_updated) — those still rely on the explicit
    // refetch after saveEditTicket / marking read / the delayed refetch below.
    useEffect(() => {
        let cancelled = false;
        let source: EventSource | null = null;

        (async () => {
            try {
                const { token } = await universalApiRequest(API_ROUTES.TECH_SUPPORT_SUBSCRIBE(ticketId), { locale: false }) as { token: string | null };
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
                            // Images upload separately, after the message itself is created — a
                            // reply from the other side can show up here before its photos do.
                            // Refetch shortly after to pick them up once they land (our own
                            // messages already self-heal via the explicit fetchTicket() in
                            // handleSend, so skip re-fetching for those).
                            if (msg.author?.id !== currentUserId) {
                                if (messageImagesRefreshTimeoutRef.current) clearTimeout(messageImagesRefreshTimeoutRef.current);
                                messageImagesRefreshTimeoutRef.current = setTimeout(() => {
                                    messageImagesRefreshTimeoutRef.current = null;
                                    fetchTicket();
                                }, 1800);
                            }
                        } else if (type === 'updated') {
                            // Full TechSupport payload — keep our own (possibly further-ahead,
                            // e.g. just-appended via "created" above) `messages` list instead of
                            // trusting whatever snapshot rode along with the status change.
                            const updated = data as SupportTicket;
                            setTicket(prev => (prev
                                ? { ...prev, ...updated, messages: prev.messages ?? sortMessagesByCreatedAt(updated.messages ?? []) }
                                : { ...updated, messages: sortMessagesByCreatedAt(updated.messages ?? []) }));
                        } else if (type === 'images_updated') {
                            // §11: the ticket's own photo set changed elsewhere (another
                            // viewer's upload/edit, or admin moderation) — only `images` is
                            // trustworthy off this event, everything else (esp. `messages`)
                            // stays exactly what we already have.
                            const updated = data as SupportTicket;
                            setTicket(prev => (prev ? { ...prev, images: updated.images ?? [] } : prev));
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
    }, [ticketId, markThreadRead, fetchTicket, currentUserId]);

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
            const body: Record<string, string> = { techSupport: API_ROUTES.TECH_SUPPORT_BY_ID(ticketId) };
            if (text) body.description = text;

            const result: TechSupportMessage = await universalApiRequest(API_ROUTES.TECH_SUPPORT_MESSAGES_CREATE, {
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
                    await universalApiRequest(API_ROUTES.TECH_SUPPORT_BY_ID(ticketId), {
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

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
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
    // §11: the ticket-content edit form (title/description/images, + reason/priority/status for
    // admins) — an admin can always open it (reason/priority/status aren't time-limited); the
    // author only gets it while the 24h content-edit window is still open. Past that, an author
    // has nothing left to change here — reopening a closed/resolved ticket already happens
    // automatically on reply (see handleSend), not through this form.
    const isTicketAuthor = !!currentUserId && !!ticket?.author && ticket.author.id === currentUserId;
    const isTicketEditWindowOpen = !!ticket && isWithinTicketEditWindow(ticket.createdAt);
    const canEditTicket = isAdminUser || (isTicketAuthor && isTicketEditWindowOpen);
    // title/description/images specifically are gated by the 24h window for *both* roles
    // (§11 — unlike reason/priority/status, which stay unrestricted for an admin). An admin
    // opening the editor on a ticket older than 24h still gets reason/priority/status, just
    // not these three — sending them anyway would 403 edit_window_expired even unchanged.
    const canEditTicketContent = isTicketEditWindowOpen;

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

    // §11, TechSupportMessage-only: once the operator has "reacted" to a message — read it
    // (`readAt` set) or posted anything afterward — the *appellant* (ticket author) is locked
    // out of editing/deleting its content, including its photos, via
    // ApiPatchTechSupportMessageController::checkOwnership (403 tech_support_message_edit_locked).
    // The administrant editing their own messages isn't subject to this. Predicting it
    // client-side (instead of only finding out from the 403) lets the pencil/delete controls
    // reflect it up front rather than looking like they silently do nothing.
    const isMessageLockedForAuthor = useCallback((msg: TechSupportMessage): boolean => {
        if (msg.readAt != null) return true;
        const msgTime = new Date(msg.createdAt).getTime();
        return (ticket?.messages ?? []).some(m =>
            getMessageRole(m.author?.id) === 'admin' && new Date(m.createdAt).getTime() > msgTime
        );
    }, [ticket?.messages, getMessageRole]);

    // Admin ticket-fields editing — option lists. Category is scoped to `applicableTo=support`
    // (see `fetchSupportReasons`), same restriction as the create form's picker — a ticket's
    // *current* reason may still be a non-support one inherited from elsewhere, in which case
    // it just won't appear pre-selected here unless changed. Priority/status come from the
    // shared constants (types.ts) that back the create form / tickets-table filters.
    const reasonEditOptions = useMemo(
        () => supportReasons.map(r => ({ value: API_ROUTES.APPEAL_REASON_BY_ID(r.id), label: r.title })),
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
        setEditReasonIri(ticket.reason?.id != null ? API_ROUTES.APPEAL_REASON_BY_ID(ticket.reason.id) : '');
        setEditPriority(ticket.priority != null ? String(ticket.priority) : '');
        setEditStatus(statusKey ?? '');
        setEditImages((ticket.images ?? []).map(img => ({ type: 'existing' as const, id: img.id, image: img.image })));
        setIsEditingTicket(true);
    };

    const cancelEditTicket = () => setIsEditingTicket(false);

    const saveEditTicket = async () => {
        setIsSavingTicket(true);
        try {
            // title/description/images only get touched — let alone sent — while the 24h
            // window is open; past it they're not even rendered as inputs (see the JSX), and
            // sending them anyway (even unchanged) would 403 edit_window_expired for both
            // roles. An admin past the window can still be here for reason/priority/status.
            let orderedImages: { id: number; image: string }[] | null = null;
            if (canEditTicketContent) {
                // New files first (so their ids exist server-side), then re-fetch the
                // ticket's own image list to learn those ids before computing what to
                // keep/drop — same two-step dance as Chat's message edit (upload → refetch →
                // buildOrderedImagePayload).
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
                        const fresh: SupportTicket = await universalApiRequest(API_ROUTES.TECH_SUPPORT_BY_ID(ticketId), { locale: false });
                        currentImages = fresh.images ?? [];
                    } catch {
                        // Falls back to the pre-upload snapshot — newly uploaded files just won't
                        // be prunable until the next edit in that (unlikely) case.
                    }
                }
                orderedImages = buildOrderedImagePayload(editImages, currentImages);
            }

            await universalApiRequest(API_ROUTES.TECH_SUPPORT_BY_ID(ticketId), {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/merge-patch+json' },
                body: {
                    ...(canEditTicketContent ? {
                        title: editTitle.trim(),
                        description: editDescription.trim(),
                        images: toImagePayload(orderedImages ?? []),
                    } : {}),
                    // reason/priority stay admin-only (§11) — the author's edit form doesn't
                    // even render these fields (see isEditingTicket && isAdminUser below), so
                    // editReasonIri/editPriority would just be echoing back the unchanged
                    // ticket values for them; skip sending either to be explicit about it.
                    ...(isAdminUser && editReasonIri ? { reason: editReasonIri } : {}),
                    ...(isAdminUser && editPriority ? { priority: editPriority } : {}),
                    // Only sent when it's an actual transition — resending the current value
                    // isn't a "change" the state machine needs to see, and an author is only
                    // allowed the resolved/closed → renewed self-transition anyway (§11);
                    // anything else from them 403s (extra_denied).
                    ...(editStatus && editStatus !== statusKey ? { status: editStatus } : {}),
                },
                locale: false,
            });
            await fetchTicket();
            // The cached "my tickets" / admin "all tickets" list is now stale — next visit
            // should see the edit instead of the snapshot from before it.
            getMyTechSupports.clearCache();
            setIsEditingTicket(false);
        } catch (err) {
            // Surfaces the specific reason (e.g. edit_window_expired past the 24h mark, or
            // extra_denied on a disallowed status transition) instead of one flat failure —
            // same as saveEditMessage below.
            setError(resolveApiError(err, t('thread.editError')));
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

        // Saving with no text and no photos left would produce a genuinely empty message —
        // a ghost bubble with nothing in it. Offer to delete the message outright instead of
        // silently letting that PATCH through.
        if (!editMessageText.trim() && editMessagePhotos.length === 0) {
            if (window.confirm(t('thread.emptyMessagePhotoDeleteConfirm'))) {
                const idToDelete = editingMessageId;
                cancelEditMessage();
                await deleteMessage(idToDelete, true);
            }
            return;
        }

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
                    const fresh: TechSupportMessage = await universalApiRequest(API_ROUTES.TECH_SUPPORT_MESSAGE_BY_ID(editingMessageId), { locale: false });
                    currentImages = fresh.images ?? [];
                } catch {
                    // Falls back to the pre-upload snapshot — newly uploaded files just won't
                    // be prunable until the next edit in that (unlikely) case.
                }
            }
            const orderedImages = buildOrderedImagePayload(editMessagePhotos, currentImages);

            await universalApiRequest(API_ROUTES.TECH_SUPPORT_MESSAGE_BY_ID(editingMessageId), {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/merge-patch+json' },
                body: { description: editMessageText.trim(), images: toImagePayload(orderedImages) },
                locale: false,
            });
            await fetchTicket();
            cancelEditMessage();
        } catch (err) {
            // Surfaces the specific reason instead of a generic failure — §11's shared edit
            // mechanism can 403/400/410 here (edit_window_expired, edit_too_different,
            // message_already_deleted, tech_support_message_edit_locked), each with its own
            // catalogue message via resolveApiError instead of one flat "couldn't save".
            setError(resolveApiError(err, t('thread.editError')));
        } finally {
            setIsSavingMessage(false);
        }
    };

    // Soft delete (§11) — the row survives server-side with `description` replaced by a fixed
    // placeholder and `images` cleared; `deletedByAuthor: true` is what the render below keys
    // off of instead of trusting that placeholder's text (kept out of the translation system).
    // Available to the message's own author, or any admin (moderation) — re-deleting an
    // already-deleted message is a no-op 204, so no extra guard needed against double-clicks
    // beyond disabling the button while one is in flight.
    const deleteMessage = async (messageId: number, skipConfirm = false) => {
        if (!skipConfirm && !window.confirm(t('thread.deleteMessageConfirm'))) return;
        setDeletingMessageId(messageId);
        try {
            await universalApiRequest(API_ROUTES.TECH_SUPPORT_MESSAGE_BY_ID(messageId), { method: 'DELETE', locale: false });
            await fetchTicket();
        } catch (err) {
            setError(resolveApiError(err, t('thread.deleteMessageError')));
        } finally {
            setDeletingMessageId(null);
        }
    };

    // Flattened list of every already-uploaded image in the thread (original request +
    // each message — two different upload folders, see imageUtils.ts) — feeds both the
    // full-screen gallery and the MediaSidebar thumbnail panel, so clicking any sent
    // attachment (inline or from the sidebar) opens the gallery at the right position.
    // Each item also carries where it came from + whether the viewer may delete it straight
    // from the sidebar (see `deleteSentImage`). Admins can drop anything, anywhere in the
    // thread (§11: they're the moderators here, and `images` isn't time-limited for them the
    // way title/description are — wait, it is now, see TICKET_EDIT_WINDOW_MS — but their
    // route is DELETE /multiple-images/{id}, which has no ownership/time check at all). The
    // ticket author can drop their own original-request photos while the 24h edit window is
    // open (§11: `images` shares that window), and drop images off their own messages same as
    // always — same "each side manages their own" rule as the inline per-message edit pencil.
    type SentImageSource = { type: 'ticket' } | { type: 'message'; messageId: number };
    const sentImages = useMemo(() => {
        if (!ticket) return [];
        const canDeleteTicketImages = isAdminUser || (isTicketAuthor && isTicketEditWindowOpen);
        const items: { id: number; url: string; deletable: boolean; source: SentImageSource }[] =
            (ticket.images ?? []).map(img => ({ id: img.id, url: formatTechSupportImageUrl(img.image), deletable: canDeleteTicketImages, source: { type: 'ticket' } }));
        (ticket.messages ?? []).forEach(m => {
            const mine = !!currentUserId && m.author?.id === currentUserId;
            // Same appellant-only operator-reacted lock as the inline edit pencil (§11) —
            // mirrored here so the sidebar's trash icon doesn't offer something the PATCH
            // would 403 tech_support_message_edit_locked on. isAdminUser bypasses it entirely
            // (the lock only ever gates the appellant, never the administrant).
            const deletableAsMine = mine && !isMessageLockedForAuthor(m);
            (m.images ?? []).forEach(img => items.push({ id: img.id, url: formatTechSupportMessageImageUrl(img.image), deletable: isAdminUser || deletableAsMine, source: { type: 'message', messageId: m.id } }));
        });
        return items;
    }, [ticket, isAdminUser, isTicketAuthor, isTicketEditWindowOpen, currentUserId, isMessageLockedForAuthor]);
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
    // Three different mechanisms depending on who's deleting and what (§11/§14/§15 of
    // API_REFERENCE.md):
    // - Admin: `DELETE /api/multiple-images/{id}` — ROLE_ADMIN-only, no ownership check at
    //   all, deletes by the photo's own id regardless of which entity (ticket or *any*
    //   message, even one the admin didn't write) owns it. This is what actually makes
    //   "admin deletes any photo" work — the PATCH-with-remaining-images routes below are
    //   restricted to the entity's own author/participant, so an admin PATCHing someone
    //   else's message (or a ticket they don't own) to prune its images 403s.
    // - Non-admin, ticket-level photo: PATCH-with-remaining-images on the ticket itself
    //   (`images` is part of `TechSupportPatchInput`, author-writable within the 24h edit
    //   window — same window `sentImages`' `deletable` flag already gates this on).
    // - Non-admin, message-level photo: PATCH-with-remaining-images on their own message,
    //   same mechanism as `saveEditMessage`.
    const deleteSentImage = async (image: { id: number | string }) => {
        if (!ticket) return;

        const source = sentImages.find(i => i.id === image.id)?.source;

        // Deleting the last photo off a message that already has no text would leave a
        // completely empty message behind — offer to delete the message outright instead of
        // producing that. Checked regardless of who's deleting (admin moderation shouldn't
        // orphan a message any more than the author removing their own last photo should).
        if (source?.type === 'message') {
            const msg = ticket.messages?.find(m => m.id === source.messageId);
            const hasText = !!msg?.description?.trim() && !msg.deletedByAuthor;
            const remainingCount = (msg?.images ?? []).filter(img => img.id !== image.id).length;
            if (!hasText && remainingCount === 0) {
                if (!window.confirm(t('thread.emptyMessagePhotoDeleteConfirm'))) return;
                await deleteMessage(source.messageId, true);
                return;
            }
        }

        if (!window.confirm(t('thread.deleteImageConfirm'))) return;
        try {
            if (isAdminUser) {
                await universalApiRequest(API_ROUTES.MULTIPLE_IMAGE_BY_ID(image.id), { method: 'DELETE', locale: false });
            } else {
                if (!source) return;
                if (source.type === 'ticket') {
                    const remaining = (ticket.images ?? []).filter(img => img.id !== image.id).map(img => ({ id: img.id, image: img.image }));
                    await universalApiRequest(API_ROUTES.TECH_SUPPORT_BY_ID(ticketId), {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/merge-patch+json' },
                        body: { images: toImagePayload(remaining) },
                        locale: false,
                    });
                } else {
                    const msg = ticket.messages?.find(m => m.id === source.messageId);
                    const remaining = (msg?.images ?? []).filter(img => img.id !== image.id).map(img => ({ id: img.id, image: img.image }));
                    await universalApiRequest(API_ROUTES.TECH_SUPPORT_MESSAGE_BY_ID(source.messageId), {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/merge-patch+json' },
                        body: { images: toImagePayload(remaining) },
                        locale: false,
                    });
                }
            }
            await fetchTicket();
            getMyTechSupports.clearCache();
        } catch (err) {
            setError(resolveApiError(err, t('thread.editError')));
        }
    };

    return (
        <div className={styles.thread}>
            <div className={styles.threadHeader}>
                {ticket && (
                    <div className={styles.threadHeaderInfo}>
                        {isEditingTicket && canEditTicketContent ? (
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
                            {/* reason/priority/status editing stays admin-only (§11, no time
                                limit for them) — an author editing within the 24h window still
                                sees these as the plain read-only badges below, just with an
                                editable title/description/images underneath. */}
                            {isEditingTicket && isAdminUser ? (
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
                                {canEditTicket && (
                                    isEditingTicket ? (
                                        <EditActions
                                            onSave={saveEditTicket}
                                            onCancel={cancelEditTicket}
                                            saveDisabled={isSavingTicket}
                                            inline
                                        />
                                    ) : (
                                        <button
                                            type="button"
                                            className={`${styles.mediaToggleBtn} ${styles.editToggleBtn}`}
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
                            {isEditingTicket && canEditTicketContent ? (
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
                            {isEditingTicket && canEditTicketContent ? (
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
                            const isDeleted = !!msg.deletedByAuthor;
                            const showEditButton = isMine && !isDeleted;
                            const isEditWindowExpired = !isWithinMessageEditWindow(msg.createdAt);
                            // Appellant-only lock (§11) — the administrant editing their own
                            // messages (isAdminUser, also covered by isMine when it's their own)
                            // isn't subject to this, only the ticket's own author.
                            const isLockedByOperator = !isAdminUser && isMine && isMessageLockedForAuthor(msg);
                            const canDeleteThisMessage = (isMine || isAdminUser) && !isDeleted;
                            const isDeletingThisMessage = deletingMessageId === msg.id;

                            return (
                                <div key={msg.id} className={`${styles.message} ${isMine ? styles.messageMine : styles.messageSupport}`}>
                                    <div className={styles.messageHeader}>
                                        <RoleIcon title={msgRole === 'admin' ? t('thread.executorRole') : t('thread.authorRole')} />
                                        <span className={styles.messageAuthorName}>
                                            <Marquee text={authorLabel} alwaysScroll threshold={16} />
                                        </span>
                                        <span className={styles.messageTime}>
                                            {getFormattedDateTime(msg.createdAt)}
                                            {!isDeleted && msg.edited && <span className={styles.editedMark}>{t('thread.edited')}</span>}
                                        </span>
                                        {isEditingThisMessage ? (
                                            <EditActions
                                                onSave={saveEditMessage}
                                                onCancel={cancelEditMessage}
                                                saveDisabled={isSavingMessage}
                                                className={styles.messageEditActions}
                                                inline
                                            />
                                        ) : (
                                            <>
                                                {showEditButton && (
                                                    <button
                                                        type="button"
                                                        className={styles.messageEditBtn}
                                                        onClick={() => startEditMessage(msg)}
                                                        disabled={isEditWindowExpired || isLockedByOperator}
                                                        aria-label={t('thread.editMessage')}
                                                        title={
                                                            isLockedByOperator ? t('thread.editLockedByOperator')
                                                                : isEditWindowExpired ? t('thread.editWindowExpired')
                                                                    : t('thread.editMessage')
                                                        }
                                                    >
                                                        <IoPencilOutline />
                                                    </button>
                                                )}
                                                {canDeleteThisMessage && (
                                                    <button
                                                        type="button"
                                                        className={styles.messageDeleteBtn}
                                                        onClick={() => deleteMessage(msg.id)}
                                                        disabled={isDeletingThisMessage}
                                                        aria-label={t('thread.deleteMessage')}
                                                        title={t('thread.deleteMessage')}
                                                    >
                                                        <IoTrashOutline />
                                                    </button>
                                                )}
                                            </>
                                        )}
                                    </div>
                                    {isDeleted ? (
                                        <div className={styles.messageDeletedBody}>{t('thread.messageDeleted')}</div>
                                    ) : isEditingThisMessage ? (
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

                                <SelectSearch
                                    altMode
                                    hideIcon
                                    options={[]}
                                    className={styles.inputField}
                                    placeholder={t('thread.placeholder')}
                                    value={message}
                                    onChange={setMessage}
                                    onKeyDown={handleKeyDown}
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
