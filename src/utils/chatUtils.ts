import { getAuthToken } from './auth';

const API_BASE_URL = 'https://admin.ustoyob.tj';

interface ChatCreateData {
    replyAuthor: string;
    ticket?: string;
}

export const createChatWithAuthor = async (authorId: number, ticketId?: number) => {
    try {
        const token = getAuthToken();
        if (!token) {
            console.error('No auth token');
            return null;
        }

        const chatData: ChatCreateData = {
            replyAuthor: `/api/users/${authorId}`
        };

        // Добавляем ticket только если он передан и является числом
        if (ticketId && typeof ticketId === 'number') {
            chatData.ticket = `/api/tickets/${ticketId}`;
        }

        console.log('Creating chat with data:', chatData);

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

            // Если чат уже существует, попробуем найти существующий
            if (response.status === 422 || response.status === 400) {
                console.log('Trying to find existing chat...');
                const existingChats = await fetchUserChats(token);
                const existingChat = existingChats.find(chat =>
                    chat.replyAuthor?.id === authorId || chat.author?.id === authorId
                );
                if (existingChat) {
                    console.log('Found existing chat:', existingChat);
                    return existingChat;
                }
            }
            return null;
        }
    } catch (error) {
        console.error('Error creating chat:', error);
        return null;
    }
};

const fetchUserChats = async (token: string) => {
    try {
        const response = await fetch(`${API_BASE_URL}/api/chats/me`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
        });

        if (response.ok) {
            return await response.json();
        }
        return [];
    } catch (error) {
        console.error('Error fetching user chats:', error);
        return [];
    }
};