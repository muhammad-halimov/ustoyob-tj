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
    isOnline?: boolean;
    lastSeen?: string;
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
    const [isMobileChatActive, setIsMobileChatActive] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const API_BASE_URL = 'https://admin.ustoyob.tj';
    const POLLING_INTERVAL = 5000;

    const [searchParams] = useSearchParams();
    const chatIdFromUrl = searchParams.get('chatId');

    // Отладочный эффект
    useEffect(() => {
        console.log('DEBUG - Current user data:', {
            id: currentUser?.id,
            name: currentUser?.name,
            email: currentUser?.email
        });

        const currentChat = chats.find(c => c.id === selectedChat);
        if (currentChat && currentUser) {
            console.log('DEBUG - Selected chat analysis:', {
                chatId: selectedChat,
                chatAuthorId: currentChat.author?.id,
                chatReplyAuthorId: currentChat.replyAuthor?.id,
                currentUserId: currentUser.id,
                currentUserIsAuthor: currentChat.author.id === currentUser.id,
                currentUserIsReplyAuthor: currentChat.replyAuthor.id === currentUser.id
            });
        }
    }, [currentUser, selectedChat, chats]);

    useEffect(() => {
        const initializeChat = async () => {
            console.log('Initializing chat...');
            const user = await getCurrentUser();
            if (user) {
                console.log('User loaded, fetching chats...');
                await fetchChats();
            }
        };
        initializeChat();
    }, []);

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

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        if (chatIdFromUrl) {
            const chatId = parseInt(chatIdFromUrl);
            console.log('Chat ID from URL:', chatId);
            setSelectedChat(chatId);
            if (!chats.find(chat => chat.id === chatId)) {
                fetchChatById(chatId);
            }
        }
    }, [chatIdFromUrl, chats]);

    useEffect(() => {
        if (currentUser && selectedChat) {
            console.log('DEBUG - currentUser loaded, checking if we need to fetch messages');
            // Если сообщений нет, но чат выбран - загружаем сообщения
            if (messages.length === 0) {
                console.log('DEBUG - No messages, fetching for chat:', selectedChat);
                fetchChatMessages(selectedChat);
            }
        }
    }, [currentUser, selectedChat]);

    const getInterlocutorFromChat = (chat: ApiChat | undefined): ApiUser | null => {
        if (!chat || !currentUser) return null;

        console.log('DEBUG - getInterlocutorFromChat:', {
            currentUserId: currentUser.id,
            chatAuthorId: chat.author?.id,
            chatReplyAuthorId: chat.replyAuthor?.id,
            chatAuthorName: chat.author?.name,
            chatReplyAuthorName: chat.replyAuthor?.name
        });

        if (!chat.author || !chat.replyAuthor) {
            console.error('Invalid chat structure:', chat);
            return null;
        }

        if (!chat.author.id || !chat.replyAuthor.id) {
            console.error('Chat authors missing ID:', chat);
            return null;
        }

        // Определяем, кто собеседник
        if (chat.author.id === currentUser.id) {
            console.log('Current user is AUTHOR, interlocutor is REPLY_AUTHOR');
            return chat.replyAuthor;
        } else if (chat.replyAuthor.id === currentUser.id) {
            console.log('Current user is REPLY_AUTHOR, interlocutor is AUTHOR');
            return chat.author;
        } else {
            console.error('Current user is neither author nor replyAuthor of this chat!');
            console.error('Current user ID:', currentUser.id);
            console.error('Chat author ID:', chat.author.id);
            console.error('Chat replyAuthor ID:', chat.replyAuthor.id);
            return null;
        }
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
                console.log('Fetched chat by ID:', chatData);
                setChats(prev => {
                    const exists = prev.find(chat => chat.id === chatId);
                    if (!exists) {
                        return [...prev, chatData];
                    }
                    return prev.map(chat => chat.id === chatId ? chatData : chat);
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
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json',
                },
            });

            if (response.ok) {
                const chatData: ApiChat = await response.json();
                console.log('Raw chat data received:', {
                    chatId: chatData.id,
                    messagesCount: chatData.messages?.length || 0,
                    authorId: chatData.author?.id,
                    replyAuthorId: chatData.replyAuthor?.id
                });

                // Если currentUser еще не загружен, ждем
                if (!currentUser) {
                    console.log('DEBUG - currentUser not ready yet, waiting...');
                    setTimeout(() => {
                        if (currentUser) {
                            processApiMessages(chatId, chatData.messages || []);
                        } else {
                            console.log('DEBUG - Still no currentUser after timeout');
                            // Пробуем еще раз через секунду
                            setTimeout(() => {
                                if (currentUser) {
                                    processApiMessages(chatId, chatData.messages || []);
                                }
                            }, 1000);
                        }
                    }, 500);
                } else {
                    processApiMessages(chatId, chatData.messages || []);
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
        if (!currentUser) {
            console.log('DEBUG - currentUser is null, will process later or wait for it');
            // Сохраняем сообщения и обработаем их, когда появится currentUser
            const savedMessages = apiMessages;
            const savedChatId = chatId;

            // Проверяем, есть ли сохраненные сообщения для этого чата
            if (apiMessages.length > 0) {
                // Ждем немного и проверяем снова
                setTimeout(() => {
                    if (currentUser) {
                        console.log('DEBUG - Now have currentUser, processing saved messages');
                        processMessagesWithUser(savedChatId, savedMessages);
                    }
                }, 100);
            }
            return;
        }

        processMessagesWithUser(chatId, apiMessages);
    };

// Новая функция для обработки сообщений с currentUser
    const processMessagesWithUser = (chatId: number, apiMessages: ApiMessage[]) => {
        console.log('DEBUG - Processing messages for user:', {
            currentUserId: currentUser!.id,
            currentUserName: `${currentUser!.name} ${currentUser!.surname}`,
            totalMessages: apiMessages.length
        });

        const formatted: Message[] = apiMessages.map(msg => {
            const isFromMe = msg.author.id === currentUser!.id;

            console.log('DEBUG - Message details:', {
                messageId: msg.id,
                authorId: msg.author.id,
                authorName: `${msg.author.name} ${msg.author.surname}`,
                currentUserId: currentUser!.id,
                currentUserName: `${currentUser!.name} ${currentUser!.surname}`,
                isFromMe: isFromMe,
                textPreview: msg.text.substring(0, 30)
            });

            return {
                id: msg.id,
                sender: isFromMe ? "me" : "other",
                name: `${msg.author.name} ${msg.author.surname}`,
                text: msg.text,
                time: msg.createdAt
                    ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : ""
            };
        });

        console.log('DEBUG - Final formatted messages summary:',
            formatted.map(m => `${m.sender === "me" ? "→" : "←"} ${m.name}: ${m.text.substring(0, 20)}...`)
        );

        if (selectedChat === chatId) {
            console.log('Setting messages for selected chat');
            setMessages(formatted);
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
                method: 'GET',
                headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' },
            });

            if (response.ok) {
                const userData = await response.json();
                console.log('Current user loaded successfully:', {
                    id: userData.id,
                    name: userData.name,
                    email: userData.email
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
                console.log('No auth token, using mock chats');
                const mockChats = createMockChats();
                setChats(mockChats);
                if (mockChats.length > 0 && !selectedChat) {
                    setSelectedChat(mockChats[0].id);
                }
                setIsLoading(false);
                return;
            }

            console.log('Fetching chats with token...');
            const response = await fetch(`${API_BASE_URL}/api/chats/me`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                },
            });

            let chatsData: ApiChat[] = [];

            if (response.ok) {
                try {
                    const responseData = await response.json();
                    console.log('Chats API response:', responseData);

                    // Обрабатываем разные форматы ответа
                    if (Array.isArray(responseData)) {
                        chatsData = responseData;
                    } else if (responseData && typeof responseData === 'object') {
                        // API Platform формат
                        if (responseData['hydra:member'] && Array.isArray(responseData['hydra:member'])) {
                            chatsData = responseData['hydra:member'];
                        } else if (responseData.id) {
                            // Одиночный объект
                            chatsData = [responseData];
                        }
                    }

                    console.log(`Parsed ${chatsData.length} chats`);

                    // Добавляем тестовые сообщения для дебага
                    if (chatsData.length > 0 && process.env.NODE_ENV === 'development') {
                        chatsData = chatsData.map(chat => ({
                            ...chat,
                            messages: [
                                ...(chat.messages || []),
                                {
                                    id: 999991,
                                    text: "Тест: мое сообщение (синий справа)",
                                    image: "",
                                    author: currentUser || { id: 0, email: "", name: "Тест", surname: "Пользователь", phone1: "", phone2: "" },
                                    createdAt: new Date().toISOString()
                                },
                                {
                                    id: 999992,
                                    text: "Тест: сообщение собеседника (серый слева)",
                                    image: "",
                                    author: chat.author.id === currentUser?.id ? chat.replyAuthor : chat.author,
                                    createdAt: new Date().toISOString()
                                }
                            ].filter(m => m.author.id > 0)
                        }));
                    }
                } catch (parseError) {
                    console.error('Error parsing chats response:', parseError);
                    chatsData = createMockChats();
                }
            } else {
                console.warn(`Failed to fetch chats (status: ${response.status}), using mock data`);
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

        console.log('Creating mock chats for user:', currentUser.id);

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
                messages: [
                    {
                        id: 1,
                        text: "Это мое тестовое сообщение (должно быть справа синее)",
                        image: "",
                        author: currentUser,
                        createdAt: new Date().toISOString()
                    },
                    {
                        id: 2,
                        text: "Это тестовое сообщение собеседника (должно быть слева серое)",
                        image: "",
                        author: {
                            id: 2,
                            email: "master@example.com",
                            name: "Алишер",
                            surname: "Каримов",
                            phone1: "+992123456789",
                            phone2: ""
                        },
                        createdAt: new Date().toISOString()
                    }
                ],
                images: []
            }
        ];
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

        console.log('DEBUG - Sending message:', {
            currentUserId: currentUser.id,
            currentUserName: currentUser.name,
            message: newMessage
        });

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

    const handleChatSelect = (chatId: number) => {
        console.log('Selecting chat:', chatId);
        setSelectedChat(chatId);
        if (window.innerWidth <= 480) {
            setIsMobileChatActive(true);
        }
    };

    const handleBackToChatList = () => {
        setIsMobileChatActive(false);
    };

    const currentChat = chats.find(chat => chat.id === selectedChat);
    const currentInterlocutor = currentChat ? getInterlocutorFromChat(currentChat) : null;
    const showChatArea = selectedChat !== null && currentInterlocutor !== null;

    const chatContainerClass = `${styles.chat} ${isMobileChatActive ? styles.chatAreaActive : ''}`;

    if (isLoading) return <div className={styles.chat}>Загрузка чатов...</div>;

    return (
        <div className={chatContainerClass}>
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
                                <button
                                    className={styles.backButton}
                                    onClick={handleBackToChatList}
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
        </div>
    );
}

export default Chat;