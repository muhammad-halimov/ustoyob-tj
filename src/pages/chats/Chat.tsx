import React, { useState, useEffect, useRef, useMemo } from "react";
import { getAuthToken } from "../../utils/auth";
import styles from "./Chat.module.scss";
import { useNavigate, useSearchParams } from 'react-router-dom';
import { IoSend, IoAttach, IoClose, IoImages, IoArchiveOutline, IoArchiveSharp } from "react-icons/io5";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";

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
    const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
    const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
    const [selectedPhotoImages, setSelectedPhotoImages] = useState<string[]>([]);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
    const POLLING_INTERVAL = 5000;

    const [searchParams] = useSearchParams();
    const chatIdFromUrl = searchParams.get('chatId');
    const navigate = useNavigate();

    const [photoOrientations, setPhotoOrientations] = useState<('landscape' | 'portrait')[]>([]);

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

    const getImageUrl = (imagePath: string): string => {
        if (!imagePath) return '';

        if (imagePath.startsWith('http')) {
            return imagePath;
        }

        if (imagePath.startsWith('/')) {
            return `${API_BASE_URL}${imagePath}`;
        }

        return `${API_BASE_URL}/images/appeal_photos/${imagePath}`;
    };

    // Фильтрация чатов по поисковому запросу
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
    }, [chats, searchQuery, activeTab, currentUser]);

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
            setError("Ошибка загрузки чатов");
        } finally {
            setIsLoading(false);
        }
    };

    // ===== ФУНКЦИИ ДЛЯ АРХИВАЦИИ ЧАТОВ =====
    const archiveChat = async (chatId: number, archive: boolean = true) => {
        try {
            const token = getAuthToken();
            if (!token) {
                setError("Необходима авторизация");
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

                setError(archive ? "Чат перемещен в архив" : "Чат восстановлен из архива");
                setTimeout(() => setError(null), 3000);

                // Обновляем данные чата после изменения статуса
                if (selectedChat === chatId) {
                    fetchChatMessages(chatId);
                }
            } else {
                console.error(`Error updating chat: ${response.status}`);
                const errorText = await response.text();
                console.error('Error response:', errorText);

                setError(archive ? "Ошибка архивации чата" : "Ошибка восстановления чата");
            }
        } catch (error) {
            console.error(`Error ${archive ? 'archiving' : 'unarchiving'} chat:`, error);
            setError("Ошибка при выполнении операции");
        }
    };

    // ===== ФУНКЦИИ ДЛЯ РАБОТЫ С ФАЙЛАМИ И ФОТО =====

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
                    // В этом случае нужно снова запросить чат, чтобы получить актуальные изображения
                    console.log('Success message received, fetching updated chat data...');

                    // Сразу обновляем список чатов
                    await fetchChatMessages(chatId);

                    // Возвращаем null, так как изображение уже добавлено в чат
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
    };

    const uploadAllFiles = async () => {
        if (!selectedChat || selectedFiles.length === 0 || !currentUser) {
            console.log('Cannot upload files');
            return;
        }

        setIsUploading(true);
        setError(null);

        // Показываем уведомление о начале загрузки
        setError(`Начинается загрузка ${selectedFiles.length} файлов...`);

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

            setError(`Успешно загружено ${selectedFiles.length} файлов`);

        } catch (error) {
            console.error('Error uploading files:', error);
            setError('Ошибка при загрузке файлов');
        } finally {
            setIsUploading(false);
            // Через 3 секунды очищаем сообщение об ошибке/успехе
            setTimeout(() => setError(null), 3000);
        }
    };

    // для автоматического определения ориентации
    const getImageOrientation = (src: string): Promise<'landscape' | 'portrait'> => {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const orientation = img.width > img.height ? 'landscape' : 'portrait';
                resolve(orientation);
            };
            img.onerror = () => resolve('landscape'); // По умолчанию
            img.src = src;
        });
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
            // Не показываем "Фото" в последнем сообщении, если есть только изображения
            const lastTextMsg = chat.messages?.find(m => m.text && m.text.trim());
            if (lastTextMsg) {
                return lastTextMsg.text.length > 30 ? lastTextMsg.text.substring(0, 30) + '...' : lastTextMsg.text;
            }
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
        setChatImages([]);
    };

    const handleBackToHome = () => {
        navigate('/');
    };

    // ===== ФУНКЦИИ ДЛЯ МОДАЛЬНОГО ОКНА ФОТО =====

    const openPhotoModal = async (images: ChatImageThumbnail[], startIndex: number = 0) => {
        const imageUrls = images.map(img => img.imageUrl);
        setSelectedPhotoImages(imageUrls);
        setCurrentPhotoIndex(startIndex);
        setIsPhotoModalOpen(true);

        const orientations = await Promise.all(
            imageUrls.map(url => getImageOrientation(url))
        );
        setPhotoOrientations(orientations);

        document.body.style.overflow = 'hidden';
    };

    const closePhotoModal = () => {
        setIsPhotoModalOpen(false);
        document.body.style.overflow = 'auto';
    };

    const goToPrevPhoto = () => {
        setCurrentPhotoIndex(prev =>
            prev > 0 ? prev - 1 : selectedPhotoImages.length - 1
        );
    };

    const goToNextPhoto = () => {
        setCurrentPhotoIndex(prev =>
            prev < selectedPhotoImages.length - 1 ? prev + 1 : 0
        );
    };

    // ===== ОСТАЛЬНЫЕ ФУНКЦИИ =====

    const triggerFileInput = () => {
        fileInputRef.current?.click();
    };

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchQuery(e.target.value);
    };

    const clearSearch = () => {
        setSearchQuery("");
        if (searchInputRef.current) {
            searchInputRef.current.focus();
        }
    };

    const currentChat = chats.find(chat => chat.id === selectedChat);
    const currentInterlocutor = currentChat ? getInterlocutorFromChat(currentChat) : null;
    const showChatArea = selectedChat !== null && currentInterlocutor !== null;

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
                    </div>
                )}
                <div className={styles.searchBar}>
                    <div className={styles.searchInputContainer}>
                        <input
                            type="text"
                            placeholder="Поиск по имени, email или телефону"
                            className={styles.searchInput}
                            value={searchQuery}
                            onChange={handleSearchChange}
                            ref={searchInputRef}
                        />
                        {searchQuery && (
                            <button
                                className={styles.clearSearchButton}
                                onClick={clearSearch}
                                aria-label="Очистить поиск"
                            >
                                ×
                            </button>
                        )}
                    </div>
                </div>

                <div className={styles.tabs}>
                    <button className={`${styles.tab} ${activeTab === "active" ? styles.active : ""}`} onClick={() => setActiveTab("active")}>Активные</button>
                    <button className={`${styles.tab} ${activeTab === "archive" ? styles.active : ""}`} onClick={() => setActiveTab("archive")}>Архив</button>
                </div>

                <div className={styles.chatList}>
                    {filteredChats.length === 0 ? (
                        <div className={styles.noChatsContainer}>
                            <div className={styles.noChats}>
                                {searchQuery ? "Ничего не найдено" :
                                    activeTab === "active" ? "Нет активных чатов" :
                                        "Нет архивных чатов"}
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
                                        {chat.isArchived && (
                                            <div className={styles.archiveIndicator} title="Чат в архиве">
                                                <IoArchiveOutline size={12} />
                                            </div>
                                        )}
                                    </div>
                                    <div className={styles.chatInfo}>
                                        <div className={styles.name}>
                                            {interlocutor.name} {interlocutor.surname}
                                            {chat.isArchived && <span className={styles.archiveBadge}> (архив)</span>}
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
                                    {currentInterlocutor.isOnline && !currentChat?.isArchived && (
                                        <div className={styles.onlineIndicator} />
                                    )}
                                </div>
                                <div className={styles.headerInfo}>
                                    <div className={styles.name}>
                                        {currentInterlocutor.name} {currentInterlocutor.surname}
                                        {currentChat?.isArchived && <span className={styles.archiveBadge}> (архив)</span>}
                                    </div>
                                    {currentChat?.ticket?.title && (
                                        <a href={`/order/${currentChat.replyAuthor.id}?ticket=${currentChat.ticket.id}`} className={styles.serviceTitle}>
                                            {currentChat.ticket.title}
                                        </a>
                                    )}
                                    <div className={styles.status}>
                                        {currentInterlocutor.isOnline && !currentChat?.isArchived ? 'онлайн' : 'оффлайн'}
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
                                        aria-label={currentChat.isArchived ? "Восстановить из архива" : "Архивировать чат"}
                                        title={currentChat.isArchived ? "Восстановить из архива" : "Архивировать чат"}
                                    >
                                        {currentChat.isArchived ? <IoArchiveSharp /> : <IoArchiveOutline />}
                                    </button>
                                )}
                                {chatImages.length > 0 && (
                                    <button
                                        className={styles.photosButton}
                                        onClick={() => openPhotoModal(chatImages, 0)}
                                        aria-label="Просмотреть фото"
                                        title="Просмотреть все фото"
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
                                            "Этот чат находится в архиве. Новые сообщения не отправляются." :
                                            "Начните чат"}
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
                                        <span>Фото ({chatImages.length})</span>
                                    </div>
                                    <div className={styles.photoThumbnails}>
                                        {chatImages.map((image, index) => (
                                            <div
                                                key={image.id}
                                                className={styles.photoThumbnail}
                                                onClick={() => openPhotoModal(chatImages, index)}
                                            >
                                                <img
                                                    src={image.imageUrl}
                                                    alt={`Миниатюра ${index + 1}`}
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
                                aria-label="Прикрепить файл"
                            >
                                <IoAttach />
                            </button>

                            <input
                                type="text"
                                placeholder={currentChat?.isArchived ? "Чат в архиве" : "Введите сообщение"}
                                className={`${styles.inputField} ${currentChat?.isArchived ? styles.disabled : ''}`}
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                onKeyPress={handleKeyPress}
                                disabled={isUploading || currentChat?.isArchived}
                            />

                            <button
                                className={styles.sendButton}
                                onClick={sendMessage}
                                disabled={(!newMessage.trim() && selectedFiles.length === 0) || isUploading || currentChat?.isArchived}
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
                        {chats.length === 0 ? "У вас пока нет чатов" :
                            activeTab === "active" ? "Выберите активный чат для общения" :
                                "Выберите архивный чат для просмотра"}
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
            {isPhotoModalOpen && (
                <div className={styles.photoModalOverlay} onClick={closePhotoModal}>
                    <div className={styles.photoModalContent} onClick={(e) => e.stopPropagation()}>
                        <button
                            className={styles.photoModalClose}
                            onClick={closePhotoModal}
                            aria-label="Закрыть"
                        >
                            <IoClose size={24} />
                        </button>

                        <div className={styles.photoModalMain}>
                            <button
                                className={styles.photoModalNav}
                                onClick={goToPrevPhoto}
                                aria-label="Предыдущее фото"
                            >
                                <FaChevronLeft size={24} />
                            </button>

                            <div className={styles.photoModalImageContainer}>
                                <img
                                    src={selectedPhotoImages[currentPhotoIndex]}
                                    alt={`Фото ${currentPhotoIndex + 1}`}
                                    className={styles.photoModalImage}
                                    data-orientation={photoOrientations[currentPhotoIndex] || 'landscape'}
                                    onLoad={(e) => {
                                        // Альтернативный способ, если orientations еще не загружены
                                        if (!photoOrientations[currentPhotoIndex]) {
                                            const img = e.currentTarget;
                                            const isLandscape = img.naturalWidth > img.naturalHeight;
                                            e.currentTarget.dataset.orientation = isLandscape ? 'landscape' : 'portrait';
                                        }

                                        // УБИРАЕМ canvas анализ - вызывает CORS ошибку
                                        // Вместо этого всегда применяем стили для лучшей видимости
                                        document.querySelectorAll(`.${styles.photoModalNav}, .${styles.photoModalCounter}`).forEach(el => {
                                            (el as HTMLElement).style.border = '2px solid rgba(0, 0, 0, 0.3)';
                                            (el as HTMLElement).style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.5)';
                                            (el as HTMLElement).style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
                                        });
                                    }}
                                    onError={(e) => {
                                        e.currentTarget.src = '../fonTest5.png';
                                    }}
                                />
                            </div>

                            <button
                                className={styles.photoModalNav}
                                onClick={goToNextPhoto}
                                aria-label="Следующее фото"
                            >
                                <FaChevronRight size={24} />
                            </button>
                        </div>

                        <div className={styles.photoModalCounter}>
                            {currentPhotoIndex + 1} / {selectedPhotoImages.length}
                        </div>

                        <div className={styles.photoModalThumbnails}>
                            {selectedPhotoImages.map((image, index) => (
                                <img
                                    key={index}
                                    src={image}
                                    alt={`Миниатюра ${index + 1}`}
                                    className={`${styles.photoModalThumbnail} ${index === currentPhotoIndex ? styles.active : ''}`}
                                    onClick={() => setCurrentPhotoIndex(index)}
                                    onError={(e) => {
                                        e.currentTarget.src = '../fonTest5.png';
                                    }}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Chat;