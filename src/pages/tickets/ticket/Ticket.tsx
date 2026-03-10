import {useNavigate, useParams} from 'react-router-dom';
import {useEffect, useRef, useState} from 'react';
import {getAuthToken, getUserData, getUserRole} from '../../../utils/auth.ts';
import { getAuthorAvatar } from '../../../utils/imageHelper';
import styles from './Ticket.module.scss';
import {createChatWithAuthor, initChatModals} from "../../../utils/chatUtils.ts";
import AuthModal from "../../../features/auth/AuthModal.tsx";
import {smartNameTranslator, textHelper} from "../../../utils/textHelper.ts";
import CookieConsentBanner from "../../../widgets/Banners/CookieConsentBanner/CookieConsentBanner.tsx";
import {useTranslation} from 'react-i18next';
import {useLanguageChange} from '../../../hooks';
import {getStorageItem} from '../../../utils/storageHelper.ts';
import Status from '../../../shared/ui/Modal/Status';
import Review from '../../../shared/ui/Modal/Review';
import Complaint from '../../../shared/ui/Modal/Complaint/Complaint.tsx';
import { Carousel } from '../../../shared/ui/Photo/Carousel/Carousel.tsx';
import { Marquee } from '../../../shared/ui/Text/Marquee';
import { Back } from '../../../shared/ui/Button/Back/Back.tsx';
import {useFavorites} from '../../../shared/ui/useFavorites';
import {ROUTES} from '../../../app/routers/routes';
import {ReviewsSection} from '../../profile/shared/ui/ReviewsSection';
import {SocialNetworksSection} from '../../profile/shared/ui/SocialNetworksSection';
import {SOCIAL_NETWORK_CONFIG, renderSocialIcon} from '../../profile/shared/config/socialNetworkConfig';
import type {Review as ReviewType} from '../../../entities';
import {PageLoader} from '../../../widgets/PageLoader';
import {IoEllipsisVertical, IoWarningOutline, IoStar, IoHeart, IoHeartOutline, IoChevronForward, IoCompass} from 'react-icons/io5';

interface ApiTicket {
    id: number;
    title: string;
    description: string;
    budget: number;
    unit: { id: number; title: string };
    addresses: {
        id: number;
        title?: string;
        province?: {
            id: number;
            title?: string;
        };
        district?: {
            id: number;
            title?: string;
            image?: string | null;
        };
        city?: {
            id: number;
            title?: string;
            image?: string | null;
        };
        suburb?: {
            id: number;
            title?: string;
        } | null;
        settlement?: {
            id: number;
            title?: string;
        } | null;
        village?: {
            id: number;
            title?: string;
        } | null;
        community?: {
            id: number;
            title?: string;
        } | null;
    }[];
    createdAt: string;
    master: { 
        id: number; 
        name?: string; 
        surname?: string; 
        image?: string; 
        rating?: number;
        education?: {
            id: number;
            uniTitle: string;
            beginning: number;
            ending: number;    
            graduated: boolean;
            occupation: {
                id: number;
                title: string | null;
                image: string | null;
            };
        }[];
    } | null;
    author: { id: number; name?: string; surname?: string; image?: string; rating?: number };
    category: { id: number; title: string };
    subcategory?: { id: number; title: string };
    notice?: string;
    images?: { id: number; image: string }[];
    ticketImages?: { id: number; image: string }[];
    active: boolean;
    service: boolean;
    reviewsCount?: number;
    negotiableBudget?: boolean;
}

interface Order {
    id: number;
    title: string;
    price: number;
    unit: string;
    description: string;
    address: string;
    date: string;
    author: string;
    authorId: number;
    timeAgo: string;
    category: string;
    categoryId: number;
    subcategory?: string;
    additionalComments?: string;
    photos?: string[];
    notice?: string;
    rating: number;
    authorImage?: string;
    active?: boolean;
    hasEducation?: boolean;
    negotiableBudget?: boolean;
    isService?: boolean;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export function Ticket() {
    const {id} = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { t, i18n } = useTranslation(['ticket', 'components']);
    const [order, setOrder] = useState<Order | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [rating, setRating] = useState<number>(0);

    // Используем хук для управления избранным
    const favorites = useFavorites({
        itemId: order?.id || 0,
        itemType: 'ticket',
        onSuccess: () => console.log('Favorite updated'),
        onError: (message) => {
            setModalMessage(message);
            setShowErrorModal(true);
            setTimeout(() => setShowErrorModal(false), 3000);
        }
    });

    const [showReviewModal, setShowReviewModal] = useState(false);
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [showComplaintModal, setShowComplaintModal] = useState(false);

    // States for reviews
    const [reviews, setReviews] = useState<ReviewType[]>([]);
    const [reviewsLoading, setReviewsLoading] = useState(false);
    const [visibleReviewCount, setVisibleReviewCount] = useState(2);

    const [reviewCount, setReviewCount] = useState<number>(0);

    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [showErrorModal, setShowErrorModal] = useState(false);
    const [showInfoModal, setShowInfoModal] = useState(false);
    const [modalMessage, setModalMessage] = useState('');

    // States for ticket deactivation
    const [isTicketActive, setIsTicketActive] = useState(true);
    const [currentUserId, setCurrentUserId] = useState<number | null>(null);
    const [isTogglingActive, setIsTogglingActive] = useState(false);
    const isLoadingRef = useRef<boolean>(false); // Отслеживаем текущие запросы
    const isServiceRef = useRef<boolean>(false);

    // States for chat checking
    const [existingChatId, setExistingChatId] = useState<number | null>(null);
    const [isCheckingChats, setIsCheckingChats] = useState(false);

    // Dropdown for complaint/review
    const [showActionsDropdown, setShowActionsDropdown] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Social networks of the ticket author
    const [authorSocialNetworks, setAuthorSocialNetworks] = useState<{ id: string; network: string; handle: string }[]>([]);

    useEffect(() => {
        console.log('Ticket useEffect triggered with id:', id);
        
        initChatModals({
            showSuccessModal: (message: string) => {
                setModalMessage(message);
                setShowSuccessModal(true);
                // Автоматическое закрытие через 3 секунды
                setTimeout(() => setShowSuccessModal(false), 3000);
            },
            showErrorModal: (message: string) => {
                setModalMessage(message);
                setShowErrorModal(true);
                setTimeout(() => setShowErrorModal(false), 3000);
            },
            showInfoModal: (message: string) => {
                setModalMessage(message);
                setShowInfoModal(true);
                setTimeout(() => setShowInfoModal(false), 3000);
            }
        });

        const loadData = async () => {
            // Проверяем что нет активного запроса
            if (isLoadingRef.current) {
                console.log('Fetch already in progress, skipping duplicate request for ID:', id);
                return;
            }

            // Получаем ID текущего пользователя из localStorage (без API запроса)
            const userData = getUserData();
            setCurrentUserId(userData?.id || null);
            
            // Загружаем тикет если есть ID
            if (id) {
                console.log('Starting fetchOrder for ticket ID:', id);
                isLoadingRef.current = true;
                try {
                    await fetchOrder(parseInt(id));
                } finally {
                    isLoadingRef.current = false;
                }
            }
        };

        loadData();
    }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

    // Перезагружать данные при смене языка
    useLanguageChange(() => {
        if (id) {
            fetchOrder(parseInt(id));
        }
    });

    const fetchAuthorSocialNetworks = async (authorId: number) => {
        try {
            const userInfo = await getUserInfoWithoutAuth(authorId);
            if (userInfo?.socialNetworks && Array.isArray(userInfo.socialNetworks)) {
                const networks = userInfo.socialNetworks
                    .filter((sn: { network?: string; handle?: string; id?: unknown }) => sn.network)
                    .map((sn: { network: string; handle?: string; id?: unknown }) => ({
                        id: sn.id?.toString() || `${sn.network}-${Date.now()}`,
                        network: sn.network.toLowerCase(),
                        handle: sn.handle || '',
                    }));
                setAuthorSocialNetworks(networks);
            }
        } catch {
            // silently ignore
        }
    };

    useEffect(() => {
        if (order) {
            favorites.checkFavoriteStatus();
            fetchAuthorSocialNetworks(order.authorId);
            // Проверяем существующие чаты если пользователь авторизован
            if (currentUserId) {
                checkExistingChats();
            }
            // Загружаем отзывы
            fetchReviews();
        }
    }, [order, favorites.checkFavoriteStatus, currentUserId]);

    // Close dropdown on outside click
    useEffect(() => {
        if (!showActionsDropdown) return;
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setShowActionsDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showActionsDropdown]);

    const handleCloseSuccessModal = () => {
        setShowSuccessModal(false);
    };

    const handleCloseErrorModal = () => {
        setShowErrorModal(false);
    };

    const handleCloseInfoModal = () => {
        setShowInfoModal(false);
    };

    const handleCloseReviewModal = () => {
        setShowReviewModal(false);
    };

    const handleCloseComplaintModal = () => {
        setShowComplaintModal(false);
    };

    const handleComplaintSuccess = (message: string) => {
        setModalMessage(message);
        setShowSuccessModal(true);
        setTimeout(() => setShowSuccessModal(false), 3000);
    };

    const handleComplaintError = (message: string) => {
        setModalMessage(message);
        setShowErrorModal(true);
        setTimeout(() => setShowErrorModal(false), 3000);
    };

    const handleReviewSuccess = (message: string) => {
        setModalMessage(message);
        setShowSuccessModal(true);
        setTimeout(() => setShowSuccessModal(false), 3000);
    };

    const handleReviewError = (message: string) => {
        setModalMessage(message);
        setShowErrorModal(true);
        setTimeout(() => setShowErrorModal(false), 3000);
    };

    const handleReviewSubmitted = (updatedCount: number) => {
        setReviewCount(updatedCount);
    };

    const getFullAddress = (ticketData: ApiTicket): string => {
        console.log('getFullAddress input:', ticketData);

        if (!ticketData.addresses || ticketData.addresses.length === 0) {
            return 'Адрес не указан';
        }

        const address = ticketData.addresses[0];
        const parts: string[] = [];

        // Провинция (область)
        if (address.province?.title) {
            parts.push(address.province.title);
        }

        // Город
        if (address.city?.title) {
            parts.push(address.city.title);
        }

        // Район
        if (address.district?.title) {
            parts.push(address.district.title);
        }

        // Пригород (если есть)
        if (address.suburb?.title) {
            parts.push(address.suburb.title);
        }

        // Поселение (если есть)
        if (address.settlement?.title) {
            parts.push(address.settlement.title);
        }

        // Деревня (если есть)
        if (address.village?.title) {
            parts.push(address.village.title);
        }

        // Сообщество (если есть)
        if (address.community?.title) {
            parts.push(address.community.title);
        }

        // Конкретный адрес
        if (address.title) {
            parts.push(address.title);
        }

        const result = parts.length > 0 ? parts.join(', ') : 'Адрес не указан';
        console.log('Formatted address:', result);
        return result;
    };

    const formatTicketImageUrl = (imagePath: string): string => {
        if (!imagePath) return '';

        console.log('Formatting ticket image path:', imagePath);

        if (imagePath.startsWith('/images/ticket_photos/')) {
            return `${API_BASE_URL}${imagePath}`;
        } else if (imagePath.startsWith('http')) {
            return imagePath;
        } else {
            return `${API_BASE_URL}/images/ticket_photos/${imagePath}`;
        }
    };

    const fetchOrder = async (ticketId: number) => {
        const fetchTime = Date.now();
        console.log(`[${fetchTime}] fetchOrder STARTED for ticket ID:`, ticketId);
        
        try {
            setIsLoading(true);
            setError(null);

            console.log('Fetching ticket with ID:', ticketId);

            const headers: HeadersInit = {
                'Content-Type': 'application/json',
            };

            const token = getAuthToken();
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const currentLocale = getStorageItem('i18nextLng') || 'ru';
            const response = await fetch(`${API_BASE_URL}/api/tickets/${ticketId}?locale=${currentLocale}`, {
                method: 'GET',
                headers: headers,
            });

            if (!response.ok) {
                if (response.status === 404) {
                    setError(t('ticket:ticketNotFound'));
                    return;
                } else if (response.status === 403) {
                    setError(t('ticket:accessDenied'));
                    return;
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }

        const responseData = await response.json();
        console.log('Raw API response:', responseData);

        // API может возвращать как объект, так и массив с одним элементом
        let ticketData: ApiTicket;
        
        if (Array.isArray(responseData)) {
            if (responseData.length === 0) {
                setError(t('ticket:ticketNotFound'));
                return;
            }
            ticketData = responseData[0];
        } else {
            ticketData = responseData;
        }

        console.log('Processed ticket data:', ticketData);

        // Проверяем что у нас есть валидные данные тикета
        if (!ticketData || !ticketData.id) {
                setError(t('ticket:invalidData'));
                return;
            }

            // Проверяем доступ к неактивным объявлениям
            // Неактивные объявления видны только их владельцам
            if (!ticketData.active && currentUserId) {
                const isOwner = ticketData.author?.id === currentUserId || ticketData.master?.id === currentUserId;
                if (!isOwner) {
                    setError(t('ticket:inactiveAd'));
                    return;
                }
            }

            // Определяем кого показывать: мастера или клиента
            // Если есть master - это заявка клиента, показываем мастера
            // Если master === null - это услуга мастера, показываем автора (клиента)
            let displayUserId: number;
            let displayUserName: string;
            let displayUserImage: string;
            let userTypeForRating: string | null;
            let userRating: number; // Рейтинг берем из данных тикета

            if (ticketData.master) {
                // Заявка клиента - показываем мастера
                displayUserId = ticketData.master.id;
                displayUserName = `${ticketData.master.surname || ''} ${ticketData.master.name || ''}`.trim() || t('components:app.defaultMaster');
                displayUserImage = getAuthorAvatar(ticketData.master, '');
                userTypeForRating = 'master';
                userRating = ticketData.master.rating || 0; // Рейтинг мастера из тикета
            } else {
                // Услуга мастера - показываем автора
                displayUserId = ticketData.author.id;
                displayUserName = `${ticketData.author.surname || ''} ${ticketData.author.name || ''}`.trim() || t('components:app.defaultClient');
                displayUserImage = getAuthorAvatar(ticketData.author, '');
                userTypeForRating = 'client';
                userRating = ticketData.author.rating || 0; // Рейтинг автора из тикета
            }

            // Переводим имя пользователя
            const currentLang = i18n.language as 'ru' | 'tj' | 'eng';
            displayUserName = smartNameTranslator(displayUserName, currentLang);

            console.log('Display user info:', {
                displayUserId,
                displayUserName,
                userTypeForRating,
                displayUserImage,
                userRating
            });

            // Используем reviewsCount из API тикета если есть
            const reviewCountForUser = ticketData.reviewsCount || 0;
            setReviewCount(reviewCountForUser);

            // Используем рейтинг из данных тикета (БЕЗ дополнительного API запроса)
            setRating(userRating);

            const fullAddress = getFullAddress(ticketData);

            // Собираем фото из разных источников
            const photos: string[] = [];
            if (ticketData.images?.length) {
                photos.push(...ticketData.images.map(img => {
                    return img.image.startsWith('http') ? img.image : formatTicketImageUrl(img.image);
                }));
            }

            if (ticketData.ticketImages?.length) {
                photos.push(...ticketData.ticketImages.map(img => {
                    return img.image.startsWith('http') ? img.image : formatTicketImageUrl(img.image);
                }));
            }

            // Проверяем есть ли образование у пользователя (только для мастеров)
            const hasEducation = ticketData.master && 
                                ticketData.master.education && 
                                ticketData.master.education.length > 0;

            const orderData: Order = {
                id: ticketData.id,
                title: ticketData.title ? textHelper(ticketData.title) : t('ticket:noTitle'),
                price: ticketData.budget || 0,
                unit: ticketData.unit?.title || 'tjs',
                description: ticketData.description ? textHelper(ticketData.description) : t('ticket:noDescription'),
                address: fullAddress,
                date: formatDate(ticketData.createdAt),
                author: displayUserName,
                authorId: displayUserId,
                timeAgo: getTimeAgo(ticketData.createdAt),
                category: ticketData.category?.title ? textHelper(ticketData.category.title) : t('components:app.service'),
                categoryId: ticketData.category?.id || 0,
                subcategory: ticketData.subcategory?.title ? textHelper(ticketData.subcategory.title) : undefined,
                additionalComments: ticketData.notice ? textHelper(ticketData.notice) : undefined,
                photos: photos.length > 0 ? photos : undefined,
                notice: ticketData.notice ? textHelper(ticketData.notice) : undefined,
                rating: userRating,
                authorImage: displayUserImage || undefined,
                active: ticketData.active,
                hasEducation: hasEducation || false,
                negotiableBudget: ticketData.negotiableBudget,
                isService: ticketData.service,
            };

            console.log('Final order data:', orderData);
            setOrder(orderData);
            setIsTicketActive(ticketData.active);
            isServiceRef.current = ticketData.service;

        } catch (error) {
            const fetchTime = Date.now();
            console.error(`[${fetchTime}] fetchOrder ERROR for ticket:`, error);
            setError(t('ticket:loadError'));
        } finally {
            const fetchTime = Date.now();
            console.log(`[${fetchTime}] fetchOrder COMPLETED, setting isLoading to false`);
            setIsLoading(false);
        }
    };

    const formatDate = (dateString: string) => {
        try {
            if (!dateString) return t('ticket:dateNotSpecified');
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return dateString;
            const months = t('components:time.months', { returnObjects: true }) as string[];
            if (Array.isArray(months) && months.length === 12) {
                return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
            }
            return new Date(dateString).toLocaleDateString('ru-RU', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            });
        } catch {
            return t('ticket:dateNotSpecified');
        }
    };

    const getTimeAgo = (dateString: string) => {
        try {
            if (!dateString) return t('ticket:recently');
            const date = new Date(dateString);
            const now = new Date();
            const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
            if (diffInSeconds < 60) return t('ticket:justNow');
            const minuteWords = t('components:time.minuteWords', { returnObjects: true }) as string[];
            const hourWords = t('components:time.hourWords', { returnObjects: true }) as string[];
            const dayWords = t('components:time.dayWords', { returnObjects: true }) as string[];
            const ago = t('components:time.ago');
            if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} ${getRussianWord(Math.floor(diffInSeconds / 60), minuteWords as [string,string,string])} ${ago}`;
            if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} ${getRussianWord(Math.floor(diffInSeconds / 3600), hourWords as [string,string,string])} ${ago}`;
            return `${Math.floor(diffInSeconds / 86400)} ${getRussianWord(Math.floor(diffInSeconds / 86400), dayWords as [string,string,string])} ${ago}`;
        } catch {
            return t('ticket:recently');
        }
    };

    const getRussianWord = (number: number, words: [string, string, string]) => {
        const cases = [2, 0, 1, 1, 1, 2];
        return words[number % 100 > 4 && number % 100 < 20 ? 2 : cases[number % 10 < 5 ? number % 10 : 5]];
    };

    const handleLeaveReview = () => {
        setShowReviewModal(true);
    };

    const handleToggleActive = async () => {
        const token = getAuthToken();
        if (!token) {
            navigate(ROUTES.HOME);
            return;
        }

        if (!order) return;

        try {
            setIsTogglingActive(true);
            const newActiveStatus = !isTicketActive;

            const response = await fetch(`${API_BASE_URL}/api/tickets/${order.id}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/merge-patch+json',
                },
                body: JSON.stringify({
                    active: newActiveStatus
                }),
            });

            if (response.ok) {
                setIsTicketActive(newActiveStatus);
                setOrder(prev => prev ? { ...prev, active: newActiveStatus } : null);

                setModalMessage(newActiveStatus ? t('ticket:activatedSuccess') : t('ticket:deactivatedSuccess'));
                setShowSuccessModal(true);
                setTimeout(() => setShowSuccessModal(false), 3000);
            } else {
                const errorText = await response.text();
                console.error('Error toggling active status:', errorText);
                throw new Error(newActiveStatus ? t('ticket:activateError') : t('ticket:deactivateError'));
            }
        } catch (error) {
            console.error('Error toggling active status:', error);
            setModalMessage(`Ошибка при ${isTicketActive ? 'деактивации' : 'активации'} объявления`);
            setShowErrorModal(true);
            setTimeout(() => setShowErrorModal(false), 3000);
        } finally {
            setIsTogglingActive(false);
        }
    };

    const handleRespondClick = async (authorId: number) => {
        const token = getAuthToken();

        // Если пользователь не авторизован, показываем модалку авторизации
        if (!token) {
            setShowAuthModal(true);
            return;
        }

        // Проверяем, что пользователь не пытается откликнуться на свое объявление
        if (currentUserId === authorId) {
            setModalMessage('Вы не можете откликнуться на своё собственное объявление');
            setShowErrorModal(true);
            setTimeout(() => setShowErrorModal(false), 3000);
            return;
        }

        // Проверяем, что объявление активно
        if (!isTicketActive) {
            setModalMessage('Данное объявление неактивно');
            setShowInfoModal(true);
            setTimeout(() => setShowInfoModal(false), 3000);
            return;
        }

        // Если уже есть чат, переходим к нему сразу
        if (existingChatId) {
            navigate(`${ROUTES.CHATS}?chatId=${existingChatId}`);
            return;
        }

        try {
            const chat = await createChatWithAuthor(authorId, order?.id);

            if (chat) {
                navigate(`${ROUTES.CHATS}?chatId=${chat.id}`);
            }
        } catch (error) {
            console.error('Error creating chat:', error);
        }
    };

    const handleLoginSuccess = (token: string, email?: string) => {
        console.log('Login successful, token:', token);
        if (email) {
            console.log('User email:', email);
        }
        setShowAuthModal(false);

        if (order?.authorId) {
            const createChat = async () => {
                try {
                    const chat = await createChatWithAuthor(order.authorId, order.id);
                    if (chat && chat.id) {
                        console.log('Navigating to chat after login:', chat.id);
                        navigate(`${ROUTES.CHATS}?chatId=${chat.id}`);
                    } else {
                        console.error('Failed to create chat after login');
                        navigate(ROUTES.CHATS);
                    }
                } catch (error) {
                    console.error('Error creating chat after login:', error);
                    navigate(ROUTES.CHATS);
                }
            };
            createChat();
        } else {
            // Если нет order, просто идем в чаты
            navigate(ROUTES.CHATS);
        }
    };

    const handleProfileClick = async (userId: number) => {
        console.log('Profile click for user:', userId);

        try {
            const userInfo = await getUserInfoWithoutAuth(userId);

            if (userInfo && userInfo.roles) {
                if (userInfo.roles.includes('ROLE_MASTER')) {
                    console.log('Navigating to master profile');
                    navigate(ROUTES.PROFILE_BY_ID(userId));
                } else if (userInfo.roles.includes('ROLE_CLIENT')) {
                    console.log('Navigating to client profile');
                    navigate(ROUTES.PROFILE_BY_ID(userId));
                } else {
                    console.log('Unknown role, defaulting to profile');
                    navigate(ROUTES.PROFILE_BY_ID(userId));
                }
            } else {
                console.log('Could not determine role, defaulting to profile');
                navigate(ROUTES.PROFILE_BY_ID(userId));
            }
        } catch (error) {
            console.error('Error determining role:', error);
            navigate(ROUTES.PROFILE_BY_ID(userId));
        }
    };

    const getUserInfoWithoutAuth = async (userId: number): Promise<any> => {
        try {
            console.log(`Fetching user info for ID: ${userId} without auth`);

            const response = await fetch(`${API_BASE_URL}/api/users/${userId}`, {
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                return await response.json();
            } else {
                console.log(`User info fetch failed: ${response.status}`);
                throw new Error(`Failed to fetch user info: ${response.status}`);
            }
        } catch (error) {
            console.error('Error fetching user info:', error);
            throw error;
        }
    };
    
    // Проверяем существующие чаты пользователя
    const checkExistingChats = async () => {
        const token = getAuthToken();
        if (!token || !order) return;

        setIsCheckingChats(true);
        
        try {
            const response = await fetch(`${API_BASE_URL}/api/chats/me`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                },
            });

            if (response.ok) {
                const responseData = await response.json();
                let chatsData: any[] = [];

                if (Array.isArray(responseData)) {
                    chatsData = responseData;
                } else if (responseData && responseData['hydra:member']) {
                    chatsData = responseData['hydra:member'];
                }

                // Helper: extract numeric id from object or IRI string "/api/xxx/123"
                const extractId = (obj: any): number | undefined => {
                    if (obj?.id) return typeof obj.id === 'number' ? obj.id : parseInt(String(obj.id));
                    const iri = obj?.['@id'];
                    if (iri) { const m = String(iri).match(/\/(\d+)$/); if (m) return parseInt(m[1]); }
                    return undefined;
                };

                // Ищем чат связанный с этим тикетом (сравниваем по числовому id)
                const existingChat = chatsData.find((chat: any) => {
                    const ticketId = extractId(chat.ticket) ?? chat.ticket?.id;
                    return ticketId === order.id;
                });

                if (existingChat) {
                    const chatId = extractId(existingChat);
                    console.log('Found existing chat for ticket:', chatId);
                    setExistingChatId(chatId ?? null);
                } else {
                    setExistingChatId(null);
                }
            }
        } catch (error) {
            console.error('Error checking existing chats:', error);
        } finally {
            setIsCheckingChats(false);
        }
    };

    const getReviewWord = (count: number) => {
        const reviewWords = t('components:time.reviewsOne') ? 
            [t('components:time.reviewsOne'), t('components:time.reviewsFew'), t('components:time.reviewsMany')] :
            ['отзыв', 'отзыва', 'отзывов'];
        return getRussianWord(count, reviewWords as [string, string, string]);
    };

    // ===== Функции для работы с отзывами =====
    
    const fetchReviews = async () => {
        if (!order) return;
        
        setReviewsLoading(true);
        
        try {
            const token = getAuthToken();
            
            // Тип тикета уже известен из fetchOrder — не делаем повторный запрос
            const isService = isServiceRef.current;
            
            // Формируем правильный эндпоинт
            const serviceParam = isService ? 'true' : 'false';
            const url = `${API_BASE_URL}/api/reviews?services.service=${serviceParam}&exists[services]=true&exists[master]=true&exists[client]=true&services=${order.id}`;
            
            const headers: HeadersInit = {
                'Content-Type': 'application/json',
            };
            
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
            
            const response = await fetch(url, {
                method: 'GET',
                headers: headers,
            });
            
            if (!response.ok) {
                console.error('Failed to fetch reviews:', response.statusText);
                setReviews([]);
                return;
            }
            
            const data = await response.json();
            
            // API может вернуть объект с 'hydra:member' или массив
            const reviewsData = data['hydra:member'] || data || [];
            
            console.log('=== Ticket Reviews Debug ===');
            console.log('Total reviews:', reviewsData.length);
            if (reviewsData.length > 0) {
                console.log('First review sample:', reviewsData[0]);
                console.log('Review master:', reviewsData[0].master);
                console.log('Review client:', reviewsData[0].client);
                console.log('Review services:', reviewsData[0].services);
                console.log('Review ticket:', reviewsData[0].ticket);
            }
            
            // Используем embedded данные из ответа API — без дополнительных запросов
            const buildImageUrl = (image?: string, externalUrl?: string): string => {
                if (image) {
                    if (image.startsWith('http')) return image;
                    if (image.startsWith('/')) return `${API_BASE_URL}${image}`;
                    return `${API_BASE_URL}/images/profile_photos/${image}`;
                }
                if (externalUrl) return externalUrl;
                return '';
            };

            const transformedReviews = reviewsData.map((review: any) => {
                const masterRaw = review.master;
                const clientRaw = review.client;

                const masterData = masterRaw ? {
                    id: masterRaw.id || 0,
                    email: '',
                    name: masterRaw.name || '',
                    surname: masterRaw.surname || '',
                    rating: masterRaw.rating || 0,
                    image: buildImageUrl(masterRaw.image, masterRaw.imageExternalUrl),
                    imageExternalUrl: masterRaw.imageExternalUrl || '',
                } : null;

                const clientData = clientRaw ? {
                    id: clientRaw.id || 0,
                    email: '',
                    name: clientRaw.name || '',
                    surname: clientRaw.surname || '',
                    rating: clientRaw.rating || 0,
                    image: buildImageUrl(clientRaw.image, clientRaw.imageExternalUrl),
                    imageExternalUrl: clientRaw.imageExternalUrl || '',
                } : null;

                const serviceTitle = String(review.ticket?.title || review.services?.title || 'Услуга');

                return {
                    id: review.id,
                    rating: review.rating || 0,
                    description: review.description || '',
                    forReviewer: review.forClient || false,
                    services: {
                        id: review.ticket?.id || review.services?.id || 0,
                        title: serviceTitle
                    },
                    ticket: review.ticket,
                    images: review.images || [],
                    user: masterData || { id: 0, email: '', name: t('components:app.defaultMaster'), surname: '', rating: 0, image: '' },
                    reviewer: clientData || { id: 0, email: '', name: t('components:app.defaultClient'), surname: '', rating: 0, image: '' },
                    date: review.createdAt
                        ? new Date(review.createdAt).toLocaleDateString('ru-RU')
                        : ''
                };
            });
            
            console.log('Transformed reviews:', transformedReviews);
            setReviews(transformedReviews);
            
        } catch (error) {
            console.error('Error fetching reviews:', error);
            setReviews([]);
        } finally {
            setReviewsLoading(false);
        }
    };
    
    const getMasterName = (review: ReviewType) => {
        const master = review.user;
        if (!master) return t('components:app.defaultMaster');
        
        const firstName = master.name || '';
        const lastName = master.surname || '';
        
        if (!firstName && !lastName) return t('components:app.defaultMaster');
        
        const currentLang = i18n.language as 'ru' | 'tj' | 'eng';
        const translatedFirstName = smartNameTranslator(firstName, currentLang);
        const translatedLastName = smartNameTranslator(lastName, currentLang);
        
        return `${translatedLastName} ${translatedFirstName}`.trim() || t('components:app.defaultMaster');
    };
    
    const getClientName = (review: ReviewType) => {
        const reviewer = review.reviewer;
        if (!reviewer) return t('components:app.defaultClient');
        
        const firstName = reviewer.name || '';
        const lastName = reviewer.surname || '';
        
        if (!firstName && !lastName) return t('components:app.defaultClient');
        
        const currentLang = i18n.language as 'ru' | 'tj' | 'eng';
        const translatedFirstName = smartNameTranslator(firstName, currentLang);
        const translatedLastName = smartNameTranslator(lastName, currentLang);
        
        return `${translatedLastName} ${translatedFirstName}`.trim() || t('components:app.defaultClient');
    };
    
    const handleShowMoreReviews = () => {
        setVisibleReviewCount(reviews.length);
    };
    
    const handleShowLessReviews = () => {
        setVisibleReviewCount(2);
    };
    
    // Вспомогательная функция для получения индекса фото в галерее отзывов
    const getReviewImageIndex = (reviewIndex: number, imageIndex: number): number => {
        let totalIndex = 0;
        for (let i = 0; i < reviewIndex; i++) {
            totalIndex += reviews[i].images?.length || 0;
        }
        return totalIndex + imageIndex;
    };

    if (isLoading) return <PageLoader text={t('ticket:loading')} />;
    if (error) return (
        <div className={styles.error}>
            <Back />
            <p>{error}</p>
        </div>
    );
    if (!order) return (
        <div className={styles.error}>
            <Back />
            <p>{t('ticket:notFound')}</p>
        </div>
    );

    return (
        <div className={styles.container}>
            <Back />
            <div className={styles.orderCard}>
                {/* ── Title row: title + controls side-by-side ── */}
                <div className={styles.titleControlRow}>
                    <h1 className={styles.orderTitle}>
                        <Marquee text={order.title} alwaysScroll />
                    </h1>
                    <div className={styles.controlsGroup}>
                        {currentUserId === order.authorId ? (
                            <div className={styles.ownerControls}>
                                <button
                                    className={styles.editButton}
                                    onClick={() => navigate(ROUTES.TICKET_EDIT_BY_ID(order.id))}
                                    title={t('ticket:edit')}
                                >
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M7.2302 20.59L2.4502 21.59L3.4502 16.81L17.8902 2.29001C18.1407 2.03889 18.4385 1.83982 18.7663 1.70424C19.0941 1.56865 19.4455 1.49925 19.8002 1.50001C20.5163 1.50001 21.203 1.78447 21.7094 2.29082C22.2157 2.79717 22.5002 3.48392 22.5002 4.20001C22.501 4.55474 22.4315 4.90611 22.296 5.23391C22.1604 5.56171 21.9613 5.85945 21.7102 6.11001L7.2302 20.59Z" stroke="#3A54DA" strokeWidth="2" strokeMiterlimit="10"/>
                                        <path d="M0.549805 22.5H23.4498" stroke="#3A54DA" strokeWidth="2" strokeMiterlimit="10"/>
                                        <path d="M19.6403 8.17986L15.8203 4.35986" stroke="#3A54DA" strokeWidth="2" strokeMiterlimit="10"/>
                                    </svg>
                                </button>
                                <div className={styles.service_active_toggle}>
                                    <label className={styles.switch}>
                                        <input
                                            type="checkbox"
                                            checked={isTicketActive}
                                            onChange={handleToggleActive}
                                            disabled={isTogglingActive}
                                        />
                                        <span className={styles.slider}></span>
                                    </label>
                                    <span className={styles.toggle_label}>
                                        {isTicketActive ? t('ticket:active') : t('ticket:inactive')}
                                    </span>
                                </div>
                            </div>
                        ) : (
                            <div ref={dropdownRef} className={styles.ticketMenuWrapper}>
                                <button
                                    className={styles.ticketMenuButton}
                                    onClick={() => setShowActionsDropdown(prev => !prev)}
                                    aria-label="Меню"
                                >
                                    <IoEllipsisVertical />
                                </button>
                                {showActionsDropdown && (
                                    <div className={styles.ticketMenuDropdown}>
                                        <button
                                            className={styles.ticketMenuDropdownItem}
                                            onClick={() => {
                                                setShowActionsDropdown(false);
                                                const token = getAuthToken();
                                                if (!token) { setShowAuthModal(true); } else { handleLeaveReview(); }
                                            }}
                                        >
                                            <IoStar />
                                            <span>{t('ticket:leaveReview')}</span>
                                        </button>
                                        <button
                                            className={`${styles.ticketMenuDropdownItem} ${styles.ticketMenuDropdownItemDanger}`}
                                            onClick={() => { setShowActionsDropdown(false); setShowComplaintModal(true); }}
                                        >
                                            <IoWarningOutline />
                                            <span>{t('ticket:complaintTitle')}</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Category row ── */}
                <div className={styles.orderHeader}>
                    <div className={styles.categoryContainer}>
                        <button
                            className={styles.categoryBadge}
                            onClick={() => navigate(ROUTES.CATEGORY_TICKETS_BY_ID(order.categoryId), { state: { categoryName: order.category } })}
                        >
                            <IoCompass className={styles.categoryIcon} />
                            <Marquee text={order.category} className={styles.categoryBadgeText} alwaysScroll />
                        </button>
                        {order.subcategory && (
                            <>
                                <IoChevronForward className={styles.categorySeparatorIcon} />
                                <span className={styles.subcategoryBadge}>
                                    <Marquee text={order.subcategory} alwaysScroll />
                                </span>
                            </>
                        )}
                    </div>
                </div>

                <section className={styles.section}>
                    <div className={styles.descriptionPhotoRow}>
                        {order.photos && order.photos.length > 0 && (
                            <Carousel photos={order.photos} className={styles.ticketCarousel} />
                        )}
                        <div className={styles.descriptionCol}>
                            <h2 className={styles.section_about}>{t('ticket:description')}</h2>
                            <p className={styles.description}>{order.description ? textHelper(order.description) : t('ticket:noDescription')}</p>
                        </div>
                    </div>
                </section>

                {/* ── Price badge: below description/photo, above geography ── */}
                <span className={styles.priceBadge}>
                    <Marquee
                        alwaysScroll
                        text={(order.negotiableBudget && !order.price)
                            ? t('components:app.negotiablePrice')
                            : `${order.price} TJS, ${order.unit}`}
                    />
                </span>

                <section className={styles.section}>
                    <div className={styles.address}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"
                                  stroke="#3A54DA" strokeWidth="2"/>
                            <circle cx="12" cy="9" r="2.5" stroke="#3A54DA" strokeWidth="2"/>
                        </svg>
                        {order.address}
                    </div>
                    <div className={styles.published}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                            <path d="M3 8h18M21 6v14H3V6h18zM16 2v4M8 2v4" stroke="#3A54DA" strokeWidth="2"/>
                        </svg>
                        {t('ticket:publishedOn')} {order.date} ({order.timeAgo})
                    </div>
                </section>

                <section className={styles.section}>
                    <h2 className={styles.section_more}>{t('ticket:additionalComments')}</h2>
                    <div className={styles.commentsContent}>
                        <p>{order.additionalComments
                            ? textHelper(order.additionalComments)
                            : t('ticket:commentsPlaceholder')}</p>
                    </div>
                </section>


                <section className={styles.section}>
                    <div className={styles.section_photo}>
                        <img
                            src={order.authorImage || '/default_user.png'}
                            alt="authorImage"
                            onClick={() => handleProfileClick(order.authorId)}
                            style={{cursor: 'pointer'}}
                            onError={(e) => {
                                (e.target as HTMLImageElement).src = '/default_user.png';
                            }}
                        />
                        <div className={styles.authorSection}>
                            <div className={styles.authorInfo}>
                                <h3
                                    onClick={() => handleProfileClick(order.authorId)}
                                    style={{cursor: 'pointer'}}
                                >
                                    {order.author}
                                </h3>
                            </div>
                            <p>{order.title}</p>
                        </div>
                    </div>
                    {authorSocialNetworks.length > 0 && (
                        <SocialNetworksSection
                            socialNetworks={authorSocialNetworks}
                            SOCIAL_NETWORK_CONFIG={SOCIAL_NETWORK_CONFIG}
                            readOnly={true}
                            editingSocialNetwork={null}
                            socialNetworkEditValue={''}
                            socialNetworkValidationError={''}
                            showAddSocialNetwork={false}
                            selectedNewNetwork={''}
                            availableSocialNetworks={[]}
                            setEditingSocialNetwork={() => {}}
                            setSocialNetworkEditValue={() => {}}
                            setSocialNetworkValidationError={() => {}}
                            setShowAddSocialNetwork={() => {}}
                            setSelectedNewNetwork={() => {}}
                            setSocialNetworks={() => {}}
                            onUpdateSocialNetworks={async () => false}
                            onRemoveSocialNetwork={async () => {}}
                            onAddSocialNetwork={async () => {}}
                            onResetSocialNetworks={async () => {}}
                            onCopySocialNetwork={async () => {}}
                            renderSocialIcon={renderSocialIcon}
                            getAvailableNetworks={() => []}
                            className={styles.social_networks_override}
                        />
                    )}
                </section>

                <section className={styles.rate}>
                    <div className={styles.rate_wrap}>
                        <div className={styles.rate_item}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
                                 xmlns="http://www.w3.org/2000/svg">
                                <g clipPath="url(#clip0_324_2272)">
                                    <g clipPath="url(#clip1_324_2272)">
                                        <path
                                            d="M12 2.49023L15.51 8.17023L22 9.76023L17.68 14.8502L18.18 21.5102L12 18.9802L5.82 21.5102L6.32 14.8502L2 9.76023L8.49 8.17023L12 2.49023Z"
                                            stroke="#3A54DA" strokeWidth="2" strokeMiterlimit="10"/>
                                        <path d="M12 19V18.98" stroke="black" strokeWidth="2" strokeMiterlimit="10"/>
                                    </g>
                                </g>
                                <defs>
                                    <clipPath id="clip0_324_2272">
                                        <rect width="24" height="24" fill="white"/>
                                    </clipPath>
                                    <clipPath id="clip1_324_2272">
                                        <rect width="24" height="24" fill="white"/>
                                    </clipPath>
                                </defs>
                            </svg>
                            <p>{rating.toFixed(1)} ({t('ticket:rating')})</p>
                        </div>
                        <div className={styles.rate_item}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
                                 xmlns="http://www.w3.org/2000/svg">
                                <g clipPath="url(#clip0_214_6840)">
                                    <path
                                        d="M12 1.48047C6.2 1.48047 1.5 5.75047 1.5 11.0005C1.52866 13.0157 2.23294 14.9631 3.5 16.5305L2.5 21.5305L9.16 20.2005C10.1031 20.4504 11.0744 20.5781 12.05 20.5805C17.85 20.5805 22.55 16.3005 22.55 11.0305C22.55 5.76047 17.8 1.48047 12 1.48047Z"
                                        stroke="#3A54DA" strokeWidth="2" strokeMiterlimit="10"/>
                                </g>
                                <defs>
                                    <clipPath id="clip0_214_6840">
                                        <rect width="24" height="24" fill="white"/>
                                    </clipPath>
                                </defs>
                            </svg>
                            <p>{reviewCount} {getReviewWord(reviewCount)}</p>
                        </div>
                        {order.hasEducation && (
                            <div className={styles.rate_item}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
                                     xmlns="http://www.w3.org/2000/svg">
                                    <g clipPath="url(#clip0_214_6844)">
                                        <g clipPath="url(#clip1_214_6844)">
                                            <path
                                                d="M12 22.5C17.799 22.5 22.5 17.799 22.5 12C22.5 6.20101 17.799 1.5 12 1.5C6.20101 1.5 1.5 6.20101 1.5 12C1.5 17.799 6.20101 22.5 12 22.5Z"
                                                stroke="#3A54DA" strokeWidth="2" strokeMiterlimit="10"/>
                                            <path d="M6.27002 11.9997L10.09 15.8197L17.73 8.17969" stroke="#3A54DA"
                                                  strokeWidth="2" strokeMiterlimit="10"/>
                                        </g>
                                    </g>
                                    <defs>
                                        <clipPath id="clip0_214_6844">
                                            <rect width="24" height="24" fill="white"/>
                                        </clipPath>
                                        <clipPath id="clip1_214_6844">
                                            <rect width="24" height="24" fill="white"/>
                                        </clipPath>
                                    </defs>
                                </svg>
                                <p>{t('ticket:diplomaEducation')}</p>
                            </div>
                        )}
                    </div>
                </section>

                {currentUserId !== order?.authorId && (
                <section className={styles.actionButtons}>
                    {!(order?.isService && getUserRole() === 'master') && (
                        <button
                            className={`${styles.respondButton} ${
                                (!isTicketActive || isCheckingChats) ? styles.respondButtonDisabled :
                                existingChatId ? styles.respondButtonDone :
                                ''
                            }`}
                            onClick={() => order?.authorId && handleRespondClick(order.authorId)}
                            disabled={!isTicketActive || isCheckingChats}
                        >
                            {isCheckingChats ? t('ticket:checking') :
                             existingChatId ? t('ticket:done') :
                             !isTicketActive ? t('ticket:inactive') :
                             t('ticket:respond')}
                        </button>
                    )}
                    <button
                        className={`${styles.favoriteButton} ${favorites.isLiked ? styles.liked : ''} ${favorites.isLikeLoading ? styles.loading : ''}`}
                        onClick={favorites.handleLikeClick}
                        title={favorites.isLiked ? t('components:buttons.removeFavorite') : t('components:buttons.addFavorite')}
                    >
                        {favorites.isLiked ? <IoHeart /> : <IoHeartOutline />}
                    </button>
                </section>
                )}
            </div>
            
            {/* Секция отзывов - независимая от основного контейнера */}
            {reviews.length > 0 && (
                <ReviewsSection
                    reviews={reviews}
                    reviewsLoading={reviewsLoading}
                    visibleCount={visibleReviewCount}
                    API_BASE_URL={API_BASE_URL}
                    userRole="master"
                    onShowMore={handleShowMoreReviews}
                    onShowLess={handleShowLessReviews}
                    maxLength={200}
                    getClientName={getClientName}
                    getMasterName={getMasterName}
                    onClientProfileClick={handleProfileClick}
                    onMasterProfileClick={handleProfileClick}
                    onServiceClick={(ticketId) => navigate(ROUTES.TICKET_BY_ID(ticketId))}
                    getReviewImageIndex={getReviewImageIndex}
                />
            )}

            <Review
                isOpen={showReviewModal}
                onClose={handleCloseReviewModal}
                onSuccess={handleReviewSuccess}
                onError={handleReviewError}
                ticketId={order?.id || 0}
                targetUserId={order?.authorId || 0}
                onReviewSubmitted={handleReviewSubmitted}
            />

            {showAuthModal && (
                <AuthModal
                    isOpen={showAuthModal}
                    onClose={() => setShowAuthModal(false)}
                    onLoginSuccess={handleLoginSuccess}
                />
            )}

            <Complaint
                isOpen={showComplaintModal}
                onClose={handleCloseComplaintModal}
                onSuccess={handleComplaintSuccess}
                onError={handleComplaintError}
                targetUserId={order?.authorId || 0}
                ticketId={order?.id}
            />

            <Status
                type="success"
                isOpen={showSuccessModal}
                onClose={handleCloseSuccessModal}
                message={modalMessage}
            />

            <Status
                type="error"
                isOpen={showErrorModal}
                onClose={handleCloseErrorModal}
                message={modalMessage}
            />

            <Status
                type="info"
                isOpen={showInfoModal}
                onClose={handleCloseInfoModal}
                message={modalMessage}
            />

            <CookieConsentBanner/>
        </div>
    );
}