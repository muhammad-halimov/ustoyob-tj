import {type ChangeEvent, useCallback, useEffect, useRef, useState} from 'react';
import {useNavigate, useParams} from 'react-router-dom';
import {getAuthToken, getUserData, handleUnauthorized, logout} from '../../utils/auth.ts';
import {ROUTES} from '../../app/routers/routes';
import styles from './Profile.module.scss';
import {useTranslation} from 'react-i18next';
import {useLanguageChange} from '../../hooks';
import {getStorageItem} from '../../utils/storageHelper.ts';
import {createChatWithAuthor} from '../../utils/chatUtils';


import {usePhotoGallery} from '../../shared/ui/PhotoGallery';
import {AddressValue, buildAddressData} from '../../shared/ui/AddressSelector';
import {PageLoader} from '../../widgets/PageLoader';
import {getOccupations} from '../../utils/dataCache.ts';
import {smartNameTranslator} from '../../utils/textHelper.ts';

// Импорты из entities
import {
    ApiResponse,
    Education,
    EducationApiData,
    GalleryApiData,
    GalleryImageApiData,
    Occupation,
    ProfileData,
    Review,
    ReviewApiData,
    Service,
    UserAddressApiData,
    UserApiData
} from '../../entities';

// Новые компоненты из shared/ui
import {ProfileHeader} from './shared/ui/ProfileHeader';
import {EducationSection} from './shared/ui/EducationSection';
import {PhonesSection} from './shared/ui/PhonesSection';
import {SocialNetworksSection} from './shared/ui/SocialNetworksSection';
import {WorkExamplesSection} from './shared/ui/WorkExamplesSection';
import {WorkAreasSection} from './shared/ui/WorkAreasSection';
import {ServicesSection} from './shared/ui/ServicesSection';
import {ReviewsSection} from './shared/ui/ReviewsSection';
import CookieConsentBanner from "../../widgets/Banners/CookieConsentBanner/CookieConsentBanner.tsx";
import StatusModal from '../../shared/ui/Modal/StatusModal';
import ReviewModal from '../../shared/ui/Modal/ReviewModal';
import ComplaintModal from '../../shared/ui/Modal/ComplaintModal';
import AuthModal from '../../features/auth/AuthModal';
import AuthBanner from '../../widgets/Banners/AuthBanner/AuthBanner';

// Интерфейс для социальных сетей с API
interface LocalAvailableSocialNetwork {
    id: number;
    network: string;
}

// Маппинг для локализации, иконок, валидации и ссылок
const SOCIAL_NETWORK_CONFIG: Record<string, { 
    label: string; 
    icon: string; 
    validate: (value: string) => boolean;
    format: (value: string) => string;
    generateUrl: (handle: string) => string;
    placeholder: string;
}> = {
    instagram: { 
        label: 'Instagram', 
        icon: '📷',
        validate: (value: string) => /^[a-zA-Z0-9._]{1,30}$/.test(value.replace('@', '')),
        format: (value: string) => value.startsWith('@') ? value.slice(1) : value,
        generateUrl: (handle: string) => `https://instagram.com/${handle}`,
        placeholder: 'username (без @)'
    },
    telegram: { 
        label: 'Telegram', 
        icon: '✈️',
        validate: (value: string) => /^[a-zA-Z0-9_]{5,32}$/.test(value.replace('@', '')),
        format: (value: string) => value.startsWith('@') ? value.slice(1) : value,
        generateUrl: (handle: string) => `https://t.me/${handle}`,
        placeholder: 'username (без @)'
    },
    whatsapp: { 
        label: 'WhatsApp', 
        icon: '💬',
        validate: (value: string) => /^\+?[1-9]\d{1,14}$/.test(value.replace(/\s/g, '')),
        format: (value: string) => {
            const cleaned = value.replace(/\s/g, '');
            return cleaned.startsWith('+') ? cleaned : `+${cleaned}`;
        },
        generateUrl: (handle: string) => `https://wa.me/${handle.replace('+', '')}`,
        placeholder: '+992123456789'
    },
    facebook: { 
        label: 'Facebook', 
        icon: '👥',
        validate: (value: string) => /^[a-zA-Z0-9.]{5,50}$/.test(value),
        format: (value: string) => value,
        generateUrl: (handle: string) => `https://facebook.com/${handle}`,
        placeholder: 'username или profile.php?id=123456789'
    },
    vk: { 
        label: 'VKontakte', 
        icon: '🌐',
        validate: (value: string) => /^[a-zA-Z0-9_]{1,50}$/.test(value) || /^id\d+$/.test(value),
        format: (value: string) => value,
        generateUrl: (handle: string) => `https://vk.com/${handle}`,
        placeholder: 'username или id123456789'
    },
    youtube: { 
        label: 'YouTube', 
        icon: '📺',
        validate: (value: string) => /^[a-zA-Z0-9_-]{1,100}$/.test(value),
        format: (value: string) => value,
        generateUrl: (handle: string) => `https://youtube.com/@${handle}`,
        placeholder: 'channel_name'
    },
    site: { 
        label: 'Веб-сайт', 
        icon: '🌍',
        validate: (value: string) => /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/.test(value),
        format: (value: string) => value.startsWith('http') ? value : `https://${value}`,
        generateUrl: (handle: string) => handle.startsWith('http') ? handle : `https://${handle}`,
        placeholder: 'example.com или https://example.com'
    },
    viber: { 
        label: 'Viber', 
        icon: '📞',
        validate: (value: string) => /^\+?[1-9]\d{1,14}$/.test(value.replace(/\s/g, '')),
        format: (value: string) => value.replace(/\s/g, ''),
        generateUrl: (handle: string) => `viber://chat?number=${handle.replace('+', '')}`,
        placeholder: '+992123456789'
    },
    imo: { 
        label: 'IMO', 
        icon: '💬',
        validate: (value: string) => /^\+?[1-9]\d{1,14}$/.test(value.replace(/\s/g, '')),
        format: (value: string) => value.replace(/\s/g, ''),
        generateUrl: (handle: string) => `https://imo.im/profile/${handle.replace('+', '')}`,
        placeholder: '+992123456789'
    },
    twitter: { 
        label: 'Twitter (X)', 
        icon: '🐦',
        validate: (value: string) => /^[a-zA-Z0-9_]{1,15}$/.test(value.replace('@', '')),
        format: (value: string) => value.startsWith('@') ? value.slice(1) : value,
        generateUrl: (handle: string) => `https://x.com/${handle}`,
        placeholder: 'username (без @)'
    },
    linkedin: { 
        label: 'LinkedIn', 
        icon: '💼',
        validate: (value: string) => /^[a-zA-Z0-9-]{3,100}$/.test(value),
        format: (value: string) => value,
        generateUrl: (handle: string) => `https://linkedin.com/in/${handle}`,
        placeholder: 'profile-name'
    },
    google: { 
        label: 'Google', 
        icon: '🔍',
        validate: (value: string) => /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(value),
        format: (value: string) => value,
        generateUrl: (handle: string) => `mailto:${handle}`,
        placeholder: 'email@gmail.com'
    },
    wechat: { 
        label: 'WeChat', 
        icon: '💬',
        validate: (value: string) => /^[a-zA-Z0-9_-]{6,20}$/.test(value),
        format: (value: string) => value,
        generateUrl: (handle: string) => `weixin://dl/chat?${handle}`,
        placeholder: 'wechat_id'
    }
};

interface LocalSocialNetwork {
    id: string;
    network: string;
    handle: string;
}

interface LocalAddress {
    id: string;
    displayText: string;
    addressValue: AddressValue;
}

interface LocalPhone {
    id: string;
    number: string;
    type: 'tj' | 'international';
}

function Profile() {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>(); // Получаем id из URL
    const { t, i18n } = useTranslation(['profile', 'components']);
    
    // Определяем, это публичный профиль или приватный
    const readOnly = !!id; // readOnly = true для публичных профилей
    const userId = id || null; // userId из URL параметра
    
    const [currentUser, setCurrentUser] = useState<{ id: number; email: string; name: string; surname: string } | null>(null);
    const [editingField, setEditingField] = useState<'fullName' | 'specialty' | 'gender' | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [userRole, setUserRole] = useState<'master' | 'client' | null>(null);
    const [profileData, setProfileData] = useState<ProfileData | null>(null);
    const [tempValue, setTempValue] = useState('');
    const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);
    const [editingEducation, setEditingEducation] = useState<string | null>(null);
    const [educationForm, setEducationForm] = useState<{
        institution: string;
        selectedSpecialty?: number;
        startYear: string;
        endYear: string;
        currentlyStudying: boolean;
    }>({
        institution: '',
        selectedSpecialty: undefined,
        startYear: '',
        endYear: '',
        currentlyStudying: false
    });
    const [reviews, setReviews] = useState<Review[]>([]);
    const [reviewsLoading, setReviewsLoading] = useState(false);
    const [servicesLoading, setServicesLoading] = useState(false);
    const [visibleCount, setVisibleCount] = useState(2);
    const [showAllWorkExamples, setShowAllWorkExamples] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [showReviewModal, setShowReviewModal] = useState(false);
    const [showComplaintModal, setShowComplaintModal] = useState(false);
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [authModalAction, setAuthModalAction] = useState<'review' | 'complaint' | null>(null);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [showErrorModal, setShowErrorModal] = useState(false);
    const [modalMessage, setModalMessage] = useState('');
    const [occupations, setOccupations] = useState<Occupation[]>([]);
    const [occupationsLoading, setOccupationsLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const workExampleInputRef = useRef<HTMLInputElement>(null);
    const specialtyInputRef = useRef<HTMLSelectElement>(null);
    const [editingSocialNetwork, setEditingSocialNetwork] = useState<string | null>(null);
    const [socialNetworks, setSocialNetworks] = useState<LocalSocialNetwork[]>([]);
    const [socialNetworkEditValue, setSocialNetworkEditValue] = useState('');
    const [showAddSocialNetwork, setShowAddSocialNetwork] = useState(false);
    const [selectedNewNetwork, setSelectedNewNetwork] = useState('');
    const [availableSocialNetworks, setAvailableSocialNetworks] = useState<LocalAvailableSocialNetwork[]>([]);
    const [socialNetworkValidationError, setSocialNetworkValidationError] = useState('');
    const [isGalleryOperating, setIsGalleryOperating] = useState(false);

    // Состояния для лайка/избранного на публичном профиле
    const [isProfileLiked, setIsProfileLiked] = useState(false);
    const [isProfileLikeLoading, setIsProfileLikeLoading] = useState(false);
    const [profileFavoriteId, setProfileFavoriteId] = useState<number | null>(null);
    
    // Состояния для адресов
    const [editingAddress, setEditingAddress] = useState<string | null>(null);
    const [addressForm, setAddressForm] = useState<AddressValue>({
        provinceId: null,
        cityId: null,
        suburbIds: [],
        districtIds: [],
        settlementId: null,
        communityId: null,
        villageId: null
    });

    // Состояния для телефонов
    const [editingPhone, setEditingPhone] = useState<string | null>(null);
    const [phoneForm, setPhoneForm] = useState({ number: '', type: 'tj' as 'tj' | 'international' });

    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

    // Проверяем начальный статус лайка при загрузке публичного профиля
    useEffect(() => {
        if (!readOnly || !profileData?.id) return;
        const token = getAuthToken();
        if (!token) return;

        (async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/api/favorites/me`, {
                    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
                });
                if (!res.ok) return;
                const data = await res.json();
                setProfileFavoriteId(data.id ?? null);
                const allUsers: Array<{ id: number }> = [
                    ...(data.masters || []),
                    ...(data.clients || [])
                ];
                setIsProfileLiked(allUsers.some((u) => u.id === Number(profileData.id)));
            } catch { /* silent */ }
        })();
    }, [readOnly, profileData?.id]);
    
    // Перезагружать данные при смене языка
    useLanguageChange(() => {
        fetchUserData(); // fetchServices и fetchUserGallery вызываются внутри fetchUserData
        fetchReviews();
    });

    // Как в MyTickets - загрузка текущего пользователя для приватного профиля
    const getCurrentUser = useCallback(async () => {
        if (readOnly) {
            // Для публичного профиля не требуется авторизация
            setCurrentUser({ id: 0, email: '', name: '', surname: '' });
            return true;
        }

        try {
            const token = getAuthToken();
            if (!token) {
                console.log('No auth token available');
                setIsLoading(false);
                return false;
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
                return true;
            } else {
                console.error('Failed to fetch current user:', response.status);
                setIsLoading(false);
                return false;
            }
        } catch (err) {
            console.error('Error fetching current user:', err);
            setIsLoading(false);
            return false;
        }
    }, [API_BASE_URL, readOnly]);
    
    // Определение размера экрана
    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth <= 768);
        };
        
        handleResize();
        window.addEventListener('resize', handleResize);
        
        return () => window.removeEventListener('resize', handleResize);
    }, []);


    
    // PhotoGallery hook для примеров работ
    const handleLogout = async () => {
        const confirmed = confirm(t('header:logoutConfirm', 'Вы уверены, что хотите выйти?'));
        if (!confirmed) return;
        try {
            await logout();
            window.dispatchEvent(new Event('logout'));
            window.location.reload();
        } catch (error) {
            console.error('Logout error:', error);
            window.location.reload();
        }
    };

    const galleryImages = profileData?.workExamples.map(work => work.image) || [];
    const {
        isOpen: isGalleryOpen,
        currentIndex: galleryCurrentIndex,
        openGallery,
        closeGallery,
        goToNext,
        goToPrevious,
        selectImage
    } = usePhotoGallery({
        images: galleryImages
    });

    // Вспомогательная функция для получения индекса фото в галерее отзывов
    const getReviewImageIndex = (reviewIndex: number, imageIndex: number): number => {
        let totalIndex = 0;
        for (let i = 0; i < reviewIndex; i++) {
            totalIndex += reviews[i].images?.length || 0;
        }
        return totalIndex + imageIndex;
    };

    // Функция загрузки доступных социальных сетей
    const fetchAvailableSocialNetworks = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/users/social-networks`);
            
            if (response.ok) {
                const data: LocalAvailableSocialNetwork[] = await response.json();
                setAvailableSocialNetworks(data);
                console.log('Available social networks loaded:', data);
            } else {
                console.error('Failed to fetch social networks:', response.status);
            }
        } catch (error) {
            console.error('Error fetching available social networks:', error);
        }
    };

    // Функция добавления новой социальной сети
    const handleAddSocialNetwork = async () => {
        if (!selectedNewNetwork) return;

        const networkConfig = availableSocialNetworks.find(n => n.network === selectedNewNetwork);
        if (!networkConfig) return;

        const newNetwork: LocalSocialNetwork = {
            id: `new-${Date.now()}`,
            network: selectedNewNetwork,
            handle: ''
        };

        const updatedNetworks = [...socialNetworks, newNetwork];
        setSocialNetworks(updatedNetworks);

        // Сразу переходим в режим редактирования новой сети
        setEditingSocialNetwork(newNetwork.id);
        setSocialNetworkEditValue('');
        setSocialNetworkValidationError('');
        setShowAddSocialNetwork(false);
        setSelectedNewNetwork('');

        // Сохраняем на сервер
        await updateSocialNetworks(updatedNetworks);
    };

    // Функция удаления социальной сети
    const handleRemoveSocialNetwork = async (networkId: string) => {
        const updatedNetworks = socialNetworks.filter(n => n.id !== networkId);
        setSocialNetworks(updatedNetworks);
        await updateSocialNetworks(updatedNetworks);
    };

    // Получить доступные для добавления сети (исключить уже добавленные)
    const getAvailableNetworks = () => {
        const addedNetworks = socialNetworks.map((sn: LocalSocialNetwork) => sn.network);
        return availableSocialNetworks.filter((an: LocalAvailableSocialNetwork) => !addedNetworks.includes(an.network));
    };

    // Рендер иконки социальной сети
    const renderSocialIcon = (networkType: string) => {
        switch (networkType.toLowerCase()) {
            case 'telegram':
                return (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="#0088CC">
                        <path d="M9.78 18.65L10.06 14.42L17.74 7.5C18.08 7.19 17.67 7.04 17.22 7.31L7.74 13.3L3.64 12C2.76 11.75 2.75 11.14 3.84 10.7L19.81 4.54C20.54 4.21 21.24 4.72 20.96 5.84L18.24 18.65C18.05 19.56 17.5 19.78 16.74 19.36L12.6 16.3L10.61 18.23C10.38 18.46 10.19 18.65 9.78 18.65Z"/>
                    </svg>
                );
            case 'instagram':
                return (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="#E4405F">
                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                    </svg>
                );
            case 'whatsapp':
                return (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="#25D366">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.893 3.488"/>
                    </svg>
                );
            case 'facebook':
                return (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="#1877F2">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                );
            case 'vk':
                return (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="#0077FF">
                        <path d="M15.684 0H8.316C1.592 0 0 1.592 0 8.316v7.368C0 22.408 1.592 24 8.316 24h7.368C22.408 24 24 22.408 24 15.684V8.316C24 1.592 22.408 0 15.684 0zM18.947 16.842h-2.368c-.702 0-.917-.563-2.177-1.825-1.097-1.097-1.586-.351-1.586.421v1.404c0 .351-.105.702-1.053.702-2.177 0-4.596-1.263-6.316-3.614C3.193 9.193 2.667 6.737 2.667 6.211c0-.351.105-.702.702-.702h2.368c.702 0 .632.351.912 1.053.807 1.973 2.193 3.509 2.755 3.509.351 0 .526-.175.526-.842V6.842c-.105-1.228-.702-1.333-.702-1.754 0-.281.211-.492.526-.492h3.86c.632 0 .772.281.772.983v3.825c0 .632.281.772.456.772.351 0 .632-.175 1.263-.807 1.474-1.474 2.456-3.719 2.456-3.719.175-.351.526-.632.912-.632h2.368c.842 0 1.053.351.842 1.053-.351 1.053-2.789 4.596-2.789 4.596-.281.351-.351.526 0 .912.281.281 1.228 1.193 1.825 1.93.842.842 1.474 1.544 1.649 2.035.175.842-.281 1.228-1.053 1.228z"/>
                    </svg>
                );
            case 'youtube':
                return (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="#FF0000">
                        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                    </svg>
                );
            case 'twitter':
            case 'x':
                return (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="#1DA1F2">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                    </svg>
                );
            case 'linkedin':
                return (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="#0A66C2">
                        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                    </svg>
                );
            case 'site':
            case 'website':
                return (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="#666666">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.94-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                    </svg>
                );
            case 'viber':
                return (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="#665CAC">
                        <path d="M13.7 2.3c3.8.4 6.8 3.4 7.2 7.2.1.6.1 1.1.1 1.7v.6c0 .5-.4.9-.9.9s-.9-.4-.9-.9v-.6c0-.5 0-.9-.1-1.3-.3-2.9-2.6-5.2-5.5-5.5-.4-.1-.8-.1-1.3-.1h-.6c-.5 0-.9-.4-.9-.9s.4-.9.9-.9h.6c.5 0 1.1 0 1.4.1zm-1.3 3.6c2.2.2 3.9 1.9 4.1 4.1.1.6.1 1.2.1 1.8 0 .5-.4.9-.9.9s-.9-.4-.9-.9c0-.5 0-1-.1-1.5-.1-1.4-1.1-2.4-2.5-2.5-.5-.1-1-.1-1.5-.1-.5 0-.9-.4-.9-.9s.4-.9.9-.9c.6 0 1.2 0 1.7.1zm3.8 9.3c-.4-.2-.8-.4-1.2-.7-1.1-.8-2.1-1.7-3-2.7v-.1c0-.1.1-.2.1-.3.1-.5.2-1 .1-1.5-.1-.8-.6-1.4-1.4-1.5h-.1c-.8 0-1.5.6-1.6 1.4 0 .1 0 .3-.1.4-.2 1.8-.2 3.6.1 5.4.1.6.3 1.2.6 1.7.8 1.4 2.1 2.4 3.7 2.8 1.8.4 3.6.4 5.4.1.1 0 .3-.1.4-.1.8-.1 1.4-.8 1.4-1.6v-.1c-.1-.8-.7-1.3-1.5-1.4-.5-.1-1 0-1.5.1-.1 0-.2.1-.3.1h-.1zm-9.4 5.3c-3.8-.4-6.8-3.4-7.2-7.2-.1-.6-.1-1.1-.1-1.7v-.6c0-.5.4-.9.9-.9s.9.4.9.9v.6c0 .5 0 .9.1 1.3.3 2.9 2.6 5.2 5.5 5.5.4.1.8.1 1.3.1h.6c.5 0 .9.4.9.9s-.4.9-.9.9h-.6c-.5 0-1.1 0-1.4-.1zm1.3-3.6c-2.2-.2-3.9-1.9-4.1-4.1-.1-.6-.1-1.2-.1-1.8 0-.5.4-.9.9-.9s.9.4.9.9c0 .5 0 1 .1 1.5.1 1.4 1.1 2.4 2.5 2.5.5.1 1 .1 1.5.1.5 0 .9.4.9.9s-.4.9-.9.9c-.6 0-1.2 0-1.7-.1z"/>
                    </svg>
                );
            case 'imo':
                return (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="#1589D1">
                        <circle cx="12" cy="12" r="10" strokeWidth="2"/>
                        <text x="12" y="16" textAnchor="middle" fontSize="8" fill="currentColor">IMO</text>
                    </svg>
                );
            case 'wechat':
                return (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="#1AAD19">
                        <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 0 1 .213.665l-.39 1.298c-.115.379.21.747.579.65L5.8 16.9a.58.58 0 0 1 .548.054 11.757 11.757 0 0 0 2.343.238c.366 0 .724-.027 1.075-.08-.22-.412-.346-.88-.346-1.372 0-3.476 3.408-6.288 7.611-6.288.845 0 1.65.138 2.389.385C18.476 4.881 14.067 2.188 8.691 2.188zm-2.46 5.695a.862.862 0 1 1 0-1.724.862.862 0 0 1 0 1.724zm4.919 0a.862.862 0 1 1 0-1.724.862.862 0 0 1 0 1.724zm5.863.662c-3.477 0-6.29 2.476-6.29 5.531 0 3.055 2.813 5.531 6.29 5.531a9.793 9.793 0 0 0 1.926-.192.579.579 0 0 1 .464.046l1.781.781a.56.56 0 0 0 .755-.518l-.315-1.076a.567.567 0 0 1 .173-.602 4.96 4.96 0 0 0 2.406-4.211c0-3.055-2.814-5.29-6.29-5.29zm-2.854 4.274a.944.944 0 1 1 0-1.888.944.944 0 0 1 0 1.888zm5.708 0a.944.944 0 1 1 0-1.888.944.944 0 0 1 0 1.888z"/>
                    </svg>
                );
            case 'google':
                return (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="#4285f4">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                );
            default:
                return (
                    <span style={{ fontSize: '20px', color: '#666' }}>
                        {SOCIAL_NETWORK_CONFIG[networkType]?.icon || '🌐'}
                    </span>
                );
        }
    };

    useEffect(() => {
        const initializeProfile = async () => {
            // Если авторизованный пользователь зашёл на свой публичный профиль — редиректим в ЛК
            // Проверяем это ПЕРВЫМ, до любых других запросов
            // Используем данные из localStorage — без лишнего API-запроса
            if (id) {
                const cachedUser = getUserData();
                if (cachedUser && cachedUser.id && cachedUser.id.toString() === id) {
                    navigate(ROUTES.PROFILE, { replace: true });
                    return;
                }
            }

            console.log('Initializing Profile...');
            const authenticated = await getCurrentUser();
            
            if (!readOnly && !authenticated) {
                // Для приватного профиля без авторизации - останавливаемся
                return;
            }

            console.log('=== LOADING PROFILE PAGE ===');
            console.log(`Loading ${readOnly ? 'public' : 'private'} profile`);
            if (userId) console.log('User ID:', userId);
            
            fetchUserData();
            fetchOccupationsList();
            
            // Загружаем доступные социальные сети только для приватных профилей
            if (!readOnly) {
                fetchAvailableSocialNetworks();
            }
        };
        initializeProfile();
    }, [navigate, readOnly, userId]);

    useEffect(() => {
        if (profileData?.id) {
            console.log('Profile loaded, fetching reviews, services, and occupations');
            if (userRole === 'master') {
                fetchUserGallery();
            }
            fetchReviews();
            fetchServices();
            fetchOccupationsList(); // Загружаем специальности сразу при загрузке профиля
        }
    }, [profileData?.id, userRole]);

    useEffect(() => {
        console.log('editingField useEffect triggered:', editingField);
        console.log('occupations.length:', occupations.length);
        if (editingField === 'specialty' && occupations.length === 0) {
            console.log('Calling fetchOccupationsList from editingField effect');
            fetchOccupationsList();
        }
    }, [editingField]);

    useEffect(() => {
        console.log('editingEducation useEffect triggered:', editingEducation);
        console.log('occupations.length:', occupations.length);
        if (editingEducation && occupations.length === 0) {
            console.log('Calling fetchOccupationsList from editingEducation effect');
            fetchOccupationsList();
        }
    }, [editingEducation]);

    // Обновляем selectedSpecialty когда загружаются occupations
    useEffect(() => {
        if (editingEducation && !editingEducation.startsWith('new-') && occupations.length > 0 && profileData && !occupationsLoading) {
            const currentEducation = profileData.education.find(edu => edu.id === editingEducation);
            console.log('useEffect: Checking for specialty update');
            console.log('Current education found:', currentEducation);
            console.log('Current selectedSpecialty:', educationForm.selectedSpecialty);
            console.log('Available occupations:', occupations.length);
            
            if (currentEducation && currentEducation.specialty && !educationForm.selectedSpecialty) {
                const foundOccupation = occupations.find(occ => {
                    const occTitle = occ.title?.toLowerCase().trim() || '';
                    const eduSpecialty = currentEducation.specialty?.toLowerCase().trim() || '';
                    return occTitle === eduSpecialty;
                });
                
                console.log('Looking for specialty match:');
                console.log('Education specialty:', currentEducation.specialty);
                console.log('Found occupation:', foundOccupation);
                
                if (foundOccupation) {
                    console.log('Updating selectedSpecialty after occupations loaded:', foundOccupation);
                    setEducationForm(prev => ({
                        ...prev,
                        selectedSpecialty: foundOccupation.id
                    }));
                } else {
                    console.warn('No matching occupation found for specialty:', currentEducation.specialty);
                }
            }
        }
    }, [editingEducation, occupations, profileData, educationForm.selectedSpecialty, occupationsLoading]);

    const updateSocialNetworks = async (updatedNetworks: LocalSocialNetwork[]) => {
        if (!profileData?.id) {
            console.error('No profile ID available');
            return false;
        }

        try {
            const token = getAuthToken();
            if (!token) {
                // Нет токена - переходим на главную
                navigate(ROUTES.HOME);
                return false;
            }

            // Подготавливаем данные для отправки - отправляем ВСЕ социальные сети (даже пустые)
            const socialNetworksData = updatedNetworks.map(network => {
                const handle = network.handle.trim();

                // Если handle пустой, отправляем null (это важно для очистки)
                return {
                    network: network.network.toLowerCase(),
                    handle: handle || null  // Отправляем null для очистки
                };
            });

            console.log('Sending social networks PATCH request...');
            console.log('URL:', `${API_BASE_URL}/api/users/${profileData.id}`);
            console.log('Data to send:', JSON.stringify({
                socialNetworks: socialNetworksData
            }, null, 2));

            // Используем правильный Content-Type как указано в API
            const response = await fetch(`${API_BASE_URL}/api/users/${profileData.id}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/merge-patch+json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify({
                    socialNetworks: socialNetworksData
                }),
            });

            console.log('Response status:', response.status);

            if (response.ok) {
                const updatedData = await response.json();
                console.log('Social networks updated successfully on server:', updatedData.socialNetworks);

                // Обновляем локальное состояние
                setSocialNetworks(updatedNetworks);

                // Обновляем профиль
                setProfileData(prev => prev ? {
                    ...prev,
                    socialNetworks: updatedNetworks
                } : null);

                console.log('Социальные сети успешно обновлены');
                return true;
            } else {
                const errorText = await response.text();
                console.error('Error updating social networks. Status:', response.status, 'Response:', errorText);

                try {
                    const errorData = JSON.parse(errorText);
                    console.error('Error details:', errorData);
                    console.error('Ошибка при обновлении социальных сетей:', response.status);
                } catch {
                    console.error('Ошибка при обновлении социальных сетей');
                }
                return false;
            }
        } catch (error) {
            console.error('Network error updating social networks:', error);
            return false;
        }
    };

    const handleResetSocialNetworks = async () => {
        if (!confirm(t('profile:deleteAllNetworksConfirm'))) {
            return;
        }

        // Очищаем все социальные сети
        const emptyNetworks: LocalSocialNetwork[] = [];

        // Обновляем локальное состояние сразу для лучшего UX
        setSocialNetworks(emptyNetworks);

        // Пытаемся обновить на сервере
        const success = await updateSocialNetworks(emptyNetworks);

        if (!success) {
            // Если не удалось на сервере, возвращаем предыдущее состояние
            await fetchUserData();
            console.error('Не удалось обновить социальные сети на сервере');
        }
    };

    // ===== Функции для работы с адресами =====
    
    // Вспомогательная функция для преобразования адреса из формата API (с объектами) в формат для отправки (с IRI)
    const convertAddressToIRI = (address: UserAddressApiData): any => {
        const iriAddress: any = {};
        
        // Сохраняем id если есть
        if (address.id) {
            iriAddress.id = address.id;
        }
        
        // Преобразуем каждое поле из объекта в IRI-строку
        if (address.province) {
            if (typeof address.province === 'object' && address.province.id) {
                iriAddress.province = `/api/provinces/${address.province.id}`;
            } else if (typeof address.province === 'string') {
                iriAddress.province = address.province;
            }
        }
        
        if (address.city) {
            if (typeof address.city === 'object' && address.city.id) {
                iriAddress.city = `/api/cities/${address.city.id}`;
            } else if (typeof address.city === 'string') {
                iriAddress.city = address.city;
            }
        }
        
        if (address.suburb) {
            if (typeof address.suburb === 'object' && address.suburb.id) {
                iriAddress.suburb = `/api/suburbs/${address.suburb.id}`;
            } else if (typeof address.suburb === 'string') {
                iriAddress.suburb = address.suburb;
            }
        }
        
        if (address.district) {
            if (typeof address.district === 'object' && address.district.id) {
                iriAddress.district = `/api/districts/${address.district.id}`;
            } else if (typeof address.district === 'string') {
                iriAddress.district = address.district;
            }
        }
        
        if (address.settlement) {
            if (typeof address.settlement === 'object' && address.settlement.id) {
                iriAddress.settlement = `/api/settlements/${address.settlement.id}`;
            } else if (typeof address.settlement === 'string') {
                iriAddress.settlement = address.settlement;
            }
        }
        
        if (address.community) {
            if (typeof address.community === 'object' && address.community.id) {
                iriAddress.community = `/api/communities/${address.community.id}`;
            } else if (typeof address.community === 'string') {
                iriAddress.community = address.community;
            }
        }
        
        if (address.village) {
            if (typeof address.village === 'object' && address.village.id) {
                iriAddress.village = `/api/villages/${address.village.id}`;
            } else if (typeof address.village === 'string') {
                iriAddress.village = address.village;
            }
        }
        
        return iriAddress;
    };
    
    const handleAddAddress = () => {
        const newAddressId = `new-${Date.now()}`;
        setEditingAddress(newAddressId);
        setAddressForm({
            provinceId: null,
            cityId: null,
            suburbIds: [],
            districtIds: [],
            settlementId: null,
            communityId: null,
            villageId: null
        });
    };

    const handleEditAddressStart = (address: LocalAddress) => {
        setEditingAddress(address.id);
        setAddressForm(address.addressValue);
    };

    const handleEditAddressCancel = () => {
        setEditingAddress(null);
        setAddressForm({
            provinceId: null,
            cityId: null,
            suburbIds: [],
            districtIds: [],
            settlementId: null,
            communityId: null,
            villageId: null
        });
    };

    const handleEditAddressSave = async () => {
        if (!profileData?.id || !editingAddress) return;

        // Проверяем, что выбрана область
        if (!addressForm.provinceId) {
            alert(t('profile:selectProvince'));
            return;
        }

        // Проверяем, что выбран город или район
        if (!addressForm.cityId && addressForm.districtIds.length === 0) {
            alert(t('profile:selectCity'));
            return;
        }

        try {
            const token = getAuthToken();
            if (!token) {
                console.error('No auth token');
                return;
            }

            // Получаем текущие данные пользователя
            const userResponse = await fetch(`${API_BASE_URL}/api/users/${profileData.id}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!userResponse.ok) {
                throw new Error('Failed to fetch current user data');
            }

            const userData: UserApiData = await userResponse.json();
            const currentAddresses = userData.addresses || [];
            
            // Преобразуем AddressValue в формат API
            const addressData = buildAddressData(addressForm);
            if (!addressData) {
                alert(t('profile:addrError'));
                return;
            }

            // Определяем, обновляем существующий или создаем новый
            const addressIndex = editingAddress.startsWith('new-') 
                ? -1 
                : currentAddresses.findIndex((addr: UserAddressApiData) => addr.id?.toString() === editingAddress);

            let updatedAddresses: any[];
            if (addressIndex >= 0) {
                // Обновляем существующий - преобразуем все адреса в IRI формат
                updatedAddresses = currentAddresses.map((addr: UserAddressApiData, idx: number) => {
                    if (idx === addressIndex) {
                        // Заменяем редактируемый адрес на новые данные
                        return {
                            id: addr.id,
                            ...addressData
                        };
                    } else {
                        // Преобразуем остальные адреса из объектов в IRI
                        return convertAddressToIRI(addr);
                    }
                });
            } else {
                // Добавляем новый - преобразуем существующие адреса в IRI формат
                updatedAddresses = [
                    ...currentAddresses.map((addr: UserAddressApiData) => convertAddressToIRI(addr)),
                    addressData
                ];
            }

            // Отправляем на сервер
            const updateResponse = await fetch(`${API_BASE_URL}/api/users/${profileData.id}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/merge-patch+json',
                },
                body: JSON.stringify({
                    addresses: updatedAddresses
                }),
            });

            if (updateResponse.ok) {
                // Получаем обновленные данные пользователя
                const updatedUserResponse = await fetch(`${API_BASE_URL}/api/users/${profileData.id}`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                });

                if (updatedUserResponse.ok) {
                    const updatedUserData: UserApiData = await updatedUserResponse.json();
                    const updatedAddresses = updatedUserData.addresses || [];

                    // Преобразуем адреса в формат для отображения
                    const loadedAddresses: LocalAddress[] = [];
                    for (let i = 0; i < updatedAddresses.length; i++) {
                        const addr = updatedAddresses[i];
                        const addressText = await getFullAddressText(addr);
                        
                        if (addressText) {
                            const addressValue: AddressValue = {
                                provinceId: addr.province ? (typeof addr.province === 'object' ? (addr.province.id || null) : null) : null,
                                cityId: addr.city ? (typeof addr.city === 'object' ? (addr.city.id || null) : null) : null,
                                suburbIds: addr.suburb ? [(typeof addr.suburb === 'object' ? (addr.suburb.id || null) : null)].filter((id): id is number => id !== null) : [],
                                districtIds: addr.district ? [(typeof addr.district === 'object' ? (addr.district.id || null) : null)].filter((id): id is number => id !== null) : [],
                                settlementId: addr.settlement ? (typeof addr.settlement === 'object' ? (addr.settlement.id || null) : null) : null,
                                communityId: addr.community ? (typeof addr.community === 'object' ? (addr.community.id || null) : null) : null,
                                villageId: addr.village ? (typeof addr.village === 'object' ? (addr.village.id || null) : null) : null
                            };

                            loadedAddresses.push({
                                id: addr.id?.toString() || `addr-${i}`,
                                displayText: addressText,
                                addressValue
                            });
                        }
                    }

                    // Обновляем только addresses в profileData
                    setProfileData(prev => prev ? {
                        ...prev,
                        addresses: loadedAddresses
                    } : null);
                }

                handleEditAddressCancel();
            } else {
                const errorText = await updateResponse.text();
                console.error('Error updating address:', errorText);
                alert(t('profile:addrSaveError'));
            }

        } catch (error) {
            console.error('Error saving address:', error);
            alert(t('profile:addrSaveError'));
        }
    };

    const handleDeleteAddress = async (addressId: string) => {
        if (!profileData?.id) return;

        if (!confirm(t('profile:deleteAddrConfirm'))) {
            return;
        }

        try {
            const token = getAuthToken();
            if (!token) {
                console.error('No auth token');
                return;
            }

            const userResponse = await fetch(`${API_BASE_URL}/api/users/${profileData.id}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!userResponse.ok) {
                throw new Error('Failed to fetch current user data');
            }

            const userData: UserApiData = await userResponse.json();
            const currentAddresses = userData.addresses || [];
            
            // Фильтруем адрес с указанным ID и преобразуем в IRI формат
            const updatedAddresses = currentAddresses
                .filter((addr: UserAddressApiData) => addr.id?.toString() !== addressId)
                .map((addr: UserAddressApiData) => convertAddressToIRI(addr));

            // Отправляем на сервер
            const updateResponse = await fetch(`${API_BASE_URL}/api/users/${profileData.id}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/merge-patch+json',
                },
                body: JSON.stringify({
                    addresses: updatedAddresses
                }),
            });

            if (updateResponse.ok) {
                // Обновляем только addresses в profileData без перезагрузки
                setProfileData(prev => {
                    if (!prev) return null;
                    return {
                        ...prev,
                        addresses: prev.addresses.filter(addr => addr.id !== addressId)
                    };
                });
            } else {
                const errorText = await updateResponse.text();
                console.error('Error deleting address:', errorText);
                alert(t('profile:addrDeleteError'));
            }

        } catch (error) {
            console.error('Error deleting address:', error);
            alert(t('profile:addrDeleteError'));
        }
    };

    // Функции для работы с телефонами
    const validatePhone = (number: string, type: 'tj' | 'international'): boolean => {
        if (!number.trim()) return false;
        
        if (type === 'tj') {
            // Таджикистанский номер: +992 и 9 цифр после
            return /^\+992\d{9}$/.test(number);
        } else {
            // Международный: начинается с + и содержит от 10 до 15 цифр
            return /^\+\d{10,15}$/.test(number);
        }
    };

    const handleAddPhone = () => {
        if (!profileData?.phones) return;
        
        // Проверяем сколько телефонов уже добавлено
        const tjPhones = profileData.phones.filter(p => p.type === 'tj').length;
        const intPhones = profileData.phones.filter(p => p.type === 'international').length;
        
        if (tjPhones === 0) {
            setPhoneForm({ number: '+992', type: 'tj' });
        } else if (intPhones === 0) {
            setPhoneForm({ number: '+', type: 'international' });
        } else {
            alert('Максимум 2 телефона: один РТ (+992) и один международный');
            return;
        }
        
        setEditingPhone('new');
    };

    const handleEditPhoneStart = (phone: LocalPhone) => {
        setEditingPhone(phone.id);
        setPhoneForm({ number: phone.number, type: phone.type });
    };

    const handleEditPhoneCancel = () => {
        setEditingPhone(null);
        setPhoneForm({ number: '', type: 'tj' });
    };

    const handleEditPhoneSave = async () => {
        if (!profileData?.id) return;

        const trimmedNumber = phoneForm.number.trim();
        
        if (!validatePhone(trimmedNumber, phoneForm.type)) {
            if (phoneForm.type === 'tj') {
                alert('Неверный формат. Введите номер в формате +992XXXXXXXXX');
            } else {
                alert('Неверный формат. Введите международный номер в формате +XXXXXXXXXXX');
            }
            return;
        }

        try {
            const token = getAuthToken();
            if (!token) {
                console.error('No auth token');
                return;
            }

            let updatedPhones: LocalPhone[];
            
            if (editingPhone === 'new') {
                // Добавление нового телефона
                updatedPhones = [
                    ...profileData.phones,
                    {
                        id: phoneForm.type === 'tj' ? 'phone-tj' : 'phone-international',
                        number: trimmedNumber,
                        type: phoneForm.type
                    }
                ];
            } else {
                // Редактирование существующего
                updatedPhones = profileData.phones.map(p =>
                    p.id === editingPhone
                        ? { ...p, number: trimmedNumber, type: phoneForm.type }
                        : p
                );
            }

            // Преобразуем в формат phone1 и phone2
            const phone1 = updatedPhones.find(p => p.type === 'tj')?.number || null;
            const phone2 = updatedPhones.find(p => p.type === 'international')?.number || null;

            const response = await fetch(`${API_BASE_URL}/api/users/${profileData.id}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/merge-patch+json',
                },
                body: JSON.stringify({
                    phone1,
                    phone2
                }),
            });

            if (response.ok) {
                setProfileData(prev => prev ? {
                    ...prev,
                    phones: updatedPhones
                } : null);
                handleEditPhoneCancel();
            } else {
                const errorText = await response.text();
                console.error('Error saving phone:', errorText);
                alert('Ошибка при сохранении телефона');
            }

        } catch (error) {
            console.error('Error saving phone:', error);
            alert('Ошибка при сохранении телефона');
        }
    };

    const handleDeletePhone = async (phoneId: string) => {
        if (!profileData?.id) return;

        if (!confirm(t('profile:deletePhoneConfirm'))) {
            return;
        }

        try {
            const token = getAuthToken();
            if (!token) {
                console.error('No auth token');
                return;
            }

            const updatedPhones = profileData.phones.filter(p => p.id !== phoneId);
            
            // Преобразуем в формат phone1 и phone2
            const phone1 = updatedPhones.find(p => p.type === 'tj')?.number || null;
            const phone2 = updatedPhones.find(p => p.type === 'international')?.number || null;

            const response = await fetch(`${API_BASE_URL}/api/users/${profileData.id}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/merge-patch+json',
                },
                body: JSON.stringify({
                    phone1,
                    phone2
                }),
            });

            if (response.ok) {
                setProfileData(prev => prev ? {
                    ...prev,
                    phones: updatedPhones
                } : null);
            } else {
                const errorText = await response.text();
                console.error('Error deleting phone:', errorText);
                alert('Ошибка при удалении телефона');
            }

        } catch (error) {
            console.error('Error deleting phone:', error);
            alert('Ошибка при удалении телефона');
        }
    };

    const handleCopyPhone = async (phoneNumber: string) => {
        try {
            await navigator.clipboard.writeText(phoneNumber);
            alert('Номер телефона скопирован в буфер обмена');
        } catch (error) {
            console.error('Failed to copy phone number:', error);
            alert('Ошибка при копировании');
        }
    };

    const handleCopySocialNetwork = async (handle: string) => {
        try {
            await navigator.clipboard.writeText(handle);
            alert('Скопировано в буфер обмена');
        } catch (error) {
            console.error('Failed to copy social network handle:', error);
            alert('Ошибка при копировании');
        }
    };

    const handleCanWorkRemotelyToggle = async () => {
        if (!profileData?.id) return;

        const newValue = !profileData.canWorkRemotely;

        try {
            const token = getAuthToken();
            if (!token) {
                console.error('No auth token');
                return;
            }

            const response = await fetch(`${API_BASE_URL}/api/users/${profileData.id}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/merge-patch+json',
                },
                body: JSON.stringify({ atHome: newValue }),
            });

            if (response.ok) {
                setProfileData((prev) => {
                    if (!prev) return null;
                    return {
                        ...prev,
                        canWorkRemotely: newValue
                    };
                });
            } else {
                console.error('Failed to update remote work setting');
                alert('Не удалось сохранить настройку удаленной работы');
            }
        } catch (error) {
            console.error('Error updating remote work setting:', error);
            alert('Ошибка при сохранении настройки удаленной работы');
        }
    };

    const fetchOccupationsList = async () => {
        try {
            setOccupationsLoading(true);
            const occupationsData = await getOccupations();
            
            console.log('Occupations from cache:', occupationsData);
            console.log('Occupations count:', occupationsData.length);
            
            // Проверяем, что у нас есть валидные данные
            const validOccupations = occupationsData.filter(occ => occ && occ.id && occ.title);
            console.log('Valid occupations count:', validOccupations.length);
            console.log('Valid occupations sample:', validOccupations.slice(0, 3));
            
            setOccupations(validOccupations);
        } catch (error) {
            console.error('Error fetching occupations:', error);
            setOccupations([]);
        } finally {
            setOccupationsLoading(false);
        }
    };

    const handleShowMore = () => {
        setVisibleCount(reviews.length);
    };

    const handleShowLess = () => {
        setVisibleCount(2);
    };

    const checkImageExists = (url: string): Promise<boolean> => {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => resolve(true);
            img.onerror = () => resolve(false);
            img.src = url;
        });
    };

    const fetchUserData = async () => {
        try {
            setIsLoading(true);
            const token = getAuthToken();
            
            // Для приватных профилей требуется токен
            if (!readOnly && !token) {
                // Нет токена - переходим на главную
                navigate(ROUTES.HOME);
                return;
            }

            // Определяем endpoint: /api/users/me для приватного или /api/users/:id для публичного
            const currentLocale = getStorageItem('i18nextLng') || 'ru';
            const endpoint = userId
                ? `${API_BASE_URL}/api/users/${userId}?locale=${currentLocale}`
                : `${API_BASE_URL}/api/users/me?locale=${currentLocale}`;

            // Загружаем данные пользователя + географию + профессии параллельно
            const localeHeaders = { ...(token && { 'Authorization': `Bearer ${token}` }) };
            const [response, provincesRes, citiesRes, districtsRes, localizedOccupations] = await Promise.all([
                fetch(endpoint, {
                    method: 'GET',
                    headers: { ...localeHeaders, 'Content-Type': 'application/json', 'Accept': 'application/json' },
                }),
                fetch(`${API_BASE_URL}/api/provinces?locale=${currentLocale}`, { headers: localeHeaders }),
                fetch(`${API_BASE_URL}/api/cities?locale=${currentLocale}`, { headers: localeHeaders }),
                fetch(`${API_BASE_URL}/api/districts?locale=${currentLocale}`, { headers: localeHeaders }),
                getOccupations(currentLocale),
            ]);

            if (response.status === 401 && !readOnly) {
                console.log('Token is invalid or expired');
                const refreshed = await handleUnauthorized();
                if (refreshed) {
                    // Повторяем запрос
                    fetchUserData();
                }
                return;
            }

            if (!response.ok) {
                throw new Error(`Failed to fetch user data: ${response.status} ${response.statusText}`);
            }

            const userData: UserApiData = await response.json();
            console.log('User data received:', userData);

            // Строим lookup maps из переведённых географических данных
            const [pRaw, cRaw, dRaw] = await Promise.all([
                provincesRes.ok ? provincesRes.json() : Promise.resolve([]),
                citiesRes.ok ? citiesRes.json() : Promise.resolve([]),
                districtsRes.ok ? districtsRes.json() : Promise.resolve([]),
            ]);
            const toArr = (d: any) => Array.isArray(d) ? d : (d?.['hydra:member'] || []);
            const provincesArr2: any[] = toArr(pRaw);
            const citiesArr: any[] = toArr(cRaw);
            const districtsArr: any[] = toArr(dRaw);

            const provinceMap = new Map<number, string>(provincesArr2.map((p: any) => [p.id, p.title]));
            const cityMap     = new Map<number, string>(citiesArr.map((c: any) => [c.id, c.title]));
            const districtMap = new Map<number, string>(districtsArr.map((d: any) => [d.id, d.title]));
            const suburbMap   = new Map<number, string>();
            const settlementMap = new Map<number, string>();
            const communityMap  = new Map<number, string>();
            const villageMap    = new Map<number, string>();
            citiesArr.forEach((city: any) => {
                (city.suburbs || []).forEach((s: any) => suburbMap.set(s.id, s.title));
            });
            districtsArr.forEach((dist: any) => {
                (dist.settlements || []).forEach((s: any) => {
                    settlementMap.set(s.id, s.title);
                    (s.village || s.villages || []).forEach((v: any) => villageMap.set(v.id, v.title));
                });
                (dist.communities || []).forEach((c: any) => communityMap.set(c.id, c.title));
            });

            const addrId = (part: any): number | null => part ? (typeof part === 'object' ? part.id : null) : null;
            const resolveAddr = (part: any, map: Map<number, string>): string => {
                const id = addrId(part);
                if (id && map.has(id)) return map.get(id)!;
                if (typeof part === 'object' && part?.title) return String(part.title);
                return '';
            };
            const buildAddressText = (addr: UserAddressApiData): string => {
                const parts = [
                    resolveAddr(addr.province, provinceMap),
                    resolveAddr(addr.city, cityMap),
                    resolveAddr(addr.district, districtMap),
                    resolveAddr(addr.suburb, suburbMap),
                    resolveAddr(addr.settlement, settlementMap),
                    resolveAddr(addr.community, communityMap),
                    resolveAddr(addr.village, villageMap),
                ].filter(Boolean);
                return parts.join(', ');
            };

            // Определяем роль пользователя
            const roles = Array.isArray(userData.roles) ? userData.roles : [];
            const role = roles.includes('ROLE_MASTER') ? 'master' : 'client';
            setUserRole(role);
            console.log('User role:', role);

            const avatarUrl = await getAvatarUrl(userData);

            // Получаем все адреса пользователя
            const userAddresses = userData.addresses as UserAddressApiData[] | undefined;

            // Строим displayText для каждого адреса через lookup maps (переведённые названия)
            const loadedAddresses: LocalAddress[] = [];
            let workArea = '';
            if (userAddresses && Array.isArray(userAddresses)) {
                const addressStrings: string[] = [];
                userAddresses.forEach((addr, i) => {
                    const addressText = buildAddressText(addr);
                    if (addressText) {
                        addressStrings.push(addressText);
                        const addressValue: AddressValue = {
                            provinceId: addrId(addr.province),
                            cityId: addrId(addr.city),
                            suburbIds: addr.suburb ? [addrId(addr.suburb)].filter((id): id is number => id !== null) : [],
                            districtIds: addr.district ? [addrId(addr.district)].filter((id): id is number => id !== null) : [],
                            settlementId: addrId(addr.settlement),
                            communityId: addrId(addr.community),
                            villageId: addrId(addr.village),
                        };
                        loadedAddresses.push({
                            id: addr.id?.toString() || `addr-${i}`,
                            displayText: addressText,
                            addressValue,
                        });
                    }
                });
                workArea = [...new Set(addressStrings)].join(', ');
            }

            // Создаем пустой массив социальных сетей - показываем только те, что есть в API
            const loadedSocialNetworks: LocalSocialNetwork[] = [];

            // Если в API есть социальные сети, добавляем их
            if (userData.socialNetworks && Array.isArray(userData.socialNetworks)) {
                console.log('Found social networks in API:', userData.socialNetworks);

                userData.socialNetworks.forEach((sn) => {
                    const networkType = sn.network?.toLowerCase();
                    const handle = sn.handle || '';

                    // Добавляем только те сети, которые реально заполнены или есть в API
                    if (networkType && (handle || (userData.socialNetworks && userData.socialNetworks.length > 0))) {
                        loadedSocialNetworks.push({
                            id: sn.id?.toString() || `network-${Date.now()}-${Math.random()}`,
                            network: networkType,
                            handle: handle
                        });
                    }
                });
            } else {
                console.log('No social networks found in API');
            }

            // Обновляем состояние социальных сетей
            setSocialNetworks(loadedSocialNetworks);

            // Преобразуем телефоны из phone1 и phone2
            const loadedPhones: LocalPhone[] = [];
            if (userData.phone1 && typeof userData.phone1 === 'string') {
                loadedPhones.push({
                    id: 'phone-tj',
                    number: userData.phone1,
                    type: 'tj'
                });
            }
            if (userData.phone2 && typeof userData.phone2 === 'string') {
                loadedPhones.push({
                    id: 'phone-international',
                    number: userData.phone2,
                    type: 'international'
                });
            }

            // localizedOccupations уже получены выше через Promise.all
            setOccupations(localizedOccupations);

            // Хелпер: по occupation (объект или IRI) вернуть переведённое название из localized списка
            const resolveOccupationTitle = (occ: any): string => {
                if (!occ) return '';
                // Всегда ищем по ID в переведённом списке
                const id = typeof occ === 'object' ? occ.id
                         : typeof occ === 'string' ? parseInt(occ.split('/').pop() || '0')
                         : null;
                if (id) {
                    const found = localizedOccupations.find(o => o.id === id);
                    if (found) return found.title;
                }
                // Fallback на встроенный title
                if (typeof occ === 'object' && occ.title) return String(occ.title);
                return '';
            };

            const transformedData: ProfileData = {
                id: userData.id.toString(),
                fullName: [userData.surname, userData.name, userData.patronymic]
                    .filter(Boolean)
                    .join(' ') || t('profile:defaultFullName'),
                email: userData.email || undefined,
                gender: (userData as any).gender || (userData as any).sex || undefined,
                dateOfBirth: userData.dateOfBirth || undefined,
                specialty: Array.isArray(userData.occupation) 
                    ? userData.occupation.map(resolveOccupationTitle).filter(Boolean).join(', ') || t('profile:defaultSpecialty')
                    : t('profile:defaultSpecialty'),
                specialties: Array.isArray(userData.occupation) 
                    ? userData.occupation.map(resolveOccupationTitle).filter(Boolean) 
                    : [],
                rating: userData.rating || 0,
                reviews: 0,
                avatar: avatarUrl,
                education: transformEducation(userData.education || [], localizedOccupations),
                workExamples: [],
                workArea: workArea,
                addresses: loadedAddresses,
                canWorkRemotely: userData.atHome || false,
                services: [],
                socialNetworks: loadedSocialNetworks,
                phones: loadedPhones,
                isOnline: (userData as any).isOnline ?? false,
                lastSeen: (userData as any).lastSeen ?? null,
            };

            setProfileData(transformedData);

            // Подгружаем услуги и галерею после обновления профиля (нужны переведённые данные)
            fetchServices();
            if (role === 'master') {
                fetchUserGallery();
            }

        } catch (error) {
            console.error('Error fetching user data:', error);
            // При ошибке устанавливаем пустой массив социальных сетей
            setSocialNetworks([]);
            setProfileData({
                id: '',
                fullName: t('profile:defaultFullName'),
                email: undefined,
                gender: undefined,
                specialty: t('profile:defaultSpecialty'),
                specialties: [],
                rating: 0,
                reviews: 0,
                avatar: null,
                phones: [],
                education: [],
                workExamples: [],
                workArea: '',
                addresses: [],
                canWorkRemotely: false,
                services: [],
                socialNetworks: []
            });
        } finally {
            setIsLoading(false);
        }
    };

    const extractAddressPart = async (addressPart: string | { title: string }): Promise<{ title: string } | null> => {
        try {
            if (typeof addressPart === 'string') {
                return { title: addressPart };
            } else if (addressPart && typeof addressPart === 'object' && 'title' in addressPart) {
                return { title: addressPart.title };
            }
            return null;
        } catch (error) {
            console.error('Error extracting address part:', error);
            return null;
        }
    };

    const getFullAddressText = async (address: UserAddressApiData): Promise<string> => {
        const addressParts: string[] = [];

        try {
            // Провинция
            if (address.province) {
                const provinceInfo = await extractAddressPart(address.province);
                if (provinceInfo?.title) addressParts.push(provinceInfo.title);
            }

            // Город
            if (address.city) {
                const cityInfo = await extractAddressPart(address.city);
                if (cityInfo?.title) addressParts.push(cityInfo.title);
            }

            // Район (district)
            if (address.district) {
                const districtInfo = await extractAddressPart(address.district);
                if (districtInfo?.title) addressParts.push(districtInfo.title);
            }

            // Квартал (suburb)
            if (address.suburb) {
                const suburbInfo = await extractAddressPart(address.suburb);
                if (suburbInfo?.title) addressParts.push(suburbInfo.title);
            }

            // Поселение (settlement)
            if (address.settlement) {
                const settlementInfo = await extractAddressPart(address.settlement);
                if (settlementInfo?.title) addressParts.push(settlementInfo.title);
            }

            // ПГТ (community)
            if (address.community) {
                const communityInfo = await extractAddressPart(address.community);
                if (communityInfo?.title) addressParts.push(communityInfo.title);
            }

            // Село (village)
            if (address.village) {
                const villageInfo = await extractAddressPart(address.village);
                if (villageInfo?.title) addressParts.push(villageInfo.title);
            }

        } catch (error) {
            console.error('Error getting full address text:', error);
        }

        return addressParts.join(', ');
    };

    const fetchReviews = async () => {
        try {
            setReviewsLoading(true);
            const token = getAuthToken();
            
            // Для публичных профилей токен необязателен
            if (!readOnly && !token) {
                console.log('No token available for fetching reviews');
                return;
            }

            if (!profileData?.id) {
                console.log('No profile data ID available');
                return;
            }

            console.log(`Fetching reviews for ${userRole} ID:`, profileData.id);
            const endpoint = userRole === 'client' 
                ? `/api/reviews?exists[services]=true&exists[master]=true&exists[client]=true&type=client&client=${profileData.id}`
                : `/api/reviews?exists[services]=true&exists[master]=true&exists[client]=true&type=master&master=${profileData.id}`;
            console.log(`Trying endpoint: ${endpoint}`);

            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                method: 'GET',
                headers: {
                    ...(token && { 'Authorization': `Bearer ${token}` }),
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
            });

            console.log(`Response status: ${response.status}`);
            console.log(`Response ok: ${response.ok}`);

            if (response.status === 401 && !readOnly) {
                console.log('Unauthorized, redirecting to login');
                const refreshed = await handleUnauthorized();
                if (refreshed) {
                    // Повторяем запрос
                    fetchReviews();
                }
                return;
            }

            if (response.status === 404) {
                console.log('No reviews found for this master');
                setReviews([]);
                return;
            }

            if (!response.ok) {
                console.error(`Failed to fetch reviews: ${response.status} ${response.statusText}`);
                setReviews([]);
                return;
            }

            const reviewsData = await response.json();
            console.log('Raw reviews data:', reviewsData);
            let reviewsArray: ReviewApiData[] = [];

            if (Array.isArray(reviewsData)) {
                reviewsArray = reviewsData;
            } else if (reviewsData && typeof reviewsData === 'object') {
                const apiResponse = reviewsData as ApiResponse<ReviewApiData>;
                if (apiResponse['hydra:member'] && Array.isArray(apiResponse['hydra:member'])) {
                    reviewsArray = apiResponse['hydra:member'];
                } else if ((reviewsData as ReviewApiData).id) {
                    reviewsArray = [reviewsData as ReviewApiData];
                }
            }

            console.log(`Processing ${reviewsArray.length} reviews`);
            if (reviewsArray.length > 0) {
                // Убираем фильтрацию - отзывы уже приходят отфильтрованными из API
                console.log(`Found ${reviewsArray.length} reviews for ${userRole} ${profileData.id}`);
                const transformedReviews = await Promise.all(
                    reviewsArray.map(async (review) => {
                        console.log('Processing review:', review);

                        // Use embedded master/client data from the review response instead of
                        // making separate GET /api/users/{id} requests for each review.
                        const masterRaw = review.master as any;
                        const clientRaw = review.client as any;

                        const [masterAvatarUrl, clientAvatarUrl] = await Promise.all([
                            masterRaw ? getAvatarUrl(masterRaw as UserApiData, 'master') : Promise.resolve(null),
                            clientRaw ? getAvatarUrl(clientRaw as UserApiData, 'client') : Promise.resolve(null)
                        ]);

                        const masterData = masterRaw ? {
                            id: masterRaw.id,
                            email: '',
                            name: masterRaw.name || '',
                            surname: masterRaw.surname || '',
                            rating: typeof masterRaw.rating === 'number' ? masterRaw.rating : 0,
                            image: masterAvatarUrl || ''
                        } : null;

                        const clientData = clientRaw ? {
                            id: clientRaw.id,
                            email: '',
                            name: clientRaw.name || '',
                            surname: clientRaw.surname || '',
                            rating: typeof clientRaw.rating === 'number' ? clientRaw.rating : 0,
                            image: clientAvatarUrl || ''
                        } : null;

                        console.log('Master data:', masterData);
                        console.log('Client data:', clientData);

                        const getFullNameParts = (fullName: string) => {
                            if (!fullName || false) {
                                return { firstName: 'Мастер', lastName: '' };
                            }
                            const parts = fullName.trim().split(/\s+/);
                            return {
                                firstName: parts[1] || 'Мастер',
                                lastName: parts[0] || ''
                            };
                        };

                        const nameParts = getFullNameParts(profileData.fullName);
                        const user = masterData || {
                            id: parseInt(profileData.id),
                            email: '',
                            name: nameParts.firstName,
                            surname: nameParts.lastName,
                            rating: profileData.rating,
                            image: profileData.avatar || ''
                        };

                        const reviewer = clientData || {
                            id: 0,
                            email: '',
                            name: 'Клиент',
                            surname: '',
                            rating: 0,
                            image: ''
                        };

                        const serviceTitle = String(review.ticket?.title || review.services?.title || 'Услуга');
                        console.log(`Review ${review.id} has service title: ${serviceTitle}`);

                        const transformedReview: Review = {
                            id: review.id,
                            rating: review.rating || 0,
                            description: review.description || '',
                            forReviewer: review.forClient || false,
                            services: {
                                id: review.ticket?.id || review.services?.id || 0,
                                title: String(serviceTitle) // Ensure it's always a string
                            },
                            ticket: review.ticket,
                            images: review.images || [],
                            user: user,
                            reviewer: reviewer,
                            vacation: String(serviceTitle), // Ensure string
                            worker: clientData ?
                                smartNameTranslator(
                                    `${clientData.name || 'Клиент'} ${clientData.surname || ''}`.trim(),
                                    i18n.language as 'ru' | 'tj' | 'eng'
                                ) :
                                smartNameTranslator('Клиент', i18n.language as 'ru' | 'tj' | 'eng'),
                            date: review.createdAt ?
                                new Date(review.createdAt).toLocaleDateString('ru-RU') :
                                getFormattedDate()
                        };

                        console.log('Transformed review:', transformedReview);
                        return transformedReview;
                    })
                );

                console.log('All transformed reviews:', transformedReviews);
                setReviews(transformedReviews);

                // Для мастеров фильтруем по user.id (получатели отзывов)
                // Для клиентов фильтруем по reviewer.id (оставляющие отзывы) 
                const userReviews = userRole === 'client' 
                    ? transformedReviews.filter(r => r.reviewer.id === parseInt(profileData.id))
                    : transformedReviews.filter(r => r.user.id === parseInt(profileData.id));
                const newRating = calculateAverageRating(userReviews);

                console.log('User reviews for rating calculation:', userReviews);
                console.log('Calculated new rating from', userReviews.length, 'reviews:', newRating);

                setProfileData(prev => prev ? {
                    ...prev,
                    reviews: userReviews.length,
                    rating: newRating
                } : null);



            } else {
                console.log(`No reviews data found for this ${userRole}`);
                setReviews([]);
                setProfileData(prev => prev ? {
                    ...prev,
                    reviews: 0
                } : null);
            }

        } catch (error) {
            console.error('Error fetching reviews:', error);
            setReviews([]);
            setProfileData(prev => prev ? {
                ...prev,
                reviews: 0
            } : null);
        } finally {
            setReviewsLoading(false);
        }
    };

    const fetchServices = async () => {
        try {
            setServicesLoading(true);
            const token = getAuthToken();
            
            // Для публичных профилей токен необязателен
            if (!readOnly && !token) {
                console.log('No token available for fetching services');
                return;
            }

            if (!profileData?.id) {
                console.log('No profile data ID available');
                return;
            }

            console.log(`Fetching services for ${userRole} ID:`, profileData.id);
            const endpoint = userRole === 'client' 
                ? `/api/tickets?locale=${getStorageItem('i18nextLng') || 'ru'}&service=false&active=true&exists[master]=false&exists[author]=true&author=${profileData.id}`
                : `/api/tickets?locale=${getStorageItem('i18nextLng') || 'ru'}&service=true&active=true&exists[author]=false&exists[master]=true&master=${profileData.id}`;
            console.log(`Trying endpoint: ${endpoint}`);

            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                method: 'GET',
                headers: {
                    ...(token && { 'Authorization': `Bearer ${token}` }),
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
            });

            console.log(`Response status: ${response.status}`);
            console.log(`Response ok: ${response.ok}`);

            if (response.status === 401 && !readOnly) {
                console.log('Unauthorized, redirecting to login');
                const refreshed = await handleUnauthorized();
                if (refreshed) {
                    // Повторяем запрос
                    fetchServices();
                }
                return;
            }

            if (response.status === 404) {
                console.log(`No services found for this ${userRole}`);
                setProfileData(prev => prev ? {
                    ...prev,
                    services: []
                } : null);
                return;
            }

            if (!response.ok) {
                console.error(`Failed to fetch services: ${response.status} ${response.statusText}`);
                setProfileData(prev => prev ? {
                    ...prev,
                    services: []
                } : null);
                return;
            }

            const servicesData = await response.json();
            console.log('Raw services data:', servicesData);
            let servicesArray: any[] = [];

            if (Array.isArray(servicesData)) {
                servicesArray = servicesData;
            } else if (servicesData && typeof servicesData === 'object') {
                const apiResponse = servicesData as ApiResponse<any>;
                if (apiResponse['hydra:member'] && Array.isArray(apiResponse['hydra:member'])) {
                    servicesArray = apiResponse['hydra:member'];
                }
            }

            console.log(`Processing ${servicesArray.length} services`);
            
            const transformedServices: Service[] = servicesArray.map(service => {
                // Преобразуем изображения в правильный формат
                let serviceImages: Array<{id: number; image: string}> = [];
                if (service.images && Array.isArray(service.images)) {
                    serviceImages = service.images
                        .filter((img: any) => img && typeof img === 'object')
                        .map((img: any) => ({
                            id: img.id || 0,
                            image: img.image || img.url || img.path || ''
                        }))
                        .filter((img: any) => img.image); // Оставляем только изображения с путём
                }

                return {
                    id: service.id,
                    title: service.title || t('components:app.service'),
                    description: service.description || '',
                    budget: service.budget || 0,
                    price: service.budget || 0, // deprecated, используется budget
                    unit: service.unit || 'сомони',
                    createdAt: service.createdAt,
                    active: service.active !== false,
                    images: serviceImages
                };
            }).reverse(); // Реверс массива

            console.log('Transformed services:', transformedServices);
            
            setProfileData(prev => prev ? {
                ...prev,
                services: transformedServices
            } : null);

        } catch (error) {
            console.error('Error fetching services:', error);
            setProfileData(prev => prev ? {
                ...prev,
                services: []
            } : null);
        } finally {
            setServicesLoading(false);
        }
    };

    const handleWorkExampleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files || files.length === 0) return;

        setIsGalleryOperating(true);

        try {
            const token = getAuthToken();
            if (!token) {
                navigate(ROUTES.HOME);
                return;
            }

            console.log('Starting batch photo upload...');
            
            // Валидация файлов
            const formData = new FormData();
            const validFiles: File[] = [];

            for (let i = 0; i < files.length; i++) {
                const file = files[i];

                if (!file.type.startsWith('image/')) {
                    alert(`Файл ${file.name} не является изображением`);
                    continue;
                }

                if (file.size > 5 * 1024 * 1024) {
                    alert(`Размер файла ${file.name} превышает 5MB`);
                    continue;
                }

                formData.append("imageFile[]", file);
                validFiles.push(file);
            }

            if (validFiles.length === 0) {
                alert("Нет валидных файлов для загрузки");
                setIsGalleryOperating(false);
                return;
            }

            // Получаем или создаем галерею (один GET запрос)
            console.log('Fetching gallery...');
            const galleryData = await getUserGallery(token);
            let galleryId = galleryData?.id || null;

            if (!galleryId) {
                console.log('No gallery found, creating new one...');
                galleryId = await createUserGallery(token);
                
                if (!galleryId) {
                    alert('Не удалось создать галерею. Попробуйте еще раз или обратитесь в поддержку.');
                    setIsGalleryOperating(false);
                    return;
                }
                
                console.log('Gallery ready with ID:', galleryId);
            }

            console.log(`Uploading ${validFiles.length} photos to gallery ${galleryId}`);

            // Загружаем фото в галерею
            const response = await fetch(`${API_BASE_URL}/api/galleries/${galleryId}/upload-photo`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`,
                },
                body: formData,
            });

            const responseText = await response.text();
            console.log(`Upload response:`, response.status, responseText);

            if (!response.ok) {
                console.error(`Ошибка при загрузке:`, responseText);
                alert("Не удалось загрузить фото. Попробуйте еще раз.");
                setIsGalleryOperating(false);
                return;
            }

            // Обновляем галерею
            await fetchUserGallery();
            alert(`${validFiles.length} фото успешно добавлены в портфолио!`);

        } catch (error) {
            console.error("Ошибка при загрузке фото в портфолио:", error);
            alert("Ошибка при загрузке фото в портфолио");
        } finally {
            setIsGalleryOperating(false);
            if (workExampleInputRef.current) workExampleInputRef.current.value = "";
        }
    };

    const getUserGallery = async (token: string): Promise<GalleryApiData | null> => {
        try {
            console.log('Fetching user gallery via /api/galleries/me...');
            const response = await fetch(`${API_BASE_URL}/api/galleries/me`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json',
                },
            });

            if (!response.ok) {
                console.log('Gallery not found, status:', response.status);
                return null;
            }

            const galleriesData = await response.json();
            console.log('Galleries data:', galleriesData);
            
            let galleryArray: GalleryApiData[] = [];

            if (Array.isArray(galleriesData)) {
                galleryArray = galleriesData;
            } else if (galleriesData && typeof galleriesData === 'object') {
                const apiResponse = galleriesData as ApiResponse<GalleryApiData>;
                if (apiResponse['hydra:member'] && Array.isArray(apiResponse['hydra:member'])) {
                    galleryArray = apiResponse['hydra:member'];
                } else if ((galleriesData as GalleryApiData).id) {
                    galleryArray = [galleriesData as GalleryApiData];
                }
            }

            if (galleryArray.length > 0) {
                console.log('Found gallery:', galleryArray[0].id);
                return galleryArray[0];
            }

            console.log('No galleries found');
            return null;
        } catch (error) {
            console.error('Error getting user gallery:', error);
            return null;
        }
    };

    const handleDeleteWorkExample = async (workExampleId: string) => {
        console.log('Delete triggered for ID:', workExampleId);

        if (!profileData?.id) return;

        if (!confirm(t('profile:deleteWorkPhotoConfirm'))) {
            return;
        }

        setIsGalleryOperating(true);

        try {
            const token = getAuthToken();
            if (!token) {
                navigate(ROUTES.HOME);
                return;
            }

            console.log('Getting gallery for deletion...');
            const gallery = await getUserGallery(token);

            if (!gallery || !gallery.id) {
                console.log('No gallery found for user');
                alert('Галерея не найдена');
                setIsGalleryOperating(false);
                return;
            }

            const galleryId = gallery.id;
            console.log('Found gallery ID for deletion:', galleryId);

            // Проверяем, есть ли изображение в галерее
            const imageToDelete = gallery.images?.find(img => img.id.toString() === workExampleId);

            if (!imageToDelete) {
                console.log('Image not found in gallery:', workExampleId);
                // Удаляем из локального состояния, если изображение не найдено на сервере
                setProfileData(prev => {
                    if (!prev) return null;
                    return {
                        ...prev,
                        workExamples: prev.workExamples.filter(work => work.id !== workExampleId)
                    };
                });
                alert('Изображение не найдено в галерее');
                setIsGalleryOperating(false);
                return;
            }

            console.log('Image to delete found:', imageToDelete);

            // Формируем новый массив изображений без удаляемого
            const updatedImages = gallery.images
                ?.filter(img => img.id.toString() !== workExampleId)
                .map(img => ({ image: img.image })) || [];

            console.log(`Filtered images: ${gallery.images?.length} -> ${updatedImages.length}`);

            // Отправляем PATCH запрос с обновленным массивом
            const updateResponse = await fetch(`${API_BASE_URL}/api/galleries/${galleryId}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/merge-patch+json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify({ images: updatedImages }),
            });

            if (!updateResponse.ok) {
                const errorText = await updateResponse.text();
                console.error('PATCH failed:', errorText);
                alert('Не удалось удалить фото. Попробуйте еще раз.');
                setIsGalleryOperating(false);
                return;
            }

            console.log('Gallery updated successfully via PATCH');

            // Обновляем локальное состояние сразу - удаляем из workExamples
            setProfileData(prev => {
                if (!prev) return null;
                return {
                    ...prev,
                    workExamples: prev.workExamples.filter(work => work.id !== workExampleId)
                };
            });
            
            alert('Фото успешно удалено из портфолио!');

        } catch (error) {
            console.error('Error deleting work example:', error);
            alert('Ошибка при удалении фото. Пожалуйста, попробуйте еще раз.');
        } finally {
            setIsGalleryOperating(false);
        }
    };

    const handleDeleteAllWorkExamples = async () => {
        if (!profileData?.id) return;

        if (!confirm(t('profile:deleteAllWorkPhotosConfirm'))) {
            return;
        }

        setIsGalleryOperating(true);

        try {
            const token = getAuthToken();
            if (!token) {
                navigate(ROUTES.HOME);
                return;
            }

            console.log('Getting gallery for deletion of all images...');
            const gallery = await getUserGallery(token);

            if (!gallery || !gallery.id) {
                console.log('No gallery found for user');
                alert('Галерея не найдена');
                setIsGalleryOperating(false);
                return;
            }

            const galleryId = gallery.id;
            console.log('Found gallery ID for deletion:', galleryId);

            // Отправляем PATCH запрос с пустым массивом изображений
            const updateResponse = await fetch(`${API_BASE_URL}/api/galleries/${galleryId}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/merge-patch+json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify({ images: [] }),
            });

            if (!updateResponse.ok) {
                const errorText = await updateResponse.text();
                console.error('PATCH failed:', errorText);
                alert('Не удалось удалить все фото. Попробуйте еще раз.');
                setIsGalleryOperating(false);
                return;
            }

            console.log('All images deleted successfully via PATCH');

            // Обновляем локальное состояние - очищаем workExamples
            setProfileData(prev => {
                if (!prev) return null;
                return {
                    ...prev,
                    workExamples: []
                };
            });
            
            alert('Все фото успешно удалены из портфолио!');

        } catch (error) {
            console.error('Error deleting all work examples:', error);
            alert('Ошибка при удалении всех фото. Пожалуйста, попробуйте еще раз.');
        } finally {
            setIsGalleryOperating(false);
        }
    };

    const createUserGallery = async (token: string): Promise<number | null> => {
        try {
            console.log('Creating new gallery...');
            const requestBody = { images: [] };

            const response = await fetch(`${API_BASE_URL}/api/galleries`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                },
                body: JSON.stringify(requestBody),
            });

            const responseText = await response.text();
            console.log('Create gallery response:', response.status, responseText);

            if (!response.ok) {
                console.error('Failed to create gallery:', response.status, responseText);
                // Если 422, возможно галерея уже есть - проверяем
                if (response.status === 422) {
                    console.log('422 error - checking if gallery exists...');
                    const existingGallery = await getUserGallery(token);
                    return existingGallery?.id || null;
                }
                return null;
            }

            // Галерея создана успешно
            console.log('Gallery created successfully, parsing response...');
            
            // Пробуем распарсить ответ (новый формат: {id, user, message})
            try {
                const responseData = JSON.parse(responseText);
                
                // Проверяем наличие id (работает и для старого, и для нового формата)
                if (responseData.id) {
                    console.log('Gallery ID from response:', responseData.id);
                    return responseData.id;
                }
                
                console.log('Response parsed but no ID found:', responseData);
            } catch (e) {
                console.error('Failed to parse response:', e);
            }
            
            // Если парсинг не удался или нет ID - делаем GET запрос
            console.log('Fetching created gallery as fallback...');
            await new Promise(resolve => setTimeout(resolve, 300));
            const createdGallery = await getUserGallery(token);
            
            if (createdGallery?.id) {
                console.log('Created gallery ID from GET:', createdGallery.id);
                return createdGallery.id;
            }
            
            console.error('Could not get gallery ID after creation');
            return null;
        } catch (error) {
            console.error('Error creating gallery:', error);
            return null;
        }
    };

    const getImageUrl = (imagePath: string): string => {
        if (!imagePath) return "../fonTest6.png";
        if (imagePath.startsWith("http")) return imagePath;
        if (imagePath.startsWith("/")) return `${API_BASE_URL}${imagePath}`;
        return `${API_BASE_URL}/images/gallery_photos/${imagePath}`;
    };

    const fetchUserGallery = async () => {
        try {
            console.log('Fetching user gallery...');

            if (userId) {
                // Публичный профиль — грузим галерею по ID пользователя, без токена
                const response = await fetch(`${API_BASE_URL}/api/galleries?user=${userId}`, {
                    headers: { 'Accept': 'application/json' },
                });

                if (!response.ok) {
                    setProfileData(prev => prev ? { ...prev, workExamples: [] } : null);
                    return;
                }

                const data = await response.json();
                let galleryArray: GalleryApiData[] = [];
                if (Array.isArray(data)) {
                    galleryArray = data;
                } else if (data?.['hydra:member']) {
                    galleryArray = data['hydra:member'];
                } else if (data?.id) {
                    galleryArray = [data];
                }

                const gallery = galleryArray[0] ?? null;
                if (gallery?.images && gallery.images.length > 0) {
                    const workExamplesLocal = await Promise.all(
                        gallery.images.map(async (image: GalleryImageApiData) => {
                            const imageUrl = getImageUrl(image.image);
                            const exists = await checkImageExists(imageUrl).catch(() => false);
                            return {
                                id: image.id?.toString() || Date.now().toString(),
                                image: exists ? imageUrl : '../fonTest6.png',
                                title: 'Пример работы'
                            };
                        })
                    );
                    setProfileData(prev => prev ? { ...prev, workExamples: workExamplesLocal } : null);
                } else {
                    setProfileData(prev => prev ? { ...prev, workExamples: [] } : null);
                }
                return;
            }

            // Приватный профиль — грузим свою галерею
            const token = getAuthToken();
            if (!token) return;
            const gallery = await getUserGallery(token);

            if (gallery) {
                console.log('Gallery found:', gallery);
                if (gallery.images && gallery.images.length > 0) {
                    console.log(`Found ${gallery.images.length} images in gallery`);
                    const workExamplesLocal = await Promise.all(
                        gallery.images.map(async (image: GalleryImageApiData) => {
                            const imagePath = image.image;
                            const imageUrl = getImageUrl(imagePath);

                            console.log(`Processing image ${image.id}: ${imagePath}`);
                            console.log(`Image URL: ${imageUrl}`);

                            try {
                                const exists = await checkImageExists(imageUrl);
                                console.log(`Image exists: ${exists}`);

                                return {
                                    id: image.id?.toString() || Date.now().toString(),
                                    image: exists ? imageUrl : "../fonTest6.png",
                                    title: "Пример работы"
                                };
                            } catch (error) {
                                console.error(`Error checking image ${image.id}:`, error);
                                return {
                                    id: image.id?.toString() || Date.now().toString(),
                                    image: "../fonTest6.png",
                                    title: "Пример работы"
                                };
                            }
                        })
                    );

                    console.log("Work examples loaded:", workExamplesLocal.length);
                    setProfileData(prev => prev ? {
                        ...prev,
                        workExamples: workExamplesLocal
                    } : null);
                } else {
                    console.log('Gallery exists but has no images');
                    setProfileData(prev => prev ? {
                        ...prev,
                        workExamples: []
                    } : null);
                }
            } else {
                console.log('No gallery found for user');
                setProfileData(prev => prev ? {
                    ...prev,
                    workExamples: []
                } : null);
            }

        } catch (error) {
            console.error('Error fetching user gallery:', error);
            setProfileData(prev => prev ? {
                ...prev,
                workExamples: []
            } : null);
        }
    };

    const getFormattedDate = (): string => {
        const now = new Date();
        const day = now.getDate().toString().padStart(2, '0');
        const month = (now.getMonth() + 1).toString().padStart(2, '0');
        const year = now.getFullYear();
        const cities = ['Москва', 'Санкт-Петербург', 'Новосибирск', 'Екатеринбург', 'Казань'];
        const randomCity = cities[Math.floor(Math.random() * cities.length)];
        return `${day}.${month}.${year}, ${randomCity}`;
    };

    const getAvatarUrl = async (userData: UserApiData, userType: 'master' | 'client' = 'master'): Promise<string | null> => {
        if (!userData) return null;

        console.log(`Getting avatar URL for ${userType}:`, userData.id);
        console.log(`${userType} imageExternalUrl:`, userData.imageExternalUrl);
        console.log(`${userType} image data:`, userData.image);

        // Приоритет 1: image (локальное изображение)
        if (userData.image) {
            // Если это полный URL (начинается с http), используем его
            if (userData.image.startsWith('http')) {
                console.log(`Using full HTTP URL for ${userType}:`, userData.image);
                return userData.image;
            }
            
            // Если это путь, начинающийся с /, добавляем только API_BASE_URL
            if (userData.image.startsWith('/')) {
                const fullUrl = `${API_BASE_URL}${userData.image}`;
                console.log(`Using path with slash for ${userType}:`, fullUrl);
                return fullUrl;
            }
            
            // Иначе это имя файла - строим путь через profile_photos
            const imagePath = `${API_BASE_URL}/images/profile_photos/${userData.image}`;
            console.log(`Using profile_photos path for ${userType}:`, imagePath);
            return imagePath;
        }

        // Приоритет 2: imageExternalUrl (внешние ссылки - Google, VK, Facebook и т.д.)
        if (userData.imageExternalUrl) {
            console.log(`Using external URL for ${userType}:`, userData.imageExternalUrl);
            return userData.imageExternalUrl;
        }

        console.log(`No avatar found for ${userType}, using placeholder`);
        return null;
    };

    const transformEducation = (education: EducationApiData[], occupationsList?: { id: number; title: string }[]): Education[] => {
        const resolvedOccupations = occupationsList && occupationsList.length > 0 ? occupationsList : occupations;
        return education.map(edu => {
            let specialty = '';
            
            // Обрабатываем occupation в разных форматах
            if (edu.occupation) {
                if (typeof edu.occupation === 'string') {
                    // occupation как IRI строка "/api/occupations/4"
                    const occupationId = parseInt(edu.occupation.split('/').pop() || '0');
                    const foundOccupation = resolvedOccupations.find(occ => occ.id === occupationId);
                    specialty = foundOccupation?.title || '';
                } else if (Array.isArray(edu.occupation)) {
                    // occupation как массив объектов
                    specialty = edu.occupation.map((occ) => {
                        if (typeof occ === 'object' && occ.title) {
                            return occ.title;
                        }
                        return '';
                    }).filter(Boolean).join(', ');
                } else if (typeof edu.occupation === 'object' && edu.occupation.title) {
                    // occupation как единичный объект {id, title, image}
                    specialty = String(edu.occupation.title);
                }
            }
            
            // Дополнительная проверка: если specialty по какой-то причине объект, преобразуем его
            if (typeof specialty === 'object' && specialty !== null) {
                if ('title' in specialty) {
                    specialty = String((specialty as any).title);
                } else {
                    specialty = '';
                }
            }
            
            return {
                id: edu.id?.toString() || Date.now().toString(),
                institution: edu.uniTitle || '',
                specialty: String(specialty), // Принудительно преобразуем в строку
                startYear: edu.beginning?.toString() || '',
                endYear: edu.ending?.toString() || '',
                currentlyStudying: !edu.graduated
            };
        });
    };

    const updateUserData = async (updatedData: Partial<ProfileData>) => {
        if (!profileData?.id) return;

        try {
            const token = getAuthToken();
            if (!token) {
                navigate(ROUTES.HOME);
                return;
            }

            const apiData: Record<string, unknown> = {};

            // Обработка имени
            if (updatedData.fullName !== undefined) {
                const nameParts = updatedData.fullName.split(' ');
                apiData.surname = nameParts[0] || '';
                apiData.name = nameParts[1] || '';
                apiData.patronymic = nameParts.slice(2).join(' ') || '';
            }

            // Обработка специальности
            if (updatedData.specialty !== undefined) {
                const specialtyTitles = updatedData.specialty.split(',').map(title => title.trim());
                const occupationIris: string[] = [];

                for (const title of specialtyTitles) {
                    const occupation = occupations.find(occ => occ.title === title);
                    if (occupation) {
                        occupationIris.push(`/api/occupations/${occupation.id}`);
                    } else {
                        const similarOccupation = occupations.find(occ =>
                            occ.title.toLowerCase().includes(title.toLowerCase()) ||
                            title.toLowerCase().includes(occ.title.toLowerCase())
                        );
                        if (similarOccupation) {
                            occupationIris.push(`/api/occupations/${similarOccupation.id}`);
                        } else {
                            console.warn(`Occupation not found for title: "${title}"`);
                        }
                    }
                }

                if (occupationIris.length > 0) {
                    apiData.occupation = occupationIris;
                } else {
                    console.warn('No valid occupations found for:', updatedData.specialty);
                    apiData.occupation = [];
                }
            }

            // Обработка пола
            if (updatedData.gender !== undefined) {
                if (updatedData.gender === 'male') {
                    apiData.gender = 'gender_male';
                } else if (updatedData.gender === 'female') {
                    apiData.gender = 'gender_female';
                } else {
                    apiData.gender = 'gender_neutral';
                }
            }

            console.log('Sending update data:', apiData);
            const response = await fetch(`${API_BASE_URL}/api/users/${profileData.id}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/merge-patch+json',
                },
                body: JSON.stringify(apiData),
            });

            if (response.status === 401) {
                const refreshed = await handleUnauthorized();
                if (refreshed) {
                    // Повторяем запрос
                    updateUserData(updatedData);
                }
                return;
            }

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Update failed:', errorText);
                throw new Error(`Failed to update user data: ${response.status}`);
            }

            console.log('User data updated successfully');
            
            // Ensure specialties is always an array of strings when updating state
            const safeUpdatedData = { ...updatedData };
            if (safeUpdatedData.specialties) {
                safeUpdatedData.specialties = safeUpdatedData.specialties.map(s =>
                    typeof s === 'string' ? s : (typeof s === 'object' && s && 'title' in s ? String((s as any).title) : '')
                ).filter(Boolean);
            }
            
            setProfileData(prev => prev ? {
                ...prev,
                ...safeUpdatedData
            } : null);

        } catch (error) {
            console.error('Error updating user data:', error);
            alert(t('profile:updateError'));
        }
    };

    // Функция для нормализации всех элементов образования - преобразует occupation в IRI формат
    const normalizeEducationArray = (educationArray: EducationApiData[]): EducationApiData[] => {
        return educationArray.map(edu => {
            let occupationIri: string | undefined = undefined;
            
            if (edu.occupation) {
                if (typeof edu.occupation === 'string') {
                    // Уже IRI - оставляем как есть
                    occupationIri = edu.occupation;
                } else if (Array.isArray(edu.occupation) && edu.occupation.length > 0) {
                    // Массив объектов - берем первый элемент и преобразуем в IRI
                    occupationIri = `/api/occupations/${edu.occupation[0].id}`;
                } else if (typeof edu.occupation === 'object' && 'id' in edu.occupation) {
                    // Единичный объект - преобразуем в IRI
                    occupationIri = `/api/occupations/${edu.occupation.id}`;
                }
            }
            
            return {
                id: edu.id,
                uniTitle: edu.uniTitle,
                beginning: edu.beginning,
                ending: edu.ending,
                graduated: edu.graduated,
                ...(occupationIri && { occupation: occupationIri })
            };
        });
    };

    const updateEducation = async (educationId: string, updatedEducation: Omit<Education, 'id'>) => {
    if (!profileData?.id) return;

    try {
        const token = getAuthToken();
        if (!token) {
            // Нет токена - переходим на главную
            navigate(ROUTES.HOME);
            return;
        }

        const userResponse = await fetch(`${API_BASE_URL}/api/users/${profileData.id}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });

        if (!userResponse.ok) {
            throw new Error('Failed to fetch user data');
        }

        const userData: UserApiData = await userResponse.json();
        const currentEducation = userData.education || [];
        
        // Нормализуем ВСЕ элементы массива образования
        const normalizedEducation = normalizeEducationArray(currentEducation);

        // Находим индекс редактируемого образования
        const existingIndex = normalizedEducation.findIndex(edu =>
            edu.id?.toString() === educationId
        );

        // Подготавливаем данные для обновления/создания
        let occupationIri: string | undefined = undefined;
        if (educationForm.selectedSpecialty) {
            occupationIri = `/api/occupations/${educationForm.selectedSpecialty}`;
        }

        const parsedId = parseInt(educationId);
        const educationData: Record<string, unknown> = {
            uniTitle: updatedEducation.institution,
            beginning: parseInt(updatedEducation.startYear) || new Date().getFullYear(),
            ending: updatedEducation.currentlyStudying ? null : (parseInt(updatedEducation.endYear) || null),
            graduated: !updatedEducation.currentlyStudying,
            ...(occupationIri && { occupation: occupationIri })
        };

        // Только добавляем id если это обновление существующей записи
        if (!isNaN(parsedId)) {
            educationData.id = parsedId;
        }

        console.log('Education data to save:', educationData);

        // Обновляем или добавляем запись
        if (existingIndex >= 0) {
            normalizedEducation[existingIndex] = educationData as any;
        } else {
            normalizedEducation.push(educationData as any);
        }

        console.log('Final normalized education array to send:', normalizedEducation);

        const updateResponse = await fetch(`${API_BASE_URL}/api/users/${profileData.id}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/merge-patch+json',
            },
            body: JSON.stringify({
                education: normalizedEducation
            }),
        });

        if (updateResponse.ok) {
            const updatedUser = await updateResponse.json();
            setProfileData(prev => prev ? {
                ...prev,
                education: transformEducation(updatedUser.education || [])
            } : null);

            setEditingEducation(null);
            setEducationForm({
                institution: '',
                selectedSpecialty: undefined,
                startYear: '',
                endYear: '',
                currentlyStudying: false
            });

            console.log('Education updated successfully');
        } else {
            const errorText = await updateResponse.text();
            console.error('Failed to update education:', errorText);
            throw new Error('Failed to update education');
        }

    } catch (error) {
        console.error('Error updating education:', error);
        // Тихо обрабатываем ошибку обновления образования
    }
};

    const deleteEducation = async (educationId: string) => {
        if (!profileData?.id) return;

        try {
            const token = getAuthToken();
            if (!token) {
                navigate(ROUTES.HOME);
                return;
            }

            const userResponse = await fetch(`${API_BASE_URL}/api/users/${profileData.id}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!userResponse.ok) {
                throw new Error('Failed to fetch user data');
            }

            const userData: UserApiData = await userResponse.json();
            const currentEducation = userData.education || [];

            // Нормализуем ВСЕ элементы массива образования перед фильтрацией
            const normalizedEducation = normalizeEducationArray(currentEducation);

            // Фильтруем нормализованный массив, удаляя элемент с указанным ID
            const updatedEducationArray = normalizedEducation.filter(edu =>
                edu.id?.toString() !== educationId
            );

            console.log(`Deleting education ${educationId}. Before: ${normalizedEducation.length}, after: ${updatedEducationArray.length}`);
            console.log('Sending normalized education array:', updatedEducationArray);

            const updateResponse = await fetch(`${API_BASE_URL}/api/users/${profileData.id}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/merge-patch+json',
                },
                body: JSON.stringify({
                    education: updatedEducationArray
                }),
            });

            if (updateResponse.ok) {
                console.log('Education deleted successfully on server');
                // Не обновляем profileData здесь, т.к. это уже сделано оптимистически
            } else {
                const errorText = await updateResponse.text();
                console.error('Failed to delete education:', errorText);
                throw new Error('Failed to delete education');
            }

        } catch (error) {
            console.error('Error deleting education:', error);
            // Тихо обрабатываем ошибку без алертов
        }
    };

    const handleDeleteEducation = async (educationId: string) => {
        if (!confirm(t('profile:educationDeleteConfirm'))) {
            return;
        }

        // Получаем элемент и его индекс для возможного восстановления
        const educationToDelete = profileData?.education.find(edu => edu.id === educationId);
        const deletedIndex = profileData?.education.findIndex(edu => edu.id === educationId) ?? -1;
        
        // Оптимистическое обновление UI - сразу удаляем из списка
        setProfileData(prev => prev ? {
            ...prev,
            education: prev.education.filter(edu => edu.id !== educationId)
        } : null);

        // Отправляем запрос на сервер в фоне
        try {
            await deleteEducation(educationId);
            console.log('Образование успешно удалено с сервера');
        } catch (error) {
            console.error('Error deleting education from server:', error);
            // Восстанавливаем удаленный элемент на том же месте при ошибке
            if (educationToDelete && deletedIndex !== -1) {
                setProfileData(prev => {
                    if (!prev) return null;
                    const newEducation = [...prev.education];
                    newEducation.splice(deletedIndex, 0, educationToDelete);
                    return {
                        ...prev,
                        education: newEducation
                    };
                });
            }
        }
    };

    const handleAddEducation = () => {
        const newEducationId = `new-${Date.now()}`;
        setEditingEducation(newEducationId);
        setEducationForm({
            institution: '',
            selectedSpecialty: undefined,
            startYear: new Date().getFullYear().toString(),
            endYear: new Date().getFullYear().toString(),
            currentlyStudying: false
        });
        
        // Загружаем список специальностей, если еще не загружен
        console.log('Starting new education, checking occupations:', occupations.length);
        if (occupations.length === 0) {
            console.log('Loading occupations for new education');
            fetchOccupationsList();
        }
    };

    const handleEditStart = (field: 'fullName' | 'specialty' | 'gender') => {
        setEditingField(field);
        if (field === 'fullName') {
            setTempValue(profileData?.fullName || '');
        } else if (field === 'specialty') {
            // Инициализируем массив специальностей из готового массива или парсим строку
            // Обязательно преобразуем в строки на случай, если API вернул объекты
            let currentSpecialties: string[] = [];
            if (profileData?.specialties && profileData.specialties.length > 0) {
                currentSpecialties = profileData.specialties.map(s => 
                    typeof s === 'string' ? s : (typeof s === 'object' && s && 'title' in s ? String((s as any).title) : '')
                ).filter(Boolean);
            } else if (profileData?.specialty) {
                currentSpecialties = profileData.specialty.split(',').map(s => s.trim()).filter(Boolean);
            }
            setSelectedSpecialties(currentSpecialties);
            setTempValue('');
        } else if (field === 'gender') {
            setTempValue(profileData?.gender || '');
        }
    };

    const handleAddSpecialty = (specialty: string) => {
        if (specialty && !selectedSpecialties.includes(specialty)) {
            setSelectedSpecialties(prev => [...prev, specialty]);
        }
    };

    const handleRemoveSpecialty = (specialty: string) => {
        setSelectedSpecialties(prev => prev.filter(s => s !== specialty));
    };

    const handleSpecialtySave = async () => {
        if (selectedSpecialties.length === 0) {
            setEditingField(null);
            return;
        }

        // Ensure all specialties are strings
        const safeSpecialties = selectedSpecialties.map(s => 
            typeof s === 'string' ? s : (typeof s === 'object' && s && 'title' in s ? String((s as any).title) : '')
        ).filter(Boolean);

        const specialtyString = safeSpecialties.join(', ');
        
        // Обновляем данные в API
        await updateUserData({ 
            specialty: specialtyString,
            specialties: safeSpecialties 
        });
        
        // Обновляем локальное состояние профиля
        setProfileData(prev => prev ? {
            ...prev,
            specialty: specialtyString,
            specialties: safeSpecialties
        } : null);
        
        setEditingField(null);
        setTempValue('');
        setSelectedSpecialties([]);
    };

    const handleInputSave = async (field: 'fullName' | 'specialty' | 'gender') => {
        if (!profileData) {
            setEditingField(null);
            return;
        }

        const trimmedValue = (tempValue || '').trim();
        if (!trimmedValue && field !== 'gender') {
            setEditingField(null);
            setTempValue('');
            return;
        }

        const currentValue = field === 'fullName' ? profileData.fullName : (field === 'specialty' ? profileData.specialty : profileData.gender || '');
        if (trimmedValue !== currentValue) {
            await updateUserData({ [field]: trimmedValue } as Partial<ProfileData>);
        }

        setEditingField(null);
        setTempValue('');
    };

    const handleInputKeyPress = (e: React.KeyboardEvent, field: 'fullName' | 'specialty' | 'gender') => {
        if (e.key === 'Enter') {
            handleInputSave(field);
        } else if (e.key === 'Escape') {
            setEditingField(null);
            setTempValue('');
        }
    };

    const handleEditEducationStart = (education: Education) => {
        setEditingEducation(education.id);
        
        console.log('Starting edit for education:', education);
        console.log('Current occupations loaded:', occupations.length);
        console.log('Occupations loading state:', occupationsLoading);
        
        // Если специальности еще загружаются, попробуем найти позже
        if (occupationsLoading || occupations.length === 0) {
            console.log('Occupations not ready, initializing form without specialty selection');
            setEducationForm({
                institution: education.institution,
                selectedSpecialty: undefined,
                startYear: education.startYear,
                endYear: education.endYear,
                currentlyStudying: education.currentlyStudying
            });
            return;
        }
        
        // Находим специальность в списке occupations с более гибким поиском
        const foundOccupation = occupations.find(occ => {
            const occTitle = occ.title?.toLowerCase().trim() || '';
            const eduSpecialty = education.specialty?.toLowerCase().trim() || '';
            return occTitle === eduSpecialty;
        });
        
        console.log('Looking for specialty:', education.specialty);
        console.log('Available occupations:', occupations.map(o => ({ id: o.id, title: o.title })));
        console.log('Found occupation:', foundOccupation);
        
        setEducationForm({
            institution: education.institution,
            selectedSpecialty: foundOccupation?.id,
            startYear: education.startYear,
            endYear: education.endYear,
            currentlyStudying: education.currentlyStudying
        });
    };

    const handleEditEducationSave = async () => {
        if (!editingEducation || !educationForm.institution || !educationForm.startYear) {
            alert(t('profile:fillRequiredFields'));
            return;
        }

        // Формируем данные для сохранения (occupation обрабатывается внутри updateEducation)
        const educationToSave = {
            institution: educationForm.institution,
            specialty: '', // Больше не используется, occupation отправляется как IRI
            startYear: educationForm.startYear,
            endYear: educationForm.endYear,
            currentlyStudying: educationForm.currentlyStudying
        };

        await updateEducation(editingEducation, educationToSave);
    };

    const handleEditEducationCancel = () => {
        setEditingEducation(null);
        setEducationForm({
            institution: '',
            selectedSpecialty: undefined,
            startYear: '',
            endYear: '',
            currentlyStudying: false
        });
    };

    const handleEducationFormChange = (field: keyof Omit<Education, 'id'>, value: string | boolean) => {
        setEducationForm(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleAvatarClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !profileData?.id) return;

        if (!file.type.startsWith("image/")) {
            alert(t('profile:notImageFile'));
            return;
        }

        if (file.size > 2 * 1024 * 1024) {
            alert(t('profile:fileTooLarge'));
            return;
        }

        setIsLoading(true);

        try {
            const token = getAuthToken();
            if (!token) {
                navigate(ROUTES.HOME);
                return;
            }

            const formData = new FormData();
            formData.append("imageFile", file);

            if (profileData) {
                formData.append("email", "user@example.com");
                formData.append("name", profileData.fullName.split(' ')[1] || "");
                formData.append("surname", profileData.fullName.split(' ')[0] || "");
                formData.append("patronymic", profileData.fullName.split(' ').slice(2).join(' ') || "");
                formData.append("password", "current-password");
                formData.append("roles", "ROLE_USER");
            }

            const response = await fetch(`${API_BASE_URL}/api/users/${profileData.id}/update-photo`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`,
                },
                body: formData,
            });

            const responseText = await response.text();
            console.log('Photo upload response status:', response.status);
            console.log('Photo upload response text:', responseText);

            if (!response.ok) {
                console.error(`Ошибка при загрузке (${response.status}):`, responseText);

                if (response.status === 400) {
                    alert(t('profile:badRequest'));
                } else if (response.status === 403) {
                    alert(t('profile:forbidden'));
                } else if (response.status === 422) {
                    alert(t('profile:validationError'));
                } else {
                    alert(`${t('profile:uploadError')} (${response.status})`);
                }
                return;
            }

            let result;
            try {
                result = JSON.parse(responseText);
            } catch (e) {
                console.error('Error parsing response as JSON:', e);
                if (response.status === 201) {
                    result = { success: true };
                } else {
                    throw new Error('Invalid response format');
                }
            }

            console.log("Фото успешно загружено:", result);
            await fetchUserData();
            alert(t('profile:photoUpdated'));

        } catch (error) {
            console.error("Ошибка при загрузке фото:", error);
            alert(t('profile:photoUploadError'));
        } finally {
            setIsLoading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const handleImageError = async (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
        console.log('Image loading error, trying fallback sources');
        const img = e.currentTarget;

        if (!profileData?.id) {
            img.src = "../fonTest6.png";
            return;
        }

        const fallbackSources = [
            profileData.avatar?.includes("uploads/") ? `${API_BASE_URL}/api/${profileData.id}/profile-photo` : null,
            profileData.avatar?.includes("uploads/") ? `/uploads/avatars/${profileData.avatar.split("/").pop()}` : null,
            "../fonTest6.png"
        ].filter(Boolean) as string[];

        for (const source of fallbackSources) {
            if (source && source !== img.src) {
                try {
                    if (await checkImageExists(source)) {
                        img.src = source;
                        console.log('Fallback image loaded:', source);
                        return;
                    }
                } catch {
                    console.log('Fallback image failed:', source);
                }
            }
        }

        img.src = "../fonTest6.png";
    };

    const getReviewerAvatarUrl = (review: Review) => {
        // Приоритет 1: image (локальное изображение)
        if (review.reviewer.image) {
            // Если это полный URL (начинается с http), используем его
            if (review.reviewer.image.startsWith('http')) {
                return review.reviewer.image;
            }
            
            // Если это путь, начинающийся с /, добавляем только API_BASE_URL
            if (review.reviewer.image.startsWith('/')) {
                return `${API_BASE_URL}${review.reviewer.image}`;
            }
            
            // Иначе это имя файла - строим путь через profile_photos
            return `${API_BASE_URL}/images/profile_photos/${review.reviewer.image}`;
        }
        
        // Приоритет 2: imageExternalUrl (внешние ссылки - Google, VK, Facebook и т.д.)
        if (review.reviewer.imageExternalUrl && review.reviewer.imageExternalUrl.trim()) {
            return review.reviewer.imageExternalUrl;
        }
        
        // Приоритет 3: дефолтное изображение
        return "../default_user.png";
    };

    const calculateAverageRating = (reviews: Review[]): number => {
        if (reviews.length === 0) return 0;
        const validReviews = reviews.filter(review =>
            review.rating && review.rating > 0 && review.rating <= 5
        );

        if (validReviews.length === 0) return 0;
        const sum = validReviews.reduce((total, review) => total + review.rating, 0);
        const average = sum / validReviews.length;
        return Math.round(average * 10) / 10;
    };

    const getImageUrlWithCacheBust = (url: string): string => {
        if (!url || url === "../fonTest6.png") return url;
        const timestamp = new Date().getTime();
        const separator = url.includes('?') ? '&' : '?';
        return `${url}${separator}t=${timestamp}`;
    };

    const getMasterName = (review: Review) => {
        if (!review.user.name && !review.user.surname) {
            return t('components:app.defaultMaster');
        }
        const fullName = `${review.user.name || ''} ${review.user.surname || ''}`.trim();
        return smartNameTranslator(fullName, i18n.language as 'ru' | 'tj' | 'eng');
    };

    const getClientName = (review: Review) => {
        if (!review.reviewer.name && !review.reviewer.surname) {
            return t('components:app.defaultClient');
        }
        const fullName = `${review.reviewer.name || ''} ${review.reviewer.surname || ''}`.trim();
        return smartNameTranslator(fullName, i18n.language as 'ru' | 'tj' | 'eng');
    };

    const handleClientProfileClick = (clientId: number) => {
        console.log('Navigating to client profile:', clientId);
        navigate(ROUTES.PROFILE_BY_ID(clientId));
    };

    const handleMasterProfileClick = (masterId: number) => {
        console.log('Navigating to master profile:', masterId);
        navigate(ROUTES.PROFILE_BY_ID(masterId));
    };

    const handleServiceClick = (ticketId: number) => {
        console.log('Navigating to ticket:', ticketId);
        navigate(ROUTES.TICKET_BY_ID(ticketId));
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
        // Обновляем список отзывов
        fetchReviews();
    };

    const handleReviewError = (message: string) => {
        setModalMessage(message);
        setShowErrorModal(true);
        setTimeout(() => setShowErrorModal(false), 3000);
    };

    const handleReviewSubmitted = async (updatedCount: number) => {
        // Обновляем количество отзывов в профиле
        setProfileData(prev => prev ? {
            ...prev,
            reviews: updatedCount
        } : null);
    };

    const handleReviewButtonClick = () => {
        const token = getAuthToken();
        if (!token) {
            setAuthModalAction('review');
            setShowAuthModal(true);
            return;
        }
        setShowReviewModal(true);
    };

    const handleComplaintClick = () => {
        const token = getAuthToken();
        if (!token) {
            setAuthModalAction('complaint');
            setShowAuthModal(true);
            return;
        }
        setShowComplaintModal(true);
    };

    const handleAuthSuccess = () => {
        setShowAuthModal(false);
        // После успешной авторизации открываем нужную модалку
        if (authModalAction === 'review') {
            setShowReviewModal(true);
        } else if (authModalAction === 'complaint') {
            setShowComplaintModal(true);
        }
        setAuthModalAction(null);
    };

    // Написать сообщение (публичный профиль)
    const handleProfileChat = async () => {
        const token = getAuthToken();
        if (!token) {
            setAuthModalAction(null);
            setShowAuthModal(true);
            return;
        }
        if (!profileData?.id) return;
        const chat = await createChatWithAuthor(Number(profileData.id));
        if (chat) {
            navigate(`${ROUTES.CHATS}?chatId=${chat.id}`);
        }
    };

    // Лайк / снятие лайка (публичный профиль)
    const handleProfileLike = async () => {
        const token = getAuthToken();
        if (!token) {
            setAuthModalAction(null);
            setShowAuthModal(true);
            return;
        }
        if (!profileData?.id) return;

        setIsProfileLikeLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/favorites/me`, {
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
            });

            let favId: number | null = profileFavoriteId;
            let existingMasters: string[] = [];
            let existingClients: string[] = [];
            let existingTickets: string[] = [];

            if (res.ok) {
                const data = await res.json();
                favId = data.id ?? null;
                setProfileFavoriteId(favId);
                existingMasters = (data.masters || []).map((m: { id: number }) => `/api/users/${m.id}`);
                existingClients = (data.clients || []).map((c: { id: number }) => `/api/users/${c.id}`);
                existingTickets = (data.tickets || []).map((tk: { id: number }) => `/api/tickets/${tk.id}`);
            }

            const userIri = `/api/users/${profileData.id}`;
            // Выбираем массив в зависимости от роли просматриваемого пользователя
            const isMasterProfile = userRole === 'master';
            let updatedMasters = [...existingMasters];
            let updatedClients = [...existingClients];

            if (isProfileLiked) {
                if (isMasterProfile) updatedMasters = updatedMasters.filter(u => u !== userIri);
                else updatedClients = updatedClients.filter(u => u !== userIri);
            } else {
                if (isMasterProfile && !updatedMasters.includes(userIri)) updatedMasters.push(userIri);
                else if (!isMasterProfile && !updatedClients.includes(userIri)) updatedClients.push(userIri);
            }

            const body = { masters: updatedMasters, clients: updatedClients, tickets: existingTickets };

            if (favId) {
                await fetch(`${API_BASE_URL}/api/favorites/${favId}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/merge-patch+json', Authorization: `Bearer ${token}` },
                    body: JSON.stringify(body)
                });
            } else {
                const createRes = await fetch(`${API_BASE_URL}/api/favorites`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                    body: JSON.stringify(body)
                });
                if (createRes.ok) {
                    const created = await createRes.json();
                    setProfileFavoriteId(created.id ?? null);
                }
            }
            setIsProfileLiked(prev => !prev);
            window.dispatchEvent(new Event('favoritesUpdated'));
        } catch (error) {
            console.error('Error toggling profile like:', error);
        } finally {
            setIsProfileLikeLoading(false);
        }
    };

    if (isLoading) {
        return <PageLoader text={t('profile:loading')} />;
    }

    // Если это приватный профиль и нет currentUser - показать AuthModal
    if (!readOnly && !currentUser) {
        return (
            <AuthModal
                isOpen={true}
                onClose={() => navigate(ROUTES.HOME)}
                onLoginSuccess={() => window.location.reload()}
            />
        );
    }

    if (!profileData) {
        return <div className={styles.profileSet}>{t('profile:loadError')}</div>;
    }

    return (
        <div className={styles.profile}>
            <div className={styles.profile_wrap}>
                {!readOnly && (
                    <div className={styles.logout_section}>
                        <button className={styles.logoutBtn} onClick={handleLogout}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                            {t('header:logout')}
                        </button>
                    </div>
                )}
                {/* ProfileHeader Component */}
                <ProfileHeader
                    avatar={profileData.avatar}
                    fullName={profileData.fullName}
                    email={profileData.email}
                    gender={profileData.gender}
                    dateOfBirth={profileData.dateOfBirth}
                    specialty={profileData.specialty}
                    specialties={profileData.specialties}
                    rating={profileData.rating}
                    reviewsCount={reviews.length}
                    editingField={editingField}
                    tempValue={tempValue}
                    selectedSpecialties={selectedSpecialties}
                    occupations={occupations}
                    fileInputRef={fileInputRef}
                    specialtyInputRef={specialtyInputRef}
                    isLoading={isLoading}
                    readOnly={readOnly}
                    userRole={userRole}
                    isOnline={profileData.isOnline}
                    lastSeen={profileData.lastSeen ?? undefined}
                    onAvatarClick={handleAvatarClick}
                    onFileChange={handleFileChange}
                    onImageError={handleImageError}
                    onEditStart={handleEditStart}
                    onTempValueChange={setTempValue}
                    onInputSave={handleInputSave}
                    onInputKeyPress={handleInputKeyPress}
                    onSpecialtySave={handleSpecialtySave}
                    onEditCancel={() => {
                        setEditingField(null);
                        setTempValue('');
                        setSelectedSpecialties([]);
                    }}
                    onAddSpecialty={handleAddSpecialty}
                    onRemoveSpecialty={handleRemoveSpecialty}
                    {...(readOnly && {
                        onChat: handleProfileChat,
                        onReview: handleReviewButtonClick,
                        onLike: handleProfileLike,
                        isLiked: isProfileLiked,
                        isLikeLoading: isProfileLikeLoading,
                    })}
                />

                {/* Баннер для неавторизованных пользователей */}
                {readOnly && !getAuthToken() && (
                    <AuthBanner onLoginClick={() => setShowAuthModal(true)} />
                )}

                {/* Секция "О себе" */}
                <div className={styles.about_section}>
                    {/* EducationSection Component - только для мастеров */}
                    {userRole === 'master' && (
                        <EducationSection
                            education={profileData.education}
                            editingEducation={editingEducation}
                            educationForm={educationForm}
                            occupations={occupations}
                            occupationsLoading={occupationsLoading}
                            readOnly={readOnly}
                            onEditEducationStart={handleEditEducationStart}
                            onEditEducationSave={handleEditEducationSave}
                            onEditEducationCancel={handleEditEducationCancel}
                            onEducationFormChange={handleEducationFormChange}
                            onDeleteEducation={handleDeleteEducation}
                            onAddEducation={handleAddEducation}
                            setEducationForm={setEducationForm}
                        />
                    )}

                    {/* PhonesSection Component */}
                    <PhonesSection
                        phones={profileData.phones}
                        editingPhone={editingPhone}
                        phoneForm={phoneForm}
                        readOnly={readOnly}
                        onEditPhoneStart={handleEditPhoneStart}
                        onEditPhoneSave={handleEditPhoneSave}
                        onEditPhoneCancel={handleEditPhoneCancel}
                        setPhoneForm={setPhoneForm}
                        onDeletePhone={handleDeletePhone}
                        onAddPhone={handleAddPhone}
                        onCopyPhone={handleCopyPhone}
                    />

                    {/* SocialNetworksSection Component */}
                    <SocialNetworksSection
                        socialNetworks={socialNetworks}
                        SOCIAL_NETWORK_CONFIG={SOCIAL_NETWORK_CONFIG}
                        editingSocialNetwork={editingSocialNetwork}
                        socialNetworkEditValue={socialNetworkEditValue}
                        socialNetworkValidationError={socialNetworkValidationError}
                        showAddSocialNetwork={showAddSocialNetwork}
                        selectedNewNetwork={selectedNewNetwork}
                        availableSocialNetworks={getAvailableNetworks()}
                        readOnly={readOnly}
                        setEditingSocialNetwork={setEditingSocialNetwork}
                        setSocialNetworkEditValue={setSocialNetworkEditValue}
                        setSocialNetworkValidationError={setSocialNetworkValidationError}
                        setShowAddSocialNetwork={setShowAddSocialNetwork}
                        setSelectedNewNetwork={setSelectedNewNetwork}
                        setSocialNetworks={setSocialNetworks}
                        onUpdateSocialNetworks={updateSocialNetworks}
                        onRemoveSocialNetwork={handleRemoveSocialNetwork}
                        onAddSocialNetwork={handleAddSocialNetwork}
                        onResetSocialNetworks={handleResetSocialNetworks}
                        onCopySocialNetwork={handleCopySocialNetwork}
                        renderSocialIcon={renderSocialIcon}
                        getAvailableNetworks={getAvailableNetworks}
                    />

                    {/* WorkExamplesSection Component - только для мастеров */}
                    {userRole === 'master' && (
                        <WorkExamplesSection
                            workExamples={profileData.workExamples}
                            showAllWorkExamples={showAllWorkExamples}
                            isMobile={isMobile}
                            isGalleryOperating={isGalleryOperating}
                            galleryImages={galleryImages}
                            isGalleryOpen={isGalleryOpen}
                            galleryCurrentIndex={galleryCurrentIndex}
                            readOnly={readOnly}
                            onOpenGallery={openGallery}
                            onCloseGallery={closeGallery}
                            onGalleryNext={goToNext}
                            onGalleryPrevious={goToPrevious}
                            onSelectGalleryImage={selectImage}
                            onDeleteWorkExample={handleDeleteWorkExample}
                            onDeleteAllWorkExamples={handleDeleteAllWorkExamples}
                            onWorkExampleUpload={handleWorkExampleUpload}
                            setShowAllWorkExamples={setShowAllWorkExamples}
                            getImageUrlWithCacheBust={getImageUrlWithCacheBust}
                            API_BASE_URL={API_BASE_URL}
                        />
                    )}

                    {/* ServicesSection Component */}
                    <ServicesSection
                        services={profileData.services}
                        servicesLoading={servicesLoading}
                        readOnly={readOnly}
                        userRole={userRole}
                        API_BASE_URL={API_BASE_URL}
                    />

                    {/* WorkAreasSection Component */}
                    <WorkAreasSection
                        addresses={profileData.addresses}
                        canWorkRemotely={profileData.canWorkRemotely}
                        editingAddress={editingAddress}
                        addressForm={addressForm}
                        readOnly={readOnly}
                        userRole={userRole}
                        setAddressForm={setAddressForm}
                        onAddAddress={handleAddAddress}
                        onEditAddressStart={handleEditAddressStart}
                        onEditAddressSave={handleEditAddressSave}
                        onEditAddressCancel={handleEditAddressCancel}
                        onDeleteAddress={handleDeleteAddress}
                        onCanWorkRemotelyToggle={handleCanWorkRemotelyToggle}
                    />
                </div>

                {/* ReviewsSection Component */}
                <ReviewsSection
                    reviews={reviews}
                    reviewsLoading={reviewsLoading}
                    visibleCount={visibleCount}
                    API_BASE_URL={API_BASE_URL}
                    userRole={userRole || 'master'}
                    onShowMore={handleShowMore}
                    onShowLess={handleShowLess}
                    getReviewerAvatarUrl={getReviewerAvatarUrl}
                    getClientName={getClientName}
                    getMasterName={getMasterName}
                    onClientProfileClick={handleClientProfileClick}
                    onMasterProfileClick={handleMasterProfileClick}
                    onServiceClick={handleServiceClick}
                    getReviewImageIndex={getReviewImageIndex}
                />
            </div>

            {readOnly && (
                <div className={styles.profile_actions}>
                    <button 
                        className={styles.review_button}
                        onClick={handleReviewButtonClick}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
                        </svg>
                        {t('profile:leaveReview')}
                    </button>
                    <button 
                        className={styles.complaint_button}
                        onClick={handleComplaintClick}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 2L2 20H22L12 2ZM12 17C11.45 17 11 16.55 11 16C11 15.45 11.45 15 12 15C12.55 15 13 15.45 13 16C13 16.55 12.55 17 12 17ZM13 13H11V8H13V13Z"/>
                        </svg>
                        {t('profile:complaint')}
                    </button>
                </div>
            )}

            <ReviewModal
                isOpen={showReviewModal}
                onClose={handleCloseReviewModal}
                onSuccess={handleReviewSuccess}
                onError={handleReviewError}
                ticketId={0}
                targetUserId={profileData?.id ? parseInt(profileData.id) : 0}
                onReviewSubmitted={handleReviewSubmitted}
                showServiceSelector={true}
            />

            <ComplaintModal
                isOpen={showComplaintModal}
                onClose={handleCloseComplaintModal}
                onSuccess={handleComplaintSuccess}
                onError={handleComplaintError}
                targetUserId={profileData?.id ? parseInt(profileData.id) : 0}
            />

            <AuthModal
                isOpen={showAuthModal}
                onClose={() => setShowAuthModal(false)}
                onLoginSuccess={handleAuthSuccess}
            />

            <StatusModal
                type="success"
                isOpen={showSuccessModal}
                onClose={() => setShowSuccessModal(false)}
                message={modalMessage}
            />

            <StatusModal
                type="error"
                isOpen={showErrorModal}
                onClose={() => setShowErrorModal(false)}
                message={modalMessage}
            />

            <CookieConsentBanner/>
        </div>
    );
}

export default Profile;