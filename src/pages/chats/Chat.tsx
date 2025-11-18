import React, { useState, useEffect, useRef } from "react";
import { getAuthToken } from "../../utils/auth";
import styles from "./Chat.module.scss";
import { useSearchParams } from 'react-router-dom';
import { IoSend } from "react-icons/io5";

interface Message {
    id: number;
    sender: "me" | "other";
    name: string;
    text: string;
    time: string;
}

interface ApiUser {
    id: number;
    email: string;
    name: string;
    surname: string;
    phone1: string;
    phone2: string;
    image?: string;
    isOnline?: boolean; // Добавляем поле для статуса онлайн
    lastSeen?: string; // Время последней активности
}

interface ApiMessage {
    id: number;
    text: string;
    image: string;
    author: ApiUser;
    createdAt?: string;
}

interface ApiChat {
    id: number;
    author: ApiUser;
    replyAuthor: ApiUser;
    messages: ApiMessage[];
    images: any[];
    createdAt?: string;
    updatedAt?: string;
}

function Chat() {
    const [activeTab, setActiveTab] = useState<"active" | "archive">("active");
    const [selectedChat, setSelectedChat] = useState<number | null>(null);
    const [chats, setChats] = useState<ApiChat[]>([]);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentUser, setCurrentUser] = useState<ApiUser | null>(null);
    const [showCreateChat, setShowCreateChat] = useState(false);
    const [availableUsers, setAvailableUsers] = useState<ApiUser[]>([]);
    const [isLoadingUsers, setIsLoadingUsers] = useState(false);
    const [onlineStatuses, setOnlineStatuses] = useState<{[key: number]: boolean}>({});

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const statusPollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const API_BASE_URL = 'https://admin.ustoyob.tj';
    const POLLING_INTERVAL = 5000;

    const [searchParams] = useSearchParams();
    const chatIdFromUrl = searchParams.get('chatId');

    useEffect(() => {
        const initializeChat = async () => {
            const user = await getCurrentUser();
            if (user) {
                await fetchChats();
            }
        };
        initializeChat();
    }, []);

    useEffect(() => {
        if (selectedChat) {
            startPolling(selectedChat);
        } else {
            setMessages([]);
            stopPolling();
        }
        return () => stopPolling();
    }, [selectedChat]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        if (chatIdFromUrl) {
            const chatId = parseInt(chatIdFromUrl);
            setSelectedChat(chatId);
            if (!chats.find(chat => chat.id === chatId)) {
                fetchChatById(chatId);
            }
        }
    }, [chatIdFromUrl, chats]);

    // Запускаем проверку статусов онлайн при наличии чатов
    useEffect(() => {
        if (chats.length > 0) {
        }
        return () => stopStatusPolling();
    }, [chats]);

    const getInterlocutorFromChat = (chat: ApiChat | undefined): ApiUser | null => {
        if (!chat || !currentUser) return null;

        if (!chat.author || !chat.replyAuthor) {
            console.error('Invalid chat structure:', chat);
            return null;
        }

        if (!chat.author.id || !chat.replyAuthor.id) {
            console.error('Chat authors missing ID:', chat);
            return null;
        }

        return chat.author.id === currentUser.id ? chat.replyAuthor : chat.author;
    };

    // Функция для проверки существующего чата с пользователем
    const findExistingChat = (replyAuthorId: number): number | null => {
        if (!currentUser) return null;

        const existingChat = chats.find(chat =>
            (chat.author.id === currentUser.id && chat.replyAuthor.id === replyAuthorId) ||
            (chat.author.id === replyAuthorId && chat.replyAuthor.id === currentUser.id)
        );

        return existingChat ? existingChat.id : null;
    };

    const fetchChatById = async (chatId: number) => {
        try {
            const token = getAuthToken();
            if (!token) return;

            const response = await fetch(`${API_BASE_URL}/api/chats/${chatId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json',
                },
            });

            if (response.ok) {
                const chatData = await response.json();
                setChats(prev => {
                    const exists = prev.find(chat => chat.id === chatId);
                    if (!exists) {
                        return [...prev, chatData];
                    }
                    return prev;
                });
            }
        } catch (error) {
            console.error('Error fetching chat by ID:', error);
        }
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const startPolling = (chatId: number) => {
        stopPolling();
        fetchChatMessages(chatId);

        pollingIntervalRef.current = setInterval(() => {
            fetchChatMessages(chatId);
        }, POLLING_INTERVAL);
    };

    const stopPolling = () => {
        if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
        }
    };

    const stopStatusPolling = () => {
        if (statusPollingIntervalRef.current) {
            clearInterval(statusPollingIntervalRef.current);
            statusPollingIntervalRef.current = null;
        }
    };

    // const checkUserOnlineStatus = async (userId: number) => {
    //     try {
    //         const token = getAuthToken();
    //         if (!token) return;
    //
    //         // Здесь нужно использовать ваш реальный endpoint для проверки статуса
    //         // Предположим, что есть endpoint /api/users/{id}/status
    //         const response = await fetch(`${API_BASE_URL}/api/users/${userId}`, {
    //             headers: {
    //                 'Authorization': `Bearer ${token}`,
    //                 'Accept': 'application/json',
    //             },
    //         });
    //
    //         if (response.ok) {
    //             const userData = await response.json();
    //             // Предположим, что в ответе есть поле isOnline
    //             const isOnline = userData.isOnline || false;
    //
    //             setOnlineStatuses(prev => ({
    //                 ...prev,
    //                 [userId]: isOnline
    //             }));
    //         }
    //     } catch (error) {
    //         console.error(`Error checking status for user ${userId}:`, error);
    //     }
    // };

    const getOnlineStatus = (userId: number): boolean => {
        return onlineStatuses[userId] || false;
    };

    const getLastSeenTime = (user: ApiUser): string => {
        if (!user.lastSeen) return '';

        const lastSeen = new Date(user.lastSeen);
        const now = new Date();
        const diffInMinutes = Math.floor((now.getTime() - lastSeen.getTime()) / (1000 * 60));

        if (diffInMinutes < 1) return 'только что';
        if (diffInMinutes < 60) return `${diffInMinutes} мин назад`;
        if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} ч назад`;
        return `${Math.floor(diffInMinutes / 1440)} дн назад`;
    };

    const fetchChatMessages = async (chatId: number) => {
        try {
            const token = getAuthToken();
            if (!token) return;

            const response = await fetch(`${API_BASE_URL}/api/chats/${chatId}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json',
                },
            });

            if (response.ok) {
                const chatData: ApiChat = await response.json();
                processApiMessages(chatId, chatData.messages || []);

                // Обновляем информацию о собеседнике при получении новых сообщений
                const interlocutor = getInterlocutorFromChat(chatData);
                if (interlocutor) {
                    // await checkUserOnlineStatus(interlocutor.id);
                }
            } else if (response.status >= 500) {
                console.warn(`Server error (${response.status}) fetching chat ${chatId}`);
            } else {
                console.error(`Error fetching chat messages: ${response.status}`);
            }
        } catch (err) {
            console.error('Error fetching chat messages:', err);
        }
    };

    const processApiMessages = (chatId: number, apiMessages: ApiMessage[]) => {
        const formatted: Message[] = apiMessages.map(msg => ({
            id: msg.id,
            sender: msg.author.id === currentUser?.id ? "me" : "other",
            name: `${msg.author.name} ${msg.author.surname}`,
            text: msg.text,
            time: msg.createdAt
                ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : ""
        }));

        // Автоматически определяем онлайн статус по последнему сообщению
        if (apiMessages.length > 0) {
            const lastMessage = apiMessages[apiMessages.length - 1];
            const interlocutorId = lastMessage.author.id === currentUser?.id
                ? getInterlocutorFromChat(chats.find(c => c.id === chatId))?.id
                : lastMessage.author.id;

            if (interlocutorId) {
                // Если сообщение было отправлено менее 2 минут назад - считаем онлайн
                const messageTime = new Date(lastMessage.createdAt || '').getTime();
                const isOnline = Date.now() - messageTime < 2 * 60 * 1000; // 2 минуты

                setOnlineStatuses(prev => ({
                    ...prev,
                    [interlocutorId]: isOnline
                }));
            }
        }

        if (selectedChat === chatId) setMessages(formatted);
    };

    const getCurrentUser = async (): Promise<ApiUser | null> => {
        try {
            const token = getAuthToken();
            if (!token) {
                setError("Необходима авторизация");
                return null;
            }

            const response = await fetch(`${API_BASE_URL}/api/users/me`, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' },
            });

            if (response.ok) {
                const userData = await response.json();
                setCurrentUser(userData);
                return userData;
            } else {
                setError("Ошибка авторизации");
                return null;
            }
        } catch (err) {
            console.error('Error fetching current user:', err);
            return null;
        }
    };

    const fetchChats = async () => {
        try {
            setIsLoading(true);
            setError(null);

            const token = getAuthToken();
            if (!token) return;

            const response = await fetch(`${API_BASE_URL}/api/chats/me`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
            });

            let chatsData: ApiChat[] = [];

            if (response.ok) {
                chatsData = await response.json();
                if (!Array.isArray(chatsData)) {
                    console.error('Invalid chats data format:', chatsData);
                    chatsData = [];
                }
            } else {
                console.warn('Failed to fetch chats, using mock data');
                chatsData = createMockChats();
            }

            setChats(chatsData);
            if (chatsData.length > 0 && !selectedChat) {
                setSelectedChat(chatsData[0].id);
            }
        } catch (error) {
            console.error('Error fetching chats:', error);
            const mockChats = createMockChats();
            setChats(mockChats);
            if (mockChats.length > 0 && !selectedChat) {
                setSelectedChat(mockChats[0].id);
            }
        } finally {
            setIsLoading(false);
        }
    };

    const createMockChats = (): ApiChat[] => {
        if (!currentUser) return [];
        return [
            {
                id: 1,
                author: currentUser,
                replyAuthor: {
                    id: 2,
                    email: "master@example.com",
                    name: "Алишер",
                    surname: "Каримов",
                    phone1: "+992123456789",
                    phone2: "",
                    isOnline: true
                },
                messages: [],
                images: []
            },
            {
                id: 2,
                author: currentUser,
                replyAuthor: {
                    id: 3,
                    email: "support@example.com",
                    name: "Мария",
                    surname: "Иванова",
                    phone1: "+992987654321",
                    phone2: "",
                    isOnline: false,
                    lastSeen: new Date(Date.now() - 15 * 60 * 1000).toISOString() // 15 минут назад
                },
                messages: [],
                images: []
            }
        ];
    };

    const fetchAvailableUsers = async () => {
        setIsLoadingUsers(true);
        try {
            const token = getAuthToken();
            if (!token) return;

            // Запрашиваем реальных пользователей вместо моковых данных
            const response = await fetch(`${API_BASE_URL}/api/users`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json',
                },
            });

            if (response.ok) {
                const usersData = await response.json();
                setAvailableUsers(usersData);
            } else {
                // Fallback на моковые данные
                const mockUsers: ApiUser[] = [
                    {
                        id: 2,
                        email: "master1@example.com",
                        name: "Алишер",
                        surname: "Каримов",
                        phone1: "+992123456789",
                        phone2: "",
                        isOnline: true
                    },
                    {
                        id: 3,
                        email: "master2@example.com",
                        name: "Фаррух",
                        surname: "Юсупов",
                        phone1: "+992987654321",
                        phone2: "",
                        isOnline: false
                    }
                ];
                setAvailableUsers(mockUsers);
            }
        } catch (error) {
            console.error('Error fetching available users:', error);
            const mockUsers: ApiUser[] = [
                {
                    id: 2,
                    email: "master1@example.com",
                    name: "Алишер",
                    surname: "Каримов",
                    phone1: "+992123456789",
                    phone2: "",
                    isOnline: true
                },
                {
                    id: 3,
                    email: "master2@example.com",
                    name: "Фаррух",
                    surname: "Юсупов",
                    phone1: "+992987654321",
                    phone2: "",
                    isOnline: false
                }
            ];
            setAvailableUsers(mockUsers);
        } finally {
            setIsLoadingUsers(false);
        }
    };

    const createNewChat = async (replyAuthorId: number) => {
        if (!currentUser) return;

        // Проверяем существующий чат
        const existingChatId = findExistingChat(replyAuthorId);
        if (existingChatId) {
            setSelectedChat(existingChatId);
            setShowCreateChat(false);
            return;
        }

        try {
            const token = getAuthToken();
            if (!token) return;

            const response = await fetch(`${API_BASE_URL}/api/chats`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    replyAuthor: `/api/users/${replyAuthorId}`
                })
            });

            if (response.ok) {
                const newChat: ApiChat = await response.json();
                setChats(prev => [...prev, newChat]);
                setSelectedChat(newChat.id);
                setShowCreateChat(false);
            } else {
                const errorText = await response.text();
                console.error('Error creating chat:', errorText);
                setError('Ошибка при создании чата');
            }
        } catch (error) {
            console.error('Error creating chat:', error);
            setError('Ошибка при создании чата');
        }
    };

    const sendMessage = async () => {
        if (!newMessage.trim() || !selectedChat || !currentUser) return;

        const newMessageObj: Message = {
            id: Date.now(),
            sender: "me",
            name: `${currentUser.name} ${currentUser.surname}`,
            text: newMessage,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        // Локально добавляем сообщение
        setMessages(prev => [...prev, newMessageObj]);
        setNewMessage("");

        await sendMessageToServer(selectedChat, newMessage);
    };

    const sendMessageToServer = async (chatId: number, messageText: string) => {
        if (!currentUser) return;
        try {
            const token = getAuthToken();
            if (!token) return;

            const response = await fetch(`${API_BASE_URL}/api/chat-messages`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    text: messageText,
                    chat: `/api/chats/${chatId}`
                })
            });

            if (response.ok) {
                console.log('Сообщение успешно отправлено');
                const newMessageData = await response.json();
                console.log('Новое сообщение создано:', newMessageData);

                // Обновляем чат чтобы получить обновленные сообщения
                fetchChatMessages(chatId);
            } else {
                const errorText = await response.text();
                console.error('Ошибка отправки сообщения:', response.status, errorText);
            }
        } catch (err) {
            console.error('Ошибка отправки сообщения на сервер:', err);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    const getLastMessageTime = (chat: ApiChat) => {
        const msg = chat.messages?.[chat.messages.length - 1];
        if (!msg?.createdAt) return "";
        return new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const getLastMessageText = (chat: ApiChat) => {
        const msg = chat.messages?.[chat.messages.length - 1];
        return msg?.text || 'Нет сообщений';
    };

    const handleCreateChatClick = () => {
        setShowCreateChat(true);
        fetchAvailableUsers();
    };

    const currentChat = chats.find(chat => chat.id === selectedChat);
    const currentInterlocutor = currentChat ? getInterlocutorFromChat(currentChat) : null;
    const showChatArea = selectedChat !== null && currentInterlocutor !== null;

    // Получаем статус текущего собеседника
    const currentInterlocutorStatus = currentInterlocutor
        ? getOnlineStatus(currentInterlocutor.id)
        : false;

    if (isLoading) return <div className={styles.chat}>Загрузка чатов...</div>;

    return (
        <div className={styles.chat}>
            {/* Sidebar */}
            <div className={styles.sidebar}>
                <div className={styles.searchBar}>
                    <input type="text" placeholder="Поиск" className={styles.searchInput} />
                </div>

                <div className={styles.tabs}>
                    <button className={`${styles.tab} ${activeTab === "active" ? styles.active : ""}`} onClick={() => setActiveTab("active")}>Активные</button>
                    <button className={`${styles.tab} ${activeTab === "archive" ? styles.active : ""}`} onClick={() => setActiveTab("archive")}>Архив</button>
                </div>

                <div className={styles.chatList}>
                    {chats.length === 0 ? (
                        <div className={styles.noChatsContainer}>
                            <div className={styles.noChats}>Чатов нет</div>
                            <button className={styles.createChatButton} onClick={handleCreateChatClick}>Создать чат</button>
                        </div>
                    ) : (
                        chats.map(chat => {
                            const interlocutor = getInterlocutorFromChat(chat);
                            if (!interlocutor) {
                                console.warn('No interlocutor found for chat:', chat);
                                return null;
                            }

                            const isOnline = getOnlineStatus(interlocutor.id);

                            return (
                                <div key={chat.id} className={`${styles.chatItem} ${selectedChat === chat.id ? styles.selected : ""}`} onClick={() => setSelectedChat(chat.id)}>
                                    <div className={styles.avatar}>
                                        {interlocutor.image ? (
                                            <img
                                                src={interlocutor.image}
                                                className={styles.avatarImage}
                                            />
                                        ) : (
                                            `${interlocutor.name?.charAt(0) || ''}${interlocutor.surname?.charAt(0) || ''}`
                                        )}
                                        <div className={`${styles.onlineIndicator} ${isOnline ? styles.online : styles.offline}`} />
                                    </div>
                                    <div className={styles.chatInfo}>
                                        <div className={styles.name}>{interlocutor.name} {interlocutor.surname}</div>
                                        <div className={styles.specialty}>{interlocutor.email}</div>
                                        <div className={styles.lastMessage}>{getLastMessageText(chat)}</div>
                                    </div>
                                    <div className={styles.chatMeta}>
                                        <div className={styles.time}>{getLastMessageTime(chat)}</div>
                                        {!isOnline && interlocutor.lastSeen && (
                                            <div className={styles.lastSeen}>{getLastSeenTime(interlocutor)}</div>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Chat area */}
            <div className={styles.chatArea}>
                {showChatArea && currentInterlocutor ? (
                    <>
                        <div className={styles.chatHeader}>
                            <div className={styles.headerLeft}>
                                <div className={styles.avatar}>
                                    {currentInterlocutor.name?.charAt(0)}{currentInterlocutor.surname?.charAt(0)}
                                    <div className={`${styles.onlineIndicator} ${currentInterlocutorStatus ? styles.online : styles.offline}`} />
                                </div>
                                <div className={styles.headerInfo}>
                                    <div className={styles.name}>
                                        {currentInterlocutor.name} {currentInterlocutor.surname}
                                    </div>
                                    <div className={`${styles.status} ${currentInterlocutorStatus ? styles.online : styles.offline}`}>
                                        {currentInterlocutorStatus ? 'онлайн' : 'оффлайн'}
                                        {!currentInterlocutorStatus && currentInterlocutor.lastSeen && (
                                            <span className={styles.lastSeen}> • {getLastSeenTime(currentInterlocutor)}</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className={styles.chatMessages}>
                            {messages.length === 0 ? (
                                <div className={styles.noMessages}>Начните чат</div>
                            ) : (
                                messages.map(msg => (
                                    <div key={msg.id} className={`${styles.message} ${msg.sender === "me" ? styles.myMessage : styles.theirMessage}`}>
                                        <div className={styles.messageName}>{msg.name}</div>
                                        <div className={styles.messageText}>{msg.text}</div>
                                        <div className={styles.messageTime}>{msg.time}</div>
                                    </div>
                                ))
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        <div className={styles.chatInput}>
                            <input
                                type="text"
                                placeholder="Введите сообщение"
                                className={styles.inputField}
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                onKeyPress={handleKeyPress}
                            />
                            <button
                                className={styles.sendButton}
                                onClick={sendMessage}
                                disabled={!newMessage.trim()}
                            >
                                <IoSend />
                            </button>
                        </div>
                    </>
                ) : (
                    <div className={styles.noChat}>
                        {chats.length === 0 ? "Начните чат" : "Выберите чат"}
                    </div>
                )}

                {error && (
                    <div className={styles.error}>
                        {error}
                        <button onClick={() => setError(null)} className={styles.closeError}>×</button>
                    </div>
                )}
            </div>

            {/* Create Chat Modal */}
            {showCreateChat && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modal}>
                        <div className={styles.modalHeader}>
                            <h2>Выберите пользователя</h2>
                            <button className={styles.closeButton} onClick={() => setShowCreateChat(false)}>×</button>
                        </div>
                        <div className={styles.usersList}>
                            {isLoadingUsers ? (
                                <div className={styles.loading}>Загрузка пользователей...</div>
                            ) : availableUsers.length === 0 ? (
                                <div className={styles.noUsers}>Нет доступных пользователей</div>
                            ) : (
                                availableUsers.map(user => (
                                    <div key={user.id} className={styles.userItem} onClick={() => createNewChat(user.id)}>
                                        <div className={styles.userAvatar}>
                                            {user.name.charAt(0)}{user.surname.charAt(0)}
                                            <div className={`${styles.onlineIndicator} ${user.isOnline ? styles.online : styles.offline}`} />
                                        </div>
                                        <div className={styles.userInfo}>
                                            <div className={styles.userName}>{user.name} {user.surname}</div>
                                            <div className={styles.userEmail}>{user.email}</div>
                                            <div className={styles.userStatus}>
                                                {user.isOnline ? 'онлайн' : 'оффлайн'}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Chat;