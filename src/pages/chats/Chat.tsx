import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useTranslation } from 'react-i18next';
import { getAuthToken } from "../../utils/auth";
import { ROUTES } from '../../app/routers/routes';
import { smartNameTranslator } from '../../utils/textHelper';
import AuthModal from '../../features/auth/AuthModal';
import ComplaintModal from '../../shared/ui/Modal/ComplaintModal/ComplaintModal';
import { PageLoader } from '../../widgets/PageLoader';
import styles from "./Chat.module.scss";
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { IoSend, IoAttach, IoClose, IoImages, IoArchiveOutline, IoArchiveSharp, IoWarningOutline, IoPencilSharp, IoTrashSharp, IoArrowUndoSharp } from "react-icons/io5";
import { PhotoGallery, usePhotoGallery } from '../../shared/ui/PhotoGallery';
import CookieConsentBanner from "../../widgets/Banners/CookieConsentBanner/CookieConsentBanner.tsx";

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
    replyTo?: { id: number; text: string; name: string };
    edited?: boolean;
    images?: { id: number; url: string; name: string }[]; // вложенные фото сообщения
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
    author: ApiUser;
    createdAt?: string;
    updatedAt?: string;
    replyTo?: { id: number; text: string; author: ApiUser } | null;
    images?: UploadedImage[];
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
    images?: UploadedImage[]; // все фото чата (плоский список от бэкенда)
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
    const { t, i18n } = useTranslation('components');
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
    const [isPhotoSidebarOpen, setIsPhotoSidebarOpen] = useState(false);
    const [showComplaintModal, setShowComplaintModal] = useState(false);
    // const [isArchiveMode, setIsArchiveMode] = useState(false);

    // Состояния для миниатюр и модального окна фото
    const [chatImages, setChatImages] = useState<ChatImageThumbnail[]>([]);

    // Состояния для ответа и редактирования
    const [replyToMessage, setReplyToMessage] = useState<Message | null>(null);
    const [editingMessage, setEditingMessage] = useState<Message | null>(null);
    const [editingImages, setEditingImages] = useState<{ id: number; url: string; name: string }[]>([]);
    const [editingNewFiles, setEditingNewFiles] = useState<File[]>([]);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const editFileInputRef = useRef<HTMLInputElement>(null);
    const eventSourceRef = useRef<EventSource | null>(null);
    const currentUserRef = useRef<ApiUser | null>(null);
    const tokenRefreshRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const startSSERef = useRef<((chatId: number) => Promise<void>) | null>(null);
    const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const heartbeatIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const chatsRef = useRef<ApiChat[]>([]);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const messageInputRef = useRef<HTMLInputElement>(null);
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
    const MERCURE_HUB_URL = import.meta.env.VITE_MERCURE_HUB_URL;

    const [searchParams] = useSearchParams();
    const chatIdFromUrl = searchParams.get('chatId');
    const navigate = useNavigate();

    // Хук для галереи фотографий
    const galleryImages = useMemo(() => chatImages.map(img => img.imageUrl), [chatImages]);
    const photoGallery = usePhotoGallery({ images: galleryImages });
    
    // Вспомогательная функция для транслитерации полного имени (с автоопределением)
    const getTranslatedFullName = useCallback((user: ApiUser): string => {
        const firstName = user.name || '';
        const lastName = user.surname || '';
        const currentLang = i18n.language as 'ru' | 'tj' | 'eng';
        
        const translatedFirstName = smartNameTranslator(firstName, currentLang);
        const translatedLastName = smartNameTranslator(lastName, currentLang);
        
        return `${translatedFirstName} ${translatedLastName}`.trim();
    }, [i18n.language]);

    // Синхронизируем ref чтобы SSE-обработчик всегда имел свежий currentUser
    useEffect(() => { currentUserRef.current = currentUser; }, [currentUser]);

    // Инициализация пользователя и чатов
    useEffect(() => {
        const initializeChat = async () => {
            console.log('Initializing chat...');
            await getCurrentUser();
        };
        initializeChat();
    }, []);

    // Загрузка чатов после получения текущего пользователя
    // activeTab не нужен здесь — фильтрация уже в filteredChats
    useEffect(() => {
        if (currentUser) {
            console.log('User loaded, fetching chats...');
            fetchChats();
        }
    }, [currentUser]);

    // Обработка выбранного чата
    useEffect(() => {
        if (selectedChat) {
            console.log('Starting SSE for chat:', selectedChat);
            startSSE(selectedChat);
            if (window.innerWidth <= 480) {
                setIsMobileChatActive(true);
            }
        } else {
            setMessages([]);
            setChatImages([]);
            stopSSE();
        }
        return () => stopSSE();
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
                    };
                    return newChats;
                });

                if (currentUser) {
                    // Каждое ApiMessage → один Message с вложенными изображениями
                    const serverItems: Message[] = (chatData.messages || []).map(msg => {
                        const createdAt = msg.createdAt ? new Date(msg.createdAt) : new Date();
                        const updatedAt = msg.updatedAt ? new Date(msg.updatedAt) : null;
                        const isEdited = !!(updatedAt && msg.createdAt && updatedAt.getTime() - new Date(msg.createdAt).getTime() > 1000);
                        return {
                            id: msg.id,
                            sender: msg.author.id === currentUser.id ? "me" : "other",
                            name: getTranslatedFullName(msg.author),
                            text: msg.text,
                            type: 'text' as const,
                            time: createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                            createdAt: createdAt.toISOString(),
                            edited: isEdited,
                            replyTo: msg.replyTo ? {
                                id: msg.replyTo.id,
                                text: msg.replyTo.text,
                                name: getTranslatedFullName(msg.replyTo.author)
                            } : undefined,
                            images: (msg.images || []).map(img => ({
                                id: img.id,
                                url: getImageUrl(img.image),
                                name: img.image
                            }))
                        };
                    });

                    // Миниатюры для боковой панели — берём из плоского списка chatData.images
                    const allThumbnails: ChatImageThumbnail[] = (chatData.images || []).map(img => ({
                        id: img.id,
                        imageUrl: getImageUrl(img.image),
                        author: img.author,
                        createdAt: img.createdAt || new Date().toISOString()
                    }));
                    allThumbnails.sort((a, b) =>
                        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                    );
                    setChatImages(allThumbnails);

                    setMessages(prev => {
                        // Сохраняем только локальные pending/uploading сообщения
                        const localMessages = prev.filter(msg => msg.isLocal &&
                            (msg.status === 'pending' || msg.status === 'uploading'));

                        const combined = [...localMessages, ...serverItems];
                        combined.sort((a, b) => {
                            const timeA = a.createdAt ? new Date(a.createdAt).getTime() : (a.isLocal ? a.id : 0);
                            const timeB = b.createdAt ? new Date(b.createdAt).getTime() : (b.isLocal ? b.id : 0);
                            return timeA - timeB;
                        });
                        return combined;
                    });
                }
            } else {
                console.error(`Error fetching chat messages: ${response.status}`);
            }
        } catch (err) {
            console.error('Error fetching chat messages:', err);
        }
    }, [API_BASE_URL, currentUser, getImageUrl]);

    const uploadImageToMessage = useCallback(async (messageId: number, file: File): Promise<boolean> => {
        const token = getAuthToken();
        if (!token) {
            console.error('No token for uploading image');
            return false;
        }

        const formData = new FormData();
        formData.append('imageFile', file);

        try {
            console.log('Uploading image to message:', messageId, 'File:', file.name);
            const response = await fetch(`${API_BASE_URL}/api/chat-messages/${messageId}/upload-photo`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
                body: formData,
            });

            if (response.ok) {
                console.log('Image uploaded to message:', messageId);
                return true;
            } else {
                const errorText = await response.text();
                console.error('Error uploading image:', response.status, errorText);
                return false;
            }
        } catch (error) {
            console.error('Error uploading image:', error);
            return false;
        }
    }, [API_BASE_URL]);

    const stopSSE = useCallback(() => {
        if (tokenRefreshRef.current) {
            clearTimeout(tokenRefreshRef.current);
            tokenRefreshRef.current = null;
        }
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
        }
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
            eventSourceRef.current = null;
            console.log('SSE connection closed');
        }
    }, []);

    const startSSE = useCallback(async (chatId: number) => {
        stopSSE();

        // 1. Начальная загрузка сообщений
        await fetchChatMessages(chatId);

        // 2. Получаем Mercure JWT
        const token = getAuthToken();
        if (!token) return;

        try {
            const subResp = await fetch(`${API_BASE_URL}/api/chats/${chatId}/subscribe`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!subResp.ok) {
                console.error('Failed to get Mercure token:', subResp.status);
                return;
            }
            const { token: mercureToken, topic } = await subResp.json() as { token: string; topic: string };

            // 3. Открываем SSE-соединение
            const hubUrl = new URL(MERCURE_HUB_URL);
            hubUrl.searchParams.append('topic', topic);
            hubUrl.searchParams.append('authorization', mercureToken);

            const es = new EventSource(hubUrl.toString());
            eventSourceRef.current = es;
            console.log('SSE connected to topic:', topic);

            es.onmessage = (event) => {
                try {
                    const payload = JSON.parse(event.data) as {
                        type: 'created' | 'updated' | 'deleted';
                        data: ApiMessage | { id: number; chatId: number };
                    };
                    const { type, data } = payload;
                    const user = currentUserRef.current;

                    if (type === 'deleted') {
                        const del = data as { id: number; chatId: number };
                        setMessages(prev => prev.filter(m => m.id !== del.id));
                        // Обновляем миниатюры через рефреш чата
                        fetchChatMessages(chatId);
                        return;
                    }

                    if (!user) return;

                    const apiMsg = data as ApiMessage;
                    const createdAt = apiMsg.createdAt ? new Date(apiMsg.createdAt) : new Date();
                    const updatedAt = apiMsg.updatedAt ? new Date(apiMsg.updatedAt) : null;
                    const isEdited = !!(updatedAt && apiMsg.createdAt &&
                        updatedAt.getTime() - new Date(apiMsg.createdAt).getTime() > 1000);

                    const msg: Message = {
                        id: apiMsg.id,
                        sender: apiMsg.author.id === user.id ? 'me' : 'other',
                        name: getTranslatedFullName(apiMsg.author),
                        text: apiMsg.text,
                        type: 'text' as const,
                        time: createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        createdAt: createdAt.toISOString(),
                        edited: isEdited,
                        replyTo: apiMsg.replyTo ? {
                            id: apiMsg.replyTo.id,
                            text: apiMsg.replyTo.text,
                            name: getTranslatedFullName(apiMsg.replyTo.author)
                        } : undefined,
                        images: (apiMsg.images || []).map(img => ({
                            id: img.id,
                            url: getImageUrl(img.image),
                            name: img.image
                        }))
                    };

                    if (type === 'created') {
                        setMessages(prev => {
                            // Удаляем локальный pending-дубликат только если сообщение от меня
                            const isMyMsg = msg.sender === 'me';
                            const filtered = isMyMsg
                                ? prev.filter(m => !(m.isLocal && m.text === msg.text))
                                : prev;
                            if (filtered.some(m => m.id === msg.id)) return filtered;
                            return [...filtered, msg].sort(
                                (a, b) => new Date(a.createdAt!).getTime() - new Date(b.createdAt!).getTime()
                            );
                        });
                        // Обновляем миниатюры если есть фото
                        if (apiMsg.images && apiMsg.images.length > 0) {
                            const newThumbs: ChatImageThumbnail[] = apiMsg.images.map(img => ({
                                id: img.id,
                                imageUrl: getImageUrl(img.image),
                                author: img.author,
                                createdAt: img.createdAt || new Date().toISOString()
                            }));
                            setChatImages(prev => {
                                const merged = [
                                    ...prev.filter(t => !newThumbs.some(n => n.id === t.id)),
                                    ...newThumbs
                                ];
                                return merged.sort(
                                    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                                );
                            });
                        }
                    } else if (type === 'updated') {
                        setMessages(prev => prev.map(m => m.id === msg.id ? msg : m));
                        // Обновляем миниатюры
                        const updThumbs: ChatImageThumbnail[] = (apiMsg.images || []).map(img => ({
                            id: img.id,
                            imageUrl: getImageUrl(img.image),
                            author: img.author,
                            createdAt: img.createdAt || new Date().toISOString()
                        }));
                        setChatImages(prev => {
                            const merged = [
                                ...prev.filter(t => !updThumbs.some(n => n.id === t.id)),
                                ...updThumbs
                            ];
                            return merged.sort(
                                (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                            );
                        });
                    }
                } catch (err) {
                    console.error('SSE parse error:', err);
                }
            };

            es.onerror = (err) => {
                console.error('SSE error, reconnecting in 3s:', err);
                es.close();
                eventSourceRef.current = null;
                // Автопереподключение через 3 секунды
                if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
                reconnectTimeoutRef.current = setTimeout(() => {
                    console.log('Reconnecting SSE for chat:', chatId);
                    startSSERef.current?.(chatId);
                }, 3000);
            };

            // Обновляем токен за 5 минут до его истечения (55 минут)
            if (tokenRefreshRef.current) clearTimeout(tokenRefreshRef.current);
            tokenRefreshRef.current = setTimeout(() => {
                console.log('Refreshing Mercure token for chat:', chatId);
                startSSERef.current?.(chatId);
            }, 55 * 60 * 1000);

        } catch (err) {
            console.error('Error setting up SSE:', err);
        }
    }, [stopSSE, fetchChatMessages, API_BASE_URL, MERCURE_HUB_URL, getTranslatedFullName, getImageUrl]);

    // Синхронизируем ref чтобы setTimeout всегда вызывал актуальную версию startSSE
    useEffect(() => { startSSERef.current = startSSE; }, [startSSE]);

    // Синхронизируем chatsRef чтобы startSSE мог получить актуальный список чатов
    useEffect(() => { chatsRef.current = chats; }, [chats]);

    // ===== PRESENCE (ОНЛАЙН/ОФЛАЙН) =====
    useEffect(() => {
        if (!currentUser) return;

        const pingUrl = `${API_BASE_URL}/api/users/ping`;
        const offlineUrl = `${API_BASE_URL}/api/users/offline`;

        const doPing = () => {
            const token = getAuthToken();
            if (token) fetch(pingUrl, { method: 'POST', headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
        };

        const pingAndRefresh = () => {
            doPing();
            fetchChats();
        };

        const markOffline = () => {
            const token = getAuthToken();
            if (token) fetch(offlineUrl, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, keepalive: true }).catch(() => {});
        };

        doPing();
        heartbeatIntervalRef.current = setInterval(pingAndRefresh, 30_000);

        const onVisibility = () => {
            if (document.visibilityState === 'hidden') markOffline();
            else doPing();
        };

        window.addEventListener('beforeunload', markOffline);
        document.addEventListener('visibilitychange', onVisibility);

        return () => {
            clearInterval(heartbeatIntervalRef.current!);
            heartbeatIntervalRef.current = null;
            window.removeEventListener('beforeunload', markOffline);
            document.removeEventListener('visibilitychange', onVisibility);
            markOffline();
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentUser?.id]);

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

    const sendMessageToServer = useCallback(async (chatId: number, messageText: string, replyToId?: number): Promise<number | false> => {
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
                    chat: `/api/chats/${chatId}`,
                    ...(replyToId ? { replyTo: `/api/chat-messages/${replyToId}` } : {})
                })
            });

            if (response.ok) {
                const data = await response.json();
                console.log(t('chat.messageSuccess'));
                return typeof data.id === 'number' ? data.id : false;
            } else {
                console.error(t('chat.messageError'), response.status);
                return false;
            }
        } catch (err) {
            console.error(t('chat.messageError'), err);
            return false;
        }
    }, [API_BASE_URL, t]);

    const deleteMessage = useCallback(async (messageId: number) => {
        try {
            const token = getAuthToken();
            if (!token) return;
            const response = await fetch(`${API_BASE_URL}/api/chat-messages/${messageId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok || response.status === 204) {
                setMessages(prev => prev.filter(msg => msg.id !== messageId));
            } else {
                console.error('Delete failed:', response.status);
            }
        } catch (err) {
            console.error('Error deleting message:', err);
        }
    }, [API_BASE_URL]);

    const editMessageOnServer = useCallback(async (
        messageId: number,
        newText: string,
        keepImages: { id: number; url: string; name: string }[],
        newFiles: File[]
    ): Promise<boolean> => {
        try {
            const token = getAuthToken();
            if (!token || !selectedChat) return false;
            const response = await fetch(`${API_BASE_URL}/api/chat-messages/${messageId}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/merge-patch+json'
                },
                body: JSON.stringify({
                    text: newText,
                    chat: `/api/chats/${selectedChat}`,
                    images: keepImages.map(img => ({ image: img.name }))
                })
            });
            if (response.ok) {
                for (const file of newFiles) {
                    await uploadImageToMessage(messageId, file);
                }
                return true;
            }
            return false;
        } catch (err) {
            console.error('Error editing message:', err);
            return false;
        }
    }, [API_BASE_URL, selectedChat, uploadImageToMessage]);

    const handleEditFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (files && files.length > 0) {
            const validFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
            setEditingNewFiles(prev => [...prev, ...validFiles]);
        }
        if (event.target) event.target.value = '';
    }, []);

    // Загрузка файлов к конкретному сообщению
    const uploadFilesToMessage = useCallback(async (messageId: number, files: File[]): Promise<void> => {
        for (const file of files) {
            await uploadImageToMessage(messageId, file);
        }
    }, [uploadImageToMessage]);

    const sendMessage = useCallback(async () => {
        const isEditMode = !!editingMessage;
        const hasContent = isEditMode
            ? (newMessage.trim().length > 0 || editingImages.length > 0 || editingNewFiles.length > 0)
            : (newMessage.trim().length > 0 || selectedFiles.length > 0);
        if (!hasContent || !selectedChat || !currentUser) {
            console.log('Cannot send message');
            return;
        }

        // Режим редактирования
        if (editingMessage) {
            setIsUploading(true);
            try {
                const success = await editMessageOnServer(editingMessage.id, newMessage, editingImages, editingNewFiles);
                if (success) {
                    // SSE updated-событие обновит сообщение, нам нужно только сбросить UI
                    setEditingMessage(null);
                    setEditingImages([]);
                    setEditingNewFiles([]);
                    setNewMessage("");
                }
            } finally {
                setIsUploading(false);
            }
            return;
        }

        const text = newMessage.trim();
        const capturedReplyId = replyToMessage?.id;
        const filesToUpload = [...selectedFiles];

        // Добавляем временное сообщение в UI
        const tempMessageId = Date.now();
        const now = new Date();
        const tempMessage: Message = {
            id: tempMessageId,
            sender: "me" as const,
            name: getTranslatedFullName(currentUser),
            text: text || '',
            type: 'text' as const,
            time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            isLocal: true,
            createdAt: now.toISOString(),
            replyTo: replyToMessage ? { id: replyToMessage.id, text: replyToMessage.text, name: replyToMessage.name } : undefined
        };

        setMessages(prev => [...prev, tempMessage]);
        setNewMessage("");
        setReplyToMessage(null);
        setSelectedFiles([]);

        // Отправляем сообщение на сервер (даже если текст пустой — для файлов нужен ID)
        const messageId = await sendMessageToServer(selectedChat, text, capturedReplyId);

        if (messageId === false) {
            setMessages(prev => prev.map(msg =>
                msg.id === tempMessageId ? { ...msg, status: 'error' as const } : msg
            ));
            return;
        }

        // Если есть файлы — загружаем к только что созданному сообщению
        if (filesToUpload.length > 0) {
            setIsUploading(true);
            try {
                await uploadFilesToMessage(messageId, filesToUpload);
                // После загрузки файлов освежаем чат чтобы синхронизировать thumbnail-панель
                await fetchChatMessages(selectedChat);
            } finally {
                setIsUploading(false);
            }
        }
        // SSE created-событие доставит итоговое сообщение (текст без файлов)
    }, [newMessage, selectedFiles, selectedChat, currentUser, sendMessageToServer, editingMessage, editMessageOnServer, editingImages, editingNewFiles, replyToMessage, getTranslatedFullName, uploadFilesToMessage, fetchChatMessages]);



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

    // Обработка клавиатуры на мобильных устройствах
    useEffect(() => {
        if (typeof window === 'undefined') return;

        const handleResize = () => {
            // Когда открывается клавиатура, прокручиваем к последнему сообщению
            if (window.innerWidth <= 480 && selectedChat) {
                // Небольшая задержка чтобы DOM успел обновиться
                setTimeout(() => {
                    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
                }, 100);
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
    }, [scrollToBottom, selectedChat]);

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
            const fullName = getTranslatedFullName(interlocutor).toLowerCase();
            const originalFullName = `${interlocutor.name} ${interlocutor.surname}`.toLowerCase();
            const email = interlocutor.email?.toLowerCase() || '';
            const phone = interlocutor.phone1?.toLowerCase() || '';

            return fullName.includes(searchLower) ||
                originalFullName.includes(searchLower) ||
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

        // Проверяем есть ли фото в любом из сообщений
        const hasImages = chat.messages?.some(m => m.images && m.images.length > 0);
        if (hasImages) {
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
        navigate(ROUTES.HOME);
    }, [navigate]);

    const currentChat = chats.find(chat => chat.id === selectedChat);
    const currentInterlocutor = currentChat ? getInterlocutorFromChat(currentChat) : null;
    const showChatArea = selectedChat !== null && currentInterlocutor !== null;

    // Пока загружается - показать загрузку
    if (isLoading) {
        return <PageLoader text={t('chat.loadingChats')} />;
    }

    // Если нет currentUser после загрузки - показать AuthModal
    if (!currentUser) {
        return (
            <AuthModal
                isOpen={true}
                onClose={() => navigate(ROUTES.HOME)}
                onLoginSuccess={() => window.location.reload()}
            />
        );
    }

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
            <input
                type="file"
                ref={editFileInputRef}
                style={{ display: 'none' }}
                onChange={handleEditFileSelect}
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
                                                alt={getTranslatedFullName(interlocutor)}
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
                                            {getTranslatedFullName(interlocutor)}
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
                                <Link to={ROUTES.PROFILE_BY_ID(currentInterlocutor.id)} style={{ textDecoration: 'none' }}>
                                    <div className={styles.avatar}>
                                        {currentInterlocutor.image ? (
                                            <img
                                                src={`${API_BASE_URL}${currentInterlocutor.image.startsWith('/') ? currentInterlocutor.image : '/images/profile_photos/' + currentInterlocutor.image}`}
                                                className={styles.avatarImage}
                                                alt={getTranslatedFullName(currentInterlocutor)}
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
                                </Link>
                                <div className={styles.headerInfo}>
                                    <div className={styles.name}>
                                        <Link to={ROUTES.PROFILE_BY_ID(currentInterlocutor.id)} style={{ textDecoration: 'none', color: 'inherit' }}>
                                            {getTranslatedFullName(currentInterlocutor)}
                                        </Link>
                                        {currentChat?.isArchived && <span className={styles.archiveBadge}> ({t('chat.archive').toLowerCase()})</span>}
                                    </div>
                                    {currentChat?.ticket?.title && (
                                        <a href={`/ticket/${currentChat.ticket.id}`} className={styles.serviceTitle}>
                                            {currentChat.ticket.title}
                                        </a>
                                    )}
                                    {!currentChat?.isArchived && (
                                        <div className={styles.status}>
                                            {currentInterlocutor.isOnline
                                                ? t('chat.online')
                                                : currentInterlocutor.lastSeen
                                                    ? `${t('chat.offline')} • ${getLastSeenTime(currentInterlocutor)}`
                                                    : t('chat.offline')}
                                        </div>
                                    )}

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
                                        className={`${styles.photosButton} ${isPhotoSidebarOpen ? styles.photosButtonActive : ''}`}
                                        onClick={() => setIsPhotoSidebarOpen(prev => !prev)}
                                        aria-label={t('chat.viewAllPhotos')}
                                        title={isPhotoSidebarOpen ? 'Скрыть фото' : 'Показать фото'}
                                    >
                                        <IoImages />
                                        <span className={styles.photosCount}>{chatImages.length}</span>
                                    </button>
                                )}
                                {currentInterlocutor && (
                                    <button
                                        className={styles.complaintButton}
                                        onClick={() => setShowComplaintModal(true)}
                                        title="Пожаловаться"
                                        aria-label="Пожаловаться"
                                    >
                                        <IoWarningOutline />
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
                                            // Временные локальные ожидающие загрузки файлов
                                            if (msg.type === 'image' && (msg.status === 'pending' || msg.status === 'uploading')) {
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

                                            return (
                                                <div
                                                    key={msg.id}
                                                    className={`${styles.messageWrapper} ${msg.sender === "me" ? styles.myWrapper : ''}`}
                                                >
                                                    <div className={`${styles.message} ${msg.sender === "me" ? styles.myMessage : styles.theirMessage}`}>
                                                        {msg.sender === "other" && (
                                                            <div className={styles.messageName}>{msg.name}</div>
                                                        )}
                                                        {msg.replyTo && (
                                                            <div className={styles.replyQuote}>
                                                                <div className={styles.replyQuoteName}>{msg.replyTo.name}</div>
                                                                <div className={styles.replyQuoteText}>
                                                                    {msg.replyTo.text.length > 80 ? msg.replyTo.text.substring(0, 80) + '…' : msg.replyTo.text}
                                                                </div>
                                                            </div>
                                                        )}
                                                        {msg.images && msg.images.length > 0 && (
                                                            <div className={`${styles.messageImagesGrid} ${msg.images.length === 1 ? styles.messageImages1 : msg.images.length === 2 ? styles.messageImages2 : styles.messageImages3}`}>
                                                                {msg.images.map((img) => (
                                                                    <img
                                                                        key={img.id}
                                                                        src={img.url}
                                                                        alt=""
                                                                        className={styles.messageGridImage}
                                                                        onClick={() => {
                                                                            const galleryIdx = chatImages.findIndex(ci => ci.imageUrl === img.url);
                                                                            photoGallery.openGallery(galleryIdx >= 0 ? galleryIdx : 0);
                                                                        }}
                                                                        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                                                                    />
                                                                ))}
                                                            </div>
                                                        )}
                                                        <div className={styles.messageContent}>
                                                            {msg.text && <div className={styles.messageText}>{msg.text}</div>}
                                                            <div className={styles.messageTime}>
                                                                {msg.time}
                                                                {msg.edited && <span className={styles.editedBadge}> • изм.</span>}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className={styles.messageActions}>
                                                        <button className={styles.actionBtn} onClick={() => { setReplyToMessage(msg); messageInputRef.current?.focus(); }} title="Ответить">
                                                            <IoArrowUndoSharp />
                                                        </button>
                                                        {msg.sender === "me" && !msg.isLocal && (
                                                            <>
                                                                <button className={styles.actionBtn} onClick={() => { setEditingMessage(msg); setNewMessage(msg.text); setEditingImages(msg.images || []); setEditingNewFiles([]); messageInputRef.current?.focus(); }} title="Редактировать">
                                                                    <IoPencilSharp />
                                                                </button>
                                                                <button className={`${styles.actionBtn} ${styles.deleteMsgBtn}`} onClick={() => deleteMessage(msg.id)} title="Удалить">
                                                                    <IoTrashSharp />
                                                                </button>
                                                            </>
                                                        )}
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
                                <div className={`${styles.photoSidebar} ${!isPhotoSidebarOpen ? styles.photoSidebarCollapsed : ''} ${isPhotoSidebarOpen ? styles.photoSidebarMobileOpen : ''}`}>
                                    <div className={styles.photoSidebarHeader}>
                                        <IoImages />
                                        <span style={{ flex: 1 }}>{t('chat.photos')} ({chatImages.length})</span>
                                        <button
                                            className={styles.photoSidebarGalleryBtn}
                                            onClick={() => photoGallery.openGallery(0)}
                                            title="Открыть галерею"
                                        >⤢</button>
                                        <button
                                            className={styles.photoSidebarCloseBtn}
                                            onClick={() => setIsPhotoSidebarOpen(false)}
                                            title="Закрыть"
                                        >✕</button>
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

                        {(replyToMessage || editingMessage) && !currentChat?.isArchived && (
                            <div className={styles.replyBar}>
                                <div className={styles.replyBarContent}>
                                    {replyToMessage ? (
                                        <>
                                            <IoArrowUndoSharp className={styles.replyBarIcon} />
                                            <div className={styles.replyBarText}>
                                                <span className={styles.replyBarName}>{replyToMessage.name}</span>
                                            </div>
                                        </>
                                    ) : editingMessage && (
                                        <>
                                            <IoPencilSharp className={styles.replyBarIcon} />
                                            <div className={styles.editBarBody}>
                                                <div className={styles.replyBarText}>
                                                    <span className={styles.replyBarName}>{t('chat.editing')}</span>
                                                </div>
                                                {(editingImages.length > 0 || editingNewFiles.length > 0) && (
                                                    <div className={styles.editingPhotos}>
                                                        {editingImages.map(img => (
                                                            <div key={img.id} className={styles.editingPhotoItem}>
                                                                <img src={img.url} alt="" className={styles.editingPhotoThumb} />
                                                                <button
                                                                    className={styles.editingPhotoRemove}
                                                                    onClick={() => setEditingImages(prev => prev.filter(i => i.id !== img.id))}
                                                                    title="Удалить фото"
                                                                ><IoClose /></button>
                                                            </div>
                                                        ))}
                                                        {editingNewFiles.map((file, idx) => (
                                                            <div key={idx} className={styles.editingPhotoItem}>
                                                                <img src={URL.createObjectURL(file)} alt="" className={styles.editingPhotoThumb} />
                                                                <button
                                                                    className={styles.editingPhotoRemove}
                                                                    onClick={() => setEditingNewFiles(prev => prev.filter((_, i) => i !== idx))}
                                                                    title="Убрать"
                                                                ><IoClose /></button>
                                                            </div>
                                                        ))}
                                                        <button
                                                            className={styles.editingPhotoAdd}
                                                            onClick={() => editFileInputRef.current?.click()}
                                                            title="Добавить фото"
                                                        ><IoAttach /></button>
                                                    </div>
                                                )}
                                                {editingImages.length === 0 && editingNewFiles.length === 0 && (
                                                    <button
                                                        className={styles.editingPhotoAddInline}
                                                        onClick={() => editFileInputRef.current?.click()}
                                                        title="Добавить фото"
                                                    ><IoAttach /> фото</button>
                                                )}
                                            </div>
                                        </>
                                    )}
                                </div>
                                <button
                                    className={styles.replyBarClose}
                                    onClick={() => { setReplyToMessage(null); setEditingMessage(null); setEditingImages([]); setEditingNewFiles([]); setNewMessage(""); }}
                                    aria-label="Отменить"
                                >
                                    <IoClose />
                                </button>
                            </div>
                        )}
                        <div className={styles.chatInput}>
                            {!editingMessage && (
                                <button
                                    className={styles.attachButton}
                                    onClick={triggerFileInput}
                                    disabled={isUploading || currentChat?.isArchived}
                                    aria-label={t('chat.attachFile')}
                                >
                                    <IoAttach />
                                </button>
                            )}

                            <input
                                type="text"
                                ref={messageInputRef}
                                placeholder={currentChat?.isArchived ? t('chat.chatInArchive') : t('chat.messageInput')}
                                className={`${styles.inputField} ${currentChat?.isArchived ? styles.disabled : ''}`}
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                onKeyPress={handleKeyPress}
                                onFocus={() => {
                                    // Задержки для надежной прокрутки когда открывается клавиатура
                                    setTimeout(() => {
                                        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
                                    }, 100);
                                    setTimeout(() => {
                                        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
                                    }, 300);
                                }}
                                disabled={isUploading || currentChat?.isArchived}
                            />

                            <button
                                className={styles.sendButton}
                                onClick={sendMessage}
                                disabled={(editingMessage
                                    ? (!newMessage.trim() && editingImages.length === 0 && editingNewFiles.length === 0)
                                    : (!newMessage.trim() && selectedFiles.length === 0)) || isUploading || currentChat?.isArchived}
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
            {showComplaintModal && currentInterlocutor && (
                <ComplaintModal
                    isOpen={showComplaintModal}
                    onClose={() => setShowComplaintModal(false)}
                    onSuccess={(msg) => { setShowComplaintModal(false); setError(msg); setTimeout(() => setError(null), 3000); }}
                    onError={(msg) => { setError(msg); setTimeout(() => setError(null), 3000); }}
                    targetUserId={currentInterlocutor.id}
                    ticketId={currentChat?.ticket?.id}
                    chatId={selectedChat ?? undefined}
                    complaintType="chat"
                />
            )}
            <CookieConsentBanner/>
        </div>
    );
}

export default Chat;