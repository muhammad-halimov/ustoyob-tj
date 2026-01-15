export interface User {
    id: number;
    email: string;
    name: string;
    surname: string;
    phone1: string;
    phone2: string;
}

export interface Message {
    id: number;
    text: string;
    image: string;
    author: User;
    createdAt?: string;
}

export interface Chat {
    id: number;
    messageAuthor: User;
    replyAuthor: User;
    message: Message[];
    lastMessage?: Message;
    unreadCount?: number;
}

export interface CreateChatRequest {
    messageAuthor: string; // IRI
    replyAuthor: string; // IRI
    message: {
        text: string;
        imageFile?: string;
        image?: string;
        author: string; // IRI
    }[];
}

export interface SendMessageRequest {
    text: string;
    imageFile?: string;
    image?: string;
    author: string; // IRI
}