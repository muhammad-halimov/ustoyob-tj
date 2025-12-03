import { getAuthToken } from './auth';

const API_BASE_URL = 'https://admin.ustoyob.tj';

export interface ChatData {
    id: number;
    author: {
        id: number;
        email: string;
        name: string;
        surname: string;
        image?: string;
        approved?: boolean;
        active?: boolean;
    };
    replyAuthor: {
        id: number;
        email: string;
        name: string;
        surname: string;
        image?: string;
        approved?: boolean;
        active?: boolean;
    };
    messages: any[];
}

export const createChatWithAuthor = async (replyAuthorId: number, ticketId?: number): Promise<ChatData | null> => {
    try {
        const token = getAuthToken();
        if (!token) {
            console.log('No auth token available');
            alert('Необходима авторизация для создания чата');
            return null;
        }

        console.log('Creating chat with params:', { replyAuthorId, ticketId });

        // Проверяем существующие чаты
        const existingChat = await findExistingChat(replyAuthorId, token);
        if (existingChat) {
            console.log('Found existing chat:', existingChat.id);
            return existingChat;
        }

        // Проверяем статус пользователя
        const userStatus = await checkUserStatus(replyAuthorId);
        if (!userStatus.approved || !userStatus.active) {
            console.log('User is not active or approved');
            alert('Пользователь не активен. Чаты можно создавать только с активными пользователями.');
            return null;
        }

        // Создаем новый чат
        const chatData: any = {
            replyAuthor: `/api/users/${replyAuthorId}`
        };

        // Добавляем ticket, если он указан
        if (ticketId) {
            chatData.ticket = `/api/tickets/${ticketId}`;
        }

        console.log('Creating chat with data:', chatData);

        const response = await fetch(`${API_BASE_URL}/api/chats`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify(chatData)
        });

        if (response.ok) {
            const chatResponse: ChatData = await response.json();
            console.log('Chat created successfully:', chatResponse);
            alert('Чат успешно создан');
            return chatResponse;
        } else {
            const errorText = await response.text();
            console.error('Failed to create chat:', response.status, errorText);

            try {
                const errorData = JSON.parse(errorText);
                if (errorData.detail) {
                    alert('Ошибка при создании чата: ' + errorData.detail);
                } else {
                    alert('Ошибка при создании чата');
                }
            } catch {
                alert('Ошибка при создании чата');
            }
            return null;
        }
    } catch (error) {
        console.error('Error creating chat:', error);
        alert('Произошла ошибка при создании чата');
        return null;
    }
};

export const checkUserStatus = async (userId: number): Promise<{ approved: boolean; active: boolean }> => {
    try {
        const token = getAuthToken();
        if (!token) return { approved: false, active: false };

        const response = await fetch(`${API_BASE_URL}/api/users/${userId}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json',
            },
        });

        if (response.ok) {
            const userData = await response.json();
            return {
                approved: userData.approved || false,
                active: userData.active || false
            };
        }
        return { approved: false, active: false };
    } catch (error) {
        console.error('Error checking user status:', error);
        return { approved: false, active: false };
    }
};

const findExistingChat = async (replyAuthorId: number, token: string): Promise<ChatData | null> => {
    try {
        const response = await fetch(`${API_BASE_URL}/api/chats/me`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json',
            },
        });

        if (response.ok) {
            const responseData = await response.json();
            let chatsArray: ChatData[] = [];

            // Обрабатываем разные форматы ответа
            if (Array.isArray(responseData)) {
                chatsArray = responseData;
            } else if (responseData && typeof responseData === 'object') {
                if (responseData['hydra:member'] && Array.isArray(responseData['hydra:member'])) {
                    chatsArray = responseData['hydra:member'] as ChatData[];
                } else if (responseData.id) {
                    chatsArray = [responseData];
                }
            }

            // Ищем чат с тем же replyAuthor
            const existingChat = chatsArray.find(chat => {
                const chatReplyAuthorId = chat.replyAuthor?.id;
                return chatReplyAuthorId === replyAuthorId;
            });

            return existingChat || null;
        }
        return null;
    } catch (error) {
        console.error('Error finding existing chat:', error);
        return null;
    }
};