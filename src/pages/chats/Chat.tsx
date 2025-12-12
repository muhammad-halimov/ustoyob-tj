import React, { useState, useEffect, useRef } from "react";
import { getAuthToken } from "../../utils/auth";
import styles from "./Chat.module.scss";
import { useNavigate, useSearchParams } from 'react-router-dom';
import { IoSend, IoAttach, IoClose } from "react-icons/io5";

interface Message {
    id: number;
    sender: "me" | "other";
    name: string;
    text: string;
    time: string;
    type?: 'text' | 'image';
    imageUrl?: string;
    status?: 'pending' | 'uploading' | 'uploaded' | 'error';
    file?: File;
    progress?: number;
    isLocal?: boolean;
    createdAt?: string;
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
    images: UploadedImage[];
    createdAt?: string;
    updatedAt?: string;
}

interface UploadedImage {
    id: number;
    author: ApiUser;
    image: string;
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
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [isUploading, setIsUploading] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
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

    const getInterlocutorFromChat = (chat: ApiChat | undefined): ApiUser | null => {
        if (!chat || !currentUser) return null;

        if (!chat.author || !chat.replyAuthor) {
            console.error('Invalid chat structure:', chat);
            return null;
        }

        if (chat.author.id === currentUser.id) {
            return chat.replyAuthor;
        } else if (chat.replyAuthor.id === currentUser.id) {
            return chat.author;
        } else {
            console.error('Current user is neither author nor replyAuthor of this chat!');
            return null;
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
                console.log('Chat data received:', chatData);
                console.log('Images in chat data:', chatData.images);
                console.log('Messages in chat data:', chatData.messages);

                setChats(prev => {
                    const chatIndex = prev.findIndex(c => c.id === chatId);
                    if (chatIndex === -1) {
                        return [...prev, chatData];
                    }
                    const newChats = [...prev];
                    newChats[chatIndex] = {
                        ...newChats[chatIndex],
                        messages: chatData.messages || [],
                        images: chatData.images || []
                    };
                    return newChats;
                });

                if (currentUser) {
                    // Создаем массив всех элементов с временными метками
                    interface ChatItem {
                        id: number;
                        type: 'message' | 'image';
                        createdAt: Date;
                        data: ApiMessage | UploadedImage;
                    }

                    const allItems: ChatItem[] = [];

                    // Добавляем сообщения с их временными метками
                    (chatData.messages || []).forEach(msg => {
                        const createdAt = msg.createdAt ? new Date(msg.createdAt) : new Date();
                        allItems.push({
                            id: msg.id,
                            type: 'message',
                            createdAt,
                            data: msg
                        });
                    });

                    // Добавляем изображения
                    (chatData.images || []).forEach((imageObj: UploadedImage) => {
                        // Ищем соответствующее сообщение для этого изображения или используем текущее время
                        let createdAt = new Date(); // По умолчанию текущее время

                        // Пытаемся найти сообщение с этим imageId, если оно есть
                        const relatedMessage = chatData.messages?.find(m => m.image === imageObj.image);
                        if (relatedMessage?.createdAt) {
                            createdAt = new Date(relatedMessage.createdAt);
                        }

                        allItems.push({
                            id: imageObj.id,
                            type: 'image',
                            createdAt,
                            data: imageObj
                        });
                    });

                    // Сортируем все элементы по времени создания
                    allItems.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

                    // Преобразуем в массив сообщений для отображения
                    const allChatItems: Message[] = allItems.map(item => {
                        if (item.type === 'message') {
                            const msg = item.data as ApiMessage;
                            return {
                                id: msg.id,
                                sender: msg.author.id === currentUser.id ? "me" : "other",
                                name: `${msg.author.name} ${msg.author.surname}`,
                                text: msg.text,
                                type: 'text' as const,
                                time: item.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                                createdAt: item.createdAt.toISOString()
                            };
                        } else {
                            const imageObj = item.data as UploadedImage;
                            const isMyImage = imageObj.author.id === currentUser.id;

                            let imageUrl = imageObj.image;
                            if (!imageUrl.startsWith('http')) {
                                if (!imageUrl.startsWith('/')) {
                                    imageUrl = `/images/appeal_photos/${imageUrl}`;
                                }
                                imageUrl = `${API_BASE_URL}${imageUrl}`;
                            }

                            return {
                                id: imageObj.id,
                                sender: isMyImage ? "me" : "other",
                                name: `${imageObj.author.name} ${imageObj.author.surname}`,
                                text: '',
                                type: 'image' as const,
                                imageUrl: imageUrl,
                                time: item.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                                createdAt: item.createdAt.toISOString()
                            };
                        }
                    });

                    // Оставляем локальные временные сообщения
                    setMessages(prev => {
                        // Фильтруем только локальные сообщения
                        const localMessages = prev.filter(msg => msg.isLocal &&
                            (msg.status === 'pending' || msg.status === 'uploading' || msg.status === 'error'));

                        // Объединяем с серверными
                        const combinedMessages = [...localMessages, ...allChatItems];

                        // Сортируем все сообщения по времени
                        combinedMessages.sort((a, b) => {
                            const timeA = a.createdAt ? new Date(a.createdAt).getTime() :
                                (a.isLocal ? a.id : 0);
                            const timeB = b.createdAt ? new Date(b.createdAt).getTime() :
                                (b.isLocal ? b.id : 0);

                            return timeA - timeB;
                        });

                        return combinedMessages;
                    });
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

    // ===== ФУНКЦИИ ДЛЯ РАБОТЫ С ФАЙЛАМИ =====

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (files && files.length > 0) {
            const newFiles = Array.from(files);

            const validFiles = newFiles.filter(file => {
                const fileType = file.type;
                const isValid = fileType.startsWith('image/');
                if (!isValid) {
                    setError(`Файл ${file.name} не является изображением`);
                }
                return isValid;
            });

            setSelectedFiles(prev => [...prev, ...validFiles]);
        }

        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const uploadImageToChat = async (chatId: number, file: File): Promise<string | null> => {
        const token = getAuthToken();
        if (!token) {
            console.error('No token for uploading image');
            return null;
        }

        const formData = new FormData();
        formData.append('imageFile', file);

        try {
            const response = await fetch(`${API_BASE_URL}/api/chats/${chatId}/upload-photo`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
                body: formData,
            });

            if (response.ok) {
                const data = await response.json();
                console.log('Image uploaded successfully:', data);

                if (data.image) {
                    return data.image;
                } else if (data.images && data.images.length > 0) {
                    return data.images[0].image;
                }
                return null;
            } else {
                console.error('Error uploading image:', response.status);
                return null;
            }
        } catch (error) {
            console.error('Error uploading image:', error);
            return null;
        }
    };

    const uploadAllFiles = async () => {
        if (!selectedChat || selectedFiles.length === 0 || !currentUser) {
            console.log('Cannot upload files');
            return;
        }

        setIsUploading(true);
        setError(null);

        try {
            for (let i = 0; i < selectedFiles.length; i++) {
                const file = selectedFiles[i];
                const fileName = file.name;
                const now = new Date();

                // Создаем временное сообщение с файлом
                const tempMessageId = Date.now() + i;
                const tempMessage: Message = {
                    id: tempMessageId,
                    sender: "me" as const,
                    name: `${currentUser.name} ${currentUser.surname}`,
                    text: '',
                    type: 'image' as const,
                    file: file,
                    status: 'pending' as const,
                    progress: 0,
                    time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    isLocal: true,
                    createdAt: now.toISOString() // Добавляем временную метку
                };

                // Добавляем временное сообщение
                setMessages(prev => [...prev, tempMessage]);

                // Обновляем статус на загрузку
                setMessages(prev => prev.map(msg =>
                    msg.id === tempMessageId
                        ? { ...msg, status: 'uploading' as const, progress: 10 }
                        : msg
                ));

                // Загружаем файл
                const imageUrl = await uploadImageToChat(selectedChat, file);

                if (imageUrl) {
                    let fullImageUrl = imageUrl;
                    if (!fullImageUrl.startsWith('http')) {
                        if (!fullImageUrl.startsWith('/')) {
                            fullImageUrl = `/images/appeal_photos/${fullImageUrl}`;
                        }
                        fullImageUrl = `${API_BASE_URL}${fullImageUrl}`;
                    }

                    // Обновляем сообщение с загруженным изображением
                    setMessages(prev => prev.map(msg =>
                        msg.id === tempMessageId
                            ? {
                                ...msg,
                                imageUrl: fullImageUrl,
                                status: 'uploaded' as const,
                                progress: 100,
                                file: undefined,
                                createdAt: new Date().toISOString() // Обновляем время
                            }
                            : msg
                    ));

                } else {
                    setMessages(prev => prev.map(msg =>
                        msg.id === tempMessageId
                            ? { ...msg, status: 'error' as const }
                            : msg
                    ));
                    setError(`Ошибка загрузки файла: ${fileName}`);
                }
            }

            // Очищаем выбранные файлы
            setSelectedFiles([]);

        } catch (error) {
            console.error('Error uploading files:', error);
            setError('Ошибка при загрузке файлов');
        } finally {
            setIsUploading(false);
        }
    };

    const sendMessage = async () => {
        if ((!newMessage.trim() && selectedFiles.length === 0) || !selectedChat || !currentUser) {
            console.log('Cannot send message');
            return;
        }

        // Если есть файлы, сначала загружаем их
        if (selectedFiles.length > 0) {
            await uploadAllFiles();
        }

        // Если есть текстовое сообщение, отправляем его
        if (newMessage.trim()) {
            const tempMessageId = Date.now();
            const now = new Date();
            const tempMessage: Message = {
                id: tempMessageId,
                sender: "me" as const,
                name: `${currentUser.name} ${currentUser.surname}`,
                text: newMessage,
                type: 'text' as const,
                time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                isLocal: true,
                createdAt: now.toISOString() // Добавляем временную метку
            };

            // Добавляем временное сообщение
            setMessages(prev => [...prev, tempMessage]);

            setNewMessage("");

            // Отправляем на сервер
            const success = await sendMessageToServer(selectedChat, newMessage);

            if (!success) {
                setMessages(prev => prev.map(msg =>
                    msg.id === tempMessageId
                        ? { ...msg, status: 'error' as const }
                        : msg
                ));
            }
        }
    };

    const sendMessageToServer = async (chatId: number, messageText: string): Promise<boolean> => {
        try {
            const token = getAuthToken();
            if (!token) return false;

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
                return true;
            } else {
                console.error('Ошибка отправки сообщения:', response.status);
                return false;
            }
        } catch (err) {
            console.error('Ошибка отправки сообщения на сервер:', err);
            return false;
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
        if (msg?.text) {
            return msg.text.length > 30 ? msg.text.substring(0, 30) + '...' : msg.text;
        }

        if (chat.images && chat.images.length > 0) {
            return '📷 Фото';
        }

        return 'Нет сообщений';
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
        setSelectedFiles([]);
    };

    const handleBackToHome = () => {
        navigate('/');
    }

    const currentChat = chats.find(chat => chat.id === selectedChat);
    const currentInterlocutor = currentChat ? getInterlocutorFromChat(currentChat) : null;
    const showChatArea = selectedChat !== null && currentInterlocutor !== null;

    const triggerFileInput = () => {
        fileInputRef.current?.click();
    };

    if (isLoading) return <div className={styles.chat}>Загрузка чатов...</div>;

    return (
        <div className={`${styles.chat} ${isMobileChatActive ? styles.chatAreaActive : ''}`}>
            <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                onChange={handleFileSelect}
                multiple
                accept="image/*"
            />

            {/* Sidebar - без изменений */}
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
                            if (!interlocutor) return null;

                            return (
                                <div key={chat.id} className={`${styles.chatItem} ${selectedChat === chat.id ? styles.selected : ""}`} onClick={() => handleChatSelect(chat.id)}>
                                    <div className={styles.avatar}>
                                        {interlocutor.image ? (
                                            <img
                                                src={`${API_BASE_URL}${interlocutor.image.startsWith('/') ? interlocutor.image : '/images/profile_photos/' + interlocutor.image}`}
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
                                    aria-label="Вернуться к списку чатов"
                                >
                                    ←
                                </button>
                                <div className={styles.avatar}>
                                    {currentInterlocutor.image ? (
                                        <img
                                            src={`${API_BASE_URL}${currentInterlocutor.image.startsWith('/') ? currentInterlocutor.image : '/images/profile_photos/' + currentInterlocutor.image}`}
                                            className={styles.avatarImage}
                                            alt={`${currentInterlocutor.name} ${currentInterlocutor.surname}`}
                                        />
                                    ) : (
                                        <>
                                            {currentInterlocutor.name?.charAt(0)}
                                            {currentInterlocutor.surname?.charAt(0)}
                                        </>
                                    )}
                                    {currentInterlocutor.isOnline && <div className={styles.onlineIndicator} />}
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
                                        if (msg.type === 'image') {
                                            if (msg.status === 'pending' || msg.status === 'uploading') {
                                                return (
                                                    <div
                                                        key={msg.id}
                                                        className={`${styles.message} ${msg.sender === "me" ? styles.myMessage : styles.theirMessage}`}
                                                    >
                                                        {msg.sender === "other" && (
                                                            <div className={styles.messageName}>{msg.name}</div>
                                                        )}
                                                        <div className={styles.messageContent}>
                                                            <div className={styles.uploadingImage}>
                                                                {msg.file && msg.file.type.startsWith('image/') && (
                                                                    <img
                                                                        src={URL.createObjectURL(msg.file)}
                                                                        alt="Загружаемое изображение"
                                                                        className={styles.uploadingImagePreview}
                                                                    />
                                                                )}
                                                                <div className={styles.uploadingOverlay}>
                                                                    <div className={styles.uploadingProgress}>
                                                                        <div
                                                                            className={styles.uploadingProgressBar}
                                                                            style={{ width: `${msg.progress || 0}%` }}
                                                                        />
                                                                    </div>
                                                                    <div className={styles.uploadingText}>
                                                                        {msg.status === 'pending' ? 'Ожидание...' : `Загрузка ${msg.progress || 0}%`}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className={styles.messageTime}>{msg.time}</div>
                                                        </div>
                                                    </div>
                                                );
                                            }

                                            if (msg.imageUrl) {
                                                return (
                                                    <div
                                                        key={msg.id}
                                                        className={`${styles.message} ${msg.sender === "me" ? styles.myMessage : styles.theirMessage}`}
                                                    >
                                                        {msg.sender === "other" && (
                                                            <div className={styles.messageName}>{msg.name}</div>
                                                        )}
                                                        <div className={styles.messageContent}>
                                                            <div className={styles.messageImage}>
                                                                <img
                                                                    src={msg.imageUrl}
                                                                    alt="Отправленное изображение"
                                                                    className={styles.imageMessage}
                                                                    onError={(e) => {
                                                                        console.error('Failed to load image:', msg.imageUrl);
                                                                        e.currentTarget.style.display = 'none';
                                                                        e.currentTarget.parentElement!.innerHTML =
                                                                            '<div class="' + styles.imageError + '">Ошибка загрузки изображения</div>';
                                                                    }}
                                                                />
                                                                {msg.status === 'error' && (
                                                                    <div className={styles.imageError}>Ошибка загрузки</div>
                                                                )}
                                                            </div>
                                                            <div className={styles.messageTime}>{msg.time}</div>
                                                        </div>
                                                    </div>
                                                );
                                            }
                                        }

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
                            <button
                                className={styles.attachButton}
                                onClick={triggerFileInput}
                                disabled={isUploading}
                                aria-label="Прикрепить файл"
                            >
                                <IoAttach />
                            </button>

                            <input
                                type="text"
                                placeholder="Введите сообщение"
                                className={styles.inputField}
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                onKeyPress={handleKeyPress}
                                disabled={isUploading}
                            />

                            <button
                                className={styles.sendButton}
                                onClick={sendMessage}
                                disabled={(!newMessage.trim() && selectedFiles.length === 0) || isUploading}
                                aria-label="Отправить сообщение"
                            >
                                <IoSend />
                            </button>
                        </div>

                        {selectedFiles.length > 0 && (
                            <div className={styles.selectedFilesIndicator}>
                                <span>Выбрано файлов: {selectedFiles.length}</span>
                                <button
                                    className={styles.clearFilesButton}
                                    onClick={() => setSelectedFiles([])}
                                    aria-label="Очистить все файлы"
                                >
                                    <IoClose /> Очистить
                                </button>
                            </div>
                        )}

                        {isUploading && (
                            <div className={styles.uploadingOverlay}>
                                <div className={styles.uploadingText}>Загрузка файлов...</div>
                            </div>
                        )}
                    </>
                ) : (
                    <div className={styles.noChat}>
                        {chats.length === 0 ? "У вас пока нет чатов" : "Выберите чат для общения"}
                    </div>
                )}

                {error && (
                    <div className={styles.error}>
                        <span>{error}</span>
                        <button onClick={() => setError(null)} className={styles.closeError}>×</button>
                    </div>
                )}
            </div>
        </div>
    );
}

export default Chat;