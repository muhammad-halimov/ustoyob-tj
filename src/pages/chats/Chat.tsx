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

// Интерфейсы для API
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
}

interface ApiChat {
    id: number;
    messageAuthor: ApiUser;
    replyAuthor: ApiUser;
    message: ApiMessage[];
}

function Chat() {
    const [activeTab, setActiveTab] = useState<"active" | "archive">("active");
    const [selectedChat, setSelectedChat] = useState<number | null>(null);
    const [chats, setChats] = useState<ApiChat[]>([]);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const API_BASE_URL = 'http://usto.tj.auto-schule.site';

    // Загрузка чатов при монтировании компонента
    useEffect(() => {
        fetchChats();
    }, []);

    // Загрузка сообщений при выборе чата
    useEffect(() => {
        if (selectedChat) {
            fetchChatMessages(selectedChat);
        }
    }, [selectedChat]);

    // Прокрутка к последнему сообщению
    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const fetchChats = async () => {
        try {
            setIsLoading(true);
            const token = getAuthToken();

            if (!token) {
                setError("Необходима авторизация");
                return;
            }

            const response = await fetch(`${API_BASE_URL}/api/chats/me`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
            });

            if (response.status === 401) {
                setError("Ошибка авторизации");
                return;
            }

            if (!response.ok) {
                throw new Error(`Ошибка загрузки чатов: ${response.status}`);
            }

            const chatsData: ApiChat[] = await response.json();
            setChats(chatsData);

            // Автоматически выбираем первый чат, если есть
            if (chatsData.length > 0 && !selectedChat) {
                setSelectedChat(chatsData[0].id);
            }

        } catch (err) {
            console.error('Error fetching chats:', err);
            setError('Ошибка при загрузке чатов');
        } finally {
            setIsLoading(false);
        }
    };

    const fetchChatMessages = async (chatId: number) => {
        try {
            const token = getAuthToken();

            if (!token) {
                setError("Необходима авторизация");
                return;
            }

            const response = await fetch(`${API_BASE_URL}/api/chats/${chatId}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error(`Ошибка загрузки сообщений: ${response.status}`);
            }

            const chatData: ApiChat = await response.json();

            // Получаем текущего пользователя для определения отправителя
            const currentUser = await getCurrentUser();

            // Преобразуем сообщения из API в формат компонента
            const transformedMessages: Message[] = chatData.message.map(msg => {
                const isMe = currentUser && msg.author.id === currentUser.id;

                return {
                    id: msg.id,
                    sender: isMe ? "me" : "other",
                    name: `${msg.author.name} ${msg.author.surname}`,
                    text: msg.text,
                    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                };
            });

            setMessages(transformedMessages);

        } catch (err) {
            console.error('Error fetching chat messages:', err);
            setError('Ошибка при загрузке сообщений');
        }
    };

    const sendMessage = async () => {
        if (!newMessage.trim() || !selectedChat) return;

        try {
            const token = getAuthToken();

            if (!token) {
                setError("Необходима авторизация");
                return;
            }

            // Получаем текущего пользователя
            const currentUser = await getCurrentUser();
            if (!currentUser) {
                setError("Не удалось получить данные пользователя");
                return;
            }

            // Создаем временное сообщение для немедленного отображения
            const tempMessage: Message = {
                id: Date.now(), // Временный ID
                sender: "me",
                name: `${currentUser.name} ${currentUser.surname}`,
                text: newMessage,
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            };

            setMessages(prev => [...prev, tempMessage]);
            setNewMessage("");

            // Отправляем сообщение на сервер
            const response = await fetch(`${API_BASE_URL}/api/chats/${selectedChat}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/merge-patch+json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify({
                    message: [
                        {
                            text: newMessage,
                            author: `/api/users/${currentUser.id}`
                        }
                    ]
                })
            });

            if (!response.ok) {
                throw new Error(`Ошибка отправки сообщения: ${response.status}`);
            }

            // Обновляем чаты после отправки сообщения
            fetchChats();

        } catch (err) {
            console.error('Error sending message:', err);
            setError('Ошибка при отправке сообщения');
            // Удаляем временное сообщение в случае ошибки
            setMessages(prev => prev.filter(msg => msg.id !== Date.now()));
        }
    };

    const getCurrentUser = async (): Promise<ApiUser | null> => {
        try {
            const token = getAuthToken();

            if (!token) return null;

            const response = await fetch(`${API_BASE_URL}/api/users/me`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json',
                },
            });

            if (response.ok) {
                return await response.json();
            }
            return null;
        } catch (error) {
            console.error('Error fetching current user:', error);
            return null;
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    const formatTime = (dateString: string) => {
        return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const getLastMessageTime = (chat: ApiChat) => {
        if (chat.message.length === 0) return '';
        return formatTime(new Date().toISOString());
    };

    const getInterlocutor = async (chat: ApiChat): Promise<ApiUser | null> => {
        const currentUser = await getCurrentUser();
        if (!currentUser) return null;

        // Определяем собеседника: если текущий пользователь - автор сообщения, то собеседник - replyAuthor, и наоборот
        return chat.messageAuthor.id === currentUser.id ? chat.replyAuthor : chat.messageAuthor;
    };

    const [interlocutor, setInterlocutor] = useState<ApiUser | null>(null);

    // Загружаем информацию о собеседнике при смене чата
    const currentChat = chats.find(chat => chat.id === selectedChat);

    useEffect(() => {
        const loadInterlocutor = async () => {
            if (currentChat) {
                const interlocutorData = await getInterlocutor(currentChat);
                setInterlocutor(interlocutorData);
            }
        };

        loadInterlocutor();
    }, [currentChat]);

    // const currentChat = chats.find(chat => chat.id === selectedChat);

    if (isLoading) {
        return <div className={styles.chat}>Загрузка чатов...</div>;
    }

    return (
        <div className={styles.chat}>
            <div className={styles.sidebar}>
                <div className={styles.searchBar}>
                    <svg className={styles.searchIcon} width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <g clipPath="url(#clip0_324_3513)">
                            <path d="M9.9975 16.1825C13.6895 16.1825 16.6825 13.1895 16.6825 9.4975C16.6825 5.80548 13.6895 2.8125 9.9975 2.8125C6.30548 2.8125 3.3125 5.80548 3.3125 9.4975C3.3125 13.1895 6.30548 16.1825 9.9975 16.1825Z" stroke="#3A54DA" strokeWidth="2" strokeMiterlimit="10"/>
                            <path d="M21.6875 21.1876L14.5912 14.0913" stroke="#3A54DA" strokeWidth="2" strokeMiterlimit="10"/>
                        </g>
                        <defs>
                            <clipPath id="clip0_324_3513">
                                <rect width="21" height="21" fill="white" transform="translate(2 1.5)"/>
                            </clipPath>
                        </defs>
                    </svg>
                    <input
                        type="text"
                        placeholder="Поиск"
                        className={styles.searchInput}
                    />
                </div>

                <div className={styles.tabs}>
                    <button
                        className={`${styles.tab} ${activeTab === "active" ? styles.active : ""}`}
                        onClick={() => setActiveTab("active")}
                    >
                        Активные
                    </button>
                    <button
                        className={`${styles.tab} ${activeTab === "archive" ? styles.active : ""}`}
                        onClick={() => setActiveTab("archive")}
                    >
                        Архив
                    </button>
                </div>

                <div className={styles.chatList}>
                    {chats.length === 0 ? (
                        <div className={styles.noChats}>Нет активных чатов</div>
                    ) : (
                        chats.map(async (chat) => {
                            const interlocutor = await getInterlocutor(chat);
                            const lastMessage = chat.message[chat.message.length - 1];

                            return (
                                <div
                                    key={chat.id}
                                    className={`${styles.chatItem} ${selectedChat === chat.id ? styles.selected : ""}`}
                                    onClick={() => setSelectedChat(chat.id)}
                                >
                                    <div className={styles.avatar}>
                                        {interlocutor?.name?.charAt(0)}{interlocutor?.surname?.charAt(0)}
                                    </div>
                                    <div className={styles.chatInfo}>
                                        <div className={styles.name}>
                                            {interlocutor?.name} {interlocutor?.surname}
                                        </div>
                                        <div className={styles.specialty}>
                                            {interlocutor?.email}
                                        </div>
                                        <div className={styles.lastMessage}>
                                            {lastMessage?.text || 'Нет сообщений'}
                                        </div>
                                    </div>
                                    <div className={styles.chatMeta}>
                                        <svg className={styles.star} width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <g clipPath="url(#clip0_186_6434)">
                                                <g clipPath="url(#clip1_186_6434)">
                                                    <path d="M12 2.49023L15.51 8.17023L22 9.76023L17.68 14.8502L18.18 21.5102L12 18.9802L5.82 21.5102L6.32 14.8502L2 9.76023L8.49 8.17023L12 2.49023Z" stroke="black" strokeWidth="2" strokeMiterlimit="10"/>
                                                    <path d="M12 19V18.98" stroke="black" strokeWidth="2" strokeMiterlimit="10"/>
                                                </g>
                                            </g>
                                            <defs>
                                                <clipPath id="clip0_186_6434">
                                                    <rect width="24" height="24" fill="white"/>
                                                </clipPath>
                                                <clipPath id="clip1_186_6434">
                                                    <rect width="24" height="24" fill="white"/>
                                                </clipPath>
                                            </defs>
                                        </svg>
                                        <div className={styles.time}>
                                            {getLastMessageTime(chat)}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            <div className={styles.chatArea}>
                {currentChat && interlocutor ? (
                    <>
                        <div className={styles.chatHeader}>
                            <div className={styles.headerLeft}>
                                <div className={styles.avatar}>
                                    {interlocutor.name?.charAt(0)}{interlocutor.surname?.charAt(0)}
                                </div>
                                <div className={styles.headerInfo}>
                                    <div className={styles.name}>
                                        {interlocutor.name} {interlocutor.surname}
                                    </div>
                                    <div className={styles.order}>онлайн</div>
                                </div>
                            </div>
                            <div className={styles.headerRight}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <g clipPath="url(#clip0_186_6434)">
                                        <g clipPath="url(#clip1_186_6434)">
                                            <path d="M12 2.49023L15.51 8.17023L22 9.76023L17.68 14.8502L18.18 21.5102L12 18.9802L5.82 21.5102L6.32 14.8502L2 9.76023L8.49 8.17023L12 2.49023Z" stroke="black" strokeWidth="2" strokeMiterlimit="10"/>
                                            <path d="M12 19V18.98" stroke="black" strokeWidth="2" strokeMiterlimit="10"/>
                                        </g>
                                    </g>
                                    <defs>
                                        <clipPath id="clip0_186_6434">
                                            <rect width="24" height="24" fill="white"/>
                                        </clipPath>
                                        <clipPath id="clip1_186_6434">
                                            <rect width="24" height="24" fill="white"/>
                                        </clipPath>
                                    </defs>
                                </svg>
                                <div className={styles.time}>
                                    {getLastMessageTime(currentChat)}
                                </div>
                            </div>
                        </div>

                        <div className={styles.chatMessages}>
                            <div className={styles.date}>
                                {new Date().toLocaleDateString('ru-RU', {
                                    day: 'numeric',
                                    month: 'long',
                                    year: 'numeric'
                                })}
                            </div>
                            {messages.map(msg => (
                                <div
                                    key={msg.id}
                                    className={`${styles.message} ${msg.sender === "me" ? styles.myMessage : styles.theirMessage}`}
                                >
                                    <div className={styles.messageName}>{msg.name}</div>
                                    <div className={styles.messageText}>{msg.text}</div>
                                    <div className={styles.messageTime}>{msg.time}</div>
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>

                        <div className={styles.chatInput}>
                            <svg
                                width="24"
                                height="24"
                                viewBox="0 0 24 24"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                                className={styles.attachmentIcon}
                            >
                                <path d="M21.44 11.05L12.25 20.24C11.1242 21.3658 9.59723 21.9983 8.00502 21.9983C6.41282 21.9983 4.88585 21.3658 3.76002 20.24C2.6342 19.1142 2.00171 17.5872 2.00171 15.995C2.00171 14.4028 2.6342 12.8758 3.76002 11.75L12.95 2.56C13.7006 1.80944 14.7186 1.3877 15.78 1.3877C16.8415 1.3877 17.8595 1.80944 18.61 2.56C19.3606 3.31056 19.7823 4.32855 19.7823 5.39C19.7823 6.45145 19.3606 7.46944 18.61 8.22L9.41002 17.41C9.03473 17.7853 8.52574 17.9961 7.99502 17.9961C7.46431 17.9961 6.95532 17.7853 6.58002 17.41C6.20473 17.0347 5.99393 16.5257 5.99393 15.995C5.99393 15.4643 6.20473 14.9553 6.58002 14.58L15.07 6.1" stroke="#3A54DA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>

                            <input
                                type="text"
                                placeholder="Введите сообщение"
                                className={styles.inputField}
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                onKeyPress={handleKeyPress}
                                disabled={!selectedChat}
                            />

                            <button
                                className={styles.sendButton}
                                onClick={sendMessage}
                                disabled={!newMessage.trim() || !selectedChat}
                            >
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M22 2L11 13" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
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
                        <button onClick={() => setError(null)} className={styles.closeError}>
                            ×
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

export default Chat;