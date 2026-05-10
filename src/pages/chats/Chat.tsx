import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useTranslation } from 'react-i18next';
import { getAuthToken, fetchCurrentUser } from "../../utils/auth";
import { ROUTES } from '../../app/routers/routes';
import { smartNameTranslator } from '../../utils/textHelper';
import Auth from '../../shared/ui/Modal/Auth/Auth.tsx';
import Feedback from '../../shared/ui/Modal/Feedback';
import { PageLoader } from '../../widgets/PageLoader';
import { EmptyState } from '../../widgets/EmptyState';
import styles from "./Chat.module.scss";
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { IoSend, IoAttach, IoImages, IoArchiveOutline, IoArrowUpCircleOutline, IoWarningOutline, IoPencilSharp, IoTrashSharp, IoArrowUndoSharp, IoEye, IoChatbubblesOutline } from "react-icons/io5";
import { Preview, usePreview } from '../../shared/ui/Photo/Preview';
import CookieConsentBanner from "../../widgets/Banners/CookieConsentBanner/CookieConsentBanner.tsx";
import { ActionsDropdown } from '../../widgets/ActionsDropdown';
import { uploadPhotos } from '../../utils/imageHelper';
import { Tabs } from '../../shared/ui/Tabs';
import Grid, { PhotoItem, buildOrderedImagePayload } from '../../shared/ui/Photo/Grid';
import { Clear } from '../../shared/ui/Button/Clear/Clear';
import { ShowMore } from '../../shared/ui/Button/ShowMore/ShowMore.tsx';
import { SelectSearch } from '../../shared/ui/SelectSearch';
import { getPageSize } from '../../utils/pageSize.ts';
import { parsePagedResponse } from '../../utils/apiHelper';
import { useShowMore } from '../../hooks';
import { Marquee } from '../../shared/ui/Text/Marquee';

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
    readAt?: string | null;
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
    description: string;
    author: ApiUser;
    chat?: { id: number } | null;
    createdAt?: string;
    updatedAt?: string;
    readAt?: string | null;
    replyTo?: { id: number; description: string; author: ApiUser } | null;
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
    const { t, i18n } = useTranslation(['components', 'common']);
    const [activeTab, setActiveTab] = useState<"active" | "archive">("active");
    const [selectedChat, setSelectedChat] = useState<number | null>(null);
    const [chats, setChats] = useState<ApiChat[]>([]);
    const { page: chatPage, appendRef: appendChatsRef, skipFetchRef: skipChatFetchRef, setHasMore: setChatHasMore, showMoreProps: chatsShowMoreProps } = useShowMore<ApiChat>(setChats);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [isChatListRefreshing, setIsChatListRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [currentUser, setCurrentUser] = useState<ApiUser | null>(null);
    const [isMobileChatActive, setIsMobileChatActive] = useState(false);
    const [selectedPhotoItems, setSelectedPhotoItems] = useState<PhotoItem[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [isChatLoading, setIsChatLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [isPhotoSidebarOpen, setIsPhotoSidebarOpen] = useState(false);
    const [showComplaintModal, setShowComplaintModal] = useState(false);
    const [sidebarComplaintTarget, setSidebarComplaintTarget] = useState<{ chatId: number; interlocutorId: number; ticketId?: number } | null>(null);

    // Состояния для миниатюр и модального окна фото
    const [chatImages, setChatImages] = useState<ChatImageThumbnail[]>([]);

    // Состояния для ответа и редактирования
    const [replyToMessage, setReplyToMessage] = useState<Message | null>(null);
    const [editingMessage, setEditingMessage] = useState<Message | null>(null);
    const [editingPhotoItems, setEditingPhotoItems] = useState<PhotoItem[]>([]);

    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const eventSourceRef = useRef<EventSource | null>(null);
    const presenceSourceRef = useRef<EventSource | null>(null);
    const inboxSourceRef = useRef<EventSource | null>(null);
    const currentUserRef = useRef<ApiUser | null>(null);
    const tokenRefreshRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const startSSERef = useRef<((chatId: number) => Promise<void>) | null>(null);
    const startPresenceSSERef = useRef<((interlocutorId: number) => void) | null>(null);
    const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const heartbeatIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const chatsRef = useRef<ApiChat[]>([]);
    const messageInputRef = useRef<HTMLInputElement>(null);
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
    const MERCURE_HUB_URL = import.meta.env.VITE_MERCURE_HUB_URL;

    const [searchParams] = useSearchParams();
    const chatIdFromUrl = searchParams.get('chatId');
    const navigate = useNavigate();

    // Хук для галереи фотографий
    const galleryImages = useMemo(() => chatImages.map(img => img.imageUrl), [chatImages]);
    const photoGallery = usePreview({ images: galleryImages });

    // Gallery for selected (new-message) photos
    const selectedPhotoUrls = useMemo(
        () => selectedPhotoItems.map(p => p.type === 'new' ? p.previewUrl : ''),
        [selectedPhotoItems]
    );
    const selectedFilesGallery = usePreview({ images: selectedPhotoUrls });
    
    // Вспомогательная функция для транслитерации полного имени (с автоопределением)
    const getTranslatedFullName = useCallback((user: ApiUser): string => {
        const firstName = user.name || '';
        const lastName = user.surname || '';
        const currentLang = i18n.language as 'ru' | 'tj' | 'eng';
        
        const translatedFirstName = smartNameTranslator(firstName, currentLang);
        const translatedLastName = smartNameTranslator(lastName, currentLang);
        
        return `${translatedLastName} ${translatedFirstName}`.trim();
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

    // Если currentUser загрузился позже, чем был выбран чат из URL-параметра,
    // fetchChatMessages пропустил обработку сообщений (currentUser был null).
    // Повторно загружаем сообщения теперь, когда пользователь известен.
    useEffect(() => {
        if (currentUser && selectedChat) {
            fetchChatMessages(selectedChat);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentUser]);

    // Обработка выбранного чата
    useEffect(() => {
        if (selectedChat) {
            console.log('Starting SSE for chat:', selectedChat);
            startSSE(selectedChat);

            const chat = chatsRef.current.find(c => c.id === selectedChat);
            const interlocutor = chat
                ? (chat.author?.id === currentUserRef.current?.id ? chat.replyAuthor : chat.author)
                : null;
            if (interlocutor) {
                startPresenceSSERef.current?.(interlocutor.id);
            }

            if (window.innerWidth <= 960) {
                setIsMobileChatActive(true);
            }
        } else {
            setMessages([]);
            setChatImages([]);
            stopSSE();
            setIsChatLoading(false);
            if (presenceSourceRef.current) {
                presenceSourceRef.current.close();
                presenceSourceRef.current = null;
            }
        }
        return () => {
            stopSSE();
            if (presenceSourceRef.current) {
                presenceSourceRef.current.close();
                presenceSourceRef.current = null;
            }
        };
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
        const container = messagesContainerRef.current;
        if (container) {
            container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
        }
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

        return `${API_BASE_URL}/uploads/chat_messages/${imagePath}`;
    }, [API_BASE_URL]);

    // Gallery for editing mode photos (needs getImageUrl for existing items)
    const editingAllPreviews = useMemo(
        () => editingPhotoItems.map(p => p.type === 'existing' ? getImageUrl(p.image) : p.previewUrl),
        [editingPhotoItems, getImageUrl]
    );
    const editingGallery = usePreview({ images: editingAllPreviews });

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
                            text: msg.description,
                            type: 'text' as const,
                            time: createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                            createdAt: createdAt.toISOString(),
                            edited: isEdited,
                            readAt: msg.readAt ?? null,
                            replyTo: msg.replyTo ? {
                                id: msg.replyTo.id,
                                text: msg.replyTo.description,
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

    const markChatAsRead = useCallback(async (chatId: number) => {
        const token = getAuthToken();
        if (!token) return;
        try {
            await fetch(`${API_BASE_URL}/api/chats/${chatId}/read`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
            });
        } catch {
            // fire-and-forget — ошибка не критична
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
        setIsChatLoading(true);

        // 1. Начальная загрузка сообщений
        await fetchChatMessages(chatId);
        await markChatAsRead(chatId);
        setIsChatLoading(false);

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
                        text: apiMsg.description,
                        type: 'text' as const,
                        time: createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        createdAt: createdAt.toISOString(),
                        edited: isEdited,
                        readAt: apiMsg.readAt ?? null,
                        replyTo: apiMsg.replyTo ? {
                            id: apiMsg.replyTo.id,
                            text: apiMsg.replyTo.description,
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
                        // Помечаем сообщения как прочитанные если сообщение от собеседника
                        if (msg.sender === 'other') {
                            markChatAsRead(chatId);
                        }
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
    }, [stopSSE, fetchChatMessages, markChatAsRead, setIsChatLoading, API_BASE_URL, MERCURE_HUB_URL, getTranslatedFullName, getImageUrl]);

    const startPresenceSSE = useCallback((interlocutorId: number) => {
        if (presenceSourceRef.current) {
            presenceSourceRef.current.close();
            presenceSourceRef.current = null;
        }

        const hubUrl = new URL(MERCURE_HUB_URL);
        hubUrl.searchParams.append('topic', `user:${interlocutorId}`);

        const es = new EventSource(hubUrl.toString());
        presenceSourceRef.current = es;

        es.onmessage = (event) => {
            try {
                const { isOnline, lastSeen } = JSON.parse(event.data) as {
                    isOnline: boolean;
                    lastSeen: string | null;
                };

                setChats(prev => prev.map(chat => {
                    const isAuthor = chat.author?.id === interlocutorId;
                    const isReply  = chat.replyAuthor?.id === interlocutorId;
                    if (!isAuthor && !isReply) return chat;

                    return {
                        ...chat,
                        author: isAuthor
                            ? { ...chat.author, isOnline, lastSeen: lastSeen ?? undefined }
                            : chat.author,
                        replyAuthor: isReply
                            ? { ...chat.replyAuthor, isOnline, lastSeen: lastSeen ?? undefined }
                            : chat.replyAuthor,
                    };
                }));
            } catch {
                // ignore parse errors
            }
        };

        es.onerror = () => {
            // EventSource автоматически переподключается
        };
    }, [MERCURE_HUB_URL]);

    useEffect(() => { startPresenceSSERef.current = startPresenceSSE; }, [startPresenceSSE]);

    const startInboxSSE = useCallback(async () => {
        if (inboxSourceRef.current) {
            inboxSourceRef.current.close();
            inboxSourceRef.current = null;
        }
        const token = getAuthToken();
        if (!token) return;
        try {
            const resp = await fetch(`${API_BASE_URL}/api/chats/inbox-token`, {
                headers: { 'Authorization': `Bearer ${token}` },
            });
            if (!resp.ok) return;
            const { token: mercureToken, topics } = await resp.json() as { token: string | null; topics: string[] };
            if (!mercureToken || !topics?.length) return;

            const hubUrl = new URL(MERCURE_HUB_URL);
            topics.forEach(t => hubUrl.searchParams.append('topic', t));
            hubUrl.searchParams.append('authorization', mercureToken);

            const es = new EventSource(hubUrl.toString());
            inboxSourceRef.current = es;

            es.onmessage = (event) => {
                try {
                    const { type, data } = JSON.parse(event.data) as {
                        type: string;
                        data: ApiMessage & { chat?: { id: number } };
                    };
                    if (type === 'created') {
                        const chatId = data.chat?.id;
                        if (!chatId) return;
                        setChats(prev => prev.map(chat => {
                            if (chat.id !== chatId) return chat;
                            const msgs = chat.messages || [];
                            if (msgs.some(m => m.id === data.id)) return chat;
                            return { ...chat, messages: [...msgs, data] };
                        }));
                    } else if (type === 'updated') {
                        const chatId = data.chat?.id;
                        if (!chatId) return;
                        setChats(prev => prev.map(chat => {
                            if (chat.id !== chatId) return chat;
                            const msgs = (chat.messages || []).map(m =>
                                m.id === data.id ? { ...m, readAt: data.readAt } : m
                            );
                            return { ...chat, messages: msgs };
                        }));
                    } else if (type === 'deleted') {
                        const del = data as unknown as { id: number; chatId: number };
                        setChats(prev => prev.map(chat => {
                            if (chat.id !== del.chatId) return chat;
                            return { ...chat, messages: (chat.messages || []).filter(m => m.id !== del.id) };
                        }));
                    }
                } catch { /* ignore parse errors */ }
            };
            es.onerror = () => { /* EventSource auto-reconnects */ };
        } catch { /* ignore network errors */ }
    }, [API_BASE_URL, MERCURE_HUB_URL]);

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

        const markOffline = () => {
            const token = getAuthToken();
            if (token) fetch(offlineUrl, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, keepalive: true }).catch(() => {});
        };

        doPing();
        heartbeatIntervalRef.current = setInterval(doPing, 3_000);
        const chatsRefreshInterval = setInterval(() => fetchChats(true), 60_000);

        const onVisibility = () => {
            if (document.visibilityState === 'hidden') markOffline();
            else doPing();
        };

        window.addEventListener('beforeunload', markOffline);
        document.addEventListener('visibilitychange', onVisibility);

        return () => {
            clearInterval(heartbeatIntervalRef.current!);
            heartbeatIntervalRef.current = null;
            clearInterval(chatsRefreshInterval);
            window.removeEventListener('beforeunload', markOffline);
            document.removeEventListener('visibilitychange', onVisibility);
            markOffline();
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentUser?.id]);

    // Глобальный inbox SSE — подписывается на все чаты пользователя,
    // обновляет бабл непрочитанных без перезагрузки страницы.
    useEffect(() => {
        if (!currentUser?.id) return;
        startInboxSSE();
        // Обновляем токен каждые 50 минут до его истечения (токен живёт 1 час)
        const refreshInterval = setInterval(startInboxSSE, 50 * 60 * 1000);
        return () => {
            clearInterval(refreshInterval);
            if (inboxSourceRef.current) {
                inboxSourceRef.current.close();
                inboxSourceRef.current = null;
            }
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
                    description: messageText,
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
        if (!window.confirm(t('chat.deleteConfirm'))) {
            return;
        }

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
    }, [API_BASE_URL, t]);

    const editMessageOnServer = useCallback(async (
        messageId: number,
        newText: string,
        photoItems: PhotoItem[]
    ): Promise<boolean> => {
        const newFiles = (photoItems.filter(p => p.type === 'new') as Array<{ type: 'new'; file: File; previewUrl: string }>).map(p => p.file);

        const fetchMessageImages = async (id: number, token: string): Promise<Array<{ id: number; image: string }>> => {
            const response = await fetch(`${API_BASE_URL}/api/chat-messages/${id}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                }
            });
            if (!response.ok) return [];
            const messageData = await response.json() as ApiMessage;
            return (messageData.images || []).map(img => ({ id: img.id, image: img.image }));
        };

        try {
            const token = getAuthToken();
            if (!token || !selectedChat) return false;

            if (newFiles.length > 0) {
                for (const file of newFiles) {
                    await uploadPhotos('chat-messages', messageId, [file], token);
                }
            }

            const currentImages = await fetchMessageImages(messageId, token);
            const orderedImages = buildOrderedImagePayload(photoItems, currentImages);

            const response = await fetch(`${API_BASE_URL}/api/chat-messages/${messageId}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/merge-patch+json'
                },
                body: JSON.stringify({
                    description: newText,
                    chat: `/api/chats/${selectedChat}`,
                    images: orderedImages
                })
            });

            return response.ok;
        } catch (err) {
            console.error('Error editing message:', err);
            return false;
        }
    }, [API_BASE_URL, selectedChat]);

    // Загрузка файлов к конкретному сообщению
    const uploadFilesToMessage = useCallback(async (messageId: number, files: File[]): Promise<void> => {
        if (files.length === 0) return;
        const token = getAuthToken();
        if (!token) return;
        await uploadPhotos('chat-messages', messageId, files, token);
    }, []);

    const sendMessage = useCallback(async () => {
        const isEditMode = !!editingMessage;
        const hasContent = isEditMode
            ? (newMessage.trim().length > 0 || editingPhotoItems.length > 0)
            : (newMessage.trim().length > 0 || selectedPhotoItems.length > 0);
        if (!hasContent || !selectedChat || !currentUser) {
            console.log('Cannot send message');
            return;
        }

        // Если чат в архиве — разархивируем перед отправкой
        const chatToSend = chats.find(c => c.id === selectedChat);
        if (chatToSend?.isArchived) {
            const token = getAuthToken();
            if (token) {
                await fetch(`${API_BASE_URL}/api/chats/${selectedChat}`, {
                    method: 'PATCH',
                    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/merge-patch+json' },
                    body: JSON.stringify({ active: true })
                }).then(() => {
                    setChats(prev => prev.map(c => c.id === selectedChat ? { ...c, isArchived: false, active: true } : c));
                }).catch(() => {});
            }
        }

        // Режим редактирования
        if (editingMessage) {
            setIsUploading(true);
            try {
                const success = await editMessageOnServer(editingMessage.id, newMessage, editingPhotoItems);
                if (success) {
                    setEditingMessage(null);
                    setEditingPhotoItems([]);
                    setNewMessage("");
                    // Обновляем сообщение принудительно (SSE может не успеть с фото)
                    await fetchChatMessages(selectedChat);
                }
            } finally {
                setIsUploading(false);
            }
            return;
        }

        const text = newMessage.trim();
        const capturedReplyId = replyToMessage?.id;
        const filesToUpload = selectedPhotoItems
            .filter(p => p.type === 'new')
            .map(p => (p as { type: 'new'; file: File; previewUrl: string }).file);

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
        setSelectedPhotoItems([]);

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
    }, [newMessage, selectedPhotoItems, selectedChat, currentUser, sendMessageToServer, editingMessage, editMessageOnServer, editingPhotoItems, replyToMessage, getTranslatedFullName, uploadFilesToMessage, fetchChatMessages, chats, API_BASE_URL]);



    // ===== ОСТАЛЬНЫЕ ФУНКЦИИ =====

    const triggerFileInput = useCallback(() => {
        fileInputRef.current?.click();
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
            if (window.innerWidth <= 960 && selectedChat) {
                // Небольшая задержка чтобы DOM успел обновиться
                setTimeout(() => {
                    scrollToBottom();
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
            const originalFullName = `${interlocutor.surname} ${interlocutor.name}`.toLowerCase();
            const email = interlocutor.email?.toLowerCase() || '';
            const phone1 = interlocutor.phone1?.toLowerCase() || '';
            const phone2 = interlocutor.phone2?.toLowerCase() || '';
            const ticketTitle = chat.ticket?.title?.toLowerCase() || '';
            const lastMessageText = chat.messages?.length
                ? chat.messages[chat.messages.length - 1].description?.toLowerCase() || ''
                : '';
            const anyMessageText = chat.messages?.some(m =>
                m.description?.toLowerCase().includes(searchLower)
            ) || false;

            return fullName.includes(searchLower) ||
                originalFullName.includes(searchLower) ||
                email.includes(searchLower) ||
                phone1.includes(searchLower) ||
                phone2.includes(searchLower) ||
                ticketTitle.includes(searchLower) ||
                lastMessageText.includes(searchLower) ||
                anyMessageText;
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
        const userData = await fetchCurrentUser();
        if (!userData) {
            setIsLoading(false);
            return null;
        }
        setCurrentUser(userData as unknown as ApiUser);
        return userData as unknown as ApiUser;
    }, [API_BASE_URL, t]);

    const fetchChats = useCallback(async (silent = false) => {
        try {
            if (!silent) {
                if (!appendChatsRef.current) setIsLoading(true);
                setError(null);
            } else {
                setIsChatListRefreshing(true);
            }

            const token = getAuthToken();
            if (!token) {
                console.log('No auth token available');
                if (!silent) setIsLoading(false);
                return;
            }

            console.log('Fetching chats with token...');
            const pageSize = getPageSize();
            const response = await fetch(`${API_BASE_URL}/api/chats/me?page=${chatPage}&itemsPerPage=${pageSize}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                },
            });

            let chatsData: ApiChat[] = [];
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            let responseData: any = null;

            if (response.ok) {
                responseData = await response.json();
                console.log('Chats API response:', responseData);

                if (Array.isArray(responseData)) {
                    chatsData = responseData.map(chat => ({
                        ...chat,
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
                // Any failure (404, 5xx, etc.) — just leave the list as-is, EmptyState handles it
                setChatHasMore(false);
                return;
            }

            const { hasMore: fetchedHasMore } = parsePagedResponse(responseData, chatPage, pageSize);

            if (silent) {
                // Background refresh: merge by id to preserve object identity for unchanged chats,
                // preventing unnecessary re-renders of chat list items.
                setChats(prev => {
                    if (prev.length === 0) return chatsData;
                    const prevMap = new Map(prev.map(c => [c.id, c]));
                    let changed = prev.length !== chatsData.length;
                    const merged = chatsData.map(incoming => {
                        const existing = prevMap.get(incoming.id);
                        if (!existing) { changed = true; return incoming; }
                        const authorChanged =
                            existing.author?.isOnline !== incoming.author?.isOnline ||
                            existing.author?.lastSeen !== incoming.author?.lastSeen;
                        const replyAuthorChanged =
                            existing.replyAuthor?.isOnline !== incoming.replyAuthor?.isOnline ||
                            existing.replyAuthor?.lastSeen !== incoming.replyAuthor?.lastSeen;
                        const existingUnread = (existing.messages || []).filter(m => !m.readAt).length;
                        const incomingUnread = (incoming.messages || []).filter(m => !m.readAt).length;
                        const messagesChanged =
                            (existing.messages?.length ?? 0) !== (incoming.messages?.length ?? 0) ||
                            existingUnread !== incomingUnread;
                        if (authorChanged || replyAuthorChanged || messagesChanged) { changed = true; return incoming; }
                        return existing;
                    });
                    return changed ? merged : prev;
                });
            } else if (appendChatsRef.current) {
                appendChatsRef.current = false;
                setChats(prev => {
                    const existingIds = new Set(prev.map(c => c.id));
                    const newChats = chatsData.filter(c => !existingIds.has(c.id));
                    return [...prev, ...newChats];
                });
            } else {
                // Preserve the URL-specific chat if it's not in the new response (race condition with newly created chats)
                if (chatIdFromUrl) {
                    const urlChatId = parseInt(chatIdFromUrl);
                    setChats(prev => {
                        if (!chatsData.some(c => c.id === urlChatId)) {
                            const preserved = prev.find(c => c.id === urlChatId);
                            return preserved ? [preserved, ...chatsData] : chatsData;
                        }
                        return chatsData;
                    });
                } else {
                    setChats(chatsData);
                }
            }

            setChatHasMore(fetchedHasMore);

            if (chatIdFromUrl) {
                const chatId = parseInt(chatIdFromUrl);
                const chatExists = chatsData.some(chat => chat.id === chatId);
                if (chatExists) {
                    setSelectedChat(chatId);
                } else {
                    // Chat not in list (just created) — load it individually and add to list
                    await fetchChatMessages(chatId);
                    setSelectedChat(chatId);
                }
            }
        } catch (error) {
            console.error('Error fetching chats:', error);
        } finally {
            if (!silent) setIsLoading(false);
            else setIsChatListRefreshing(false);
        }
    }, [API_BASE_URL, chatIdFromUrl, t, fetchChatMessages, chatPage]);

    // Перезагружаем чаты при смене страницы
    useEffect(() => {
        if (skipChatFetchRef.current) {
            skipChatFetchRef.current = false;
            return;
        }
        fetchChats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [chatPage]);


    // ===== ФУНКЦИИ ДЛЯ АРХИВАЦИИ ЧАТОВ =====
    const archiveChat = useCallback(async (chatId: number, archive: boolean = true) => {
        if (archive) {
            if (!window.confirm(t('chat.archiveConfirm'))) return;
        }
        try {
            const token = getAuthToken();
            if (!token) {
                setError(t('chat.authRequired'));
                return;
            }

            const response = await fetch(`${API_BASE_URL}/api/chats/${chatId}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/merge-patch+json'
                },
                body: JSON.stringify({
                    active: !archive
                })
            });

            if (response.ok) {
                setChats(prev => prev.map(chat =>
                    chat.id === chatId
                        ? { ...chat, isArchived: archive, active: !archive }
                        : chat
                ));

                if (archive && selectedChat === chatId && activeTab === "active") {
                    setSelectedChat(null);
                    setMessages([]);
                    setChatImages([]);
                    setIsMobileChatActive(false);
                }

                if (!archive && selectedChat === chatId) {
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

            const newItems: PhotoItem[] = validFiles.map(file => ({
                type: 'new' as const,
                file,
                previewUrl: URL.createObjectURL(file),
            }));
            setSelectedPhotoItems(prev => [...prev, ...newItems]);
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
        if (msg?.description) {
            return msg.description.length > 30 ? msg.description.substring(0, 30) + '...' : msg.description;
        }

        // Проверяем есть ли фото в любом из сообщений
        const hasImages = chat.messages?.some(m => m.images && m.images.length > 0);
        if (hasImages) {
            const lastTextMsg = chat.messages?.find(m => m.description && m.description.trim());
            if (lastTextMsg) {
                return lastTextMsg.description.length > 30 ? lastTextMsg.description.substring(0, 30) + '...' : lastTextMsg.description;
            }
            return `📷 ${t('chat.noPhotoDescription')}`;
        }

        return t('chat.noMessages');
    }, [t]);

    const handleChatSelect = useCallback((chatId: number) => {
        console.log('Selecting chat:', chatId);
        setSelectedChat(chatId);
        if (window.innerWidth <= 960) {
            setIsMobileChatActive(true);
        }
    }, []);

    const handleBackToChatList = useCallback(() => {
        setIsMobileChatActive(false);
        setSelectedChat(null);
        setSelectedPhotoItems([]);
        setChatImages([]);
    }, []);

    // const handleBackToHome = useCallback(() => {
    //     navigate(ROUTES.HOME);
    // }, [navigate]);

    const currentChat = chats.find(chat => chat.id === selectedChat);
    const currentInterlocutor = currentChat ? getInterlocutorFromChat(currentChat) : null;
    const showChatArea = selectedChat !== null && currentInterlocutor !== null;

    // Пока загружается - показать загрузку
    if (isLoading) {
        return <PageLoader text={t('chat.loadingChats')} />;
    }

    // Если нет currentUser после загрузки - показать Auth
    if (!currentUser) {
        return (
            <Auth
                isOpen={true}
                onClose={() => navigate(ROUTES.HOME)}
                onLoginSuccess={() => window.location.reload()}
            />
        );
    }

    return (
        <div className={styles.chatPageWrapper}>
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
                <div className={styles.searchBar}>
                    <SelectSearch
                        altMode
                        options={[]}
                        value={searchQuery}
                        onChange={setSearchQuery}
                        placeholder={t('chat.searchPlaceholder')}
                    />
                </div>

                <Tabs
                    tabs={[
                        { key: 'active' as const, label: <><IoChatbubblesOutline />{t('chat.active')}</> },
                        { key: 'archive' as const, label: <><IoArchiveOutline />{t('chat.archive')}</> },
                    ]}
                    activeTab={activeTab}
                    onChange={setActiveTab}
                />

                <div className={styles.chatList}>
                    {isChatListRefreshing && filteredChats.length === 0 ? (
                        <EmptyState isLoading />
                    ) : filteredChats.length === 0 ? (
                        <EmptyState
                            title={searchQuery ? t('chat.noChatsFound') :
                                activeTab === "active" ? t('chat.noActiveChats') :
                                    t('chat.noArchivedChats')}
                            onRefresh={() => fetchChats(true)}
                        />
                    ) : (
                        filteredChats.map(chat => {
                            const interlocutor = getInterlocutorFromChat(chat);
                            if (!interlocutor) return null;

                            return (
                                <div key={chat.id} className={`${styles.chatItem} ${selectedChat === chat.id ? styles.selected : ""}`} onClick={() => handleChatSelect(chat.id)}>
                                    <div className={styles.avatar}>
                                        {interlocutor.image ? (
                                            <img
                                                src={`${API_BASE_URL}${interlocutor.image.startsWith('/') ? interlocutor.image : '/uploads/users/' + interlocutor.image}`}
                                                className={styles.avatarImage}
                                                alt={getTranslatedFullName(interlocutor)}
                                            />
                                        ) : (
                                            `${interlocutor.surname?.charAt(0) || ''}${interlocutor.name?.charAt(0) || ''}`
                                        )}
                                        {interlocutor.isOnline && !chat.isArchived && (
                                            <div className={styles.onlineIndicator} />
                                        )}
                                    </div>
                                    <div className={styles.chatInfo}>
                                        <div className={styles.name}>
                                            <Marquee text={getTranslatedFullName(interlocutor)} alwaysScroll />
                                        </div>
                                        <div className={styles.specialty}>
                                            <Marquee text={chat.ticket?.title || interlocutor.email} alwaysScroll />
                                        </div>
                                        <div className={styles.lastMessage}><Marquee text={getLastMessageText(chat)} alwaysScroll /></div>
                                    </div>
                                    <div className={styles.chatMeta}>
                                        <div className={styles.time}>{getLastMessageTime(chat)}</div>
                                        {!interlocutor.isOnline && interlocutor.lastSeen && !chat.isArchived && (
                                            <div className={styles.lastSeen}>{getLastSeenTime(interlocutor)}</div>
                                        )}
                                        {(() => {
                                            const unread = (chat.messages || []).filter(
                                                m => m.author?.id !== currentUser?.id && !m.readAt
                                            ).length;
                                            return unread > 0 ? (
                                                <div className={styles.unreadBadge}>{unread > 99 ? '99+' : unread}</div>
                                            ) : null;
                                        })()}
                                    </div>
                                    <div
                                        className={styles.chatItemMenuWrapper}
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <ActionsDropdown
                                            items={[
                                                {
                                                    icon: chat.isArchived ? <IoArrowUpCircleOutline /> : <IoArchiveOutline />,
                                                    label: chat.isArchived ? t('chat.restoreFromArchive') : t('chat.archiveChat'),
                                                    onClick: () => archiveChat(chat.id, !chat.isArchived),
                                                },
                                                {
                                                    icon: <IoWarningOutline />,
                                                    label: t('chat.report'),
                                                    onClick: () => setSidebarComplaintTarget({ chatId: chat.id, interlocutorId: interlocutor.id, ticketId: chat.ticket?.id }),
                                                    danger: true,
                                                },
                                            ]}
                                        />
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
                {filteredChats.length > 0 && (
                    <ShowMore
                        {...chatsShowMoreProps}
                        showMoreText={t('common:app.showMore', { defaultValue: 'Показать больше' })}
                        showLessText={t('common:app.showLess', { defaultValue: 'Показать меньше' })}
                        column={true}
                    />
                )}
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
                                                src={`${API_BASE_URL}${currentInterlocutor.image.startsWith('/') ? currentInterlocutor.image : '/uploads/users/' + currentInterlocutor.image}`}
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
                                        <Link to={ROUTES.PROFILE_BY_ID(currentInterlocutor.id)} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
                                            <Marquee text={getTranslatedFullName(currentInterlocutor)} alwaysScroll />
                                        </Link>

                                    </div>
                                    {currentChat?.ticket?.title && (
                                        <a href={`/ticket/${currentChat.ticket.id}`} className={styles.serviceTitle}>
                                            <Marquee text={currentChat.ticket.title} alwaysScroll />
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
                                <ActionsDropdown
                                    items={[
                                        {
                                            icon: currentChat?.isArchived ? <IoArrowUpCircleOutline /> : <IoArchiveOutline />,
                                            label: currentChat?.isArchived ? t('chat.restoreFromArchive') : t('chat.archiveChat'),
                                            onClick: () => currentChat && archiveChat(currentChat.id, !currentChat.isArchived),
                                            hidden: !currentChat,
                                        },
                                        {
                                            icon: <IoImages />,
                                            label: isPhotoSidebarOpen ? 'Скрыть фото' : `Фото (${chatImages.length})`,
                                            onClick: () => setIsPhotoSidebarOpen(prev => !prev),
                                            hidden: chatImages.length === 0,
                                        },
                                        {
                                            icon: <IoWarningOutline />,
                                            label: t('chat.report'),
                                            onClick: () => setShowComplaintModal(true),
                                            hidden: !currentInterlocutor,
                                            danger: true,
                                        },
                                    ]}
                                />
                            </div>
                        </div>

                        <div className={styles.chatContent}>
                            <div className={styles.chatMessages} ref={messagesContainerRef}>
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
                                                                    <PageLoader
                                                                        compact
                                                                        asSpan
                                                                        primary
                                                                        text={msg.status === 'pending' ? t('chat.waiting') : t('chat.uploading', { progress: msg.progress || 0 })}
                                                                    />
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
                                                                {msg.sender === 'me' && !msg.isLocal && (
                                                                    <span className={msg.readAt ? styles.tickRead : styles.tickSent}>
                                                                        {msg.readAt ? '✓✓' : '✓'}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className={styles.messageActions}>
                                                        <button className={styles.actionBtn} onClick={() => { setReplyToMessage(msg); messageInputRef.current?.focus(); }} title="Ответить">
                                                            <IoArrowUndoSharp />
                                                        </button>
                                                        {msg.sender === "me" && !msg.isLocal && (
                                                            <>
                                                                <button className={styles.actionBtn} onClick={() => { setEditingMessage(msg); setNewMessage(msg.text); setEditingPhotoItems((msg.images || []).map(img => ({ type: 'existing' as const, id: img.id, image: img.name }))); messageInputRef.current?.focus(); }} title="Редактировать">
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
                            </div>

                            {/* Боковая панель с миниатюрами фото */}
                            {chatImages.length > 0 && (
                                <>
                                {isPhotoSidebarOpen && (
                                    <div
                                        className={styles.photoSidebarBackdrop}
                                        onClick={() => setIsPhotoSidebarOpen(false)}
                                    />
                                )}
                                <div className={`${styles.photoSidebar} ${!isPhotoSidebarOpen ? styles.photoSidebarCollapsed : ''} ${isPhotoSidebarOpen ? styles.photoSidebarMobileOpen : ''}`}>
                                    <div className={styles.photoSidebarHeader}>
                                        <IoImages />
                                        <span style={{ flex: 1 }}>{t('chat.photos')} ({chatImages.length})</span>
                                        <button
                                            className={styles.photoSidebarGalleryBtn}
                                            onClick={() => photoGallery.openGallery(0)}
                                            title="Открыть галерею"
                                        >⤢</button>
                                        <Clear
                                            className={styles.photoSidebarCloseBtn}
                                            onClick={() => setIsPhotoSidebarOpen(false)}
                                        />
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
                                                    <IoEye />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                </>
                            )}
                        </div>

                        {(replyToMessage || editingMessage) && (
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
                                                    {editingMessage.text && (
                                                        <span className={styles.replyBarMessage}>{editingMessage.text}</span>
                                                    )}
                                                </div>
                                                <Grid
                                                    photos={editingPhotoItems}
                                                    onChange={setEditingPhotoItems}
                                                    getImageUrl={getImageUrl}
                                                    onClickPhoto={(idx) => editingGallery.openGallery(idx)}
                                                    inputId="chat-edit-photo-upload"
                                                    photoAlt="Photo"
                                                    disabled={isUploading}
                                                />
                                            </div>
                                        </>
                                    )}
                                </div>
                                <Clear
                                    className={styles.replyBarClose}
                                    onClick={() => { setReplyToMessage(null); setEditingMessage(null); setEditingPhotoItems([]); setNewMessage(""); }}
                                />
                            </div>
                        )}
                        <div className={styles.chatInput}>
                            {!editingMessage && (
                                <button
                                    className={styles.attachButton}
                                    onClick={triggerFileInput}
                                    disabled={isUploading}
                                    aria-label={t('chat.attachFile')}
                                >
                                    <IoAttach />
                                </button>
                            )}

                            <input
                                type="text"
                                ref={messageInputRef}
                                placeholder={t('chat.messageInput')}
                                className={styles.inputField}
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                onKeyPress={handleKeyPress}
                                disabled={isUploading}
                            />

                            <button
                                className={styles.sendButton}
                                onClick={sendMessage}
                                disabled={(editingMessage
                                    ? (!newMessage.trim() && editingPhotoItems.length === 0)
                                    : (!newMessage.trim() && selectedPhotoItems.length === 0)) || isUploading}
                                aria-label={t('chat.sendMessage')}
                            >
                                <IoSend />
                            </button>
                        </div>

                        {selectedPhotoItems.length > 0 && (
                            <Grid
                                photos={selectedPhotoItems}
                                onChange={setSelectedPhotoItems}
                                getImageUrl={(path) => path}
                                onClickPhoto={(idx) => selectedFilesGallery.openGallery(idx)}
                                inputId="chat-photo-upload"
                                photoAlt="Photo"
                                disabled={isUploading}
                            />
                        )}

                        {(isUploading || isChatLoading) && (
                            <div className={styles.uploadingOverlay}>
                                <PageLoader
                                    compact
                                    asSpan
                                    primary
                                    text={isChatLoading ? t('chat.loadingMessages') : t('chat.uploadingFiles')}
                                />
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
            <Preview
                isOpen={photoGallery.isOpen}
                images={galleryImages}
                currentIndex={photoGallery.currentIndex}
                onClose={photoGallery.closeGallery}
                onNext={photoGallery.goToNext}
                onPrevious={photoGallery.goToPrevious}
                onSelectImage={photoGallery.selectImage}
                fallbackImage="../fonTest5.png"
            />
            <Preview
                isOpen={selectedFilesGallery.isOpen}
                images={selectedPhotoUrls}
                currentIndex={selectedFilesGallery.currentIndex}
                onClose={selectedFilesGallery.closeGallery}
                onNext={selectedFilesGallery.goToNext}
                onPrevious={selectedFilesGallery.goToPrevious}
                onSelectImage={selectedFilesGallery.selectImage}
                fallbackImage="../fonTest5.png"
            />
            <Preview
                isOpen={editingGallery.isOpen}
                images={editingAllPreviews}
                currentIndex={editingGallery.currentIndex}
                onClose={editingGallery.closeGallery}
                onNext={editingGallery.goToNext}
                onPrevious={editingGallery.goToPrevious}
                onSelectImage={editingGallery.selectImage}
                fallbackImage="../fonTest5.png"
            />
            {showComplaintModal && currentInterlocutor && (
                <Feedback
                    mode="complaint"
                    isOpen={showComplaintModal}
                    onClose={() => setShowComplaintModal(false)}
                    onSuccess={() => setShowComplaintModal(false)}
                    onError={() => {}}
                    targetUserId={currentInterlocutor.id}
                    ticketId={currentChat?.ticket?.id}
                    chatId={selectedChat ?? undefined}
                    complaintType="chat"
                />
            )}
            {sidebarComplaintTarget && (
                <Feedback
                    mode="complaint"
                    isOpen={true}
                    onClose={() => setSidebarComplaintTarget(null)}
                    onSuccess={() => setSidebarComplaintTarget(null)}
                    onError={() => {}}
                    targetUserId={sidebarComplaintTarget.interlocutorId}
                    ticketId={sidebarComplaintTarget.ticketId}
                    chatId={sidebarComplaintTarget.chatId}
                    complaintType="chat"
                />
            )}
            <CookieConsentBanner/>
        </div>
        </div>
    );
}

export default Chat;