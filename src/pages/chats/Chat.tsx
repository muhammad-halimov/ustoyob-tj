import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useTranslation } from 'react-i18next';
import { getAuthToken } from "../../utils/auth";
import styles from "./Chat.module.scss";
import { useNavigate, useSearchParams } from 'react-router-dom';
import { IoSend, IoAttach, IoClose, IoImages, IoArchiveOutline, IoArchiveSharp } from "react-icons/io5";
import { PhotoGallery, usePhotoGallery } from '../../shared/ui/PhotoGallery';

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

interface ApiTicket {
    id: number;
    title: string;
    service?: boolean;
    active?: boolean;
}

interface ApiChat {
    id: number;
    author: ApiUser;
    replyAuthor: ApiUser;
    messages: ApiMessage[];
    images: UploadedImage[];
    ticket?: ApiTicket;
    createdAt?: string;
    updatedAt?: string;
    active?: boolean;
    isArchived?: boolean;
    archivedBy?: ApiUser;
    archivedAt?: string;
}

interface UploadedImage {
    id: number;
    author: ApiUser;
    image: string;
    createdAt?: string;
}

// Интерфейс для миниатюр фото в чате
interface ChatImageThumbnail {
    id: number;
    imageUrl: string;
    thumbnailUrl?: string;
    author: ApiUser;
    createdAt: string;
}

function Chat() {
    const { t } = useTranslation('components');
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
    const [searchQuery, setSearchQuery] = useState("");
    // const [isArchiveMode, setIsArchiveMode] = useState(false);

    // Состояния для миниатюр и модального окна фото
    const [chatImages, setChatImages] = useState<ChatImageThumbnail[]>([]);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const messageInputRef = useRef<HTMLInputElement>(null);
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
    const POLLING_INTERVAL = 3000; // Уменьшаем интервал для более реактивного обновления

    const [searchParams] = useSearchParams();
    const chatIdFromUrl = searchParams.get('chatId');
    const navigate = useNavigate();

    // Хук для галереи фотографий
    const galleryImages = useMemo(() => chatImages.map(img => img.imageUrl), [chatImages]);
    const photoGallery = usePhotoGallery({ images: galleryImages });

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
    }, [currentUser, activeTab]);

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
            setChatImages([]);
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

    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, []);

    // Прокрутка к последнему сообщению
    useEffect(() => {
        scrollToBottom();
    }, [messages, scrollToBottom]);

    // Мемоизация функций для оптимизации
    const getLastSeenTime = useCallback((user: ApiUser): string => {
        if (!user.lastSeen) return '';

        const lastSeen = new Date(user.lastSeen);
        const now = new Date();
        const diffInMinutes = Math.floor((now.getTime() - lastSeen.getTime()) / (1000 * 60));

        if (diffInMinutes < 1) return t('chat.justNow');
        if (diffInMinutes < 60) return t('chat.minutesAgo', { count: diffInMinutes });
        if (diffInMinutes < 1440) return t('chat.hoursAgo', { count: Math.floor(diffInMinutes / 60) });
        return t('chat.daysAgo', { count: Math.floor(diffInMinutes / 1440) });
    }, [t]);

    const getImageUrl = useCallback((imagePath: string): string => {
        if (!imagePath) return '';

        if (imagePath.startsWith('http')) {
            return imagePath;
        }

        if (imagePath.startsWith('/')) {
            return `${API_BASE_URL}${imagePath}`;
        }

        return `${API_BASE_URL}/images/appeal_photos/${imagePath}`;
    }, [API_BASE_URL]);

    const fetchChatMessages = useCallback(async (chatId: number) => {
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

                // Добавляем вычисляемое поле isArchived
                const chatDataWithArchive = {
                    ...chatData,
                    isArchived: chatData.active === false
                };

                setChats(prev => {
                    const chatIndex = prev.findIndex(c => c.id === chatId);
                    if (chatIndex === -1) {
                        return [...prev, chatDataWithArchive];
                    }
                    const newChats = [...prev];
                    newChats[chatIndex] = {
                        ...newChats[chatIndex],
                        ...chatDataWithArchive,
                        messages: chatData.messages || [],
                        images: chatData.images || [],
                    };
                    return newChats;
                });

                // Обновляем список изображений для миниатюр
                if (chatData.images && chatData.images.length > 0) {
                    const imagesThumbnails: ChatImageThumbnail[] = chatData.images.map((imageObj: UploadedImage) => {
                        const imageUrl = getImageUrl(imageObj.image);

                        return {
                            id: imageObj.id,
                            imageUrl: imageUrl,
                            author: imageObj.author,
                            createdAt: imageObj.createdAt || new Date().toISOString()
                        };
                    });

                    // Сортируем по дате (сначала новые)
                    imagesThumbnails.sort((a, b) =>
                        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                    );

                    setChatImages(imagesThumbnails);
                } else {
                    setChatImages([]);
                }

                if (currentUser) {
                    // ТОЛЬКО текстовые сообщения - изображения не добавляем в чат
                    const allChatItems: Message[] = (chatData.messages || []).map(msg => {
                        const createdAt = msg.createdAt ? new Date(msg.createdAt) : new Date();

                        return {
                            id: msg.id,
                            sender: msg.author.id === currentUser.id ? "me" : "other",
                            name: `${msg.author.name} ${msg.author.surname}`,
                            text: msg.text,
                            type: 'text' as const,
                            time: createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                            createdAt: createdAt.toISOString()
                        };
                    });

                    // Оставляем только локальные временные сообщения (они будут удалены после загрузки)
                    setMessages(prev => {
                        // Фильтруем только локальные сообщения
                        const localMessages = prev.filter(msg => msg.isLocal &&
                            (msg.status === 'pending' || msg.status === 'uploading'));

                        // Объединяем с серверными текстовыми сообщениями
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
    }, [API_BASE_URL, currentUser, getImageUrl]);

    const uploadImageToChat = useCallback(async (chatId: number, file: File): Promise<string | null> => {
        const token = getAuthToken();
        if (!token) {
            console.error('No token for uploading image');
            return null;
        }

        const formData = new FormData();
        formData.append('imageFile', file);

        try {
            console.log('Uploading image to chat:', chatId, 'File:', file.name);
            const response = await fetch(`${API_BASE_URL}/api/chats/${chatId}/upload-photo`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
                body: formData,
            });

            if (response.ok) {
                const data = await response.json();
                console.log('Image upload response:', data);

                // Проверяем разные форматы ответа
                if (data.image) {
                    return data.image; // Формат 1: { image: "path/to/image.jpg" }
                } else if (data.images && Array.isArray(data.images) && data.images.length > 0) {
                    // Формат 2: { images: [{ image: "path/to/image.jpg" }] }
                    return data.images[0].image;
                } else if (data.id && data.image) {
                    // Формат 3: { id: 1, image: "path/to/image.jpg", ... }
                    return data.image;
                } else if (data.message && data.count > 0) {
                    // Формат 4: { message: 'Photos uploaded successfully', count: 1 }
                    console.log('Success message received, fetching updated chat data...');
                    await fetchChatMessages(chatId);
                    return null;
                }

                console.error('Unexpected response format:', data);
                return null;
            } else {
                const errorText = await response.text();
                console.error('Error uploading image:', response.status, errorText);
                return null;
            }
        } catch (error) {
            console.error('Error uploading image:', error);
            return null;
        }
    }, [API_BASE_URL, fetchChatMessages]);

    const startPolling = useCallback((chatId: number) => {
        stopPolling();
        fetchChatMessages(chatId);

        pollingIntervalRef.current = setInterval(() => {
            fetchChatMessages(chatId);
        }, POLLING_INTERVAL);
    }, [POLLING_INTERVAL, fetchChatMessages]);

    const stopPolling = useCallback(() => {
        if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
        }
    }, []);

    const getInterlocutorFromChat = useCallback((chat: ApiChat | undefined): ApiUser | null => {
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
    }, [currentUser]);

    const sendMessageToServer = useCallback(async (chatId: number, messageText: string): Promise<boolean> => {
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
                console.log(t('chat.messageSuccess'));
                return true;
            } else {
                console.error(t('chat.messageError'), response.status);
                return false;
            }
        } catch (err) {
            console.error(t('chat.messageError'), err);
            return false;
        }
    }, [API_BASE_URL, t]);

    const uploadAllFiles = useCallback(async () => {
        if (!selectedChat || selectedFiles.length === 0 || !currentUser) {
            console.log('Cannot upload files');
            return;
        }

        setIsUploading(true);
        setError(null);

        // Показываем уведомление о начале загрузки
        setError(t('chat.filesUploading', { count: selectedFiles.length }));

        try {
            const uploadedImages: ChatImageThumbnail[] = [];

            for (let i = 0; i < selectedFiles.length; i++) {
                const file = selectedFiles[i];
                const fileName = file.name;

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
                    progress: 10,
                    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    isLocal: true,
                    createdAt: new Date().toISOString()
                };

                // Добавляем временное сообщение
                setMessages(prev => [...prev, tempMessage]);

                // Загружаем файл
                const imagePath = await uploadImageToChat(selectedChat, file);

                if (imagePath) {
                    const fullImageUrl = getImageUrl(imagePath);

                    // УДАЛЯЕМ временное сообщение из чата
                    setMessages(prev => prev.filter(msg => msg.id !== tempMessageId));

                    // Добавляем фото в список миниатюр
                    const newImage: ChatImageThumbnail = {
                        id: Date.now() + i,
                        imageUrl: fullImageUrl,
                        author: currentUser,
                        createdAt: new Date().toISOString()
                    };

                    uploadedImages.push(newImage);
                } else {
                    // Если imagePath равен null, но загрузка была успешной (формат 4)
                    // Просто удаляем временное сообщение
                    setMessages(prev => prev.filter(msg => msg.id !== tempMessageId));
                    console.log(`File ${fileName} uploaded successfully (format 4)`);
                }
            }

            // Если есть загруженные изображения, добавляем их в миниатюры
            if (uploadedImages.length > 0) {
                setChatImages(prev => [...uploadedImages, ...prev]);
            }

            // Очищаем выбранные файлы
            setSelectedFiles([]);

            // Обновляем данные чата после загрузки всех файлов
            if (selectedChat) {
                await fetchChatMessages(selectedChat);
            }

            setError(t('chat.filesUploadedSuccess', { count: selectedFiles.length }));

        } catch (error) {
            console.error('Error uploading files:', error);
            setError(t('chat.uploadError'));
        } finally {
            setIsUploading(false);
            // Через 3 секунды очищаем сообщение об ошибке/успехе
            setTimeout(() => setError(null), 3000);
        }
    }, [selectedChat, selectedFiles, currentUser, t, getImageUrl, uploadImageToChat, fetchChatMessages]);

    const sendMessage = useCallback(async () => {
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
                createdAt: now.toISOString()
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
    }, [newMessage, selectedFiles, selectedChat, currentUser, uploadAllFiles, sendMessageToServer, setNewMessage]);



    // ===== ОСТАЛЬНЫЕ ФУНКЦИИ =====

    const triggerFileInput = useCallback(() => {
        fileInputRef.current?.click();
    }, []);

    const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchQuery(e.target.value);
    }, []);

    const clearSearch = useCallback(() => {
        setSearchQuery("");
        if (searchInputRef.current) {
            searchInputRef.current.focus();
        }
    }, []);

    const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    }, [sendMessage]);

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
    }, [currentUser, activeTab]);

    // Обработка выбранного чата с оптимизацией
    useEffect(() => {
        if (selectedChat) {
            console.log('Starting polling for chat:', selectedChat);
            startPolling(selectedChat);
            if (window.innerWidth <= 480) {
                setIsMobileChatActive(true);
            }
        } else {
            setMessages([]);
            setChatImages([]);
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
    }, [messages, scrollToBottom]);

    // Обработка клавиатуры на мобильных устройствах
    useEffect(() => {
        if (typeof window === 'undefined') return;

        const handleResize = () => {
            // Когда открывается клавиатура, прокручиваем к последнему сообщению
            if (window.innerWidth <= 480) {
                scrollToBottom();
            }
        };

        // Используем visualViewport API если доступен (лучше для мобильных)
        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', handleResize);
            return () => {
                window.visualViewport?.removeEventListener('resize', handleResize);
            };
        } else {
            // Fallback для старых браузеров
            window.addEventListener('resize', handleResize);
            return () => {
                window.removeEventListener('resize', handleResize);
            };
        }
    }, [scrollToBottom]);

    // Фильтрация чатов по поисковому запросу с оптимизацией
    const filteredChats = useMemo(() => {
        const filtered = chats.filter(chat => {
            // Фильтрация по активным/архивным чатам на основе поля active
            const isArchived = chat.active === false;
            if (activeTab === "active" && isArchived) return false;
            if (activeTab === "archive" && !isArchived) return false;

            // Фильтрация по поисковому запросу
            if (!searchQuery.trim()) return true;

            const interlocutor = getInterlocutorFromChat(chat);
            if (!interlocutor) return false;

            const searchLower = searchQuery.toLowerCase();
            const fullName = `${interlocutor.name} ${interlocutor.surname}`.toLowerCase();
            const email = interlocutor.email?.toLowerCase() || '';
            const phone = interlocutor.phone1?.toLowerCase() || '';

            return fullName.includes(searchLower) ||
                email.includes(searchLower) ||
                phone.includes(searchLower);
        });

        // Сортировка: сначала активные чаты с сообщениями, затем по дате последнего сообщения
        return filtered.sort((a, b) => {
            const aHasMessages = a.messages && a.messages.length > 0;
            const bHasMessages = b.messages && b.messages.length > 0;

            if (aHasMessages && !bHasMessages) return -1;
            if (!aHasMessages && bHasMessages) return 1;

            if (aHasMessages && bHasMessages) {
                const aLastMsg = a.messages[a.messages.length - 1];
                const bLastMsg = b.messages[b.messages.length - 1];

                if (aLastMsg.createdAt && bLastMsg.createdAt) {
                    return new Date(bLastMsg.createdAt).getTime() - new Date(aLastMsg.createdAt).getTime();
                }
            }

            return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        });
    }, [chats, searchQuery, activeTab, getInterlocutorFromChat]);

    const getCurrentUser = useCallback(async (): Promise<ApiUser | null> => {
        try {
            const token = getAuthToken();
            if (!token) {
                console.log('No auth token available');
                setError(t('chat.authRequired'));
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
                setError(t('chat.authRequired'));
                setIsLoading(false);
                return null;
            }
        } catch (err) {
            console.error('Error fetching current user:', err);
            setError(t('chat.authRequired'));
            setIsLoading(false);
            return null;
        }
    }, [API_BASE_URL, t]);

    const fetchChats = useCallback(async () => {
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
                    chatsData = responseData.map(chat => ({
                        ...chat,
                        // Вычисляем isArchived на основе поля active
                        isArchived: chat.active === false
                    }));
                } else if (responseData && typeof responseData === 'object') {
                    if (responseData['hydra:member'] && Array.isArray(responseData['hydra:member'])) {
                        chatsData = responseData['hydra:member'].map(chat => ({
                            ...chat,
                            isArchived: chat.active === false
                        }));
                    } else if (responseData.id) {
                        chatsData = [{
                            ...responseData,
                            isArchived: responseData.active === false
                        }];
                    }
                }

                console.log(`Parsed ${chatsData.length} chats`);
            } else {
                console.warn(`Failed to fetch chats (status: ${response.status})`);
                setError(t('chat.errorLoadingChats'));
            }

            setChats(chatsData);

            if (chatIdFromUrl) {
                const chatId = parseInt(chatIdFromUrl);
                const chatExists = chatsData.some(chat => chat.id === chatId);
                if (chatExists) {
                    setSelectedChat(chatId);
                }
            }
        } catch (error) {
            console.error('Error fetching chats:', error);
            setError(t('chat.errorLoadingChats'));
        } finally {
            setIsLoading(false);
        }
    }, [API_BASE_URL, chatIdFromUrl, t]);

    // ===== ФУНКЦИИ ДЛЯ АРХИВАЦИИ ЧАТОВ =====
    const archiveChat = useCallback(async (chatId: number, archive: boolean = true) => {
        try {
            const token = getAuthToken();
            if (!token) {
                setError(t('chat.authRequired'));
                return;
            }

            // Используем PATCH метод для обновления поля active
            const response = await fetch(`${API_BASE_URL}/api/chats/${chatId}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/merge-patch+json'
                },
                body: JSON.stringify({
                    active: !archive // Если archive=true, то active=false и наоборот
                })
            });

            if (response.ok) {
                const updatedChat = await response.json();
                console.log('Chat updated:', updatedChat);

                // Обновляем состояние чата
                setChats(prev => prev.map(chat =>
                    chat.id === chatId
                        ? {
                            ...chat,
                            // Предполагаем, что поле active контролирует архив
                            // Если active=false, то чат в архиве
                            isArchived: !updatedChat.active,
                            active: updatedChat.active
                        }
                        : chat
                ));

                // Если текущий чат был архивирован и мы на вкладке активных, убираем его из выбранных
                if (archive && selectedChat === chatId && activeTab === "active") {
                    setSelectedChat(null);
                    setMessages([]);
                    setChatImages([]);
                }

                setError(archive ? t('chat.chatMovedToArchive') : t('chat.chatRestored'));
                setTimeout(() => setError(null), 3000);

                // Обновляем данные чата после изменения статуса
                if (selectedChat === chatId) {
                    fetchChatMessages(chatId);
                }
            } else {
                console.error(`Error updating chat: ${response.status}`);
                const errorText = await response.text();
                console.error('Error response:', errorText);

                setError(archive ? t('chat.archiveError') : t('chat.restoreError'));
            }
        } catch (error) {
            console.error(`Error ${archive ? 'archiving' : 'unarchiving'} chat:`, error);
            setError(t('chat.operationError'));
        }
    }, [API_BASE_URL, selectedChat, activeTab, t, fetchChatMessages]);

    // ===== ФУНКЦИИ ДЛЯ РАБОТЫ С ФАЙЛАМИ И ФОТО =====

    const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (files && files.length > 0) {
            const newFiles = Array.from(files);

            const validFiles = newFiles.filter(file => {
                const fileType = file.type;
                const isValid = fileType.startsWith('image/');
                if (!isValid) {
                    setError(t('chat.fileNotImage', { filename: file.name }));
                }
                return isValid;
            });

            setSelectedFiles(prev => [...prev, ...validFiles]);
        }

        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    }, [t]);

    const getLastMessageTime = useCallback((chat: ApiChat) => {
        const msg = chat.messages?.[chat.messages.length - 1];
        if (!msg?.createdAt) return "";
        return new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }, []);

    const getLastMessageText = useCallback((chat: ApiChat) => {
        const msg = chat.messages?.[chat.messages.length - 1];
        if (msg?.text) {
            return msg.text.length > 30 ? msg.text.substring(0, 30) + '...' : msg.text;
        }

        if (chat.images && chat.images.length > 0) {
            // Не показываем "Фото" в последнем сообщении, если есть только изображения
            const lastTextMsg = chat.messages?.find(m => m.text && m.text.trim());
            if (lastTextMsg) {
                return lastTextMsg.text.length > 30 ? lastTextMsg.text.substring(0, 30) + '...' : lastTextMsg.text;
            }
            return `📷 ${t('chat.noPhotoDescription')}`;
        }

        return t('chat.noMessages');
    }, [t]);

    const handleChatSelect = useCallback((chatId: number) => {
        console.log('Selecting chat:', chatId);
        setSelectedChat(chatId);
        if (window.innerWidth <= 480) {
            setIsMobileChatActive(true);
        }
    }, []);

    const handleBackToChatList = useCallback(() => {
        setIsMobileChatActive(false);
        setSelectedChat(null);
        setSelectedFiles([]);
        setChatImages([]);
    }, []);

    const handleBackToHome = useCallback(() => {
        navigate('/');
    }, [navigate]);

    const currentChat = chats.find(chat => chat.id === selectedChat);
    const currentInterlocutor = currentChat ? getInterlocutorFromChat(currentChat) : null;
    const showChatArea = selectedChat !== null && currentInterlocutor !== null;

    if (isLoading) return <div className={styles.chat}>{t('chat.loadingChats')}</div>;

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

            {/* Sidebar */}
            <div className={styles.sidebar}>
                {window.innerWidth <= 480 && (
                    <div className={styles.mobileNav}>
                        <button
                            className={styles.navBackButton}
                            onClick={handleBackToHome}
                            aria-label={t('chat.back')}
                        >
                            {t('chat.back')}
                        </button>
                    </div>
                )}
                <div className={styles.searchBar}>
                    <div className={styles.searchInputContainer}>
                        <input
                            type="text"
                            placeholder={t('chat.searchPlaceholder')}
                            className={styles.searchInput}
                            value={searchQuery}
                            onChange={handleSearchChange}
                            ref={searchInputRef}
                        />
                        {searchQuery && (
                            <button
                                className={styles.clearSearchButton}
                                onClick={clearSearch}
                                aria-label={t('chat.clearSearch')}
                            >
                                ×
                            </button>
                        )}
                    </div>
                </div>

                <div className={styles.tabs}>
                    <button className={`${styles.tab} ${activeTab === "active" ? styles.active : ""}`} onClick={() => setActiveTab("active")}>{t('chat.active')}</button>
                    <button className={`${styles.tab} ${activeTab === "archive" ? styles.active : ""}`} onClick={() => setActiveTab("archive")}>{t('chat.archive')}</button>
                </div>

                <div className={styles.chatList}>
                    {filteredChats.length === 0 ? (
                        <div className={styles.noChatsContainer}>
                            <div className={styles.noChats}>
                                {searchQuery ? t('chat.noChatsFound') :
                                    activeTab === "active" ? t('chat.noActiveChats') :
                                        t('chat.noArchivedChats')}
                            </div>
                        </div>
                    ) : (
                        filteredChats.map(chat => {
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
                                        {interlocutor.isOnline && !chat.isArchived && (
                                            <div className={styles.onlineIndicator} />
                                        )}
                                    </div>
                                    <div className={styles.chatInfo}>
                                        <div className={styles.name}>
                                            {interlocutor.name} {interlocutor.surname}
                                            {chat.isArchived && <span className={styles.archiveBadge}> ({t('chat.archive').toLowerCase()})</span>}
                                        </div>
                                        <div className={styles.specialty}>
                                            {chat.ticket?.title || interlocutor.email}
                                        </div>
                                        <div className={styles.lastMessage}>{getLastMessageText(chat)}</div>
                                    </div>
                                    <div className={styles.chatMeta}>
                                        <div className={styles.time}>{getLastMessageTime(chat)}</div>
                                        {!interlocutor.isOnline && interlocutor.lastSeen && !chat.isArchived && (
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
                                    aria-label={t('chat.back')}
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
                                    {currentInterlocutor.isOnline && !currentChat?.isArchived && (
                                        <div className={styles.onlineIndicator} />
                                    )}
                                </div>
                                <div className={styles.headerInfo}>
                                    <div className={styles.name}>
                                        {currentInterlocutor.name} {currentInterlocutor.surname}
                                        {currentChat?.isArchived && <span className={styles.archiveBadge}> ({t('chat.archive').toLowerCase()})</span>}
                                    </div>
                                    {currentChat?.ticket?.title && (
                                        <a href={`/ticket/${currentChat.replyAuthor.id}?ticket=${currentChat.ticket.id}`} className={styles.serviceTitle}>
                                            {currentChat.ticket.title}
                                        </a>
                                    )}
                                    <div className={styles.status}>
                                        {currentInterlocutor.isOnline && !currentChat?.isArchived ? t('chat.online') : t('chat.offline')}
                                        {!currentInterlocutor.isOnline && currentInterlocutor.lastSeen && !currentChat?.isArchived && (
                                            <span className={styles.lastSeen}> • {getLastSeenTime(currentInterlocutor)}</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className={styles.headerActions}>
                                {currentChat && (
                                    <button
                                        className={`${styles.archiveButton} ${currentChat.isArchived ? styles.unarchive : ''}`}
                                        onClick={() => archiveChat(currentChat.id, !currentChat.isArchived)}
                                        aria-label={currentChat.isArchived ? t('chat.restoreFromArchive') : t('chat.archiveChat')}
                                        title={currentChat.isArchived ? t('chat.restoreFromArchive') : t('chat.archiveChat')}
                                    >
                                        {currentChat.isArchived ? <IoArchiveSharp /> : <IoArchiveOutline />}
                                    </button>
                                )}
                                {chatImages.length > 0 && (
                                    <button
                                        className={styles.photosButton}
                                        onClick={() => photoGallery.openGallery(0)}
                                        aria-label={t('chat.viewAllPhotos')}
                                        title={t('chat.viewAllPhotos')}
                                    >
                                        <IoImages />
                                        <span className={styles.photosCount}>{chatImages.length}</span>
                                    </button>
                                )}

                            </div>
                        </div>

                        <div className={styles.chatContent}>
                            <div className={styles.chatMessages}>
                                {messages.length === 0 ? (
                                    <div className={styles.noMessages}>
                                        {currentChat?.isArchived ?
                                            t('chat.archivedChatNote') :
                                            t('chat.noMessages')}
                                    </div>
                                ) : (
                                    <div className={styles.messagesContainer}>
                                        {messages.map(msg => {
                                            // Показываем только текстовые сообщения и временные сообщения с ошибками
                                            if (msg.type === 'image') {
                                                // Временно показываем только загружающиеся изображения
                                                if (msg.status === 'pending' || msg.status === 'uploading') {
                                                    return (
                                                        <div
                                                            key={msg.id}
                                                            className={`${styles.message} ${msg.sender === "me" ? styles.myMessage : styles.theirMessage}`}
                                                        >
                                                            <div className={styles.messageContent}>
                                                                <div className={styles.uploadingImage}>
                                                                    {msg.file && msg.file.type.startsWith('image/') && (
                                                                        <img
                                                                            src={URL.createObjectURL(msg.file)}
                                                                            alt={t('chat.uploading', { progress: msg.progress || 0 })}
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
                                                                            {msg.status === 'pending' ? t('chat.waiting') : t('chat.uploading', { progress: msg.progress || 0 })}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div className={styles.messageTime}>{msg.time}</div>
                                                            </div>
                                                        </div>
                                                    );
                                                }
                                                // Не показываем загруженные изображения в чате
                                                return null;
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

                            {/* Боковая панель с миниатюрами фото */}
                            {chatImages.length > 0 && (
                                <div className={styles.photoSidebar}>
                                    <div className={styles.photoSidebarHeader}>
                                        <IoImages />
                                        <span>{t('chat.photos')} ({chatImages.length})</span>
                                    </div>
                                    <div className={styles.photoThumbnails}>
                                        {chatImages.map((image, index) => (
                                            <div
                                                key={image.id}
                                                className={styles.photoThumbnail}
                                                onClick={() => photoGallery.openGallery(index)}
                                            >
                                                <img
                                                    src={image.imageUrl}
                                                    alt={t('chat.thumbnail', { index: index + 1 })}
                                                    className={styles.thumbnailImage}
                                                    onError={(e) => {
                                                        e.currentTarget.src = '../fonTest5.png';
                                                    }}
                                                />
                                                <div className={styles.photoThumbnailOverlay}>
                                                    <span>+</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className={styles.chatInput}>
                            <button
                                className={styles.attachButton}
                                onClick={triggerFileInput}
                                disabled={isUploading || currentChat?.isArchived}
                                aria-label={t('chat.attachFile')}
                            >
                                <IoAttach />
                            </button>

                            <input
                                type="text"
                                ref={messageInputRef}
                                placeholder={currentChat?.isArchived ? t('chat.chatInArchive') : t('chat.messageInput')}
                                className={`${styles.inputField} ${currentChat?.isArchived ? styles.disabled : ''}`}
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                onKeyPress={handleKeyPress}
                                onFocus={() => {
                                    // Небольшая задержка для того чтобы клавиатура успела открыться
                                    setTimeout(() => scrollToBottom(), 300);
                                }}
                                disabled={isUploading || currentChat?.isArchived}
                            />

                            <button
                                className={styles.sendButton}
                                onClick={sendMessage}
                                disabled={(!newMessage.trim() && selectedFiles.length === 0) || isUploading || currentChat?.isArchived}
                                aria-label={t('chat.sendMessage')}
                            >
                                <IoSend />
                            </button>
                        </div>

                        {selectedFiles.length > 0 && (
                            <div className={styles.selectedFilesIndicator}>
                                <span>{t('chat.filesSelected')}: {selectedFiles.length}</span>
                                <button
                                    className={styles.clearFilesButton}
                                    onClick={() => setSelectedFiles([])}
                                    aria-label={t('chat.clearFiles')}
                                >
                                    <IoClose /> {t('chat.clearFiles')}
                                </button>
                            </div>
                        )}

                        {isUploading && (
                            <div className={styles.uploadingOverlay}>
                                <div className={styles.uploadingText}>{t('chat.uploadingFiles')}</div>
                            </div>
                        )}
                    </>
                ) : (
                    <div className={styles.noChat}>
                        {chats.length === 0 ? t('forms.noChats') :
                            activeTab === "active" ? t('chat.selectActiveChat') :
                                t('chat.selectArchivedChat')}
                    </div>
                )}

                {error && (
                    <div className={styles.error}>
                        <span>{error}</span>
                        <button onClick={() => setError(null)} className={styles.closeError}>×</button>
                    </div>
                )}
            </div>

            {/* Модальное окно для просмотра фото */}
            <PhotoGallery
                isOpen={photoGallery.isOpen}
                images={galleryImages}
                currentIndex={photoGallery.currentIndex}
                onClose={photoGallery.closeGallery}
                onNext={photoGallery.goToNext}
                onPrevious={photoGallery.goToPrevious}
                onSelectImage={photoGallery.selectImage}
                fallbackImage="../fonTest5.png"
            />
        </div>
    );
}

export default Chat;