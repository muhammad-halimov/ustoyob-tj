import React, { useState, useEffect, useRef } from "react";
import { getAuthToken } from "../../utils/auth";
import styles from "./Chat.module.scss";

interface Message {
    id: number;
    sender: "me" | "other";
    name: string;
    text: string;
    time: string;
    temp?: boolean;
}

interface ApiUser {
    id: number;
    email: string;
    name: string;
    surname: string;
    phone1: string;
    phone2: string;

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
    messageAuthor: ApiUser;
    replyAuthor: ApiUser;
    message: ApiMessage[];
    archived?: boolean;
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

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const API_BASE_URL = 'http://usto.tj.auto-schule.ru';
    const POLLING_INTERVAL = 3000;

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

    const getCurrentUser = async (): Promise<ApiUser | null> => {
        try {
            const token = getAuthToken();
            if (!token) {
                setError("Необходима авторизация");
                return null;
            }

            const response = await fetch(`${API_BASE_URL}/api/users/me`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                },
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
            setError("Ошибка при загрузке пользователя");
            return null;
        }
    };

    const fetchChats = async () => {
        try {
            setIsLoading(true);
            setError(null);

            const token = getAuthToken();
            if (!token) {
                setError("Необходима авторизация");
                return;
            }

            const response = await fetch(`${API_BASE_URL}/api/chats/me`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
            });

            if (response.ok) {
                const chatsData: ApiChat[] = await response.json();
                setChats(chatsData);
                if (chatsData.length > 0 && !selectedChat) {
                    setSelectedChat(chatsData[0].id);
                }
            } else {
                console.error("Ошибка загрузки чатов:", response.status);
                setError("Ошибка загрузки чатов");
            }
        } catch (err) {
            console.error("Ошибка при загрузке чатов:", err);
            setError("Ошибка при загрузке чатов");
        } finally {
            setIsLoading(false);
        }
    };

    const fetchChatMessages = async (chatId: number) => {
        try {
            const token = getAuthToken();
            if (!token) return;

            const response = await fetch(`${API_BASE_URL}/api/chats/${chatId}`, {
                headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' },
            });
            if (!response.ok) return;

            const chatData: ApiChat = await response.json();
            const serverMessages: Message[] = (chatData.message || []).map(msg => ({
                id: msg.id,
                sender: msg.author.id === currentUser?.id ? "me" : "other",
                name: `${msg.author.name} ${msg.author.surname}`,
                text: msg.text,
                time: msg.createdAt
                    ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            }));

            // загружаем локальные сообщения
            const savedMessages = localStorage.getItem(`chat-${chatId}`);
            let localMessages: Message[] = savedMessages ? JSON.parse(savedMessages) : [];

            const localMessagesWithoutTemp = localMessages.filter(m => !m.temp);
            // объединяем серверные и локальные сообщения
            const mergedMessages = [...localMessagesWithoutTemp, ...serverMessages]
                .filter((v,i,a) => a.findIndex(m => m.id === v.id) === i)
                .sort((a,b) => a.id - b.id);

            setMessages(mergedMessages);

        } catch (err) {
            console.error("Ошибка при получении сообщений:", err);
        }
    };

    useEffect(() => {
        if (selectedChat) {
            localStorage.setItem(`chat-${selectedChat}`, JSON.stringify(messages));
        }
    }, [messages, selectedChat]);

// Загрузка сообщений при выборе чата
    useEffect(() => {
        if (selectedChat) {
            const saved = localStorage.getItem(`chat-${selectedChat}`);
            if (saved) {
                setMessages(JSON.parse(saved));
            } else {
                setMessages([]);
            }
        }
    }, [selectedChat]);

    const sendMessage = async () => {
        if (!newMessage.trim() || !selectedChat || !currentUser) return;
        const text = newMessage.trim();
        setNewMessage("");

        // локально показываем временное сообщение
        const tempMessage: Message = {
            id: Date.now(),
            sender: "me",
            name: `${currentUser.name} ${currentUser.surname}`,
            text,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            temp: true, // 🔹
        };

        setMessages(prev => [...prev, tempMessage]);
        const token = getAuthToken();
        if (!token) return;

        try {
            await fetch(`${API_BASE_URL}/api/chats/${selectedChat}`, {
                method: "PATCH",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/merge-patch+json",
                },
                body: JSON.stringify({
                    message: [{ text, author: `/api/users/${currentUser.id}` }]
                }),
            });
        } catch (err) {
            console.error("Ошибка отправки сообщения:", err);
        }
    };

    const fetchAvailableUsers = async () => {
        try {
            setIsLoadingUsers(true);
            const token = getAuthToken();
            if (!token) return;

            // 🔹 Пробуем загрузить реальных пользователей
            try {
                const response = await fetch(`${API_BASE_URL}/api/users`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Accept': 'application/json',
                    },
                });

                if (response.ok) {
                    const users: ApiUser[] = await response.json();
                    const filteredUsers = users.filter(user => user.id !== currentUser?.id);
                    setAvailableUsers(filteredUsers);
                } else {
                    throw new Error('Failed to fetch users');
                }
            } catch {
                // 🔹 Если не получается, используем моковые данные
                const mockUsers: ApiUser[] = [
                    { id: 2, email: "master1@example.com", name: "Алишер", surname: "Каримов", phone1: "+992123456789", phone2: "" },
                    { id: 3, email: "master2@example.com", name: "Фаррух", surname: "Юсупов", phone1: "+992987654321", phone2: "" }
                ];
                setAvailableUsers(mockUsers);
            }
        } catch (err) {
            console.error("Ошибка загрузки пользователей:", err);
            const mockUsers: ApiUser[] = [
                { id: 2, email: "master1@example.com", name: "Алишер", surname: "Каримов", phone1: "+992123456789", phone2: "" },
                { id: 3, email: "master2@example.com", name: "Фаррух", surname: "Юсупов", phone1: "+992987654321", phone2: "" }
            ];
            setAvailableUsers(mockUsers);
        } finally {
            setIsLoadingUsers(false);
        }
    };

    const createNewChat = async (replyAuthorId: number) => {
        if (!currentUser) return;
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
                    messageAuthor: `/api/users/${currentUser.id}`,
                    replyAuthor: `/api/users/${replyAuthorId}`,
                    message: []
                })
            });

            if (response.ok) {
                const newChat: ApiChat = await response.json();
                setChats(prev => [...prev, newChat]);
                setSelectedChat(newChat.id);
                setShowCreateChat(false);
                fetchChatMessages(newChat.id);
            } else {
                setError('Ошибка при создании чата');
            }
        } catch {
            setError('Ошибка при создании чата');
        }
    };

    const getInterlocutorFromChat = (chat: ApiChat): ApiUser | null => {
        if (!currentUser) return null;
        return chat.messageAuthor.id === currentUser.id ? chat.replyAuthor : chat.messageAuthor;
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    const getLastMessage = (chat: ApiChat) => {
        if (!chat.message || chat.message.length === 0) return { text: "Нет сообщений", time: "" };

        const last = chat.message[chat.message.length - 1];
        return {
            text: last.text.length > 50 ? last.text.substring(0, 50) + "..." : last.text,
            time: last.createdAt
                ? new Date(last.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : "",
        };
    };

    const handleCreateChatClick = () => {
        setShowCreateChat(true);
        fetchAvailableUsers();
    };

    const currentChat = chats.find(chat => chat.id === selectedChat);
    const currentInterlocutor = currentChat ? getInterlocutorFromChat(currentChat) : null;
    const showChatArea = selectedChat !== null;

    if (isLoading) return <div className={styles.chat}>Загрузка чатов...</div>;

    return (
        <div className={styles.chat}>
            {/* Sidebar */}
            <div className={styles.sidebar}>
                {/* Search */}
                <div className={styles.searchBar}>
                    <input type="text" placeholder="Поиск" className={styles.searchInput} />
                </div>

                {/* Tabs */}
                <div className={styles.tabs}>
                    <button className={`${styles.tab} ${activeTab === "active" ? styles.active : ""}`} onClick={() => setActiveTab("active")}>Активные</button>
                    <button className={`${styles.tab} ${activeTab === "archive" ? styles.active : ""}`} onClick={() => setActiveTab("archive")}>Архив</button>
                </div>

                {/* Chat list */}
                <div className={styles.chatList}>
                    {chats.filter(chat => (activeTab === "archive" ? chat.archived : !chat.archived)).length === 0 ? (
                        <div className={styles.noChatsContainer}>
                            <div className={styles.noChats}>{activeTab === "archive" ? "Архив пуст" : "Чатов нет"}</div>
                            {activeTab === "active" && (
                                <button className={styles.createChatButton} onClick={handleCreateChatClick}>Создать чат</button>
                            )}
                        </div>
                    ) : (
                        chats
                            .filter(chat => (activeTab === "archive" ? chat.archived : !chat.archived))
                            .map(chat => {
                                const interlocutor = getInterlocutorFromChat(chat);
                                return (
                                    <div key={chat.id} className={`${styles.chatItem} ${selectedChat === chat.id ? styles.selected : ""}`} onClick={() => setSelectedChat(chat.id)}>
                                        <div className={styles.avatar}>{interlocutor?.name.charAt(0)}{interlocutor?.surname.charAt(0)}</div>
                                        <div className={styles.chatInfo}>
                                            <div className={styles.name}>{interlocutor?.name} {interlocutor?.surname}</div>
                                            <div className={styles.specialty}>{interlocutor?.email}</div>
                                            <div className={styles.lastMessage}>{getLastMessage(chat).text}</div>
                                        </div>
                                        <div className={styles.chatMeta}>
                                            <div className={styles.time}>{getLastMessage(chat).time}</div>
                                        </div>
                                    </div>
                                );
                            })
                    )}
                </div>
            </div>

            {/* Chat area */}
            <div className={styles.chatArea}>
                {showChatArea ? (
                    <>
                        <div className={styles.chatHeader}>
                            <div className={styles.headerLeft}>
                                <div className={styles.avatar}>{currentInterlocutor?.name.charAt(0)}{currentInterlocutor?.surname.charAt(0)}</div>
                                <div className={styles.headerInfo}>
                                    <div className={styles.name}>{currentInterlocutor?.name} {currentInterlocutor?.surname}</div>
                                    <div className={styles.status}>онлайн</div>
                                </div>
                            </div>
                        </div>

                        <div className={styles.chatMessages}>
                            {messages.length === 0 ? (
                                <div className={styles.noMessages}>Начните чат</div>
                            ) : (
                                messages.map(msg => (
                                    <div
                                        key={msg.id}
                                        className={`${styles.message} ${msg.sender === "me" ? styles.myMessage : styles.theirMessage}`}
                                    >
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
                                title="Отправить сообщение"
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="currentColor"
                                    viewBox="0 0 24 24"
                                    width="20"
                                    height="20"
                                >
                                    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                                </svg>
                            </button>
                        </div>
                    </>
                ) : (
                    <div className={styles.noChat}>{chats.length === 0 ? "Начните чат" : "Выберите чат"}</div>
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
                                        <div className={styles.userAvatar}>{user.name.charAt(0)}{user.surname.charAt(0)}</div>
                                        <div className={styles.userInfo}>
                                            <div className={styles.userName}>{user.name} {user.surname}</div>
                                            <div className={styles.userEmail}>{user.email}</div>
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