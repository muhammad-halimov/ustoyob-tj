import type { User } from '../../api';

/** Обработанный URL изображения чата для отображения */
export interface ChatImageView {
    id: number;
    imageUrl: string;
    thumbnailUrl?: string;
    author?: User | null;
    createdAt: string;
}

/** UI view-model сообщения (локальное состояние Chat.tsx) */
export interface ChatMessageView {
    id: number;
    sender: 'me' | 'other';
    name: string;
    text: string;
    time: string;
    type?: 'text' | 'image';
    imageUrl?: string;
    status?: 'pending' | 'uploading' | 'uploaded' | 'error';
    file?: File;
    progress?: number;
    isLocal?: boolean;
    createdAt?: string;
    replyTo?: { id: number; text: string; name: string };
    edited?: boolean;
    readAt?: string | null;
    images?: { id: number; url: string; name: string }[];
}
