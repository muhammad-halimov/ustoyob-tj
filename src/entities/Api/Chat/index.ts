import type { Image, Timestamps } from '../Misc';
import type { User } from '../User';
import type { Ticket } from '../Ticket';

/**
 * A single message inside a chat thread.
 * `readAt` is null until the recipient reads the message.
 * `replyTo` is non-null when the message is a threaded reply.
 */
export type ChatMessage = {
    id: number;
    description: string;
    author: User;
    chat?: { id: number } | null;
    readAt?: string | null;
    replyTo?: ChatMessage | null;
    images?: Image[];
} & Timestamps;

/**
 * A chat thread between `author` and `replyAuthor`.
 * Optionally linked to a ticket. `isArchived` is set when one party archives the thread.
 */
export type Chat = {
    id: number;
    author: User;
    replyAuthor: User;
    messages: ChatMessage[];
    ticket?: Ticket | null;
    active?: boolean;
    isArchived?: boolean;
    archivedBy?: User;
    archivedAt?: string;
    images?: Image[];
} & Timestamps;
