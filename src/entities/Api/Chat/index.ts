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
    images?: Image[];
} & Timestamps;

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
