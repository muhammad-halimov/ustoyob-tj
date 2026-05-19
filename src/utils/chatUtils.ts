import { getAuthToken, handleUnauthorized } from './auth';
import type { Chat } from '../entities';
import type { HydraResponse } from '../entities';
import type { User } from '../entities';
import { API_BASE_URL } from './config';

export const initChatModals = () => {
};

// Извлекает числовой id из объекта: сначала проверяет числовое поле id,
// затем парсит IRI вида "/api/chats/123"
const extractId = (obj: any): number | undefined => {
    if (obj?.id) return typeof obj.id === 'number' ? obj.id : parseInt(String(obj.id));
    const iri = obj?.['@id'];
    if (iri) {
        const match = String(iri).match(/\/(\d+)$/);
        if (match) return parseInt(match[1]);
    }
    return undefined;
};

// Функция для показа модалок с авто-закрытием
export const createChatWithAuthor = async (replyAuthorId: number, ticketId?: number): Promise<Chat | null> => {
    const token = getAuthToken();
    if (!token) {
        console.log('No auth token available');
        return null;
    }

    console.log('Creating chat with params:', { replyAuthorId, ticketId });

    // Проверяем существующие чаты
    const existingChat = await findExistingChat(replyAuthorId);
    if (existingChat) {
        console.log('Found existing chat:', existingChat.id);
        return existingChat;
    }

    // Проверяем статус пользователя
    const userStatus = await checkUserStatus(replyAuthorId);
    if (!userStatus.approved || !userStatus.active) {
        console.log('User is not active or approved');
        throw new Error('Пользователь не активен. Чаты можно создавать только с активными пользователями.');
    }

    // Создаем новый чат
    const chatData: { replyAuthor: string; ticket?: string } = {
        replyAuthor: `/api/users/${replyAuthorId}`
    };

    if (ticketId) {
        chatData.ticket = `/api/tickets/${ticketId}`;
    }

    console.log('Creating chat with data:', chatData);

    const doCreate = async (): Promise<Response> => {
        return fetch(`${API_BASE_URL}/api/chats`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${getAuthToken()}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify(chatData)
        });
    };

    let response = await doCreate();

    // Если 401, пробуем обновить токен
    if (response.status === 401) {
        const refreshed = await handleUnauthorized();
        if (refreshed) {
            response = await doCreate();
        } else {
            throw new Error('Сессия истекла. Пожалуйста, войдите снова.');
        }
    }

    if (response.ok) {
        const rawResponse = await response.json();
        console.log('Chat created successfully:', rawResponse);
        rawResponse.id = extractId(rawResponse);
        return rawResponse as Chat;
    }

    const errorText = await response.text();
    console.error('Failed to create chat:', response.status, errorText);
    try {
        const errorData = JSON.parse(errorText);
        throw new Error(errorData.detail ? 'Ошибка при создании чата: ' + errorData.detail : 'Ошибка при создании чата');
    } catch (e) {
        if (e instanceof Error && e.message !== errorText) throw e;
        throw new Error('Ошибка при создании чата');
    }
};

export const checkUserStatus = async (userId: number): Promise<{ approved: boolean; active: boolean }> => {
    try {
        const token = getAuthToken();
        if (!token) return { approved: false, active: false };

        const checkUser = async (): Promise<Response> => {
            return fetch(`${API_BASE_URL}/api/users/${userId}`, {
                headers: {
                    'Authorization': `Bearer ${getAuthToken()}`,
                    'Accept': 'application/json',
                },
            });
        };

        let response = await checkUser();

        // Если 401, пробуем обновить токен
        if (response.status === 401) {
            const refreshed = await handleUnauthorized();
            if (refreshed) {
                response = await checkUser();
            } else {
                return { approved: false, active: false };
            }
        }

        if (response.ok) {
            const userData: User = await response.json();
            return {
                approved: userData.approved !== false,
                active: userData.active !== false
            };
        }
        return { approved: false, active: false };
    } catch (error) {
        console.error('Error checking user status:', error);
        return { approved: false, active: false };
    }
};

const findExistingChat = async (replyAuthorId: number): Promise<Chat | null> => {
    try {
        const getChats = async (): Promise<Response> => {
            return fetch(`${API_BASE_URL}/api/chats/me`, {
                headers: {
                    'Authorization': `Bearer ${getAuthToken()}`,
                    'Accept': 'application/json',
                },
            });
        };

        let response = await getChats();

        // Если 401, пробуем обновить токен
        if (response.status === 401) {
            const refreshed = await handleUnauthorized();
            if (refreshed) {
                response = await getChats();
            } else {
                return null;
            }
        }

        if (response.ok) {
            const responseData = await response.json();
            let chatsArray: Chat[] = [];

            // Обрабатываем разные форматы ответа
            if (Array.isArray(responseData)) {
                chatsArray = responseData;
            } else if (responseData && typeof responseData === 'object') {
                // Если это Hydra-ответ
                if ('hydra:member' in responseData && Array.isArray((responseData as HydraResponse<Chat>)['hydra:member'])) {
                    const hydraResponse = responseData as HydraResponse<Chat>;
                    chatsArray = hydraResponse['hydra:member'];
                } else if (responseData.id) {
                    // Если это один объект
                    chatsArray = [responseData as Chat];
                }
            }

            // Нормализуем id у всех чатов (IRI → number)
            chatsArray = chatsArray.map(chat => ({
                ...chat,
                id: extractId(chat) ?? chat.id,
            }));

            // Ищем чат с тем же replyAuthor (или author, если текущий пользователь — replyAuthor)
            const existingChat = chatsArray.find(chat => {
                return extractId(chat.replyAuthor) === replyAuthorId ||
                       extractId(chat.author) === replyAuthorId;
            });

            return existingChat || null;
        }
        return null;
    } catch (error) {
        console.error('Error finding existing chat:', error);
        return null;
    }
};