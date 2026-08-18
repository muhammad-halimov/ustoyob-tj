import type { Image, Timestamps } from '../Misc';
import type { User } from '../User';
import type { Ticket } from '../Ticket';

export type ChatMessage = {
    id: number;
    description: string;
    author: User;
    chat?: { id: number } | null;
    readAt?: string | null;
    replyTo?: ChatMessage | null;
    /** True once PATCHed at least once — stays true forever after, never resets. */
    edited?: boolean;
    /** True after `DELETE /chat-messages/{id}` — soft delete, the row survives with
     *  `description` set to a server placeholder and `images` cleared. Render your own
     *  localized placeholder off this flag instead of trusting `description`'s text. */
    deletedByAuthor?: boolean;
    images?: Image[];
} & Timestamps;

export type Chat = {
    id: number;
    author: User;
    replyAuthor: User;
    // No `messages` field anymore — was a single unbounded array on the Chat entity itself,
    // now served separately (paginated, newest first) via `GET /api/chats/{id}/messages` —
    // see Chat.tsx's `fetchChatMessages`/`loadOlderMessages`. In its place, two fields the
    // backend now computes and keeps current server-side (never travel over Mercure — an SSE
    // event just means "refetch", see `startInboxSSE`):
    lastMessage?: ChatMessage | null;
    unreadCount?: number;
    ticket?: Ticket | null;
    active?: boolean;
    isArchived?: boolean;
    archivedBy?: User;
    archivedAt?: string;
    images?: Image[];
} & Timestamps;
