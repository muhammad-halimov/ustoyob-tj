import { getAuthToken } from './auth';

const API_BASE_URL = 'https://admin.ustoyob.tj';

interface ChatCreateData {
    replyAuthor: string;
    ticket?: string;
}

interface Chat {
    id: number;
    author?: {
        id: number;
    };
    replyAuthor?: {
        id: number;
    };
}

export const createChatWithAuthor = async (authorId: number, ticketId?: number): Promise<Chat | null> => {
    try {
        const token = getAuthToken();
        if (!token) {
            console.error('No auth token');
            return null;
        }

        // Сначала проверяем существующие чаты
        console.log('Checking for existing chats with author:', authorId);
        const existingChats = await fetchUserChats(token);
        const existingChat = existingChats.find((chat: Chat) => {
            // Проверяем, что чат существует с этим пользователем (в любой роли)
            const isAuthor = chat.author?.id === authorId;
            const isReplyAuthor = chat.replyAuthor?.id === authorId;
            return isAuthor || isReplyAuthor;
        });

        if (existingChat) {
            console.log('Found existing chat:', existingChat.id);
            return existingChat;
        }

        // Если чата нет - создаем новый
        const chatData: ChatCreateData = {
            replyAuthor: `/api/users/${authorId}`
        };

        // Добавляем ticket только если он передан и является числом
        if (ticketId && typeof ticketId === 'number') {
            chatData.ticket = `/api/tickets/${ticketId}`;
        }

        console.log('Creating new chat with data:', chatData);

        const response = await fetch(`${API_BASE_URL}/api/chats`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(chatData)
        });

        if (response.ok) {
            const chat = await response.json();
            console.log('Chat created successfully:', chat);
            return chat;
        } else {
            const errorText = await response.text();
            console.error('Error creating chat:', response.status, errorText);

            // Дополнительная попытка найти чат после ошибки создания
            if (response.status === 422 || response.status === 400) {
                console.log('Double-checking for existing chats after creation error...');
                const recheckChats = await fetchUserChats(token);
                const recheckChat = recheckChats.find((chat: Chat) =>
                    chat.replyAuthor?.id === authorId || chat.author?.id === authorId
                );
                if (recheckChat) {
                    console.log('Found existing chat on recheck:', recheckChat);
                    return recheckChat;
                }
            }
            return null;
        }
    } catch (error) {
        console.error('Error creating chat:', error);
        return null;
    }
};

const fetchUserChats = async (token: string): Promise<Chat[]> => {
    try {
        const response = await fetch(`${API_BASE_URL}/api/chats/me`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
        });

        if (response.ok) {
            const chats = await response.json();
            console.log('Fetched user chats:', chats.length);
            return Array.isArray(chats) ? chats : [];
        } else {
            console.error('Error fetching chats:', response.status);
            return [];
        }
    } catch (error) {
        console.error('Error fetching user chats:', error);
        return [];
    }
};