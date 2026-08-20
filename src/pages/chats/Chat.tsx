import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useTranslation } from 'react-i18next';
import { getAuthToken, fetchCurrentUser, isAdmin } from "../../utils/authUtils";
import { API_ROUTES, ROUTES } from '../../app/routers/routes';
import { smartNameTranslator } from '../../utils/textUtils';
import Auth from '../../shared/ui/Modal/Auth/Auth';
import Feedback from '../../shared/ui/Modal/Feedback';
import { PageLoader } from '../../widgets/PageLoader';
import { EmptyState } from '../../widgets/EmptyState';
import styles from "./Chat.module.scss";
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { IoSend, IoAttach, IoImages, IoArchiveOutline, IoArrowUpCircleOutline, IoWarningOutline, IoBanOutline, IoTrashOutline, IoPencilSharp, IoTrashSharp, IoArrowUndoSharp, IoChatbubblesOutline, IoChevronDown } from "react-icons/io5";
import { Preview, usePreview } from '../../shared/ui/Photo/Preview';
import { MediaSidebar } from '../../shared/ui/Photo/MediaSidebar/MediaSidebar';
import CookieConsentBanner from "../../widgets/Banners/CookieConsentBanner/CookieConsentBanner";
import { ActionsDropdown } from '../../widgets/ActionsDropdown';
import { uploadPhotos } from '../../utils/imageUtils';
import { openMercureSource } from '../../utils/mercureUtils';
import { Tabs } from '../../shared/ui/Tabs';
import Grid, { PhotoItem, buildOrderedImagePayload } from '../../shared/ui/Photo/Grid';
import { Clear } from '../../shared/ui/Button/Clear/Clear';
import { ShowMore } from '../../shared/ui/Button/ShowMore/ShowMore';
import { SelectSearch } from '../../shared/ui/SelectSearch';
import { getPageSize } from '../../utils/pageSizeUtils';
import { parsePagedResponse, universalApiRequest } from '../../utils/apiUtils';
import { resolveApiError } from '../../utils/appMessagesUtils';
import { useShowMore } from '../../hooks';
import { fetchBlacklistEntries, blockUser as blockUserApi, unblockUser as unblockUserApi } from '../../hooks/useBlacklist';
import { InfoBanner } from '../../widgets/Banners/InfoBanner/InfoBanner';
import { Marquee } from '../../shared/ui/Text/Marquee';
import type { User as ApiUser } from '../../entities/api/User';
import type { Chat as ApiChat, ChatMessage as ApiMessage } from '../../entities/api/Chat';
import type { ChatImageView as ChatImageThumbnail, ChatMessageView as Message } from '../../entities/view/Chat';
import { API_BASE_URL } from '../../utils/configUtils';

// Backend physically rejects PATCH /chat-messages/{id} past this window (`edit_window_expired`,
// 403) — 15 minutes from the message's own `createdAt`. Hiding the pencil once it's expired
// avoids a "clicked it — turns out you can't" round trip; the server call would still 403 if
// this were ever bypassed. Doesn't gate delete (soft delete has no time limit).
const MESSAGE_EDIT_WINDOW_MS = 15 * 60 * 1000;
const isWithinMessageEditWindow = (createdAt?: string): boolean =>
    !!createdAt && Date.now() - new Date(createdAt).getTime() < MESSAGE_EDIT_WINDOW_MS;

/**
 * Chat page — full real-time-style messaging interface.
 * - Shows a list of chat threads on the left panel.
 * - Clicking a thread loads messages on the right panel.
 * - Supports image attachments, reply-to, message editing/deletion, and archiving.
 * - Polls for new messages periodically when a chat is open.
 * - Supports deep-linking via ?chatId query param.
 */
function Chat() {
    const { t, i18n } = useTranslation(['components', 'common']);
    // Moderation reach over message deletion (§5/§11 — soft delete is author-only *or* any
    // admin) — chat itself has no other admin-only affordances, this is the one spot it matters.
    const isAdminUser = isAdmin();
    const [activeTab, setActiveTab] = useState<"active" | "archive">("active");
    const [selectedChat, setSelectedChat] = useState<number | null>(null);
    const [chats, setChats] = useState<ApiChat[]>([]);
    const { page: chatPage, appendRef: appendChatsRef, skipFetchRef: skipChatFetchRef, setHasMore: setChatHasMore, showMoreProps: chatsShowMoreProps } = useShowMore<ApiChat>(setChats);
    const [messages, setMessages] = useState<Message[]>([]);
    // Pagination over GET /chats/{id}/messages (§5, newest-first) for the open thread — reset
    // to page 1 / hasMore false whenever `selectedChat` changes, see that effect below.
    const [messagesPage, setMessagesPage] = useState(1);
    const [hasMoreMessages, setHasMoreMessages] = useState(false);
    const [isLoadingMoreMessages, setIsLoadingMoreMessages] = useState(false);
    const [newMessage, setNewMessage] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingMoreChats, setIsLoadingMoreChats] = useState(false);
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
    /** Set by `loadOlderMessages` right before it prepends — tells the auto-scroll-to-bottom
     *  effect below to sit this one out, since `loadOlderMessages` restores scroll position
     *  itself (the viewer just asked to look at history, not jump back to the latest message). */
    const skipAutoScrollRef = useRef(false);
    /** Set whenever `selectedChat` changes — tells the auto-scroll-to-bottom effect below that
     *  the next `messages` population is a chat switch (jump straight to the bottom, no visible
     *  animation) rather than a new message arriving in an already-open conversation (smooth
     *  scroll is the nice touch there). Without this, opening any chat with more than a
     *  screenful of history played the *entire* smooth scroll-to-bottom animation every time —
     *  which reads as "the window growing/changing height" while it's actually just the message
     *  list sliding underneath a container that never resized at all. */
    const justSwitchedChatRef = useRef(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const presenceSourceRef = useRef<EventSource | null>(null);
    const inboxSourceRef = useRef<EventSource | null>(null);
    const currentUserRef = useRef<ApiUser | null>(null);
    const startPresenceSSERef = useRef<((interlocutorId: number) => void) | null>(null);
    const startInboxSSERef = useRef<(() => Promise<void>) | null>(null);
    const heartbeatIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const chatsRef = useRef<ApiChat[]>([]);
    /** Tracks which chat is currently open so the inbox SSE can route messages to setMessages. */
    const selectedChatIdRef = useRef<number | null>(null);
    /** Always points to the latest processActiveChatMessage to avoid stale closures in inbox SSE. */
    const processActiveChatMessageRef = useRef<((type: string, data: ApiMessage | { id: number; chatId: number }, chatId: number) => void) | null>(null);
    /** Always points to the latest fetchChats — inbox SSE debounces into this instead of
     *  putting `fetchChats` in its own deps (would resubscribe the whole EventSource on every
     *  fetchChats identity change). */
    const fetchChatsRef = useRef<((silent?: boolean) => Promise<void>) | null>(null);
    /** Debounces inbox SSE events (created/updated/deleted, several can land in a burst — e.g.
     *  the other side sending 3 messages in a row) into a single `GET /chats/me` refetch. */
    const chatsRefreshDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    /** A 'created' SSE event for another author's message can arrive before their images are
     *  attached (two-step create-then-upload-images flow) — this schedules one delayed
     *  `fetchChatMessages` to pick up any photos that land shortly after. */
    const messageImagesRefreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const messageInputRef = useRef<HTMLInputElement>(null);

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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Загрузка чатов после получения текущего пользователя
    // activeTab не нужен здесь — фильтрация уже в filteredChats
    useEffect(() => {
        if (currentUser) {
            console.log('User loaded, fetching chats...');
            fetchChats();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
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
        selectedChatIdRef.current = selectedChat;
        justSwitchedChatRef.current = true;
        // Stale pagination state from whichever chat was open before shouldn't leak into the
        // next one — loadChatData/fetchChatMessages below always (re)fetches page 1 anyway,
        // but resetting here keeps `hasMoreMessages` honest for the instant between selecting
        // a new chat and that fetch resolving (so a stray scroll can't trigger `loadOlderMessages`
        // against the wrong chat).
        setMessagesPage(1);
        setHasMoreMessages(false);
        if (selectedChat) {
            console.log('Loading chat data for:', selectedChat);
            loadChatData(selectedChat);

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
            setIsChatLoading(false);
            if (presenceSourceRef.current) {
                presenceSourceRef.current.close();
                presenceSourceRef.current = null;
            }
        }
        return () => {
            if (presenceSourceRef.current) {
                presenceSourceRef.current.close();
                presenceSourceRef.current = null;
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedChat]);

    // Обработка chatId из URL
    useEffect(() => {
        if (chatIdFromUrl) {
            const chatId = parseInt(chatIdFromUrl);
            console.log('Chat ID from URL:', chatId);
            setSelectedChat(chatId);
        }
    }, [chatIdFromUrl]);

    const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
        const container = messagesContainerRef.current;
        if (container) {
            container.scrollTo({ top: container.scrollHeight, behavior });
        }
    }, []);

    // Прокрутка к последнему сообщению — skipped once right after `loadOlderMessages` prepends
    // older history, which restores the scroll position itself instead. Instant (not smooth)
    // the first time a newly-selected chat's messages land — playing the whole smooth-scroll
    // animation on every chat open (however long its history is) looked like the container
    // itself resizing; a real new message arriving in an already-open chat still gets the
    // smooth scroll.
    useEffect(() => {
        if (skipAutoScrollRef.current) {
            skipAutoScrollRef.current = false;
            return;
        }
        const isChatSwitch = justSwitchedChatRef.current;
        justSwitchedChatRef.current = false;
        scrollToBottom(isChatSwitch ? 'instant' : 'smooth');
    }, [messages, scrollToBottom]);

    // Указатель "прокрутить вниз" — показываем, когда пользователь читает историю
    // выше и не находится у самого низа переписки.
    const [showScrollToBottom, setShowScrollToBottom] = useState(false);
    useEffect(() => {
        const container = messagesContainerRef.current;
        if (!container) return;
        const SCROLL_BOTTOM_THRESHOLD = 150;
        const handleScroll = () => {
            const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
            setShowScrollToBottom(distanceFromBottom > SCROLL_BOTTOM_THRESHOLD);
        };
        handleScroll();
        container.addEventListener('scroll', handleScroll, { passive: true });
        return () => container.removeEventListener('scroll', handleScroll);
        // .chatMessages mounts/unmounts as chats are selected — re-attach on that change.
    }, [selectedChat]);

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
    }, []); // API_BASE_URL is a module-level constant, not a reactive dep

    // Gallery for editing mode photos (needs getImageUrl for existing items)
    const editingAllPreviews = useMemo(
        () => editingPhotoItems.map(p => p.type === 'existing' ? getImageUrl(p.image) : p.previewUrl),
        [editingPhotoItems, getImageUrl]
    );
    const editingGallery = usePreview({ images: editingAllPreviews });

    // One ApiMessage → one view-model Message, shared by the initial/refresh load below and
    // `loadOlderMessages`' pagination so the mapping only lives in one place.
    const mapApiMessageToView = useCallback((msg: ApiMessage): Message => {
        const createdAt = msg.createdAt ? new Date(msg.createdAt) : new Date();
        return {
            id: msg.id,
            sender: msg.author.id === currentUser?.id ? "me" : "other",
            name: getTranslatedFullName(msg.author),
            text: msg.description,
            type: 'text' as const,
            time: createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            createdAt: createdAt.toISOString(),
            // Real fields now (§5) — used to be a heuristic (updatedAt more than a second past
            // createdAt), which false-positived on things like photo-only-uploaded-later edits.
            edited: !!msg.edited,
            deletedByAuthor: !!msg.deletedByAuthor,
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
    }, [currentUser, getImageUrl, getTranslatedFullName]);

    /**
     * Loads a chat's metadata + its most recent page of messages — used both for opening a
     * chat and for the "refetch after I just sent/edited/deleted something" refresh. Always
     * page 1 (§5: newest first) — same "clean latest snapshot" behavior the old code had when
     * it refetched the (previously unbounded, always-complete) embedded `messages` array
     * wholesale. The one real difference: if the viewer had scrolled up and loaded older pages
     * via `loadOlderMessages`, this collapses the thread back down to just the latest page —
     * an acceptable rough edge (that history is still one more "load older" click away) given
     * the alternative (merging pages) risks bleeding one chat's messages into another's view
     * when switching chats, since this same function handles both cases.
     */
    const fetchChatMessages = useCallback(async (chatId: number) => {
        try {
            const token = getAuthToken();
            if (!token) {
                console.log('No token for fetching messages');
                return;
            }

            console.log('Fetching messages for chat:', chatId);
            const chatData: ApiChat = await universalApiRequest(API_ROUTES.CHAT_BY_ID(chatId), { locale: false });
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
                newChats[chatIndex] = { ...newChats[chatIndex], ...chatDataWithArchive };
                return newChats;
            });

            if (currentUser) {
                const pageSize = getPageSize();
                const responseData = await universalApiRequest(`${API_ROUTES.CHAT_MESSAGES(chatId)}?page=1&itemsPerPage=${pageSize}`, { locale: false });
                const { items: pageMessages, hasMore } = parsePagedResponse<ApiMessage>(responseData, 1, pageSize);
                setMessagesPage(1);
                setHasMoreMessages(hasMore);

                // Reversed — the endpoint returns newest-first, the thread renders oldest→newest.
                const serverItems: Message[] = pageMessages.map(mapApiMessageToView).reverse();

                // Миниатюры для боковой панели — берём из плоского списка chatData.images
                // (still present — `Chat.images` is unaffected by the `messages` field removal).
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
        } catch (err) {
            console.error('Error fetching chat messages:', err);
        }
    }, [currentUser, getImageUrl, mapApiMessageToView]);

    /**
     * Pages further back in the same open chat — fetches the next-older page (§5: page 1 is
     * always the newest N, so "older" means incrementing) and prepends it, preserving scroll
     * position so the viewport doesn't jump. Dedupes by id defensively (a message landing via
     * Mercure between page loads could otherwise show up twice).
     */
    const loadOlderMessages = useCallback(async (chatId: number) => {
        if (isLoadingMoreMessages || !hasMoreMessages) return;
        setIsLoadingMoreMessages(true);
        try {
            const nextPage = messagesPage + 1;
            const pageSize = getPageSize();
            const responseData = await universalApiRequest(`${API_ROUTES.CHAT_MESSAGES(chatId)}?page=${nextPage}&itemsPerPage=${pageSize}`, { locale: false });
            const { items: pageMessages, hasMore } = parsePagedResponse<ApiMessage>(responseData, nextPage, pageSize);
            const olderItems: Message[] = pageMessages.map(mapApiMessageToView).reverse();

            const container = messagesContainerRef.current;
            const prevScrollHeight = container?.scrollHeight ?? 0;

            skipAutoScrollRef.current = true;
            setMessages(prev => {
                const existingIds = new Set(prev.map(m => m.id));
                const newOnes = olderItems.filter(m => !existingIds.has(m.id));
                return [...newOnes, ...prev];
            });
            setMessagesPage(nextPage);
            setHasMoreMessages(hasMore);

            requestAnimationFrame(() => {
                if (container) container.scrollTop = container.scrollHeight - prevScrollHeight;
            });
        } catch (err) {
            console.error('Error loading older messages:', err);
        } finally {
            setIsLoadingMoreMessages(false);
        }
    }, [messagesPage, hasMoreMessages, isLoadingMoreMessages, mapApiMessageToView]);

    const markChatAsRead = useCallback(async (chatId: number) => {
        try {
            await universalApiRequest(API_ROUTES.CHAT_READ(chatId), { method: 'POST', locale: false });
        } catch {
            // fire-and-forget — ошибка не критична
        }
    }, []);

    /**
     * Loads initial messages and marks the chat as read.
     * Real-time delivery is handled by the shared inbox SSE — no per-chat EventSource needed.
     */
    const loadChatData = useCallback(async (chatId: number) => {
        setIsChatLoading(true);
        await fetchChatMessages(chatId);
        await markChatAsRead(chatId);
        setIsChatLoading(false);
    }, [fetchChatMessages, markChatAsRead]);

    /**
     * Processes a Mercure real-time event for the currently open chat.
     * Called by the inbox SSE handler when event.chatId === selectedChatIdRef.current.
     */
    const processActiveChatMessage = useCallback((
        type: string,
        data: ApiMessage | { id: number; chatId: number },
        chatId: number,
    ) => {
        const user = currentUserRef.current;

        if (type === 'deleted') {
            // Likely unreachable now — DELETE is a soft delete (§5), which flows through the
            // same update path as an edit, so a delete elsewhere probably arrives as 'updated'
            // with `deletedByAuthor: true` rather than this. Kept as a defensive fallback in
            // case it ever does fire — refetch instead of filtering the message out locally,
            // since it isn't actually gone, just flips to the deleted-placeholder render.
            fetchChatMessages(chatId);
            return;
        }

        if (!user) return;

        const apiMsg = data as ApiMessage;
        // Same mapping as the initial/paginated load — keeps `edited`/`deletedByAuthor` (real
        // fields now, §5) and everything else consistent instead of a second hand-rolled copy.
        const msg: Message = mapApiMessageToView(apiMsg);

        if (type === 'created') {
            setMessages(prev => {
                const isMyMsg = msg.sender === 'me';
                const filtered = isMyMsg
                    ? prev.filter(m => !(m.isLocal && m.text === msg.text))
                    : prev;
                if (filtered.some(m => m.id === msg.id)) return filtered;
                return [...filtered, msg].sort(
                    (a, b) => new Date(a.createdAt!).getTime() - new Date(b.createdAt!).getTime()
                );
            });
            if (msg.sender === 'other') {
                markChatAsRead(chatId);
                // Images upload separately, after the message itself is created — the
                // 'created' event here can predate them. Refetch shortly after to pick up
                // photos that attach a moment later (see comment on the ref above).
                if (messageImagesRefreshTimeoutRef.current) clearTimeout(messageImagesRefreshTimeoutRef.current);
                messageImagesRefreshTimeoutRef.current = setTimeout(() => {
                    messageImagesRefreshTimeoutRef.current = null;
                    fetchChatMessages(chatId);
                }, 1800);
            }
            if (apiMsg.images && apiMsg.images.length > 0) {
                const newThumbs: ChatImageThumbnail[] = apiMsg.images.map(img => ({
                    id: img.id,
                    imageUrl: getImageUrl(img.image),
                    author: img.author,
                    createdAt: img.createdAt || new Date().toISOString()
                }));
                setChatImages(prev => {
                    const merged = [...prev.filter(t => !newThumbs.some(n => n.id === t.id)), ...newThumbs];
                    return merged.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                });
            }
        } else if (type === 'updated') {
            setMessages(prev => prev.map(m => m.id === msg.id ? msg : m));
            const updThumbs: ChatImageThumbnail[] = (apiMsg.images || []).map(img => ({
                id: img.id,
                imageUrl: getImageUrl(img.image),
                author: img.author,
                createdAt: img.createdAt || new Date().toISOString()
            }));
            setChatImages(prev => {
                const merged = [...prev.filter(t => !updThumbs.some(n => n.id === t.id)), ...updThumbs];
                return merged.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            });
        }
    }, [fetchChatMessages, getImageUrl, markChatAsRead, mapApiMessageToView]);

    useEffect(() => { processActiveChatMessageRef.current = processActiveChatMessage; }, [processActiveChatMessage]);


    const startPresenceSSE = useCallback((interlocutorId: number) => {
        if (presenceSourceRef.current) {
            presenceSourceRef.current.close();
            presenceSourceRef.current = null;
        }

        const es = openMercureSource([`user:${interlocutorId}`]);
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
    }, []);

    useEffect(() => { startPresenceSSERef.current = startPresenceSSE; }, [startPresenceSSE]);

    const startInboxSSE = useCallback(async () => {
        if (inboxSourceRef.current) {
            inboxSourceRef.current.close();
            inboxSourceRef.current = null;
        }
        const token = getAuthToken();
        if (!token) return;
        try {
            const { token: mercureToken, topics } = await universalApiRequest(API_ROUTES.CHATS_INBOX_TOKEN, { locale: false }) as { token: string | null; topics: string[] };
            if (!mercureToken || !topics?.length) return;

            const es = openMercureSource(topics, mercureToken);
            inboxSourceRef.current = es;

            es.onmessage = (event) => {
                try {
                    const { type, data } = JSON.parse(event.data) as {
                        type: string;
                        data: ApiMessage & { chat?: { id: number } };
                    };
                    const chatId = (data as any).chat?.id ?? (data as any).chatId;
                    if (!chatId) return;

                    // Route to active chat message list (replaces the old per-chat EventSource)
                    if (chatId === selectedChatIdRef.current) {
                        processActiveChatMessageRef.current?.(type, data, chatId);
                    }

                    // `unreadCount`/`lastMessage` are server-computed and never travel over
                    // Mercure (backend note, §5) — this event only means "something changed",
                    // so refetch GET /chats/me to pick up the real values instead of guessing
                    // from `data`. Debounced: a burst of events (e.g. 3 messages sent in a row)
                    // collapses into one refetch instead of one per event.
                    if (chatsRefreshDebounceRef.current) clearTimeout(chatsRefreshDebounceRef.current);
                    chatsRefreshDebounceRef.current = setTimeout(() => {
                        chatsRefreshDebounceRef.current = null;
                        fetchChatsRef.current?.(true);
                    }, 300);
                } catch { /* ignore parse errors */ }
            };
            es.onerror = () => { /* EventSource auto-reconnects */ };
        } catch { /* ignore network errors */ }
    }, []);

    useEffect(() => { startInboxSSERef.current = startInboxSSE; }, [startInboxSSE]);

    // Синхронизируем chatsRef чтобы startInboxSSE мог получить актуальный список чатов
    useEffect(() => { chatsRef.current = chats; }, [chats]);

    // ===== PRESENCE (ОНЛАЙН/ОФЛАЙН) =====
    useEffect(() => {
        if (!currentUser) return;

        const doPing = () => universalApiRequest(API_ROUTES.USERS_PING, { method: 'POST', locale: false }).catch(() => {});
        const markOffline = () => universalApiRequest(API_ROUTES.USERS_OFFLINE, { method: 'POST', locale: false, keepalive: true }).catch(() => {});

        doPing();
        heartbeatIntervalRef.current = setInterval(doPing, 10_000);
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
            if (chatsRefreshDebounceRef.current) {
                clearTimeout(chatsRefreshDebounceRef.current);
                chatsRefreshDebounceRef.current = null;
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
            const data: any = await universalApiRequest(API_ROUTES.CHAT_MESSAGES_CREATE, {
                method: 'POST',
                body: {
                    description: messageText,
                    chat: API_ROUTES.CHAT_BY_ID(chatId),
                    ...(replyToId ? { replyTo: API_ROUTES.CHAT_MESSAGE_BY_ID(replyToId) } : {})
                },
                locale: false,
            });
            console.log(t('chat.messageSuccess'));
            return typeof data.id === 'number' ? data.id : false;
        } catch (err) {
            console.error(t('chat.messageError'), err);
            // Surfaces e.g. "user_blocked" (they've blocked you — asymmetric, §10) with the
            // server's own localized text instead of failing silently.
            setError(resolveApiError(err, t('chat.messageError')));
            return false;
        }
    }, [t]);

    // Soft delete (§5) — the row survives server-side with `description` replaced by a fixed
    // placeholder and `images` cleared; `deletedByAuthor: true` is what the render below keys
    // off of, not that placeholder text (kept out of the translation system on purpose — see
    // `chat.messageDeleted`). Available to the message's own author, or any admin (moderation,
    // same reach as photo moderation elsewhere) — re-deleting an already-deleted message is a
    // no-op 204, so nothing extra is needed against double-clicks beyond the button just
    // disappearing once `deletedByAuthor` is true.
    const deleteMessage = useCallback(async (messageId: number) => {
        if (!window.confirm(t('chat.deleteConfirm'))) {
            return;
        }

        try {
            await universalApiRequest(API_ROUTES.CHAT_MESSAGE_BY_ID(messageId), { method: 'DELETE', locale: false });
            const deletedImageIds = new Set(messages.find(m => m.id === messageId)?.images?.map(img => img.id) ?? []);
            setMessages(prev => prev.map(msg =>
                msg.id === messageId ? { ...msg, text: '', deletedByAuthor: true, images: [] } : msg
            ));
            // The photo sidebar (§5: `Chat.images` aggregates across messages) needs the same
            // prune — the server just cleared this message's own images too, so its thumbnails
            // would otherwise linger there until the next full refetch.
            if (deletedImageIds.size > 0) {
                setChatImages(prev => prev.filter(img => !deletedImageIds.has(img.id)));
            }
        } catch (err) {
            console.error('Error deleting message:', err);
            setError(resolveApiError(err, t('chat.deleteMessageError')));
        }
    }, [t, messages]);

    // Throws on failure now instead of swallowing to a bare `false` — the shared edit
    // mechanism (§5/§11) can 403/400/410 here (edit_window_expired, edit_too_different,
    // message_already_deleted), each worth its own message via resolveApiError at the call
    // site instead of a silent no-op that left the composer sitting there with no feedback.
    const editMessageOnServer = useCallback(async (
        messageId: number,
        newText: string,
        photoItems: PhotoItem[]
    ): Promise<void> => {
        const newFiles = (photoItems.filter(p => p.type === 'new') as Array<{ type: 'new'; file: File; previewUrl: string }>).map(p => p.file);

        const fetchMessageImages = async (id: number): Promise<Array<{ id: number; image: string }>> => {
            try {
                const messageData = await universalApiRequest(API_ROUTES.CHAT_MESSAGE_BY_ID(id), { locale: false }) as ApiMessage;
                return (messageData.images || []).map(img => ({ id: img.id, image: img.image }));
            } catch {
                return [];
            }
        };

        const token = getAuthToken();
        if (!token || !selectedChat) return;

        if (newFiles.length > 0) {
            for (const file of newFiles) {
                await uploadPhotos('chat-messages', messageId, [file], token);
            }
        }

        const currentImages = await fetchMessageImages(messageId);
        const orderedImages = buildOrderedImagePayload(photoItems, currentImages);

        await universalApiRequest(API_ROUTES.CHAT_MESSAGE_BY_ID(messageId), {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/merge-patch+json' },
            body: { description: newText, chat: API_ROUTES.CHAT_BY_ID(selectedChat), images: orderedImages },
            locale: false,
        });
    }, [selectedChat]);

    // One-off delete straight from the MediaSidebar panel (no need to open full edit mode just
    // to drop one screenshot) — same "images: remaining" PATCH mechanism as `editMessageOnServer`,
    // just against whichever message actually owns the picked thumbnail. MediaSidebar only ever
    // offers this on images whose `deletable` we set to true (own messages), so no extra
    // ownership check is needed here.
    const deleteChatImage = useCallback(async (image: { id: number | string }) => {
        if (!window.confirm(t('chat.deleteImageConfirm')) || !selectedChat) return;
        const owningMessage = messages.find(m => (m.images ?? []).some(img => img.id === image.id));
        if (!owningMessage) return;
        try {
            const remaining = (owningMessage.images ?? []).filter(img => img.id !== image.id).map(img => ({ id: img.id, image: img.name }));
            await universalApiRequest(API_ROUTES.CHAT_MESSAGE_BY_ID(owningMessage.id), {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/merge-patch+json' },
                // `chat` is required here even though the message id alone should be enough to
                // resolve it — same as `editMessageOnServer` below. Omitting it 404s with
                // `chat_not_found` instead of just patching the message directly.
                body: { chat: API_ROUTES.CHAT_BY_ID(selectedChat), images: remaining },
                locale: false,
            });
            await fetchChatMessages(selectedChat);
        } catch (err) {
            console.error('Error deleting image:', err);
        }
    }, [messages, selectedChat, fetchChatMessages, t]);

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
        universalApiRequest(API_ROUTES.CHAT_BY_ID(selectedChat), {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/merge-patch+json' },
                    body: { active: true },
                    locale: false,
                }).then(() => {
                    setChats(prev => prev.map(c => c.id === selectedChat ? { ...c, isArchived: false, active: true } : c));
                }).catch(() => {});
            }
        }

        // Режим редактирования
        if (editingMessage) {
            setIsUploading(true);
            try {
                await editMessageOnServer(editingMessage.id, newMessage, editingPhotoItems);
                setEditingMessage(null);
                setEditingPhotoItems([]);
                setNewMessage("");
                // Обновляем сообщение принудительно (SSE может не успеть с фото)
                await fetchChatMessages(selectedChat);
            } catch (err) {
                setError(resolveApiError(err, t('chat.messageError')));
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
    }, [newMessage, selectedPhotoItems, selectedChat, currentUser, sendMessageToServer, editingMessage, editMessageOnServer, editingPhotoItems, replyToMessage, getTranslatedFullName, uploadFilesToMessage, fetchChatMessages, chats]);



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
            const phone1 = (interlocutor.phone1 as string | undefined)?.toLowerCase() || '';
            const phone2 = (interlocutor.phone2 as string | undefined)?.toLowerCase() || '';
            const ticketTitle = chat.ticket?.title?.toLowerCase() || '';
            // Full message-history search still isn't possible client-side (Chat no longer
            // embeds `messages`, and fetching every chat's full history just to filter a list
            // would defeat the point of the paginated endpoint) — but the last message text is
            // available for free now (`chat.lastMessage`), so at least that much is searchable.
            const lastMessageText = chat.lastMessage?.description?.toLowerCase() || '';

            return fullName.includes(searchLower) ||
                originalFullName.includes(searchLower) ||
                email.includes(searchLower) ||
                phone1.includes(searchLower) ||
                phone2.includes(searchLower) ||
                ticketTitle.includes(searchLower) ||
                lastMessageText.includes(searchLower);
        });

        // No client-side sort anymore — `GET /chats/me` now comes back pre-sorted (newest
        // activity first, by last message time / chat creation if there isn't one yet).
        return filtered;
    }, [chats, searchQuery, activeTab, getInterlocutorFromChat, getTranslatedFullName]);

    const getCurrentUser = useCallback(async (): Promise<ApiUser | null> => {
        const userData = await fetchCurrentUser();
        if (!userData) {
            setIsLoading(false);
            return null;
        }
        setCurrentUser(userData as unknown as ApiUser);
        return userData as unknown as ApiUser;
    }, []);

    const fetchChats = useCallback(async (silent = false) => {
        try {
            if (!silent) {
                if (appendChatsRef.current) setIsLoadingMoreChats(true);
                else setIsLoading(true);
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
            const responseData: any = await universalApiRequest(`${API_ROUTES.CHATS_ME}?page=${chatPage}&itemsPerPage=${pageSize}`, { locale: false });

            let chatsData: ApiChat[] = [];

            console.log('Chats API response:', responseData);

            if (Array.isArray(responseData)) {
                chatsData = responseData.map(chat => ({
                    ...chat,
                    isArchived: chat.active === false
                }));
            } else if (responseData && typeof responseData === 'object') {
                if (responseData['hydra:member'] && Array.isArray(responseData['hydra:member'])) {
                    chatsData = responseData['hydra:member'].map((chat: any) => ({
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
                        // Server-computed, always current as of this request (§5) — a changed
                        // unread count, a new last message, or its read receipt flipping are
                        // exactly the cases worth re-rendering this row for.
                        const activityChanged =
                            existing.unreadCount !== incoming.unreadCount ||
                            existing.lastMessage?.id !== incoming.lastMessage?.id ||
                            existing.lastMessage?.readAt !== incoming.lastMessage?.readAt;
                        if (authorChanged || replyAuthorChanged || activityChanged) { changed = true; return incoming; }
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

            // Если появились новые чаты — перезапускаем inbox SSE,
            // чтобы подписаться на их топики тоже.
            const prevIds = new Set(chatsRef.current.map(c => c.id));
            if (chatsData.some(c => !prevIds.has(c.id))) {
                startInboxSSERef.current?.();
            }

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
            if (!silent) { setIsLoading(false); setIsLoadingMoreChats(false); }
            else setIsChatListRefreshing(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [chatIdFromUrl, t, fetchChatMessages, chatPage]);

    useEffect(() => { fetchChatsRef.current = fetchChats; }, [fetchChats]);

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

            await universalApiRequest(API_ROUTES.CHAT_BY_ID(chatId), {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/merge-patch+json' },
                body: { active: !archive },
                locale: false,
            });
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
        } catch (error) {
            console.error(`Error ${archive ? 'archiving' : 'unarchiving'} chat:`, error);
            setError(archive ? t('chat.archiveError') : t('chat.restoreError'));
        }
    }, [selectedChat, activeTab, t, fetchChatMessages]);

    // "Delete for me" (§5) — not a hard delete server-side unless the other participant had
    // already done the same; either way it stops showing up in *our* GET /chats/me right away,
    // so drop it from local state immediately instead of waiting on the next full refetch —
    // same instant-update approach as archiving, no page reload needed.
    const deleteChatForMe = useCallback(async (chatId: number) => {
        if (!window.confirm(t('chat.deleteChatConfirm'))) return;
        try {
            await universalApiRequest(API_ROUTES.CHAT_BY_ID(chatId), { method: 'DELETE', locale: false });
            setChats(prev => prev.filter(c => c.id !== chatId));
            if (selectedChat === chatId) {
                setSelectedChat(null);
                setMessages([]);
                setChatImages([]);
                setIsMobileChatActive(false);
            }
        } catch (error) {
            console.error('Error deleting chat:', error);
            setError(t('chat.deleteChatError'));
        }
    }, [selectedChat, t]);

    // ===== ФУНКЦИИ ДЛЯ РАБОТЫ С ФАЙЛАМИ И ФОТО =====

    const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (files && files.length > 0) {
            const newFiles = Array.from(files);
            const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

            const validFiles = newFiles.filter(file => {
                const fileType = file.type;
                const isValidType = fileType.startsWith('image/');
                const isValidSize = file.size <= MAX_FILE_SIZE;
                if (!isValidType) {
                    setError(t('chat.fileNotImage', { filename: file.name }));
                } else if (!isValidSize) {
                    setError(t('chat.fileTooLarge', { filename: file.name, max: '10MB' }));
                }
                return isValidType && isValidSize;
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

    // `chat.lastMessage`/`chat.unreadCount` — server-computed, always current as of the
    // request (never derived from Mercure events, see `startInboxSSE`'s debounced refetch).
    const getLastMessageTime = useCallback((chat: ApiChat) => {
        if (!chat.lastMessage?.createdAt) return "";
        return new Date(chat.lastMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }, []);

    const getLastMessageText = useCallback((chat: ApiChat) => {
        const msg = chat.lastMessage;
        if (msg?.description) {
            return msg.description.length > 30 ? msg.description.substring(0, 30) + '...' : msg.description;
        }
        if (msg?.images && msg.images.length > 0) {
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

    // Закрываем активный чат при нажатии на кнопку чатов в хедере
    useEffect(() => {
        const handler = () => handleBackToChatList();
        window.addEventListener('chat:closeActive', handler);
        return () => window.removeEventListener('chat:closeActive', handler);
    }, [handleBackToChatList]);

    // const handleBackToHome = useCallback(() => {
    //     navigate(ROUTES.HOME);
    // }, [navigate]);

    const currentChat = chats.find(chat => chat.id === selectedChat);
    const currentInterlocutor = currentChat ? getInterlocutorFromChat(currentChat) : null;
    const showChatArea = selectedChat !== null && currentInterlocutor !== null;

    // Блокировка (§10) — асимметричная и chat-only: блокировка останавливает ЕГО сообщения
    // вам, но не наоборот. Загружается целиком один раз (не per-chat), чтобы одним и тем же
    // состоянием пользоваться и в шапке открытого чата, и в дропдауне каждой строки сайдбара
    // (per-row хук здесь невозможен — хуки нельзя вызывать внутри .map()).
    const [blockedUsers, setBlockedUsers] = useState<Map<number, number>>(new Map()); // userId -> blacklist entry id

    const refreshBlockedUsers = useCallback(async () => {
        try {
            const entries = await fetchBlacklistEntries();
            setBlockedUsers(new Map(entries.filter(e => e.user).map(e => [e.user!.id, e.id])));
        } catch {
            // Non-critical — block/unblock actions still work, just won't reflect status until retried.
        }
    }, []);

    useEffect(() => {
        if (currentUser) refreshBlockedUsers();
    }, [currentUser, refreshBlockedUsers]);

    const toggleBlockUser = useCallback(async (userId: number, userName: string) => {
        const existingEntryId = blockedUsers.get(userId);
        try {
            if (existingEntryId) {
                await unblockUserApi(existingEntryId);
                setBlockedUsers(prev => {
                    const next = new Map(prev);
                    next.delete(userId);
                    return next;
                });
            } else {
                if (!window.confirm(t('chat.blockConfirm', { name: userName }))) return;
                const entry = await blockUserApi(userId);
                setBlockedUsers(prev => new Map(prev).set(userId, entry.id));
            }
        } catch (err) {
            setError(resolveApiError(err));
        }
    }, [blockedUsers, t]);

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
                                            <Marquee text={chat.ticket?.title || interlocutor.email || ''} alwaysScroll />
                                        </div>
                                        <div className={styles.lastMessage}><Marquee text={getLastMessageText(chat)} alwaysScroll /></div>
                                    </div>
                                    <div className={styles.chatMeta}>
                                        <div className={styles.time}>{getLastMessageTime(chat)}</div>
                                        {!interlocutor.isOnline && interlocutor.lastSeen && !chat.isArchived && (
                                            <div className={styles.lastSeen}>{getLastSeenTime(interlocutor)}</div>
                                        )}
                                        {!!chat.unreadCount && chat.unreadCount > 0 && (
                                            <div className={styles.unreadBadge}>{chat.unreadCount > 99 ? '99+' : chat.unreadCount}</div>
                                        )}
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
                                                {
                                                    icon: <IoBanOutline />,
                                                    label: blockedUsers.has(interlocutor.id) ? t('chat.unblockUser') : t('chat.blockUser'),
                                                    onClick: () => toggleBlockUser(interlocutor.id, getTranslatedFullName(interlocutor)),
                                                    danger: !blockedUsers.has(interlocutor.id),
                                                },
                                                {
                                                    icon: <IoTrashOutline />,
                                                    label: t('chat.deleteChat'),
                                                    onClick: () => deleteChatForMe(chat.id),
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
                        loading={isLoadingMoreChats}
                        horizontal
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
                                        {
                                            icon: <IoBanOutline />,
                                            label: currentInterlocutor && blockedUsers.has(currentInterlocutor.id) ? t('chat.unblockUser') : t('chat.blockUser'),
                                            onClick: () => currentInterlocutor && toggleBlockUser(currentInterlocutor.id, getTranslatedFullName(currentInterlocutor)),
                                            hidden: !currentInterlocutor,
                                            danger: !(currentInterlocutor && blockedUsers.has(currentInterlocutor.id)),
                                        },
                                        {
                                            icon: <IoTrashOutline />,
                                            label: t('chat.deleteChat'),
                                            onClick: () => currentChat && deleteChatForMe(currentChat.id),
                                            hidden: !currentChat,
                                            danger: true,
                                        },
                                    ]}
                                />
                            </div>
                        </div>

                        <div className={styles.chatContent}>
                            {currentInterlocutor && blockedUsers.has(currentInterlocutor.id) && (
                                <InfoBanner
                                    icon={<IoBanOutline />}
                                    message={t('chat.blockedBanner', { name: getTranslatedFullName(currentInterlocutor) })}
                                    className={styles.blockedBanner}
                                />
                            )}
                            <div className={styles.chatMessages} ref={messagesContainerRef}>
                                {messages.length === 0 ? (
                                    <div className={styles.noMessages}>
                                        {currentChat?.isArchived ?
                                            t('chat.archivedChatNote') :
                                            t('chat.noMessages')}
                                    </div>
                                ) : (
                                    <div className={styles.messagesContainer}>
                                        {hasMoreMessages && (
                                            <button
                                                type="button"
                                                className={styles.loadOlderBtn}
                                                onClick={() => selectedChat && loadOlderMessages(selectedChat)}
                                                disabled={isLoadingMoreMessages}
                                            >
                                                {isLoadingMoreMessages ? t('chat.loadingMessages') : t('chat.loadOlderMessages')}
                                            </button>
                                        )}
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

                                            const isDeleted = !!msg.deletedByAuthor;
                                            const isMine = msg.sender === 'me' && !msg.isLocal;
                                            const showEditButton = isMine && !isDeleted;
                                            const isEditWindowExpired = !isWithinMessageEditWindow(msg.createdAt);
                                            const canDeleteThisMessage = (isMine || isAdminUser) && !msg.isLocal && !isDeleted;

                                            return (
                                                <div
                                                    key={msg.id}
                                                    className={`${styles.messageWrapper} ${msg.sender === "me" ? styles.myWrapper : ''}`}
                                                >
                                                    <div className={`${styles.message} ${msg.sender === "me" ? styles.myMessage : styles.theirMessage}`}>
                                                        {msg.sender === "other" && (
                                                            <div className={styles.messageName}>{msg.name}</div>
                                                        )}
                                                        {isDeleted ? (
                                                            <div className={styles.messageContent}>
                                                                <div className={styles.deletedMessageText}>{t('chat.messageDeleted')}</div>
                                                                <div className={styles.messageTime}>{msg.time}</div>
                                                            </div>
                                                        ) : (
                                                            <>
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
                                                                        {msg.edited && <span className={styles.editedBadge}> {t('chat.editedBadge')}</span>}
                                                                        {msg.sender === 'me' && !msg.isLocal && (
                                                                            <span className={msg.readAt ? styles.tickRead : styles.tickSent}>
                                                                                {msg.readAt ? '✓✓' : '✓'}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </>
                                                        )}
                                                    </div>
                                                    {!isDeleted && (
                                                        <div className={styles.messageActions}>
                                                            <button className={styles.actionBtn} onClick={() => { setReplyToMessage(msg); messageInputRef.current?.focus(); }} title={t('chat.reply')}>
                                                                <IoArrowUndoSharp />
                                                            </button>
                                                            {showEditButton && (
                                                                <button
                                                                    className={styles.actionBtn}
                                                                    onClick={() => { setEditingMessage(msg); setNewMessage(msg.text); setEditingPhotoItems((msg.images || []).map(img => ({ type: 'existing' as const, id: img.id, image: img.name }))); messageInputRef.current?.focus(); }}
                                                                    disabled={isEditWindowExpired}
                                                                    title={isEditWindowExpired ? t('chat.editWindowExpired') : t('chat.editMessage')}
                                                                >
                                                                    <IoPencilSharp />
                                                                </button>
                                                            )}
                                                            {canDeleteThisMessage && (
                                                                <button className={`${styles.actionBtn} ${styles.deleteMsgBtn}`} onClick={() => deleteMessage(msg.id)} title={t('chat.deleteMessage')}>
                                                                    <IoTrashSharp />
                                                                </button>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {showScrollToBottom && (
                                <button
                                    type="button"
                                    className={styles.scrollToBottomBtn}
                                    onClick={() => scrollToBottom()}
                                    aria-label={t('chat.scrollToBottom')}
                                    title={t('chat.scrollToBottom')}
                                >
                                    <IoChevronDown />
                                </button>
                            )}

                            {/* Боковая панель с миниатюрами фото */}
                            <MediaSidebar
                                images={chatImages.map(img => ({
                                    id: img.id,
                                    url: img.imageUrl,
                                    // Own uploads only — same "each side manages their own" rule as the
                                    // inline message edit (pencil icon), just reachable from the panel too.
                                    deletable: !!currentUser && img.author?.id === currentUser.id,
                                }))}
                                isOpen={isPhotoSidebarOpen}
                                onClose={() => setIsPhotoSidebarOpen(false)}
                                onOpenGallery={index => photoGallery.openGallery(index)}
                                title={`${t('chat.photos')} (${chatImages.length})`}
                                galleryButtonLabel="Открыть галерею"
                                thumbnailAlt={index => t('chat.thumbnail', { index: index + 1 })}
                                onDeleteImage={deleteChatImage}
                                deleteButtonLabel={t('chat.deleteImage')}
                            />
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
                                onFocus={() => {
                                    // Mobile-keyboard-only (matches this file's other window.innerWidth <= 960
                                    // checks) — this pins body in place while the on-screen keyboard is open so
                                    // iOS/Android don't jump-scroll the page. Had no device guard before, so it
                                    // was also firing on desktop on every composer click — body flipping to
                                    // position:fixed there produced exactly the "height changes" jump, for
                                    // nothing (desktop has no on-screen keyboard to compensate for).
                                    if (window.innerWidth > 960) return;
                                    const meta = document.querySelector('meta[name="viewport"]');
                                    if (meta) meta.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=1');
                                    // Блокируем скролл страницы пока открыта клавиатура
                                    const scrollY = window.scrollY;
                                    document.body.style.position = 'fixed';
                                    document.body.style.top = `-${scrollY}px`;
                                    document.body.style.width = '100%';
                                }}
                                onBlur={() => {
                                    if (window.innerWidth > 960) return;
                                    const meta = document.querySelector('meta[name="viewport"]');
                                    if (meta) meta.setAttribute('content', 'width=device-width, initial-scale=1');
                                    // Восстанавливаем скролл
                                    const scrollY = Math.abs(parseInt(document.body.style.top || '0', 10));
                                    document.body.style.position = '';
                                    document.body.style.top = '';
                                    document.body.style.width = '';
                                    window.scrollTo(0, scrollY);
                                }}
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
                fallbackImage="/img/icons/misc/fonTest5.png"
            />
            <Preview
                isOpen={selectedFilesGallery.isOpen}
                images={selectedPhotoUrls}
                currentIndex={selectedFilesGallery.currentIndex}
                onClose={selectedFilesGallery.closeGallery}
                onNext={selectedFilesGallery.goToNext}
                onPrevious={selectedFilesGallery.goToPrevious}
                onSelectImage={selectedFilesGallery.selectImage}
                fallbackImage="/img/icons/misc/fonTest5.png"
            />
            <Preview
                isOpen={editingGallery.isOpen}
                images={editingAllPreviews}
                currentIndex={editingGallery.currentIndex}
                onClose={editingGallery.closeGallery}
                onNext={editingGallery.goToNext}
                onPrevious={editingGallery.goToPrevious}
                onSelectImage={editingGallery.selectImage}
                fallbackImage="/img/icons/misc/fonTest5.png"
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