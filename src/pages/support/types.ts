/**
 * Shared types for the Tech Support feature (form, tickets table, message thread).
 * Kept local to the page (not in `entities/`) since the backend doesn't expose
 * a dedicated Hydra type for TechSupport beyond what's used here — see API_REFERENCE.md §11.
 */

import type { ComponentType } from 'react';
import {
    IoAddCircleOutline,
    IoRefreshOutline,
    IoTimeOutline,
    IoCheckmarkCircleOutline,
    IoCloseCircleOutline,
    IoBanOutline,
    IoArrowDownCircleOutline,
    IoRemoveCircleOutline,
    IoArrowUpCircleOutline,
    IoAlertCircleOutline,
} from 'react-icons/io5';

export interface AppealReason {
    id: number;
    title: string;
}

export interface TechSupportAuthor {
    id: number;
    name: string | null;
    surname: string | null;
}

export interface TechSupportImage {
    id: number;
    image: string;
}

export interface TechSupportMessage {
    id: number;
    author: TechSupportAuthor | null;
    description: string | null;
    /** Set via POST /tech-supports/{id}/read. Marking read doesn't emit a Mercure event — see API_REFERENCE.md §11. */
    readAt?: string | null;
    images: TechSupportImage[];
    createdAt: string;
    updatedAt?: string | null;
}

/**
 * `TechSupport.STATUSES` per API_REFERENCE.md §11. `banned` is terminal and admin-only to
 * reach — once set, the ticket's author (and any guest) loses write access entirely
 * (`POST` on messages/images 403s server-side); the frontend mirrors that by making the
 * thread read-only, see TechSupportThread.
 */
export type TechSupportStatus = 'new' | 'renewed' | 'in_progress' | 'resolved' | 'closed' | 'banned';

export interface SupportTicket {
    id: number;
    title: string;
    description: string;
    priority: string;
    status?: TechSupportStatus;
    createdAt?: string;
    updatedAt?: string | null;
    reason?: { id?: number; title?: string };
    administrant?: TechSupportAuthor | null;
    author?: TechSupportAuthor | null;
    images?: TechSupportImage[];
    messages?: TechSupportMessage[];
    /** Present only in the POST /tech-supports response for guest (unauthenticated) tickets. */
    guestAccessToken?: string;
}

export const TECH_SUPPORT_STATUSES: TechSupportStatus[] = ['new', 'renewed', 'in_progress', 'resolved', 'closed', 'banned'];

// '1'..'4' — see TechSupport.PRIORITIES in API_REFERENCE.md §11. Shared between the create
// form's priority picker and the admin edit-ticket picker (TechSupportThread) so both stay in sync.
export const PRIORITY_KEYS = ['1', '2', '3', '4'] as const;

/** Shared between the tickets table and the thread header so both badge sets stay in sync. */
export const STATUS_ICONS: Record<TechSupportStatus, ComponentType> = {
    new: IoAddCircleOutline,
    renewed: IoRefreshOutline,
    in_progress: IoTimeOutline,
    resolved: IoCheckmarkCircleOutline,
    closed: IoCloseCircleOutline,
    banned: IoBanOutline,
};

// '1'..'4' — see TechSupport.PRIORITIES in API_REFERENCE.md §11.
export const PRIORITY_ICONS: Record<string, ComponentType> = {
    '1': IoArrowDownCircleOutline,
    '2': IoRemoveCircleOutline,
    '3': IoArrowUpCircleOutline,
    '4': IoAlertCircleOutline,
};

/**
 * A ticket's own `updatedAt` only moves when the TechSupport entity itself changes
 * (status/priority/title/…) — adding a reply creates a separate `TechSupportMessage`
 * row and doesn't touch it (see API_REFERENCE.md §11: messages only emit their own
 * Mercure event, nothing bumps the parent). So "last activity" for display/sort
 * purposes is whichever is more recent: the ticket's own `updatedAt`, or its latest
 * message's `createdAt`.
 */
export function getLastActivityAt(ticket: SupportTicket): string | undefined {
    const timestamps = [
        ticket.updatedAt,
        ...(ticket.messages ?? []).map(m => m.createdAt),
    ].filter((d): d is string => !!d);
    if (timestamps.length === 0) return undefined;
    return timestamps.reduce((latest, cur) => (new Date(cur) > new Date(latest) ? cur : latest));
}

/**
 * Count of replies from "the other side" not yet marked read — the title-row bubble on
 * My Tickets. Server-side truth (`TechSupportMessage.readAt`, set via POST /tech-supports/
 * {id}/read, API_REFERENCE.md §11) — "unread" mirrors the backend's own definition:
 * `author != caller && readAt == null`.
 */
export function getUnreadCount(ticket: SupportTicket, currentUserId?: number): number {
    if (!currentUserId) return 0;
    return (ticket.messages ?? []).filter(m => m.author?.id !== currentUserId && !m.readAt).length;
}
