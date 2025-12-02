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
                'Content-Type': 'application/json',
                'Accept': 'application/json' // Добавляем Accept header
            },
            body: JSON.stringify(chatData)
        });

        const responseText = await response.text();
        console.log('Raw response:', responseText);

        if (response.ok) {
            try {
                // Пытаемся парсить JSON
                const responseData = JSON.parse(responseText);

                // Если это сообщение об успехе, но без данных чата - ищем чат
                if (responseData.message && !responseData.id) {
                    console.log('Success message received, searching for created chat...');

                    // Ждем немного и ищем созданный чат
                    await new Promise(resolve => setTimeout(resolve, 1000));

                    const recheckChats = await fetchUserChats(token);
                    const recheckChat = recheckChats.find((chat: Chat) =>
                        chat.replyAuthor?.id === authorId || chat.author?.id === authorId
                    );

                    if (recheckChat) {
                        console.log('Found chat after creation:', recheckChat);
                        return recheckChat;
                    } else {
                        console.log('Could not find chat after creation');
                        return null;
                    }
                }

                // Если есть ID - это нормальный объект чата
                if (responseData.id) {
                    console.log('Chat created successfully with ID:', responseData.id);
                    return responseData;
                }

                console.log('Response data:', responseData);
                return null;
            } catch (parseError) {
                console.error('Error parsing JSON:', parseError);
                return null;
            }
        } else {
            console.error('Error creating chat:', response.status, responseText);

            // Дополнительная попытка найти чат после ошибки
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