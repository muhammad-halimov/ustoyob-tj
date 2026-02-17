import { getAuthToken, handleUnauthorized } from './auth';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// Интерфейсы для типизации
export interface UserData {
    id: number;
    email: string;
    name: string;
    surname: string;
    image?: string;
    approved?: boolean;
    active?: boolean;
}

export interface MessageData {
    id: number;
    text: string;
    author: UserData;
    createdAt: string;
    readAt?: string;
    isRead?: boolean;
}

export interface ChatData {
    id: number;
    author: UserData;
    replyAuthor: UserData;
    messages: MessageData[];
    ticket?: {
        id: number;
        title: string;
    };
}

export interface ChatCreationData {
    replyAuthor: string;
    ticket?: string;
}

export interface HydraResponse<T> {
    'hydra:member': T[];
    'hydra:totalItems': number;
    'hydra:view'?: {
        'hydra:first': string;
        'hydra:last': string;
        'hydra:next'?: string;
        'hydra:previous'?: string;
    };
}

// Интерфейсы для управления модалками
export interface ModalCallbacks {
    showSuccessModal: (message: string) => void;
    showErrorModal: (message: string) => void;
    showInfoModal: (message: string) => void;
}

// Глобальная переменная для хранения колбэков модалок
let modalCallbacks: ModalCallbacks | null = null;

// Функция для инициализации модалок
export const initChatModals = (callbacks: ModalCallbacks) => {
    modalCallbacks = callbacks;
};

// Функция для показа модалок с авто-закрытием
const showModalWithAutoClose = (
    type: 'success' | 'error' | 'info',
    message: string,
    autoCloseDelay: number = 3000
) => {
    if (!modalCallbacks) {
        console.warn('Modal callbacks not initialized. Using alert instead:', message);
        alert(message);
        return;
    }

    switch (type) {
        case 'success':
            modalCallbacks.showSuccessModal(message);
            break;
        case 'error':
            modalCallbacks.showErrorModal(message);
            break;
        case 'info':
            modalCallbacks.showInfoModal(message);
            break;
    }

    // Автоматическое закрытие через указанное время
    setTimeout(() => {
        // Здесь предполагается, что компонент модалки сам управляет своим состоянием
        // или вызовете колбэк для закрытия
    }, autoCloseDelay);
};

export const createChatWithAuthor = async (replyAuthorId: number, ticketId?: number): Promise<ChatData | null> => {
    try {
        const token = getAuthToken();
        if (!token) {
            console.log('No auth token available');
            showModalWithAutoClose('error', 'Необходима авторизация для создания чата');
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
            showModalWithAutoClose('error', 'Пользователь не активен. Чаты можно создавать только с активными пользователями.');
            return null;
        }

        // Создаем новый чат
        const chatData: ChatCreationData = {
            replyAuthor: `/api/users/${replyAuthorId}`
        };

        // Добавляем ticket, если он указан
        if (ticketId) {
            chatData.ticket = `/api/tickets/${ticketId}`;
        }

        console.log('Creating chat with data:', chatData);

        const createChat = async (): Promise<Response> => {
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

        let response = await createChat();

        // Если 401, пробуем обновить токен
        if (response.status === 401) {
            const refreshed = await handleUnauthorized();
            if (refreshed) {
                response = await createChat();
            } else {
                showModalWithAutoClose('error', 'Сессия истекла. Пожалуйста, войдите снова.');
                return null;
            }
        }

        if (response.ok) {
            const chatResponse: ChatData = await response.json();
            console.log('Chat created successfully:', chatResponse);
            showModalWithAutoClose('success', 'Чат успешно создан');
            return chatResponse;
        } else {
            const errorText = await response.text();
            console.error('Failed to create chat:', response.status, errorText);

            try {
                const errorData = JSON.parse(errorText);
                if (errorData.detail) {
                    showModalWithAutoClose('error', 'Ошибка при создании чата: ' + errorData.detail);
                } else {
                    showModalWithAutoClose('error', 'Ошибка при создании чата');
                }
            } catch {
                showModalWithAutoClose('error', 'Ошибка при создании чата');
            }
            return null;
        }
    } catch (error) {
        console.error('Error creating chat:', error);
        showModalWithAutoClose('error', 'Произошла ошибка при создании чата');
        return null;
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
            const userData: UserData = await response.json();
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

const findExistingChat = async (replyAuthorId: number): Promise<ChatData | null> => {
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
            let chatsArray: ChatData[] = [];

            // Обрабатываем разные форматы ответа
            if (Array.isArray(responseData)) {
                chatsArray = responseData;
            } else if (responseData && typeof responseData === 'object') {
                // Если это Hydra-ответ
                if ('hydra:member' in responseData && Array.isArray((responseData as HydraResponse<ChatData>)['hydra:member'])) {
                    const hydraResponse = responseData as HydraResponse<ChatData>;
                    chatsArray = hydraResponse['hydra:member'];
                } else if (responseData.id) {
                    // Если это один объект
                    chatsArray = [responseData as ChatData];
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