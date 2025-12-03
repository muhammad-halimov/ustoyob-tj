import React, { useState, useEffect, useRef } from "react";
import { getAuthToken } from "../../utils/auth";
import styles from "./Chat.module.scss";
import {useNavigate, useSearchParams} from 'react-router-dom';
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
    isOnline?: boolean;
    lastSeen?: string;
    approved?: boolean;
    active?: boolean;
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
    images: string[];
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
    const [isMobileChatActive, setIsMobileChatActive] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const API_BASE_URL = 'https://admin.ustoyob.tj';
    const POLLING_INTERVAL = 5000;

    const [searchParams] = useSearchParams();
    const chatIdFromUrl = searchParams.get('chatId');
    const navigate = useNavigate();

    // Инициализация пользователя и чатов
    useEffect(() => {
        const initializeChat = async () => {
            console.log('Initializing chat...');
            await getCurrentUser();
        };
        initializeChat();
    }, []);

    // Загрузка чатов после получения текущего пользователя
    useEffect(() => {
        if (currentUser) {
            console.log('User loaded, fetching chats...');
            fetchChats();
        }
    }, [currentUser]);

    // Обработка выбранного чата
    useEffect(() => {
        if (selectedChat) {
            console.log('Starting polling for chat:', selectedChat);
            startPolling(selectedChat);
            if (window.innerWidth <= 480) {
                setIsMobileChatActive(true);
            }
        } else {
            setMessages([]);
            stopPolling();
        }
        return () => stopPolling();
    }, [selectedChat]);

    // Обработка chatId из URL
    useEffect(() => {
        if (chatIdFromUrl) {
            const chatId = parseInt(chatIdFromUrl);
            console.log('Chat ID from URL:', chatId);
            setSelectedChat(chatId);
        }
    }, [chatIdFromUrl]);

    // Прокрутка к последнему сообщению
    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const getInterlocutorFromChat = (chat: ApiChat | undefined): ApiUser | null => {
        if (!chat || !currentUser) return null;

        console.log('DEBUG - getInterlocutorFromChat:', {
            currentUserId: currentUser.id,
            chatAuthorId: chat.author?.id,
            chatReplyAuthorId: chat.replyAuthor?.id
        });

        if (!chat.author || !chat.replyAuthor) {
            console.error('Invalid chat structure:', chat);
            return null;
        }

        // Определяем, кто собеседник
        if (chat.author.id === currentUser.id) {
            return chat.replyAuthor;
        } else if (chat.replyAuthor.id === currentUser.id) {
            return chat.author;
        } else {
            console.error('Current user is neither author nor replyAuthor of this chat!');
            return null;
        }
    };

    // const fetchChatById = async (chatId: number) => {
    //     try {
    //         const token = getAuthToken();
    //         if (!token) return;
    //
    //         const response = await fetch(`${API_BASE_URL}/api/chats/${chatId}`, {
    //             headers: {
    //                 'Authorization': `Bearer ${token}`,
    //                 'Accept': 'application/json',
    //             },
    //         });
    //
    //         if (response.ok) {
    //             const chatData = await response.json();
    //             console.log('Fetched chat by ID:', chatData);
    //             setChats(prev => {
    //                 const exists = prev.find(chat => chat.id === chatId);
    //                 if (!exists) {
    //                     return [...prev, chatData];
    //                 }
    //                 return prev.map(chat => chat.id === chatId ? chatData : chat);
    //             });
    //         }
    //     } catch (error) {
    //         console.error('Error fetching chat by ID:', error);
    //     }
    // };

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
            if (!token) {
                console.log('No token for fetching messages');
                return;
            }

            console.log('Fetching messages for chat:', chatId);
            const response = await fetch(`${API_BASE_URL}/api/chats/${chatId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json',
                },
            });

            if (response.ok) {
                const chatData: ApiChat = await response.json();

                // Обновляем список чатов
                setChats(prev => {
                    const chatIndex = prev.findIndex(c => c.id === chatId);
                    if (chatIndex === -1) {
                        return [...prev, chatData];
                    }
                    const newChats = [...prev];
                    newChats[chatIndex] = {
                        ...newChats[chatIndex],
                        messages: chatData.messages || []
                    };
                    return newChats;
                });

                // Форматируем сообщения
                if (currentUser) {
                    const formatted: Message[] = (chatData.messages || []).map(msg => ({
                        id: msg.id,
                        sender: msg.author.id === currentUser.id ? "me" : "other",
                        name: `${msg.author.name} ${msg.author.surname}`,
                        text: msg.text,
                        time: msg.createdAt
                            ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            : ""
                    }));

                    setMessages(formatted);
                }
            } else {
                console.error(`Error fetching chat messages: ${response.status}`);
            }
        } catch (err) {
            console.error('Error fetching chat messages:', err);
        }
    };

    const getCurrentUser = async (): Promise<ApiUser | null> => {
        try {
            const token = getAuthToken();
            if (!token) {
                console.log('No auth token available');
                setError("Необходима авторизация");
                setIsLoading(false);
                return null;
            }

            const response = await fetch(`${API_BASE_URL}/api/users/me`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                },
            });

            if (response.ok) {
                const userData = await response.json();
                console.log('Current user loaded successfully:', {
                    id: userData.id,
                    name: userData.name
                });
                setCurrentUser(userData);
                return userData;
            } else {
                console.error('Failed to fetch current user:', response.status);
                setError("Ошибка авторизации");
                setIsLoading(false);
                return null;
            }
        } catch (err) {
            console.error('Error fetching current user:', err);
            setIsLoading(false);
            return null;
        }
    };

    const fetchChats = async () => {
        try {
            setIsLoading(true);
            setError(null);

            const token = getAuthToken();
            if (!token) {
                console.log('No auth token available');
                setIsLoading(false);
                return;
            }

            console.log('Fetching chats with token...');
            const response = await fetch(`${API_BASE_URL}/api/chats/me`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                },
            });

            let chatsData: ApiChat[] = [];

            if (response.ok) {
                const responseData = await response.json();
                console.log('Chats API response:', responseData);

                // Обрабатываем разные форматы ответа
                if (Array.isArray(responseData)) {
                    chatsData = responseData;
                } else if (responseData && typeof responseData === 'object') {
                    if (responseData['hydra:member'] && Array.isArray(responseData['hydra:member'])) {
                        chatsData = responseData['hydra:member'];
                    } else if (responseData.id) {
                        chatsData = [responseData];
                    }
                }

                console.log(`Parsed ${chatsData.length} chats`);
            } else {
                console.warn(`Failed to fetch chats (status: ${response.status})`);
            }

            setChats(chatsData);

            // Если есть chatId из URL и он есть в списке чатов, выбираем его
            if (chatIdFromUrl) {
                const chatId = parseInt(chatIdFromUrl);
                const chatExists = chatsData.some(chat => chat.id === chatId);
                if (chatExists) {
                    setSelectedChat(chatId);
                }
            } else if (chatsData.length > 0 && !selectedChat) {
                setSelectedChat(chatsData[0].id);
            }
        } catch (error) {
            console.error('Error fetching chats:', error);
            setError("Ошибка загрузки чатов");
        } finally {
            setIsLoading(false);
        }
    };

    const sendMessage = async () => {
        if (!newMessage.trim() || !selectedChat || !currentUser) {
            console.log('Cannot send message:', {
                newMessage,
                selectedChat,
                hasCurrentUser: !!currentUser
            });
            return;
        }

        const newMessageObj: Message = {
            id: Date.now(),
            sender: "me",
            name: `${currentUser.name} ${currentUser.surname}`,
            text: newMessage,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        // Добавляем сообщение в локальный стейт сразу
        setMessages(prev => [...prev, newMessageObj]);
        setNewMessage("");

        await sendMessageToServer(selectedChat, newMessage);
    };

    const sendMessageToServer = async (chatId: number, messageText: string) => {
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
                fetchChatMessages(chatId);
            } else {
                console.error('Ошибка отправки сообщения:', response.status);
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

    const handleChatSelect = (chatId: number) => {
        console.log('Selecting chat:', chatId);
        setSelectedChat(chatId);
        if (window.innerWidth <= 480) {
            setIsMobileChatActive(true);
        }
    };

    const handleBackToChatList = () => {
        setIsMobileChatActive(false);
        setSelectedChat(null);
    };

    const handleBackToHome = () => {
        navigate('/');
    }

    const currentChat = chats.find(chat => chat.id === selectedChat);
    const currentInterlocutor = currentChat ? getInterlocutorFromChat(currentChat) : null;
    const showChatArea = selectedChat !== null && currentInterlocutor !== null;

    if (isLoading) return <div className={styles.chat}>Загрузка чатов...</div>;

    return (
        <div className={`${styles.chat} ${isMobileChatActive ? styles.chatAreaActive : ''}`}>
            {/* Sidebar */}
            <div className={styles.sidebar}>
                {window.innerWidth <= 480 && (
                    <div className={styles.mobileNav}>
                        <button
                            className={styles.navBackButton}
                            onClick={handleBackToHome}
                            aria-label="Вернуться на главную"
                        >
                            Назад
                        </button>
                        {/*<span className={styles.navTitle}>Чаты</span>*/}
                    </div>
                )}
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
                        </div>
                    ) : (
                        chats.map(chat => {
                            const interlocutor = getInterlocutorFromChat(chat);
                            if (!interlocutor) {
                                console.warn('No interlocutor found for chat:', chat);
                                return null;
                            }

                            return (
                                <div key={chat.id} className={`${styles.chatItem} ${selectedChat === chat.id ? styles.selected : ""}`} onClick={() => handleChatSelect(chat.id)}>
                                    <div className={styles.avatar}>
                                        {interlocutor.image ? (
                                            <img
                                                src={interlocutor.image}
                                                className={styles.avatarImage}
                                                alt={`${interlocutor.name} ${interlocutor.surname}`}
                                            />
                                        ) : (
                                            `${interlocutor.name?.charAt(0) || ''}${interlocutor.surname?.charAt(0) || ''}`
                                        )}
                                        {interlocutor.isOnline && (
                                            <div className={styles.onlineIndicator} />
                                        )}
                                    </div>
                                    <div className={styles.chatInfo}>
                                        <div className={styles.name}>{interlocutor.name} {interlocutor.surname}</div>
                                        <div className={styles.specialty}>{interlocutor.email}</div>
                                        <div className={styles.lastMessage}>{getLastMessageText(chat)}</div>
                                    </div>
                                    <div className={styles.chatMeta}>
                                        <div className={styles.time}>{getLastMessageTime(chat)}</div>
                                        {!interlocutor.isOnline && interlocutor.lastSeen && (
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
                                {/* Кнопка "Назад" для всех устройств */}
                                <button
                                    className={styles.backButton}
                                    onClick={handleBackToChatList}
                                    aria-label="Вернуться к списку чатов"
                                >
                                    ←
                                </button>
                                <div className={styles.avatar}>
                                    {currentInterlocutor.name?.charAt(0)}{currentInterlocutor.surname?.charAt(0)}
                                    {currentInterlocutor.isOnline && (
                                        <div className={styles.onlineIndicator} />
                                    )}
                                </div>
                                <div className={styles.headerInfo}>
                                    <div className={styles.name}>
                                        {currentInterlocutor.name} {currentInterlocutor.surname}
                                    </div>
                                    <div className={styles.status}>
                                        {currentInterlocutor.isOnline ? 'онлайн' : 'оффлайн'}
                                        {!currentInterlocutor.isOnline && currentInterlocutor.lastSeen && (
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
                                <div className={styles.messagesContainer}>
                                    {messages.map(msg => {
                                        return (
                                            <div
                                                key={msg.id}
                                                className={`${styles.message} ${msg.sender === "me" ? styles.myMessage : styles.theirMessage}`}
                                            >
                                                {msg.sender === "other" && (
                                                    <div className={styles.messageName}>{msg.name}</div>
                                                )}
                                                <div className={styles.messageContent}>
                                                    <div className={styles.messageText}>{msg.text}</div>
                                                    <div className={styles.messageTime}>{msg.time}</div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
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
                        {chats.length === 0 ? "У вас пока нет чатов" : "Выберите чат для общения"}
                    </div>
                )}

                {error && (
                    <div className={styles.error}>
                        {error}
                        <button onClick={() => setError(null)} className={styles.closeError}>×</button>
                    </div>
                )}
            </div>
        </div>
    );
}

export default Chat;