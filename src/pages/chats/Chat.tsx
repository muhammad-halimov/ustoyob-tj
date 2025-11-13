import React, { useState, useEffect, useRef } from "react";
import { getAuthToken } from "../../utils/auth";
import styles from "./Chat.module.scss";

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
}

const LOCAL_STORAGE_KEY = 'chat_messages';

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
    const POLLING_INTERVAL = 5000;

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
            loadMessagesForChat(selectedChat);
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
                processApiMessages(chatId, chatData.message || []);
            } else if (response.status >= 500) {
                console.warn(`Server error (${response.status}) fetching chat ${chatId}`);
                // Просто используем локальные сообщения, если сервер упал
                loadMessagesForChat(chatId);
            } else {
                console.error(`Error fetching chat messages: ${response.status}`);
            }
        } catch (err) {
            console.error('Error fetching chat messages:', err);
            loadMessagesForChat(chatId); // fallback
        }
    };

    const processApiMessages = (chatId: number, apiMessages: ApiMessage[]) => {
        try {
            const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
            const allMessages = stored ? JSON.parse(stored) : {};
            const localMessages: Message[] = allMessages[chatId] || [];

            const apiMessagesFormatted: Message[] = apiMessages.map(msg => ({
                id: msg.id,
                sender: msg.author.id === currentUser?.id ? "me" : "other",
                name: `${msg.author.name} ${msg.author.surname}`,
                text: msg.text,
                time: msg.createdAt
                    ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }));

            const mergedMessages = mergeMessages(localMessages, apiMessagesFormatted);
            allMessages[chatId] = mergedMessages;
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(allMessages));

            if (selectedChat === chatId) setMessages(mergedMessages);
        } catch (err) {
            console.error('Error processing API messages:', err);
        }
    };

    const mergeMessages = (localMessages: Message[], apiMessages: Message[]): Message[] => {
        const allMessages = [...localMessages, ...apiMessages];
        const uniqueMessages = allMessages.filter((msg, index, self) =>
            index === self.findIndex(m => m.id === msg.id)
        );
        return uniqueMessages.sort((a, b) => a.id - b.id);
    };

    const loadMessagesForChat = (chatId: number) => {
        try {
            const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
            if (stored) {
                const allMessages = JSON.parse(stored);
                setMessages(allMessages[chatId] || []);
            } else {
                setMessages([]);
            }
        } catch (err) {
            console.error('Error loading messages from localStorage:', err);
            setMessages([]);
        }
    };

    const saveMessageToStorage = (chatId: number, message: Message) => {
        try {
            const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
            const allMessages = stored ? JSON.parse(stored) : {};
            allMessages[chatId] = allMessages[chatId] || [];
            allMessages[chatId].push(message);
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(allMessages));
            return allMessages[chatId];
        } catch (err) {
            console.error('Error saving message to localStorage:', err);
            return [];
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
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            });

            let chatsData: ApiChat[] = [];

            if (response.ok) {
                chatsData = await response.json();
            } else {
                chatsData = createMockChats();
            }

            setChats(chatsData);
            if (chatsData.length > 0 && !selectedChat) setSelectedChat(chatsData[0].id);
        } catch {
            const mockChats = createMockChats();
            setChats(mockChats);
            if (mockChats.length > 0 && !selectedChat) setSelectedChat(mockChats[0].id);
        } finally {
            setIsLoading(false);
        }
    };

    const createMockChats = (): ApiChat[] => {
        if (!currentUser) return [];
        return [
            {
                id: 1,
                messageAuthor: currentUser,
                replyAuthor: { id: 2, email: "master@example.com", name: "Алишер", surname: "Каримов", phone1: "+992123456789", phone2: "" },
                message: []
            },
            {
                id: 2,
                messageAuthor: currentUser,
                replyAuthor: { id: 3, email: "support@example.com", name: "Мария", surname: "Иванова", phone1: "+992987654321", phone2: "" },
                message: []
            }
        ];
    };

    const fetchAvailableUsers = async () => {
        setIsLoadingUsers(true);
        const mockUsers: ApiUser[] = [
            { id: 2, email: "master1@example.com", name: "Алишер", surname: "Каримов", phone1: "+992123456789", phone2: "" },
            { id: 3, email: "master2@example.com", name: "Фаррух", surname: "Юсупов", phone1: "+992987654321", phone2: "" }
        ];
        setAvailableUsers(mockUsers);
        setIsLoadingUsers(false);
    };

    const createNewChat = async (replyAuthorId: number) => {
        if (!currentUser) return;
        try {
            const token = getAuthToken();
            if (!token) return;

            const response = await fetch(`${API_BASE_URL}/api/chats`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
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
            } else {
                setError('Ошибка при создании чата');
            }
        } catch {
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

        const updatedMessages = saveMessageToStorage(selectedChat, newMessageObj);
        setMessages(updatedMessages);
        setNewMessage("");

        await sendMessageToServer(selectedChat, newMessage);
    };

    const sendMessageToServer = async (chatId: number, messageText: string) => {
        if (!currentUser) return;
        try {
            const token = getAuthToken();
            if (!token) return;

            const response = await fetch(`${API_BASE_URL}/api/chats/${chatId}`, {
                method: 'PATCH',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/merge-patch+json' },
                body: JSON.stringify({
                    message: [{ text: messageText, author: `/api/users/${currentUser.id}` }]
                })
            });

            if (response.ok) fetchChatMessages(chatId);
        } catch (err) {
            console.error('Error sending message to server:', err);
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

    const getLastMessageTime = (chat: ApiChat) => {
        try {
            const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
            if (stored) {
                const allMessages = JSON.parse(stored);
                const chatMessages = allMessages[chat.id] || [];
                if (chatMessages.length > 0) return chatMessages[chatMessages.length - 1].time;
            }
        } catch {}
        return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const getLastMessageText = (chat: ApiChat) => {
        try {
            const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
            if (stored) {
                const allMessages = JSON.parse(stored);
                const chatMessages = allMessages[chat.id] || [];
                if (chatMessages.length > 0) return chatMessages[chatMessages.length - 1].text;
            }
        } catch {}
        return 'Нет сообщений';
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
                    {chats.length === 0 ? (
                        <div className={styles.noChatsContainer}>
                            <div className={styles.noChats}>Чатов нет</div>
                            <button className={styles.createChatButton} onClick={handleCreateChatClick}>Создать чат</button>
                        </div>
                    ) : (
                        chats.map(chat => {
                            const interlocutor = getInterlocutorFromChat(chat);
                            return (
                                <div key={chat.id} className={`${styles.chatItem} ${selectedChat === chat.id ? styles.selected : ""}`} onClick={() => setSelectedChat(chat.id)}>
                                    <div className={styles.avatar}>{interlocutor?.name.charAt(0)}{interlocutor?.surname.charAt(0)}</div>
                                    <div className={styles.chatInfo}>
                                        <div className={styles.name}>{interlocutor?.name} {interlocutor?.surname}</div>
                                        <div className={styles.specialty}>{interlocutor?.email}</div>
                                        <div className={styles.lastMessage}>{getLastMessageText(chat)}</div>
                                    </div>
                                    <div className={styles.chatMeta}>
                                        <div className={styles.time}>{getLastMessageTime(chat)}</div>
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
                            <input type="text" placeholder="Введите сообщение" className={styles.inputField} value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onKeyPress={handleKeyPress} />
                            <button className={styles.sendButton} onClick={sendMessage} disabled={!newMessage.trim()}>Отправить</button>
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
