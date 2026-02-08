import { useState, useRef, useEffect, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuthToken, removeAuthToken } from '../../../../utils/auth.ts';
import styles from './Master.module.scss';

import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import { fetchUserById } from "../../../../utils/api.ts";
import { PhotoGallery, usePhotoGallery } from '../../../../shared/ui/PhotoGallery';
import AddressSelector, { AddressValue, buildAddressData } from '../../../../shared/ui/AddressSelector';

// Интерфейс для социальных сетей с API
interface AvailableSocialNetwork {
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
        validate: (value: string) => /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/.test(value),
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

interface SocialNetwork {
    id: string;
    network: string;
    handle: string;
}

interface Address {
    id: string;
    displayText: string;
    addressValue: AddressValue;
}

interface Phone {
    id: string;
    number: string;
    type: 'tj' | 'international';
}

interface ProfileData {
    id: string;
    fullName: string;
    specialty: string;
    rating: number;
    reviews: number;
    avatar: string | null;
    education: Education[];
    workExamples: WorkExample[];
    workArea: string;
    addresses: Address[];
    canWorkRemotely: boolean;
    services: Service[];
    socialNetworks: SocialNetwork[];
    phones: Phone[];
}

interface Education {
    id: string;
    institution: string;
    specialty: string;
    startYear: string;
    endYear: string;
    currentlyStudying: boolean;
}

interface WorkExample {
    id: string;
    image: string;
    title: string;
}

interface Service {
    id: string;
    name: string;
    price: string;
}

interface Review {
    id: number;
    user: {
        id: number;
        email: string;
        name: string;
        surname: string;
        rating: number;
        image: string;
    };
    reviewer: {
        id: number;
        email: string;
        name: string;
        surname: string;
        rating: number;
        image: string;
    };
    rating: number;
    description: string;
    forReviewer: boolean;
    services: {
        id: number;
        title: string;
    };
    ticket?: {
        id: number;
        title: string;
        service: boolean;
        active: boolean;
        author?: {
            id: number;
            email: string;
            name: string;
            surname: string;
        };
        master?: {
            id: number;
            email: string;
            name: string;
            surname: string;
        };
    };
    images: {
        id: number;
        image: string;
    }[];
    vacation?: string;
    worker?: string;
    date?: string;
}

interface ReviewData {
    type: string;
    rating: number;
    description: string;
    ticket?: string;
    images?: Array<{ image: string }>;
    master: string;
    client: string;
}

interface UserApiData {
    id: number;
    email?: string;
    name?: string;
    surname?: string;
    patronymic?: string;
    rating?: number;
    image?: string;
    atHome?: boolean;
    occupation?: OccupationApiData[];
    education?: EducationApiData[];
    districts?: DistrictApiData[];
    addresses?: UserAddressApiData[];
    socialNetworks?: Array<{
        id?: number;
        network?: string;
        handle?: string;
        [key: string]: unknown;
    }>;
    [key: string]: unknown;
}

interface UserAddressApiData {
    id: number;
    suburb?: string | { id?: number; title: string };
    district?: string | { id?: number; title: string };
    city?: string | { id?: number; title: string };
    province?: string | { id?: number; title: string };
    settlement?: string | { id?: number; title: string };
    community?: string | { id?: number; title: string };
    village?: string | { id?: number; title: string };
    [key: string]: unknown;
}

interface OccupationApiData {
    id: number;
    title: string;
    [key: string]: unknown;
}

interface EducationApiData {
    id: number;
    uniTitle?: string;
    beginning?: number;
    ending?: number;
    graduated?: boolean;
    occupation?: string | OccupationApiData | OccupationApiData[]; // может быть IRI строкой, объектом или массивом
    [key: string]: unknown;
}

interface DistrictApiData {
    id: number;
    title?: string;
    city?: {
        id: number;
        title?: string;
        [key: string]: unknown;
    };
    [key: string]: unknown;
}

interface ReviewApiData {
    id: number;
    master?: { id: number };
    client?: { id: number };
    rating?: number;
    description?: string;
    forClient?: boolean;
    services?: { id: number; title: string };
    ticket?: {
        id: number;
        title: string;
        service: boolean;
        active: boolean;
        author?: {
            id: number;
            email: string;
            name: string;
            surname: string;
        };
        master?: {
            id: number;
            email: string;
            name: string;
            surname: string;
        };
    };
    images?: Array<{ id: number; image: string }>;
    createdAt?: string;
    [key: string]: unknown;
}

interface GalleryApiData {
    id: number;
    images?: GalleryImageApiData[];
    [key: string]: unknown;
}

interface GalleryImageApiData {
    id: number;
    image: string;
    [key: string]: unknown;
}

interface ApiResponse<T> {
    [key: string]: unknown;
    'hydra:member'?: T[];
}

interface Occupation {
    id: number;
    title: string;
    description?: string;
}

function Master() {
    const navigate = useNavigate();
    const [editingField, setEditingField] = useState<'fullName' | 'specialty' | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [profileData, setProfileData] = useState<ProfileData | null>(null);
    const [tempValue, setTempValue] = useState('');
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
    const [visibleCount, setVisibleCount] = useState(2);
    const [swiperKey, setSwiperKey] = useState(0);
    const [expandedReviews, setExpandedReviews] = useState<Set<number>>(new Set());
    const [showAllWorkExamples, setShowAllWorkExamples] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [showReviewModal, setShowReviewModal] = useState(false);
    const [reviewText, setReviewText] = useState('');
    const [selectedStars, setSelectedStars] = useState(0);
    const [reviewPhotos, setReviewPhotos] = useState<File[]>([]);
    const [isSubmittingReview, setIsSubmittingReview] = useState(false);
    const [occupations, setOccupations] = useState<Occupation[]>([]);
    const [occupationsLoading, setOccupationsLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const workExampleInputRef = useRef<HTMLInputElement>(null);
    const reviewPhotoInputRef = useRef<HTMLInputElement>(null);
    const specialtyInputRef = useRef<HTMLSelectElement>(null);
    const [editingSocialNetwork, setEditingSocialNetwork] = useState<string | null>(null);
    const [socialNetworks, setSocialNetworks] = useState<SocialNetwork[]>([]);
    const [socialNetworkEditValue, setSocialNetworkEditValue] = useState('');
    const [showAddSocialNetwork, setShowAddSocialNetwork] = useState(false);
    const [selectedNewNetwork, setSelectedNewNetwork] = useState('');
    const [availableSocialNetworks, setAvailableSocialNetworks] = useState<AvailableSocialNetwork[]>([]);
    const [socialNetworkValidationError, setSocialNetworkValidationError] = useState('');
    const [isGalleryOperating, setIsGalleryOperating] = useState(false);
    
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

    // PhotoGallery hook для отзывов
    const reviewGalleryImages = reviews.flatMap(review => 
        review.images?.map(img => `${API_BASE_URL}/images/review_photos/${img.image}`) || []
    );
    const {
        isOpen: isReviewGalleryOpen,
        currentIndex: reviewGalleryCurrentIndex,
        openGallery: openReviewGallery,
        closeGallery: closeReviewGallery,
        goToNext: goToNextReview,
        goToPrevious: goToPreviousReview,
        selectImage: selectReviewImage
    } = usePhotoGallery({
        images: reviewGalleryImages
    });

    // Вспомогательная функция для получения индекса фото в галерее отзывов
    const getReviewImageIndex = (reviewIndex: number, imageIndex: number): number => {
        let totalIndex = 0;
        for (let i = 0; i < reviewIndex; i++) {
            totalIndex += reviews[i].images?.length || 0;
        }
        return totalIndex + imageIndex;
    };

    // Функция для переключения развернутого состояния отзыва
    const toggleReviewExpanded = (reviewId: number) => {
        setExpandedReviews(prev => {
            const newSet = new Set(prev);
            if (newSet.has(reviewId)) {
                newSet.delete(reviewId);
            } else {
                newSet.add(reviewId);
            }
            return newSet;
        });
    };

    // Функция для отображения текста отзыва
    const renderReviewText = (review: Review) => {
        const MAX_LENGTH = 200;
        const text = review.description.replace(/<[^>]*>/g, '');
        const isExpanded = expandedReviews.has(review.id);
        
        if (text.length <= MAX_LENGTH) {
            return <div className={styles.review_text}>{text}</div>;
        }

        return (
            <div>
                <div className={styles.review_text}>
                    {isExpanded ? text : `${text.substring(0, MAX_LENGTH)}...`}
                </div>
                <button 
                    className={styles.review_more}
                    onClick={() => toggleReviewExpanded(review.id)}
                >
                    {isExpanded ? 'Скрыть' : 'Показать подробнее'}
                </button>
            </div>
        );
    };

    // Функция загрузки доступных социальных сетей
    const fetchAvailableSocialNetworks = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/users/social-networks`);
            
            if (response.ok) {
                const data: AvailableSocialNetwork[] = await response.json();
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

        const newNetwork: SocialNetwork = {
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
        const addedNetworks = socialNetworks.map((sn: SocialNetwork) => sn.network);
        return availableSocialNetworks.filter((an: AvailableSocialNetwork) => !addedNetworks.includes(an.network));
    };

    // Получить конфигурацию социальной сети
    const getSocialNetworkConfig = (networkType: string) => {
        return availableSocialNetworks.find((an: AvailableSocialNetwork) => an.network === networkType);
    };

    // Рендер иконки социальной сети
    const renderSocialIcon = (networkType: string) => {
        const config = getSocialNetworkConfig(networkType);
        if (!config) return <span>🌐</span>;

        switch (networkType) {
            case 'telegram':
                return <img src="./telegram.png" alt="tg" width="25"/>;
            case 'instagram':
                return (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="#E4405F">
                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                    </svg>
                );
            case 'whatsapp':
                return <img src="./whatsapp-icon-free-png.png" alt="whatsapp" width="25"/>;
            default:
                return <span style={{ fontSize: '20px' }}>{SOCIAL_NETWORK_CONFIG[networkType]?.icon || '🌐'}</span>;
        }
    };

    useEffect(() => {
        const token = getAuthToken();
        if (!token) {
            console.log('No JWT token found, redirecting to login');
            navigate('/');
            return;
        }
        console.log('=== LOADING PROFILE PAGE ===');
        console.log('Token present, loading user data and occupations');
        fetchUserData();
        fetchOccupationsList();
        fetchAvailableSocialNetworks(); // Загружаем доступные социальные сети
    }, [navigate]);

    useEffect(() => {
        if (profileData?.id) {
            console.log('Profile loaded, fetching gallery, reviews, and occupations');
            fetchUserGallery();
            fetchReviews();
            fetchOccupationsList(); // Загружаем специальности сразу при загрузке профиля
        }
    }, [profileData?.id]);

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

    // Обновляем ключ Swiper при изменении visibleCount для принудительной перерисовки
    useEffect(() => {
        setSwiperKey(prev => prev + 1);
    }, [visibleCount]);

    const updateSocialNetworks = async (updatedNetworks: SocialNetwork[]) => {
        if (!profileData?.id) {
            console.error('No profile ID available');
            return false;
        }

        try {
            const token = getAuthToken();
            if (!token) {
                navigate('/login');
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
        if (!confirm('Вы уверены, что хотите удалить все социальные сети?')) {
            return;
        }

        // Очищаем все социальные сети
        const emptyNetworks: SocialNetwork[] = [];

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

    const handleEditAddressStart = (address: Address) => {
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
            alert('Пожалуйста, выберите область');
            return;
        }

        // Проверяем, что выбран город или район
        if (!addressForm.cityId && addressForm.districtIds.length === 0) {
            alert('Пожалуйста, выберите город или район');
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
                alert('Не удалось сформировать данные адреса');
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
                    const loadedAddresses: Address[] = [];
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
                alert('Ошибка при сохранении адреса');
            }

        } catch (error) {
            console.error('Error saving address:', error);
            alert('Ошибка при сохранении адреса');
        }
    };

    const handleDeleteAddress = async (addressId: string) => {
        if (!profileData?.id) return;

        if (!confirm('Вы уверены, что хотите удалить этот адрес?')) {
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
                alert('Ошибка при удалении адреса');
            }

        } catch (error) {
            console.error('Error deleting address:', error);
            alert('Ошибка при удалении адреса');
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

    const handleEditPhoneStart = (phone: Phone) => {
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

            let updatedPhones: Phone[];
            
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

        if (!confirm('Вы уверены, что хотите удалить этот телефон?')) {
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
            const token = getAuthToken();
            if (!token) {
                console.warn('No auth token available for occupations API');
                setOccupationsLoading(false);
                return;
            }

            const locale = localStorage.getItem('i18nextLng') || 'ru';
            const apiUrl = `${API_BASE_URL}/api/occupations?locale=${locale}`;
            console.log('Fetching occupations from:', apiUrl);
            
            const response = await fetch(apiUrl, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
            });

            console.log('Occupations API response status:', response.status);
            
            if (response.ok) {
                const data = await response.json();
                console.log('Occupations loaded:', Array.isArray(data) ? data.length : typeof data);
                if (data && typeof data === 'object' && !Array.isArray(data)) {
                    console.log('Object keys:', Object.keys(data));
                }
                
                let occupationsArray: Occupation[] = [];

                if (Array.isArray(data)) {
                    occupationsArray = data;
                } else if (data && typeof data === 'object') {
                    const apiResponse = data as ApiResponse<Occupation>;
                    if (apiResponse['hydra:member'] && Array.isArray(apiResponse['hydra:member'])) {
                        occupationsArray = apiResponse['hydra:member'];
                    } else if ((data as Occupation).id) {
                        occupationsArray = [data as Occupation];
                    }
                }

                console.log('Transformed occupations array:', occupationsArray);
                console.log('Occupations count:', occupationsArray.length);
                
                // Проверяем, что у нас есть валидные данные
                const validOccupations = occupationsArray.filter(occ => occ && occ.id && occ.title);
                console.log('Valid occupations count:', validOccupations.length);
                console.log('Valid occupations sample:', validOccupations.slice(0, 3));
                
                setOccupations(validOccupations);
            } else {
                console.error('Failed to fetch occupations. Status:', response.status, 'Status Text:', response.statusText);
                setOccupations([]);
            }
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
            if (!token) {
                navigate('/login');
                return;
            }

            const response = await fetch(`${API_BASE_URL}/api/users/me`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
            });

            if (response.status === 401) {
                console.log('Token is invalid or expired');
                removeAuthToken();
                window.dispatchEvent(new Event('logout'));
                navigate('/');
                return;
            }

            if (!response.ok) {
                throw new Error(`Failed to fetch user data: ${response.status} ${response.statusText}`);
            }

            const userData: UserApiData = await response.json();
            console.log('User data received:', userData);
            console.log('User addresses:', userData.addresses);

            const avatarUrl = await getAvatarUrl(userData);
            let workArea = '';

            // Получаем все адреса пользователя
            const userAddresses = userData.addresses as UserAddressApiData[] | undefined;

            if (userAddresses && Array.isArray(userAddresses)) {
                console.log('Processing addresses for work area...');
                console.log('Total addresses found:', userAddresses.length);

                const addressStrings: string[] = [];

                for (let i = 0; i < userAddresses.length; i++) {
                    const address = userAddresses[i];
                    console.log(`Processing address ${i + 1}:`, address);

                    try {
                        const addressText = await getFullAddressText(address);
                        if (addressText && addressText.trim()) {
                            console.log(`Address ${i + 1} text: "${addressText}"`);
                            addressStrings.push(addressText);
                        } else {
                            console.log(`Address ${i + 1} returned empty text`);
                        }
                    } catch (error) {
                        console.error(`Error processing address ${i + 1}:`, error);
                    }
                }

                console.log('All address strings:', addressStrings);

                if (addressStrings.length > 0) {
                    // Убираем дубликаты и объединяем через запятую
                    const uniqueAddresses = [...new Set(addressStrings)];
                    workArea = uniqueAddresses.join(', ');
                    console.log('Final work area:', workArea);
                } else {
                    console.log('No valid addresses found');
                }
            } else {
                console.log('No addresses found in user data');
            }

            console.log('Final work area:', workArea);

            // Создаем пустой массив социальных сетей - показываем только те, что есть в API
            const loadedSocialNetworks: SocialNetwork[] = [];

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

            // Преобразуем адреса в нужный формат
            const loadedAddresses: Address[] = [];
            if (userAddresses && Array.isArray(userAddresses)) {
                for (let i = 0; i < userAddresses.length; i++) {
                    const addr = userAddresses[i];
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
            }

            // Преобразуем телефоны из phone1 и phone2
            const loadedPhones: Phone[] = [];
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

            const transformedData: ProfileData = {
                id: userData.id.toString(),
                fullName: [userData.surname, userData.name, userData.patronymic]
                    .filter(Boolean)
                    .join(' ') || 'Фамилия Имя Отчество',
                specialty: userData.occupation?.map((occ) => occ.title).join(', ') || 'Специальность',
                rating: userData.rating || 0,
                reviews: 0,
                avatar: avatarUrl,
                education: transformEducation(userData.education || []),
                workExamples: [],
                workArea: workArea,
                addresses: loadedAddresses,
                canWorkRemotely: userData.atHome || false,
                services: [],
                socialNetworks: loadedSocialNetworks,
                phones: loadedPhones
            };

            setProfileData(transformedData);

        } catch (error) {
            console.error('Error fetching user data:', error);
            // При ошибке устанавливаем пустой массив социальных сетей
            setSocialNetworks([]);
            setProfileData({
                id: '',
                fullName: 'Фамилия Имя Отчество',
                specialty: 'Специальность',
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

    const updateUserRating = async (rating: number) => {
        if (!profileData?.id) return;

        try {
            const token = getAuthToken();
            if (!token) {
                console.log('No token available for updating rating');
                return;
            }

            console.log(`Updating user rating to: ${rating}`);
            const response = await fetch(`${API_BASE_URL}/api/users/${profileData.id}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/merge-patch+json',
                },
                body: JSON.stringify({
                    rating: rating
                }),
            });

            if (response.status === 401) {
                removeAuthToken();
                window.dispatchEvent(new Event('logout'));
                navigate('/login');
                return;
            }

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Rating update failed:', errorText);
                throw new Error(`Failed to update rating: ${response.status}`);
            }

            console.log('User rating updated successfully');

        } catch (error) {
            console.error('Error updating user rating:', error);
        }
    };

    const getUserInfo = async (userId: number, userType: 'master' | 'client'): Promise<{
        id: number;
        email: string;
        name: string;
        surname: string;
        rating: number;
        image: string;
    }> => {
        console.log(`Getting user info for ${userType} ID:`, userId);

        if (!userId) {
            console.log('No user ID provided');
            return {
                id: 0,
                email: '',
                name: userType === 'master' ? 'Мастер' : 'Клиент',
                surname: '',
                rating: 0,
                image: ''
            };
        }

        try {
            const userData = await fetchUserById(userId);
            if (userData) {
                const avatarUrl = await getAvatarUrl(userData, userType);
                const userInfo = {
                    id: userData.id,
                    email: userData.email || '',
                    name: userData.name || '',
                    surname: userData.surname || '',
                    rating: typeof userData.rating === 'number' ? userData.rating : 0,
                    image: avatarUrl || ''
                };
                console.log(`User info for ${userType}:`, userInfo);
                return userInfo;
            }
        } catch (error) {
            console.error(`Error fetching user info for ${userType} ID ${userId}:`, error);
        }

        console.log(`Using fallback for ${userType} ID:`, userId);
        return {
            id: userId,
            email: '',
            name: userType === 'master' ? 'Мастер' : 'Клиент',
            surname: '',
            rating: 0,
            image: ''
        };
    };

    const fetchReviews = async () => {
        try {
            setReviewsLoading(true);
            const token = getAuthToken();
            if (!token) {
                console.log('No token available for fetching reviews');
                return;
            }

            if (!profileData?.id) {
                console.log('No profile data ID available');
                return;
            }

            console.log('Fetching reviews for master ID:', profileData.id);
            const endpoint = `/api/reviews?exists[master]=true&master=${profileData.id}`;
            console.log(`Trying endpoint: ${endpoint}`);

            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
            });

            console.log(`Response status: ${response.status}`);
            console.log(`Response ok: ${response.ok}`);

            if (response.status === 401) {
                console.log('Unauthorized, redirecting to login');
                removeAuthToken();
                window.dispatchEvent(new Event('logout'));
                navigate('/login');
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
                const masterReviews = reviewsArray.filter(review => {
                    const reviewMasterId = review.master?.id;
                    const isForCurrentMaster = reviewMasterId?.toString() === profileData.id;
                    console.log(`Review ${review.id}: master ID ${reviewMasterId}, is for current master: ${isForCurrentMaster}`);
                    return isForCurrentMaster;
                });

                console.log(`Found ${masterReviews.length} reviews for master ${profileData.id}`);
                const transformedReviews = await Promise.all(
                    masterReviews.map(async (review) => {
                        console.log('Processing review:', review);
                        const masterId = review.master?.id;
                        const clientId = review.client?.id;
                        console.log('Master ID from review:', masterId);
                        console.log('Client ID from review:', clientId);

                        const [masterData, clientData] = await Promise.all([
                            masterId ? getUserInfo(masterId, 'master') : Promise.resolve(null),
                            clientId ? getUserInfo(clientId, 'client') : Promise.resolve(null)
                        ]);

                        console.log('Master data:', masterData);
                        console.log('Client data:', clientData);

                        const getFullNameParts = (fullName: string) => {
                            if (!fullName || typeof fullName !== 'string') {
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

                        const serviceTitle = review.ticket?.title || review.services?.title || 'Услуга';
                        console.log(`Review ${review.id} has service title: ${serviceTitle}`);

                        const transformedReview: Review = {
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
                            user: user,
                            reviewer: reviewer,
                            vacation: serviceTitle,
                            worker: clientData ?
                                `${clientData.name || 'Клиент'} ${clientData.surname || ''}`.trim() :
                                'Клиент',
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

                const userReviews = transformedReviews.filter(r => r.user.id === parseInt(profileData.id));
                const newRating = calculateAverageRating(userReviews);

                console.log('User reviews for rating calculation:', userReviews);
                console.log('Calculated new rating from', userReviews.length, 'reviews:', newRating);

                setProfileData(prev => prev ? {
                    ...prev,
                    reviews: userReviews.length,
                    rating: newRating
                } : null);

                if (userReviews.length > 0) {
                    await updateUserRating(newRating);
                }

            } else {
                console.log('No reviews data found for this master');
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

    const handleWorkExampleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files || files.length === 0) return;

        setIsGalleryOperating(true);

        try {
            const token = getAuthToken();
            if (!token) {
                navigate("/");
                return;
            }

            console.log('Starting batch photo upload...');
            let galleryId = await getUserGalleryId(token);

            if (!galleryId) {
                console.log('No gallery found, trying to create new one...');
                galleryId = await findExistingGallery(token, await getCurrentUserId(token) || 0);

                if (!galleryId) {
                    console.log('Creating new gallery...');
                    galleryId = await createUserGallery(token);

                    if (!galleryId) {
                        console.log('Could not create gallery, trying alternative approach...');
                        await uploadPhotosWithoutGallery(files, token);
                        return;
                    }
                }
            }

            console.log('Using gallery ID:', galleryId);

            // Валидация файлов и создание FormData для batch-загрузки
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

                // Добавляем файл в FormData как массив
                formData.append("imageFile[]", file);
                validFiles.push(file);
            }

            if (validFiles.length === 0) {
                alert("Нет валидных файлов для загрузки");
                setIsGalleryOperating(false);
                return;
            }

            console.log(`Uploading ${validFiles.length} photos in batch to gallery ${galleryId}`);

            // Отправляем один запрос со всеми файлами
            const response = await fetch(`${API_BASE_URL}/api/galleries/${galleryId}/upload-photo`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`,
                },
                body: formData,
            });

            const responseText = await response.text();
            console.log(`Batch upload response:`, response.status, responseText);

            if (!response.ok) {
                if (response.status === 404) {
                    console.log(`Gallery ${galleryId} not found, trying to create new one...`);
                    const newGalleryId = await createUserGallery(token);
                    if (newGalleryId) {
                        const retryResponse = await fetch(`${API_BASE_URL}/api/galleries/${newGalleryId}/upload-photo`, {
                            method: "POST",
                            headers: {
                                "Authorization": `Bearer ${token}`,
                            },
                            body: formData,
                        });

                        if (retryResponse.ok) {
                            await fetchUserGallery();
                            alert(`${validFiles.length} фото успешно добавлены в портфолио!`);
                            return;
                        }
                    }
                }

                console.error(`Ошибка при batch-загрузке:`, responseText);
                alert("Не удалось загрузить фото. Попробуйте еще раз.");
                return;
            }

            // Обновляем галерею только для блока с примерами работ
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

    const uploadPhotosWithoutGallery = async (files: FileList, token: string) => {
        try {
            console.log('Trying to upload photos without gallery...');
            console.log('Files count:', files.length);
            console.log('Token available:', !!token);
            alert('В данный момент загрузка фото временно недоступна. Пожалуйста, попробуйте позже или обратитесь в поддержку.');
            return [];

        } catch (error) {
            console.error('Error uploading without gallery:', error);
            alert('Ошибка при загрузке фото');
            throw error;
        }
    };

    const getUserGallery = async (token: string): Promise<GalleryApiData | null> => {
        try {
            console.log('Fetching user gallery...');
            const response = await fetch(`${API_BASE_URL}/api/galleries/me`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
            });

            console.log('Gallery /me response status:', response.status);

            if (response.ok) {
                const galleriesData = await response.json();
                console.log('Galleries data from /me:', galleriesData);
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
                    console.log('Found gallery via /me:', galleryArray[0]);
                    return galleryArray[0];
                }
            }

            console.log('Trying to find gallery via /api/galleries with user filter...');
            const currentUserId = await getCurrentUserId(token);
            if (!currentUserId) {
                console.log('Cannot get current user ID');
                return null;
            }

            const filterResponse = await fetch(`${API_BASE_URL}/api/galleries?user=${currentUserId}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
            });

            console.log('Filter response status:', filterResponse.status);

            if (filterResponse.ok) {
                const filterData = await filterResponse.json();
                console.log('Galleries with user filter:', filterData);
                let filteredArray: GalleryApiData[] = [];

                if (Array.isArray(filterData)) {
                    filteredArray = filterData;
                } else if (filterData && typeof filterData === 'object') {
                    const apiResponse = filterData as ApiResponse<GalleryApiData>;
                    if (apiResponse['hydra:member'] && Array.isArray(apiResponse['hydra:member'])) {
                        filteredArray = apiResponse['hydra:member'];
                    } else if ((filterData as GalleryApiData).id) {
                        filteredArray = [filterData as GalleryApiData];
                    }
                }

                if (filteredArray.length > 0) {
                    console.log('Found gallery via user filter:', filteredArray[0]);
                    return filteredArray[0];
                }
            }

            console.log('Trying to find gallery via all galleries...');
            const allGalleriesResponse = await fetch(`${API_BASE_URL}/api/galleries`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
            });

            if (allGalleriesResponse.ok) {
                const allGalleriesData = await allGalleriesResponse.json();
                console.log('All galleries data:', allGalleriesData);
                let allGalleryArray: GalleryApiData[] = [];

                if (Array.isArray(allGalleriesData)) {
                    allGalleryArray = allGalleriesData;
                } else if (allGalleriesData && typeof allGalleriesData === 'object') {
                    const apiResponse = allGalleriesData as ApiResponse<GalleryApiData>;
                    if (apiResponse['hydra:member'] && Array.isArray(apiResponse['hydra:member'])) {
                        allGalleryArray = apiResponse['hydra:member'];
                    } else if ((allGalleriesData as GalleryApiData).id) {
                        allGalleryArray = [allGalleriesData as GalleryApiData];
                    }
                }

                if (allGalleryArray.length > 0) {
                    const userGallery = allGalleryArray.find(gallery => {
                        if (gallery.user && typeof gallery.user === 'object' && 'id' in gallery.user) {
                            return gallery.user.id === currentUserId;
                        }
                        return false;
                    });

                    if (userGallery) {
                        console.log('Found user gallery in all galleries:', userGallery);
                        return userGallery;
                    }
                }
            }

            console.log('No gallery found for user');
            return null;
        } catch (error) {
            console.error('Error getting user gallery:', error);
            return null;
        }
    };

    const getUserGalleryId = async (token: string): Promise<number | null> => {
        try {
            const gallery = await getUserGallery(token);
            if (gallery && gallery.id) {
                console.log('Gallery ID found:', gallery.id);
                return gallery.id;
            }
            return null;
        } catch (error) {
            console.error('Error getting user gallery ID:', error);
            return null;
        }
    };

    const handleDeleteWorkExample = async (workExampleId: string) => {
        console.log('Delete triggered for ID:', workExampleId);

        if (!profileData?.id) return;

        if (!confirm('Вы уверены, что хотите удалить это фото из портфолио?')) {
            return;
        }

        setIsGalleryOperating(true);

        try {
            const token = getAuthToken();
            if (!token) {
                navigate("/");
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

        if (!confirm('Вы уверены, что хотите удалить все фото из портфолио?')) {
            return;
        }

        setIsGalleryOperating(true);

        try {
            const token = getAuthToken();
            if (!token) {
                navigate("/");
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

    const testGalleryAPI = async (token: string) => {
        try {
            console.log('Testing Gallery API...');
            const response = await fetch(`${API_BASE_URL}/api/galleries/me`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (response.ok) {
                const data = await response.json();
                console.log('Gallery /me response:', data);
                return data;
            } else {
                console.error('Failed to get galleries:', response.status);
            }
        } catch (error) {
            console.error('Error testing API:', error);
        }
        return null;
    };

    const getCurrentUserId = async (token: string): Promise<number | null> => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/users/me`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (response.ok) {
                const userData: UserApiData = await response.json();
                console.log('Current user data:', userData);
                return userData.id;
            }
            return null;
        } catch (error) {
            console.error('Error getting current user ID:', error);
            return null;
        }
    };

    const createUserGallery = async (token: string): Promise<number | null> => {
        try {
            console.log('Creating new gallery...');
            const currentUserId = await getCurrentUserId(token);
            if (!currentUserId) {
                alert('Не удалось определить ID пользователя');
                return null;
            }

            console.log('Creating gallery for user ID:', currentUserId);
            const requestBody = {
                images: []
            };

            console.log('Creating gallery with data:', requestBody);

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
            console.log('Create gallery response status:', response.status);
            console.log('Create gallery response text:', responseText);

            if (response.ok) {
                let galleryData: GalleryApiData;
                try {
                    galleryData = JSON.parse(responseText);
                    console.log('Gallery created successfully:', galleryData);
                    return galleryData.id;
                } catch (e) {
                    console.error('Error parsing gallery response:', e);
                    return await findExistingGallery(token, currentUserId);
                }
            } else if (response.status === 422) {
                console.log('Validation error, gallery might already exist');
                return await findExistingGallery(token, currentUserId);
            } else {
                console.error('Failed to create gallery:', responseText);
                console.log('Trying to find existing gallery instead...');
                return await findExistingGallery(token, currentUserId);
            }
        } catch (error) {
            console.error('Error creating gallery:', error);
            alert("Ошибка при создании галереи. Попробуйте загрузить фото позже.");
            return null;
        }
    };

    const findExistingGallery = async (token: string, userId: number): Promise<number | null> => {
        try {
            console.log('Searching for existing gallery for user:', userId);
            const response = await fetch(`${API_BASE_URL}/api/galleries/me`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json',
                },
            });

            if (response.ok) {
                const galleriesData = await response.json();
                console.log('Galleries from /me:', galleriesData);
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
                    const gallery = galleryArray[0];
                    console.log('Found existing gallery:', gallery);
                    return gallery.id;
                }
            }

            const directResponse = await fetch(`${API_BASE_URL}/api/galleries?user=${userId}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json',
                },
            });

            if (directResponse.ok) {
                const directData = await directResponse.json();
                console.log('Galleries from direct query:', directData);
                let directArray: GalleryApiData[] = [];

                if (Array.isArray(directData)) {
                    directArray = directData;
                } else if (directData && typeof directData === 'object') {
                    const apiResponse = directData as ApiResponse<GalleryApiData>;
                    if (apiResponse['hydra:member'] && Array.isArray(apiResponse['hydra:member'])) {
                        directArray = apiResponse['hydra:member'];
                    } else if ((directData as GalleryApiData).id) {
                        directArray = [directData as GalleryApiData];
                    }
                }

                if (directArray.length > 0) {
                    const gallery = directArray[0];
                    console.log('Found existing gallery via direct query:', gallery);
                    return gallery.id;
                }
            }

            console.log('No existing gallery found');
            return null;
        } catch (error) {
            console.error('Error finding existing gallery:', error);
            return null;
        }
    };

    const getImageUrl = (imagePath: string): string => {
        if (!imagePath) return "../fonTest6.png";
        if (imagePath.startsWith("http")) return imagePath;
        if (imagePath.startsWith("/")) return `${API_BASE_URL}${imagePath}`;
        const galleryPhotoUrl = `${API_BASE_URL}/images/gallery_photos/${imagePath}`;
        return galleryPhotoUrl;
    };

    const fetchUserGallery = async () => {
        try {
            console.log('Fetching user gallery...');
            const token = getAuthToken();
            if (!token) return;

            await testGalleryAPI(token);
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
        console.log(`${userType} image data:`, userData.image);

        if (userData.image) {
            const serverUrl = `${API_BASE_URL}/images/profile_photos/${userData.image}`;
            console.log(`Checking server avatar for ${userType}:`, serverUrl);

            if (await checkImageExists(serverUrl)) {
                console.log(`Using server avatar for ${userType}`);
                return serverUrl;
            }

            const alternativeUrl = `${API_BASE_URL}/${userData.image}`;
            console.log(`Checking alternative avatar URL for ${userType}:`, alternativeUrl);

            if (await checkImageExists(alternativeUrl)) {
                console.log(`Using alternative avatar URL for ${userType}`);
                return alternativeUrl;
            }

            if (userType === 'client') {
                const clientPaths = [
                    `${API_BASE_URL}/uploads/profile_photos/${userData.image}`,
                    `${API_BASE_URL}/uploads/clients/${userData.image}`,
                    `${API_BASE_URL}/images/clients/${userData.image}`
                ];

                for (const path of clientPaths) {
                    console.log(`Checking client avatar path:`, path);
                    if (await checkImageExists(path)) {
                        console.log(`Using client avatar from:`, path);
                        return path;
                    }
                }
            }
        }

        console.log(`No avatar found for ${userType}, using placeholder`);
        return null;
    };

    const transformEducation = (education: EducationApiData[]): Education[] => {
        return education.map(edu => {
            let specialty = '';
            
            // Обрабатываем occupation в разных форматах
            if (edu.occupation) {
                if (typeof edu.occupation === 'string') {
                    // occupation как IRI строка "/api/occupations/4"
                    const occupationId = parseInt(edu.occupation.split('/').pop() || '0');
                    const foundOccupation = occupations.find(occ => occ.id === occupationId);
                    specialty = foundOccupation?.title || '';
                } else if (Array.isArray(edu.occupation)) {
                    // occupation как массив объектов
                    specialty = edu.occupation.map((occ) => occ.title).join(', ');
                } else if (typeof edu.occupation === 'object' && edu.occupation.title) {
                    // occupation как единичный объект {id, title, image}
                    specialty = edu.occupation.title;
                }
            }
            
            return {
                id: edu.id?.toString() || Date.now().toString(),
                institution: edu.uniTitle || '',
                specialty: specialty,
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
                navigate('/login');
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
                removeAuthToken();
                window.dispatchEvent(new Event('logout'));
                navigate('/login');
                return;
            }

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Update failed:', errorText);
                throw new Error(`Failed to update user data: ${response.status}`);
            }

            console.log('User data updated successfully');
            setProfileData(prev => prev ? {
                ...prev,
                ...updatedData
            } : null);

        } catch (error) {
            console.error('Error updating user data:', error);
            alert('Ошибка при обновлении данных');
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
            navigate('/login');
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
                navigate('/login');
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
        if (!confirm('Вы уверены, что хотите удалить это образование?')) {
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

    const handleEditStart = (field: 'fullName' | 'specialty') => {
        setEditingField(field);
        setTempValue(field === 'fullName' ? profileData?.fullName || '' : profileData?.specialty || '');
    };

    const handleInputSave = async (field: 'fullName' | 'specialty') => {
        if (!profileData || !tempValue.trim()) {
            setEditingField(null);
            return;
        }

        const trimmedValue = tempValue.trim();
        if (trimmedValue !== (field === 'fullName' ? profileData.fullName : profileData.specialty)) {
            await updateUserData({ [field]: trimmedValue });
        }

        setEditingField(null);
        setTempValue('');
    };

    const handleInputKeyPress = (e: React.KeyboardEvent, field: 'fullName' | 'specialty') => {
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
            alert('Пожалуйста, заполните обязательные поля');
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
            alert("Пожалуйста, выберите изображение");
            return;
        }

        if (file.size > 2 * 1024 * 1024) {
            alert("Размер файла не должен превышать 2MB");
            return;
        }

        setIsLoading(true);

        try {
            const token = getAuthToken();
            if (!token) {
                navigate("/");
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
                    alert("Неверные данные для загрузки фото");
                } else if (response.status === 403) {
                    alert("Нет прав для изменения фото профиля");
                } else if (response.status === 422) {
                    alert("Ошибка валидации данных");
                } else {
                    alert(`Ошибка при загрузке фото (${response.status})`);
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
            alert("Фото профиля успешно обновлено!");

        } catch (error) {
            console.error("Ошибка при загрузке фото:", error);
            alert("Ошибка при загрузке фото профиля");
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
                    continue;
                }
            }
        }

        img.src = "../fonTest6.png";
    };

    const getReviewerName = (review: Review) => {
        return `${review.reviewer.name} ${review.reviewer.surname}`.trim();
    };

    const getReviewerAvatarUrl = (review: Review) => {
        if (review.reviewer.image) {
            console.log('Reviewer image from data:', review.reviewer.image);

            const possiblePaths = [
                review.reviewer.image,
                `${API_BASE_URL}/images/profile_photos/${review.reviewer.image}`,
                `${API_BASE_URL}/uploads/profile_photos/${review.reviewer.image}`,
                `${API_BASE_URL}/uploads/clients/${review.reviewer.image}`,
                `${API_BASE_URL}/images/clients/${review.reviewer.image}`,
                `${API_BASE_URL}/${review.reviewer.image}`
            ];

            for (const path of possiblePaths) {
                if (path && path !== "../fonTest6.png") {
                    console.log('Trying reviewer avatar path:', path);
                    return path;
                }
            }
        }

        console.log('Using default avatar for reviewer');
        return "../fonTest6.png";
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
            return 'Мастер';
        }
        return `${review.user.name || ''} ${review.user.surname || ''}`.trim();
    };

    const getClientName = (review: Review) => {
        if (!review.reviewer.name && !review.reviewer.surname) {
            return 'Клиент';
        }
        return `${review.reviewer.name || ''} ${review.reviewer.surname || ''}`.trim();
    };

    const handleClientProfileClick = (clientId: number) => {
        console.log('Navigating to client profile:', clientId);
        navigate(`/client/${clientId}`);
    };

    const handleLeaveReview = () => {
        const token = getAuthToken();
        if (!token) {
            navigate('/auth');
            return;
        }

        setShowReviewModal(true);
    };

    const handleCloseReviewModal = () => {
        setShowReviewModal(false);
        setReviewText('');
        setSelectedStars(0);
        setReviewPhotos([]);
    };

    const handleStarClick = (starCount: number) => {
        setSelectedStars(starCount);
    };

    const handleReviewPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files);
            setReviewPhotos(prev => [...prev, ...files]);
        }
    };

    const removeReviewPhoto = (index: number) => {
        setReviewPhotos(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmitReview = async () => {
        if (!reviewText.trim()) {
            alert('Пожалуйста, напишите комментарий');
            return;
        }

        if (selectedStars === 0) {
            alert('Пожалуйста, поставьте оценку');
            return;
        }

        try {
            setIsSubmittingReview(true);
            const token = getAuthToken();
            if (!token) {
                alert('Необходима авторизация');
                return;
            }

            const currentUserId = await getCurrentUserId(token);
            if (!currentUserId || !profileData) {
                alert('Не удалось определить пользователя или мастера');
                return;
            }

            const reviewData: ReviewData = {
                type: 'master',
                rating: selectedStars,
                description: reviewText,
                master: `/api/users/${profileData.id}`,
                client: `/api/users/${currentUserId}`
            };

            console.log('Sending review data:', reviewData);
            const response = await fetch(`${API_BASE_URL}/api/reviews`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(reviewData)
            });

            if (response.ok) {
                const reviewResponse = await response.json();
                console.log('Review created successfully:', reviewResponse);

                if (reviewPhotos.length > 0) {
                    try {
                        await uploadReviewPhotos(reviewResponse.id, reviewPhotos, token);
                        console.log('All review photos uploaded successfully');
                    } catch (uploadError) {
                        console.error('Error uploading photos, but review was created:', uploadError);
                        alert('Отзыв отправлен, но возникла ошибка при загрузке фото');
                    }
                }

                handleCloseReviewModal();
                alert('Отзыв успешно отправлен!');
                await fetchReviews();

            } else {
                const errorText = await response.text();
                console.error('Error creating review. Status:', response.status, 'Response:', errorText);

                let errorMessage = 'Ошибка при отправке отзыва';
                if (response.status === 422) {
                    errorMessage = 'Ошибка валидации данных. Проверьте введенные данные.';
                } else if (response.status === 400) {
                    errorMessage = 'Неверные данные для отправки отзыва.';
                } else if (response.status === 404) {
                    errorMessage = 'Ресурс не найден. Возможно, пользователь не существует.';
                }

                alert(errorMessage);
            }

        } catch (error) {
            console.error('Error submitting review:', error);
            alert('Произошла непредвиденная ошибка при отправке отзыва');
        } finally {
            setIsSubmittingReview(false);
        }
    };

    const uploadReviewPhotos = async (reviewId: number, photos: File[], token: string) => {
        try {
            console.log(`Uploading ${photos.length} photos for review ${reviewId}`);

            for (const photo of photos) {
                const formData = new FormData();
                formData.append('image', photo);

                console.log(`Uploading review photo: ${photo.name}`);
                const response = await fetch(`${API_BASE_URL}/api/reviews/${reviewId}/upload-photo`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    },
                    body: formData
                });

                if (response.ok) {
                    const uploadResult = await response.json();
                    console.log('Review photo uploaded successfully:', uploadResult);
                } else {
                    const errorText = await response.text();
                    console.error(`Error uploading photo for review ${reviewId}:`, errorText);
                }
            }

            console.log('All review photos uploaded successfully');
        } catch (error) {
            console.error('Error uploading review photos:', error);
            throw error;
        }
    };

    if (isLoading) {
        return <div className={styles.profileSet}>Загрузка...</div>;
    }

    if (!profileData) {
        return <div className={styles.profileSet}>Ошибка загрузки данных</div>;
    }

    return (
        <div className={styles.profile}>
            <div className={styles.profile_wrap}>
                <div className={styles.profile_content}>
                    <div className={styles.avatar_section}>
                        <div
                            className={styles.avatar_container}
                            onClick={handleAvatarClick}
                        >
                            {profileData.avatar ? (
                                <img
                                    src={profileData.avatar}
                                    alt="Аватар"
                                    className={styles.avatar}
                                    onError={handleImageError}
                                    onLoad={() => console.log('Avatar loaded successfully from:', profileData.avatar)}
                                />
                            ) : (
                                <img
                                    src="../fonTest6.png"
                                    alt="FonTest6"
                                    className={styles.avatar_placeholder}
                                />
                            )}
                            <div className={styles.avatar_overlay}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    <path d="M17 8L12 3L7 8" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    <path d="M12 3V15" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                                <span>Изменить фото</span>
                            </div>
                        </div>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            accept="image/*"
                            style={{ display: 'none' }}
                        />
                    </div>

                    <div className={styles.profile_info}>
                        <div className={styles.name_specialty}>
                            <div className={styles.name_row}>
                                {editingField === 'fullName' ? (
                                    <div className={styles.full_name_edit}>
                                        <input
                                            type="text"
                                            value={tempValue}
                                            onChange={(e) => setTempValue(e.target.value)}
                                            onBlur={() => handleInputSave('fullName')}
                                            onKeyDown={(e) => handleInputKeyPress(e, 'fullName')}
                                            className={styles.name_input}
                                            placeholder="Фамилия Имя Отчество"
                                            autoFocus
                                        />
                                    </div>
                                ) : (
                                    <div className={styles.name_with_icon}>
                                        <span className={styles.name}>
                                            {profileData.fullName}
                                        </span>
                                        <button
                                            className={styles.edit_icon}
                                            onClick={() => handleEditStart('fullName')}
                                        >
                                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <g clipPath="url(#clip0_188_2958)">
                                                    <g clipPath="url(#clip1_188_2958)">
                                                        <path d="M7.2302 20.59L2.4502 21.59L3.4502 16.81L17.8902 2.29001C18.1407 2.03889 18.4385 1.83982 18.7663 1.70424C19.0941 1.56865 19.4455 1.49925 19.8002 1.50001C20.5163 1.50001 21.203 1.78447 21.7094 2.29082C22.2157 2.79717 22.5002 3.48392 22.5002 4.20001C22.501 4.55474 22.4315 4.90611 22.296 5.23391C22.1604 5.56171 21.9613 5.85945 21.7102 6.11001L7.2302 20.59Z" stroke="#3A54DA" strokeWidth="2" strokeMiterlimit="10"/>
                                                        <path d="M0.549805 22.5H23.4498" stroke="#3A54DA" strokeWidth="2" strokeMiterlimit="10"/>
                                                        <path d="M19.6403 8.17986L15.8203 4.35986" stroke="#3A54DA" strokeWidth="2" strokeMiterlimit="10"/>
                                                    </g>
                                                </g>
                                                <defs>
                                                    <clipPath id="clip0_188_2958">
                                                        <rect width="24" height="24" fill="white"/>
                                                    </clipPath>
                                                    <clipPath id="clip1_188_2958">
                                                        <rect width="24" height="24" fill="white"/>
                                                    </clipPath>
                                                </defs>
                                            </svg>
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className={styles.specialty_row}>
                                {editingField === 'specialty' ? (
                                    <div className={styles.specialty_edit_container}>
                                        <select
                                            ref={specialtyInputRef}
                                            value={tempValue}
                                            onChange={(e) => setTempValue(e.target.value)}
                                            className={styles.specialty_select}
                                            autoFocus
                                        >
                                            <option value="">Выберите специальность</option>
                                            {occupations.map(occupation => (
                                                <option
                                                    key={occupation.id}
                                                    value={occupation.title}
                                                >
                                                    {occupation.title}
                                                </option>
                                            ))}
                                        </select>

                                        <div className={styles.specialty_actions}>
                                            <button
                                                className={styles.save_occupations_btn}
                                                onClick={() => {
                                                    if (tempValue.trim()) {
                                                        const updateData = { specialty: tempValue };
                                                        updateUserData(updateData);
                                                        setEditingField(null);
                                                    }
                                                }}
                                                disabled={isLoading || !tempValue.trim()}
                                            >
                                                {isLoading ? 'Сохранение...' : 'Сохранить'}
                                            </button>
                                            <button
                                                className={styles.cancel_occupations_btn}
                                                onClick={() => {
                                                    setEditingField(null);
                                                    setTempValue('');
                                                }}
                                            >
                                                Отмена
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className={styles.specialty_with_icon}>
                                        <span className={styles.specialty}>{profileData.specialty}</span>
                                        <button
                                            className={styles.edit_icon}
                                            onClick={() => handleEditStart('specialty')}
                                        >
                                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <g clipPath="url(#clip0_188_2958)">
                                                    <g clipPath="url(#clip1_188_2958)">
                                                        <path d="M7.2302 20.59L2.4502 21.59L3.4502 16.81L17.8902 2.29001C18.1407 2.03889 18.4385 1.83982 18.7663 1.70424C19.0941 1.56865 19.4455 1.49925 19.8002 1.50001C20.5163 1.50001 21.203 1.78447 21.7094 2.29082C22.2157 2.79717 22.5002 3.48392 22.5002 4.20001C22.501 4.55474 22.4315 4.90611 22.296 5.23391C22.1604 5.56171 21.9613 5.85945 21.7102 6.11001L7.2302 20.59Z" stroke="#3A54DA" strokeWidth="2" strokeMiterlimit="10"/>
                                                        <path d="M0.549805 22.5H23.4498" stroke="#3A54DA" strokeWidth="2" strokeMiterlimit="10"/>
                                                        <path d="M19.6403 8.17986L15.8203 4.35986" stroke="#3A54DA" strokeWidth="2" strokeMiterlimit="10"/>
                                                    </g>
                                                </g>
                                                <defs>
                                                    <clipPath id="clip0_188_2958">
                                                        <rect width="24" height="24" fill="white"/>
                                                    </clipPath>
                                                    <clipPath id="clip1_188_2958">
                                                        <rect width="24" height="24" fill="white"/>
                                                    </clipPath>
                                                </defs>
                                            </svg>
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className={styles.rating_reviews}>
                            <span className={styles.rating}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <g clipPath="url(#clip0_324_2272)">
                                    <g clipPath="url(#clip1_324_2272)">
                                    <path d="M12 2.49023L15.51 8.17023L22 9.76023L17.68 14.8502L18.18 21.5102L12 18.9802L5.82 21.5102L6.32 14.8502L2 9.76023L8.49 8.17023L12 2.49023Z" stroke="#3A54DA" strokeWidth="2" strokeMiterlimit="10"/>
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
                                {profileData.rating}
                            </span>
                            <span className={styles.reviews}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <g clipPath="url(#clip0_188_2937)">
                                    <g clipPath="url(#clip1_188_2937)">
                                    <path d="M12 1.47998C6.2 1.47998 1.5 5.74998 1.5 11C1.52866 13.0153 2.23294 14.9626 3.5 16.53L2.5 21.53L9.16 20.2C10.1031 20.4499 11.0744 20.5776 12.05 20.58C17.85 20.58 22.55 16.3 22.55 11.03C22.55 5.75998 17.8 1.47998 12 1.47998Z" stroke="#3A54DA" strokeWidth="2" strokeMiterlimit="10"/>
                                    </g>
                                    </g>
                                    <defs>
                                    <clipPath id="clip0_188_2937">
                                    <rect width="24" height="24" fill="white"/>
                                    </clipPath>
                                    <clipPath id="clip1_188_2937">
                                    <rect width="24" height="24" fill="white"/>
                                    </clipPath>
                                    </defs>
                                </svg>
                                {reviews.length} отзыва
                            </span>
                        </div>
                    </div>
                </div>

                {/* Секция "О себе" */}
                <div className={styles.about_section}>
                    {/* Образование и опыт */}
                    <div className={styles.section_item}>
                        <h3>Образование и опыт</h3>
                        <div className={styles.section_content}>
                            {profileData.education.map((edu, index) => (
                                <div key={edu.id} className={`${styles.education_item} ${index === profileData.education.length - 1 ? styles.education_item_last : ''}`}>
                                    {editingEducation === edu.id ? (
                                        <div className={styles.education_form}>
                                            <div className={styles.form_group}>
                                                <label>Учебное заведение *</label>
                                                <input
                                                    type="text"
                                                    placeholder="Учебное заведение"
                                                    value={educationForm.institution}
                                                    onChange={(e) => handleEducationFormChange('institution', e.target.value)}
                                                />
                                            </div>

                                            <div className={styles.form_group}>
                                                <label>Специальность</label>
                                                <select
                                                    className={styles.specialty_select}
                                                    value={educationForm.selectedSpecialty || ''}
                                                    onChange={(e) => {
                                                        const selectedId = parseInt(e.target.value);
                                                        setEducationForm(prev => ({
                                                            ...prev,
                                                            selectedSpecialty: selectedId || undefined
                                                        }));
                                                    }}
                                                >
                                                    <option value="">Выберите специальность</option>
                                                    {/* Debug: показываем состояние occupations для нового образования */}
                                                    {occupationsLoading && (
                                                        <option disabled>Загружается...</option>
                                                    )}
                                                    {occupations.map(occupation => {
                                                        console.log('Rendering occupation option (new education):', occupation);
                                                        return (
                                                            <option key={occupation.id} value={occupation.id}>
                                                                {occupation.title}
                                                            </option>
                                                        );
                                                    })}
                                                </select>
                                            </div>

                                            <div className={styles.year_group}>
                                                <div className={styles.form_group}>
                                                    <label>Год начала *</label>
                                                    <input
                                                        type="number"
                                                        placeholder="Год начала"
                                                        value={educationForm.startYear}
                                                        onChange={(e) => handleEducationFormChange('startYear', e.target.value)}
                                                        min="1900"
                                                        max={new Date().getFullYear()}
                                                    />
                                                </div>

                                                <div className={styles.form_group}>
                                                    <label>Год окончания</label>
                                                    <input
                                                        type="number"
                                                        placeholder="Год окончания"
                                                        value={educationForm.endYear}
                                                        onChange={(e) => handleEducationFormChange('endYear', e.target.value)}
                                                        min={parseInt(educationForm.startYear) || 1900}
                                                        max={new Date().getFullYear()}
                                                        disabled={educationForm.currentlyStudying}
                                                    />
                                                </div>
                                            </div>

                                            <div className={styles.checkbox_group}>
                                                <label className={styles.checkbox_label}>
                                                    <input
                                                        type="checkbox"
                                                        checked={educationForm.currentlyStudying}
                                                        onChange={(e) => handleEducationFormChange('currentlyStudying', e.target.checked)}
                                                    />
                                                    Учусь сейчас
                                                </label>
                                            </div>

                                            <div className={styles.form_actions}>
                                                <button
                                                    className={styles.save_button}
                                                    onClick={handleEditEducationSave}
                                                    disabled={!educationForm.institution || !educationForm.startYear}
                                                >
                                                    Сохранить
                                                </button>
                                                <button
                                                    className={styles.cancel_button}
                                                    onClick={handleEditEducationCancel}
                                                >
                                                    Отмена
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className={styles.education_main}>
                                            <div className={styles.education_content}>
                                                <div className={styles.education_header}>
                                                    <strong>{edu.institution}</strong>
                                                </div>
                                                <div className={styles.education_years}>
                                                    <span>{edu.startYear} - {edu.currentlyStudying ? 'По настоящее время' : edu.endYear}</span>
                                                </div>
                                                {edu.specialty && (
                                                    <div className={styles.education_details}>
                                                        <span>Специальность: {edu.specialty}</span>
                                                    </div>
                                                )}
                                            </div>
                                            <div className={styles.education_actions}>
                                                <button
                                                    className={styles.edit_icon}
                                                    onClick={() => handleEditEducationStart(edu)}
                                                    title="Редактировать"
                                                >
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                                        <path d="M7.2302 20.59L2.4502 21.59L3.4502 16.81L17.8902 2.29001C18.1407 2.03889 18.4385 1.83982 18.7663 1.70424C19.0941 1.56865 19.4455 1.49925 19.8002 1.50001C20.5163 1.50001 21.203 1.78447 21.7094 2.29082C22.2157 2.79717 22.5002 3.48392 22.5002 4.20001C22.501 4.55474 22.4315 4.90611 22.296 5.23391C22.1604 5.56171 21.9613 5.85945 21.7102 6.11001L7.2302 20.59Z" stroke="#3A54DA" strokeWidth="2" strokeMiterlimit="10"/>
                                                    </svg>
                                                </button>
                                                <button
                                                    className={styles.delete_icon}
                                                    onClick={() => handleDeleteEducation(edu.id)}
                                                    title="Удалить"
                                                >
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                                        <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" fill="#ff4444"/>
                                                    </svg>
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}

                            {/* Кнопка добавления нового образования */}
                            {editingEducation === null ? (
                                <div className={styles.add_education_container}>
                                    <button
                                        className={styles.add_button}
                                        onClick={handleAddEducation}
                                        title="Добавить образование"
                                    >
                                        +
                                    </button>
                                </div>
                            ) : editingEducation.startsWith('new-') ? (
                                <div className={styles.education_form}>
                                    <div className={styles.form_group}>
                                        <label>Учебное заведение *</label>
                                        <input
                                            type="text"
                                            placeholder="Учебное заведение"
                                            value={educationForm.institution}
                                            onChange={(e) => handleEducationFormChange('institution', e.target.value)}
                                        />
                                    </div>

                                    <div className={styles.form_group}>
                                        <label>Специальность</label>
                                        <select
                                            value={educationForm.selectedSpecialty || ''}
                                            onChange={(e) => {
                                                const selectedId = parseInt(e.target.value);
                                                setEducationForm(prev => ({
                                                    ...prev,
                                                    selectedSpecialty: selectedId || undefined
                                                }));
                                            }}
                                        >
                                            <option value="">Выберите специальность</option>
                                            {occupationsLoading && (
                                                <option disabled>Загружается...</option>
                                            )}
                                            {occupations.map(occupation => (
                                                <option key={occupation.id} value={occupation.id}>
                                                    {occupation.title}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className={styles.year_group}>
                                        <div className={styles.form_group}>
                                            <label>Год начала *</label>
                                            <input
                                                type="number"
                                                placeholder="Год начала"
                                                value={educationForm.startYear}
                                                onChange={(e) => handleEducationFormChange('startYear', e.target.value)}
                                                min="1900"
                                                max={new Date().getFullYear()}
                                            />
                                        </div>

                                        <div className={styles.form_group}>
                                            <label>Год окончания</label>
                                            <input
                                                type="number"
                                                placeholder="Год окончания"
                                                value={educationForm.endYear}
                                                onChange={(e) => handleEducationFormChange('endYear', e.target.value)}
                                                min={parseInt(educationForm.startYear) || 1900}
                                                max={new Date().getFullYear()}
                                                disabled={educationForm.currentlyStudying}
                                            />
                                        </div>
                                    </div>

                                    <div className={styles.checkbox_group}>
                                        <label className={styles.checkbox_label}>
                                            <input
                                                type="checkbox"
                                                checked={educationForm.currentlyStudying}
                                                onChange={(e) => handleEducationFormChange('currentlyStudying', e.target.checked)}
                                            />
                                            Учусь сейчас
                                        </label>
                                    </div>

                                    <div className={styles.form_actions}>
                                        <button
                                            className={styles.save_button}
                                            onClick={handleEditEducationSave}
                                            disabled={!educationForm.institution || !educationForm.startYear}
                                        >
                                            Сохранить
                                        </button>
                                        <button
                                            className={styles.cancel_button}
                                            onClick={handleEditEducationCancel}
                                        >
                                            Отмена
                                        </button>
                                    </div>
                                </div>
                            ) : null}
                        </div>
                    </div>

                    {/* Телефоны */}
                    <div className={styles.section_item}>
                        <h3>Телефоны</h3>
                        <div className={styles.section_content}>
                            {profileData.phones && profileData.phones.map((phone, index) => (
                                <div key={phone.id} className={`${styles.list_item} ${index === profileData.phones.length - 1 ? styles.list_item_last : ''}`}>
                                    {editingPhone === phone.id ? (
                                        <div className={styles.edit_form}>
                                            <div className={styles.form_group}>
                                                <label>Тип телефона</label>
                                                <select
                                                    value={phoneForm.type}
                                                    onChange={(e) => setPhoneForm(prev => ({ ...prev, type: e.target.value as 'tj' | 'international' }))}
                                                    disabled
                                                >
                                                    <option value="tj">Таджикистан (+992)</option>
                                                    <option value="international">Международный</option>
                                                </select>
                                            </div>
                                            <div className={styles.form_group}>
                                                <label>Номер телефона</label>
                                                <input
                                                    type="tel"
                                                    placeholder={phoneForm.type === 'tj' ? '+992XXXXXXXXX' : '+XXXXXXXXXXX'}
                                                    value={phoneForm.number}
                                                    onChange={(e) => {
                                                        let value = e.target.value;
                                                        if (!value.startsWith('+')) value = '+' + value;
                                                        if (phoneForm.type === 'tj' && !value.startsWith('+992')) {
                                                            value = '+992';
                                                        }
                                                        setPhoneForm(prev => ({ ...prev, number: value }));
                                                    }}
                                                />
                                            </div>
                                            <div className={styles.form_actions}>
                                                <button
                                                    className={styles.save_button}
                                                    onClick={handleEditPhoneSave}
                                                >
                                                    Сохранить
                                                </button>
                                                <button
                                                    className={styles.cancel_button}
                                                    onClick={handleEditPhoneCancel}
                                                >
                                                    Отмена
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <div className={styles.list_item_content}>
                                                <div className={styles.address_text}>
                                                    <strong>{phone.type === 'tj' ? '🇹🇯 ' : '🌍 '}</strong>
                                                    <a 
                                                        href={`tel:${phone.number}`}
                                                        className={styles.phone_link}
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        {phone.number}
                                                    </a>
                                                </div>
                                            </div>
                                            <div className={styles.list_item_actions}>
                                                <button
                                                    className={styles.copy_icon}
                                                    onClick={() => handleCopyPhone(phone.number)}
                                                    title="Копировать"
                                                >
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                                        <path d="M16 1H4C2.9 1 2 1.9 2 3V17H4V3H16V1ZM19 5H8C6.9 5 6 5.9 6 7V21C6 22.1 6.9 23 8 23H19C20.1 23 21 22.1 21 21V7C21 5.9 20.1 5 19 5ZM19 21H8V7H19V21Z" fill="#3A54DA"/>
                                                    </svg>
                                                </button>
                                                <button
                                                    className={styles.edit_icon}
                                                    onClick={() => handleEditPhoneStart(phone)}
                                                    title="Редактировать"
                                                >
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                                        <path d="M7.2302 20.59L2.4502 21.59L3.4502 16.81L17.8902 2.29001C18.1407 2.03889 18.4385 1.83982 18.7663 1.70424C19.0941 1.56865 19.4455 1.49925 19.8002 1.50001C20.5163 1.50001 21.203 1.78447 21.7094 2.29082C22.2157 2.79717 22.5002 3.48392 22.5002 4.20001C22.501 4.55474 22.4315 4.90611 22.296 5.23391C22.1604 5.56171 21.9613 5.85945 21.7102 6.11001L7.2302 20.59Z" stroke="#3A54DA" strokeWidth="2" strokeMiterlimit="10"/>
                                                    </svg>
                                                </button>
                                                <button
                                                    className={styles.delete_icon}
                                                    onClick={() => handleDeletePhone(phone.id)}
                                                    title="Удалить"
                                                >
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                                        <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" fill="#ff4444"/>
                                                    </svg>
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            ))}

                            {/* Кнопка добавления или форма нового телефона */}
                            {editingPhone === null && profileData.phones.length < 2 ? (
                                <div className={styles.add_education_container}>
                                    <button
                                        className={styles.add_button}
                                        onClick={handleAddPhone}
                                        title="Добавить телефон"
                                    >
                                        +
                                    </button>
                                </div>
                            ) : editingPhone === 'new' ? (
                                <div className={styles.edit_form}>
                                    <div className={styles.form_group}>
                                        <label>Тип телефона</label>
                                        <select
                                            value={phoneForm.type}
                                            onChange={(e) => {
                                                const type = e.target.value as 'tj' | 'international';
                                                setPhoneForm({
                                                    type,
                                                    number: type === 'tj' ? '+992' : '+'
                                                });
                                            }}
                                        >
                                            <option value="tj" disabled={profileData.phones.some(p => p.type === 'tj')}>
                                                Таджикистан (+992)
                                            </option>
                                            <option value="international" disabled={profileData.phones.some(p => p.type === 'international')}>
                                                Международный / Таджикистан (+992)
                                            </option>
                                        </select>
                                    </div>
                                    <div className={styles.form_group}>
                                        <label>Номер телефона</label>
                                        <input
                                            type="tel"
                                            placeholder={phoneForm.type === 'tj' ? '+992XXXXXXXXX' : '+XXXXXXXXXXX'}
                                            value={phoneForm.number}
                                            onChange={(e) => {
                                                let value = e.target.value;
                                                if (!value.startsWith('+')) value = '+' + value;
                                                if (phoneForm.type === 'tj' && !value.startsWith('+992')) {
                                                    value = '+992';
                                                }
                                                setPhoneForm(prev => ({ ...prev, number: value }));
                                            }}
                                        />
                                    </div>
                                    <div className={styles.form_actions}>
                                        <button
                                            className={styles.save_button}
                                            onClick={handleEditPhoneSave}
                                        >
                                            Добавить
                                        </button>
                                        <button
                                            className={styles.cancel_button}
                                            onClick={handleEditPhoneCancel}
                                        >
                                            Отмена
                                        </button>
                                    </div>
                                </div>
                            ) : null}
                        </div>
                    </div>

                    {/* Социальные сети */}
                    <div className={styles.section_item}>
                        <h3>Социальные сети</h3>
                        <div className={styles.section_content}>
                            <div className={styles.social_networks}>
                                {socialNetworks.length === 0 && (
                                    <div className={styles.empty_social_networks}>
                                        <p>Социальные сети не добавлены</p>
                                        {getAvailableNetworks().length > 0 && (
                                            <p>Нажмите "+" чтобы добавить социальную сеть</p>
                                        )}
                                    </div>
                                )}

                                {socialNetworks.map(network => {
                                    return (
                                        <div key={network.id} className={styles.social_network_item}>
                                            <div className={styles.social_network_icon}>
                                                {renderSocialIcon(network.network)}
                                            </div>
                                            <div className={styles.social_network_info}>
                                                <span className={styles.social_network_name}>
                                                    {SOCIAL_NETWORK_CONFIG[network.network]?.label || network.network}
                                                </span>
                                                {editingSocialNetwork === network.id ? (
                                                <div className={styles.social_network_edit}>
                                                    <input
                                                        type="text"
                                                        value={socialNetworkEditValue}
                                                        placeholder={SOCIAL_NETWORK_CONFIG[network.network]?.placeholder || 'Введите контактные данные'}
                                                        onChange={(e) => {
                                                            setSocialNetworkEditValue(e.target.value);
                                                            setSocialNetworkValidationError('');
                                                        }}
                                                        className={styles.social_input}
                                                        autoFocus
                                                    />
                                                    <div className={styles.social_edit_buttons}>
                                                        <button
                                                            className={styles.save_social_btn}
                                                            onClick={async () => {
                                                                const trimmedValue = socialNetworkEditValue.trim();
                                                                const config = SOCIAL_NETWORK_CONFIG[network.network];
                                                                
                                                                // Валидация
                                                                if (!trimmedValue) {
                                                                    setSocialNetworkValidationError('Поле не может быть пустым');
                                                                    return;
                                                                }

                                                                if (config && !config.validate(trimmedValue)) {
                                                                    setSocialNetworkValidationError(`Неверный формат для ${config.label}`);
                                                                    return;
                                                                }

                                                                try {
                                                                    const formattedValue = config?.format(trimmedValue) || trimmedValue;
                                                                    const updatedNetworks = socialNetworks.map(n =>
                                                                        n.id === network.id
                                                                            ? { ...n, handle: formattedValue }
                                                                            : n
                                                                    );
                                                                    setSocialNetworks(updatedNetworks);
                                                                    const success = await updateSocialNetworks(updatedNetworks);
                                                                    if (success) {
                                                                        setEditingSocialNetwork(null);
                                                                        setSocialNetworkEditValue('');
                                                                        setSocialNetworkValidationError('');
                                                                    } else {
                                                                        setSocialNetworkValidationError('Ошибка при сохранении');
                                                                    }
                                                                } catch (error) {
                                                                    console.error('Error saving social network:', error);
                                                                    setSocialNetworkValidationError('Ошибка при сохранении');
                                                                }
                                                            }}
                                                            title="Сохранить"
                                                            disabled={!socialNetworkEditValue.trim()}
                                                        >
                                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                                                                <path d="M20.285 2l-11.285 11.567-5.286-5.011-3.714 3.716 9 8.728 15-15.285z"/>
                                                            </svg>
                                                        </button>
                                                    </div>
                                                    {socialNetworkValidationError && (
                                                        <div className={styles.validation_error}>
                                                            {socialNetworkValidationError}
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className={styles.social_network_display}>
                                                    <div className={`${styles.social_network_handle} ${!network.handle ? styles.empty_handle : ''}`}>
                                                        {network.handle ? (
                                                            <a 
                                                                href={SOCIAL_NETWORK_CONFIG[network.network]?.generateUrl(network.handle) || '#'}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className={styles.handle_value_link}
                                                            >
                                                                {(['telegram', 'instagram'].includes(network.network) && !network.handle.startsWith('@'))
                                                                    ? `@${network.handle}`
                                                                    : network.handle}
                                                            </a>
                                                        ) : (
                                                            <span className={styles.handle_placeholder}>
                                                                Не указано
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className={styles.list_item_actions}>
                                                        {network.handle && (
                                                            <button
                                                                className={styles.copy_icon}
                                                                onClick={() => handleCopySocialNetwork(network.handle)}
                                                                title="Копировать"
                                                            >
                                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                                                    <path d="M16 1H4C2.9 1 2 1.9 2 3V17H4V3H16V1ZM19 5H8C6.9 5 6 5.9 6 7V21C6 22.1 6.9 23 8 23H19C20.1 23 21 22.1 21 21V7C21 5.9 20.1 5 19 5ZM19 21H8V7H19V21Z" fill="#3A54DA"/>
                                                                </svg>
                                                            </button>
                                                        )}
                                                        <button
                                                            className={styles.edit_icon}
                                                            onClick={() => {
                                                                setEditingSocialNetwork(network.id);
                                                                setSocialNetworkEditValue(network.handle || '');
                                                                setSocialNetworkValidationError('');
                                                            }}
                                                            title="Редактировать"
                                                        >
                                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                                                <path d="M7.2302 20.59L2.4502 21.59L3.4502 16.81L17.8902 2.29001C18.1407 2.03889 18.4385 1.83982 18.7663 1.70424C19.0941 1.56865 19.4455 1.49925 19.8002 1.50001C20.5163 1.50001 21.203 1.78447 21.7094 2.29082C22.2157 2.79717 22.5002 3.48392 22.5002 4.20001C22.501 4.55474 22.4315 4.90611 22.296 5.23391C22.1604 5.56171 21.9613 5.85945 21.7102 6.11001L7.2302 20.59Z" stroke="#3A54DA" strokeWidth="2" strokeMiterlimit="10"/>
                                                            </svg>
                                                        </button>
                                                        <button
                                                            className={styles.delete_icon}
                                                            onClick={() => {
                                                                if (confirm(`Удалить ${SOCIAL_NETWORK_CONFIG[network.network]?.label || network.network}?`)) {
                                                                    handleRemoveSocialNetwork(network.id);
                                                                }
                                                            }}
                                                            title={`Удалить ${SOCIAL_NETWORK_CONFIG[network.network]?.label || network.network}`}
                                                        >
                                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                                                <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" fill="#ff4444"/>
                                                            </svg>
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    );
                                })}

                            {/* Кнопки управления социальными сетями */}
                            {!showAddSocialNetwork && (getAvailableNetworks().length > 0 || socialNetworks.length > 0) && (
                                <div className={styles.add_education_container}>
                                    {socialNetworks.length > 0 && (
                                        <button
                                            onClick={handleResetSocialNetworks}
                                            className={styles.reset_social_btn}
                                            title="Удалить все социальные сети"
                                        >
                                            Удалить все
                                        </button>
                                    )}
                                    {getAvailableNetworks().length > 0 && (
                                        <button
                                            className={styles.add_button}
                                            onClick={() => setShowAddSocialNetwork(true)}
                                            title="Добавить социальную сеть"
                                        >
                                            +
                                        </button>
                                    )}
                                </div>
                            )}

                                {/* Интерфейс добавления новой социальной сети */}
                                {showAddSocialNetwork && (
                                    <div className={styles.add_social_network_form}>
                                        <h4>Добавить социальную сеть</h4>
                                        <div className={styles.social_network_select}>
                                            <label>Выберите социальную сеть:</label>
                                            <select
                                                value={selectedNewNetwork}
                                                onChange={(e) => setSelectedNewNetwork(e.target.value)}
                                            >
                                                <option value="">-- Выберите --</option>
                                                {getAvailableNetworks().map((availableNetwork: AvailableSocialNetwork) => {
                                                    const config = SOCIAL_NETWORK_CONFIG[availableNetwork.network] || { label: availableNetwork.network, icon: '🌐' };
                                                    return (
                                                        <option key={availableNetwork.id} value={availableNetwork.network}>
                                                            {config.icon} {config.label}
                                                        </option>
                                                    );
                                                })}
                                            </select>
                                        </div>
                                        <div className={styles.add_social_buttons}>
                                            <button
                                                onClick={handleAddSocialNetwork}
                                                disabled={!selectedNewNetwork}
                                                className={styles.confirm_add_btn}
                                            >
                                                Добавить
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setShowAddSocialNetwork(false);
                                                    setSelectedNewNetwork('');
                                                }}
                                                className={styles.cancel_add_btn}
                                            >
                                                Отмена
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Примеры работ */}
                    <div className={styles.section_item}>
                        <h3>Примеры работ</h3>
                        <div className={styles.section_content}>
                            <div className={styles.work_examples}>
                                {profileData.workExamples.length > 0 ? (
                                    <>
                                        <div className={styles.work_examples_grid}>
                                            {profileData.workExamples
                                                .slice(0, showAllWorkExamples ? undefined : (isMobile ? 6 : 8))
                                                .map((work, index) => (
                                            <div key={work.id} className={styles.work_example}>
                                                <img
                                                    src={getImageUrlWithCacheBust(work.image)}
                                                    alt={work.title}
                                                    onClick={() => {
                                                        openGallery(index);
                                                    }}
                                                    style={{ cursor: 'pointer' }}
                                                    onError={(e) => {
                                                        console.log('Image load error for:', work.image);
                                                        const img = e.currentTarget;

                                                        const alternativePaths = [
                                                            `${API_BASE_URL}/uploads/gallery_images/${work.image.split('/').pop() || work.image}`,
                                                            "./fonTest6.png"
                                                        ];

                                                        let currentIndex = 0;
                                                        const tryNextSource = () => {
                                                            if (currentIndex < alternativePaths.length) {
                                                                const nextSource = alternativePaths[currentIndex];
                                                                currentIndex++;
                                                                console.log('Trying alternative path:', nextSource);

                                                                const testImg = new Image();
                                                                testImg.onload = () => {
                                                                    console.log('Alternative image loaded successfully:', nextSource);
                                                                    img.src = nextSource;
                                                                };
                                                                testImg.onerror = () => {
                                                                    console.log('Alternative image failed:', nextSource);
                                                                    tryNextSource();
                                                                };
                                                                testImg.src = nextSource;
                                                            } else {
                                                                console.log('All alternative paths failed, using placeholder');
                                                                img.src = "./fonTest6.png";
                                                            }
                                                        };

                                                        tryNextSource();
                                                    }}
                                                    onLoad={() => console.log('Portfolio image loaded successfully:', work.image)}
                                                />
                                                <button
                                                    className={styles.delete_work_button}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDeleteWorkExample(work.id);
                                                    }}
                                                    title="Удалить фото"
                                                >
                                                    ×
                                                </button>
                                            </div>
                                            ))}
                                        </div>
                                        {profileData.workExamples.length > (isMobile ? 6 : 8) && (
                                            <button
                                                className={styles.show_more_work_button}
                                                onClick={() => setShowAllWorkExamples(!showAllWorkExamples)}
                                            >
                                                {showAllWorkExamples ? 'Скрыть' : `Показать все (${profileData.workExamples.length})`}
                                            </button>
                                        )}
                                    </>
                                ) : (
                                    <div className={styles.empty_state}>
                                        <span>Добавить фото в портфолио</span>
                                    </div>
                                )}
                            </div>
                            
                            {/* Кнопки управления портфолио */}
                            <div className={styles.add_education_container}>
                                {profileData.workExamples.length > 0 && (
                                    <button
                                        className={styles.reset_social_btn}
                                        onClick={handleDeleteAllWorkExamples}
                                        disabled={isGalleryOperating}
                                        title="Удалить все фото"
                                    >
                                        Удалить все
                                    </button>
                                )}
                                <button
                                    className={styles.add_button}
                                    onClick={() => workExampleInputRef.current?.click()}
                                    title="Добавить фото в портфолио"
                                >
                                    +
                                </button>
                            </div>
                        </div>
                        <input
                            type="file"
                            ref={workExampleInputRef}
                            onChange={handleWorkExampleUpload}
                            accept="image/*"
                            multiple
                            style={{ display: 'none' }}
                        />
                        
                        {/* PhotoGallery для примеров работ */}
                        <PhotoGallery
                            isOpen={isGalleryOpen}
                            images={galleryImages}
                            currentIndex={galleryCurrentIndex}
                            onClose={closeGallery}
                            onNext={goToNext}
                            onPrevious={goToPrevious}
                            onSelectImage={selectImage}
                        />
                    </div>

                    {/* Районы работы */}
                    <div className={styles.section_item}>
                        <h3>Районы работы</h3>

                        {/* Переключатель удаленной работы */}
                        <div className={styles.remote_work}>
                            <div className={styles.switch_container}>
                                <div className={styles.switch_label}>
                                    <span className={styles.label_main}>Могу работать удаленно</span>
                                    <span className={styles.label_sub}>Предложи заказы с дистанционной работой</span>
                                </div>
                                <label className={styles.switch}>
                                    <input
                                        type="checkbox"
                                        checked={profileData.canWorkRemotely}
                                        onChange={handleCanWorkRemotelyToggle}
                                    />
                                    <span className={styles.slider}></span>
                                </label>
                            </div>
                        </div>

                        <div className={styles.section_content}>
                            {profileData.addresses && profileData.addresses.length > 0 ? (
                                profileData.addresses.map((address, index) => (
                                    <div key={address.id} className={`${styles.list_item} ${index === profileData.addresses.length - 1 ? styles.list_item_last : ''}`}>
                                        {editingAddress === address.id ? (
                                            <div className={styles.edit_form}>
                                                <AddressSelector
                                                    value={addressForm}
                                                    onChange={setAddressForm}
                                                    required={true}
                                                    multipleSuburbs={true}
                                                />
                                                <div className={styles.form_actions}>
                                                    <button
                                                        className={styles.save_button}
                                                        onClick={handleEditAddressSave}
                                                    >
                                                        Сохранить
                                                    </button>
                                                    <button
                                                        className={styles.cancel_button}
                                                        onClick={handleEditAddressCancel}
                                                    >
                                                        Отмена
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                <div className={styles.list_item_content}>
                                                    <span className={styles.address_text}>{address.displayText}</span>
                                                </div>
                                                <div className={styles.list_item_actions}>
                                                    <button
                                                        className={styles.edit_icon}
                                                        onClick={() => handleEditAddressStart(address)}
                                                        title="Редактировать"
                                                    >
                                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                                            <path d="M7.2302 20.59L2.4502 21.59L3.4502 16.81L17.8902 2.29001C18.1407 2.03889 18.4385 1.83982 18.7663 1.70424C19.0941 1.56865 19.4455 1.49925 19.8002 1.50001C20.5163 1.50001 21.203 1.78447 21.7094 2.29082C22.2157 2.79717 22.5002 3.48392 22.5002 4.20001C22.501 4.55474 22.4315 4.90611 22.296 5.23391C22.1604 5.56171 21.9613 5.85945 21.7102 6.11001L7.2302 20.59Z" stroke="#3A54DA" strokeWidth="2" strokeMiterlimit="10"/>
                                                        </svg>
                                                    </button>
                                                    <button
                                                        className={styles.delete_icon}
                                                        onClick={() => handleDeleteAddress(address.id)}
                                                        title="Удалить"
                                                    >
                                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                                            <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" fill="#ff4444"/>
                                                        </svg>
                                                    </button>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                ))
                            ) : (
                                <div className={styles.empty_state}>
                                    <span>Добавьте районы работы</span>
                                </div>
                            )}

                            {/* Кнопка добавления нового адреса */}
                            {!editingAddress && (
                                <div className={styles.add_education_container}>
                                    <button
                                        className={styles.add_button}
                                        onClick={handleAddAddress}
                                        title="Добавить адрес"
                                    >
                                        +
                                    </button>
                                </div>
                            )}

                            {/* Форма добавления нового адреса */}
                            {editingAddress && editingAddress.startsWith('new-') && (
                                <div className={styles.edit_form}>
                                    <AddressSelector
                                        value={addressForm}
                                        onChange={setAddressForm}
                                        required={true}
                                        multipleSuburbs={true}
                                    />
                                    <div className={styles.form_actions}>
                                        <button
                                            className={styles.save_button}
                                            onClick={handleEditAddressSave}
                                        >
                                            Добавить
                                        </button>
                                        <button
                                            className={styles.cancel_button}
                                            onClick={handleEditAddressCancel}
                                        >
                                            Отмена
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Секция отзывов */}
                <div className={styles.reviews_section}>
                    <h3>Отзывы</h3>
                    <div className={styles.reviews_list}>
                        {reviewsLoading ? (
                            <div className={styles.loading}>Загрузка отзывов...</div>
                        ) : reviews.length > 0 ? (
                            <>
                                <div className={styles.reviews_desktop}>
                                    {reviews.slice(0, visibleCount).map((review, reviewIndex) => (
                                        <div key={review.id} className={styles.review_item}>
                                            <div className={styles.review_header}>
                                                <div className={styles.reviewer_info}>
                                                    <img
                                                        src={getReviewerAvatarUrl(review)}
                                                        alt={getReviewerName(review)}
                                                        onClick={() => handleClientProfileClick(review.reviewer.id)}
                                                        style={{ cursor: 'pointer' }}
                                                        className={styles.reviewer_avatar}
                                                        onError={(e) => {
                                                            e.currentTarget.src = "./fonTest5.png";
                                                        }}
                                                    />
                                                    <div className={styles.reviewer_main_info}>
                                                        <div className={styles.reviewer_name}>{getClientName(review)}</div>
                                                        <div className={styles.review_service}>
                                                            Услуга: <span className={styles.service_title}>{review.services.title}</span>
                                                        </div>
                                                        <span className={styles.review_worker}>{getMasterName(review)}</span>
                                                        <div className={styles.review_rating_main}>
                                                            <span>Поставил: </span>
                                                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                                <g clipPath="url(#clip0_324_2272)">
                                                                    <g clipPath="url(#clip1_324_2272)">
                                                                        <path d="M12 2.49023L15.51 8.17023L22 9.76023L17.68 14.8502L18.18 21.5102L12 18.9802L5.82 21.5102L6.32 14.8502L2 9.76023L8.49 8.17023L12 2.49023Z" stroke="#3A54DA" strokeWidth="2" strokeMiterlimit="10"/>
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
                                                            <span className={styles.rating_value}>{review.rating}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className={styles.review_details}>
                                                <div className={styles.review_worker_date}>
                                                    <span className={styles.review_date}>{review.date}</span>
                                                </div>
                                            </div>

                                            {review.description && renderReviewText(review)}

                                            {review.images && review.images.length > 0 && (
                                                <div className={styles.review_images}>
                                                    {review.images.map((image, imageIndex) => (
                                                        <div
                                                            key={image.id}
                                                            className={styles.review_image}
                                                            onClick={() => openReviewGallery(getReviewImageIndex(reviewIndex, imageIndex))}
                                                        >
                                                            <img
                                                                src={`${API_BASE_URL}/images/review_photos/${image.image}`}
                                                                alt={`Фото отзыва ${imageIndex + 1}`}
                                                                onError={(e) => {
                                                                    const target = e.currentTarget;
                                                                    if (target.dataset.errorHandled) return;
                                                                    target.dataset.errorHandled = 'true';
                                                                    target.src = "./fonTest5.png";
                                                                }}
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                <div className={styles.reviews_mobile}>
                                    {visibleCount === 2 ? (
                                        <Swiper
                                            key={swiperKey}
                                            spaceBetween={16}
                                            slidesPerView={1}
                                            className={styles.reviews_slider}
                                        >
                                            {reviews.slice(0, visibleCount).map((review, reviewIndex) => (
                                                <SwiperSlide key={review.id}>
                                                    <div className={styles.review_item}>
                                                    <div className={styles.review_header}>
                                                        <div className={styles.reviewer_info}>
                                                            <img
                                                                src={getReviewerAvatarUrl(review)}
                                                                alt={getReviewerName(review)}
                                                                onClick={() => handleClientProfileClick(review.reviewer.id)}
                                                                style={{ cursor: 'pointer' }}
                                                                className={styles.reviewer_avatar}
                                                                onError={(e) => {
                                                                    e.currentTarget.src = "./fonTest5.png";
                                                                }}
                                                            />
                                                            <div className={styles.reviewer_main_info}>
                                                                <div className={styles.reviewer_name}>{getClientName(review)}</div>
                                                                <div className={styles.review_service}>
                                                                    Услуга: <span className={styles.service_title}>{review.services.title}</span>
                                                                </div>
                                                                <span className={styles.review_worker}>{getMasterName(review)}</span>
                                                                <div className={styles.review_rating_main}>
                                                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                                        <g clipPath="url(#clip0_324_2272)">
                                                                            <g clipPath="url(#clip1_324_2272)">
                                                                                <path d="M12 2.49023L15.51 8.17023L22 9.76023L17.68 14.8502L18.18 21.5102L12 18.9802L5.82 21.5102L6.32 14.8502L2 9.76023L8.49 8.17023L12 2.49023Z" stroke="#3A54DA" strokeWidth="2" strokeMiterlimit="10"/>
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
                                                                    <span className={styles.rating_value}>{review.rating}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {review.description && renderReviewText(review)}

                                                    {review.images && review.images.length > 0 && (
                                                        <div className={styles.review_images}>
                                                            {review.images.map((image, imageIndex) => (
                                                                <div
                                                                    key={image.id}
                                                                    className={styles.review_image}
                                                                    onClick={() => openReviewGallery(getReviewImageIndex(reviewIndex, imageIndex))}
                                                                >
                                                                    <img
                                                                        src={`${API_BASE_URL}/images/review_photos/${image.image}`}
                                                                        alt={`Фото отзыва ${imageIndex + 1}`}
                                                                        onError={(e) => {
                                                                            const target = e.currentTarget;
                                                                            if (target.dataset.errorHandled) return;
                                                                            target.dataset.errorHandled = 'true';
                                                                            target.src = "./fonTest5.png";
                                                                        }}
                                                                    />
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </SwiperSlide>
                                        ))}
                                    </Swiper>
                                    ) : (
                                        <>
                                            {reviews.slice(0, visibleCount).map((review, reviewIndex) => (
                                                <div key={review.id} className={styles.review_item}>
                                                    <div className={styles.review_header}>
                                                        <div className={styles.reviewer_info}>
                                                            <img
                                                                src={getReviewerAvatarUrl(review)}
                                                                alt={getReviewerName(review)}
                                                                onClick={() => handleClientProfileClick(review.reviewer.id)}
                                                                style={{ cursor: 'pointer' }}
                                                                className={styles.reviewer_avatar}
                                                                onError={(e) => {
                                                                    e.currentTarget.src = "./fonTest5.png";
                                                                }}
                                                            />
                                                            <div className={styles.reviewer_main_info}>
                                                                <div className={styles.reviewer_name}>{getClientName(review)}</div>
                                                                <div className={styles.review_service}>
                                                                    Услуга: <span className={styles.service_title}>{review.services.title}</span>
                                                                </div>
                                                                <span className={styles.review_worker}>{getMasterName(review)}</span>
                                                                <div className={styles.review_rating_main}>
                                                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                                        <g clipPath="url(#clip0_324_2272)">
                                                                            <g clipPath="url(#clip1_324_2272)">
                                                                                <path d="M12 2.49023L15.51 8.17023L22 9.76023L17.68 14.8502L18.18 21.5102L12 18.9802L5.82 21.5102L6.32 14.8502L2 9.76023L8.49 8.17023L12 2.49023Z" stroke="#3A54DA" strokeWidth="2" strokeMiterlimit="10"/>
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
                                                                    <span className={styles.rating_value}>{review.rating}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {review.description && renderReviewText(review)}

                                                    {review.images && review.images.length > 0 && (
                                                        <div className={styles.review_images}>
                                                            {review.images.map((image, imageIndex) => (
                                                                <div
                                                                    key={image.id}
                                                                    className={styles.review_image}
                                                                    onClick={() => openReviewGallery(getReviewImageIndex(reviewIndex, imageIndex))}
                                                                >
                                                                    <img
                                                                        src={`${API_BASE_URL}/images/review_photos/${image.image}`}
                                                                        alt={`Фото отзыва ${imageIndex + 1}`}
                                                                        onError={(e) => {
                                                                            const target = e.currentTarget;
                                                                            if (target.dataset.errorHandled) return;
                                                                            target.dataset.errorHandled = 'true';
                                                                            target.src = "./fonTest5.png";
                                                                        }}
                                                                    />
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </>
                                    )}
                                </div>
                            </>
                        ) : (
                            <div className={styles.no_reviews}>
                                Пока нет отзывов от клиентов
                            </div>
                        )}
                    </div>

                    {/* Кнопки управления отзывами */}
                    <div className={styles.reviews_actions}>
                        {reviews.length > 2 && (
                            <button
                                className={styles.show_all_reviews_btn}
                                onClick={visibleCount === reviews.length ? handleShowLess : handleShowMore}
                            >
                                {visibleCount === reviews.length ? 'Скрыть отзывы' : 'Показать все отзывы'}
                            </button>
                        )}
                        <button
                            className={styles.leave_review_btn}
                            onClick={handleLeaveReview}
                            style={{ display: "none" }}
                        >
                            Оставить отзыв
                        </button>
                    </div>
                </div>
            </div>

            {/* PhotoGallery для отзывов */}
            <PhotoGallery
                isOpen={isReviewGalleryOpen}
                images={reviewGalleryImages}
                currentIndex={reviewGalleryCurrentIndex}
                onClose={closeReviewGallery}
                onNext={goToNextReview}
                onPrevious={goToPreviousReview}
                onSelectImage={selectReviewImage}
            />

            {/* Модальное окно для оставления отзыва */}
            {showReviewModal && (
                <div className={styles.modalOverlay}>
                    <div className={styles.reviewModal}>
                        <div className={styles.modalHeader}>
                            <h2>Оставьте отзыв о работе</h2>
                        </div>

                        <div className={styles.modalContent}>
                            <div className={styles.commentSection}>
                                <textarea
                                    value={reviewText}
                                    onChange={(e) => setReviewText(e.target.value)}
                                    placeholder="Расскажите о вашем опыте работы..."
                                    className={styles.commentTextarea}
                                />
                            </div>

                            <div className={styles.photoSection}>
                                <label>Приложите фото</label>
                                <div className={styles.photoUploadContainer}>
                                    <div className={styles.photoPreviews}>
                                        {reviewPhotos.map((photo, index) => (
                                            <div key={index} className={styles.photoPreview}>
                                                <img
                                                    src={URL.createObjectURL(photo)}
                                                    alt={`Preview ${index + 1}`}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => removeReviewPhoto(index)}
                                                    className={styles.removePhoto}
                                                >
                                                    ×
                                                </button>
                                            </div>
                                        ))}

                                        <div className={styles.photoUpload}>
                                            <input
                                                type="file"
                                                id="review-photos"
                                                multiple
                                                accept="image/*"
                                                onChange={handleReviewPhotoUpload}
                                                className={styles.fileInput}
                                                ref={reviewPhotoInputRef}
                                            />
                                            <label htmlFor="review-photos" className={styles.photoUploadButton}>
                                                +
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className={styles.ratingSection}>
                                <label>Поставьте оценку</label>
                                <div className={styles.stars}>
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <button
                                            key={star}
                                            type="button"
                                            className={`${styles.star} ${star <= selectedStars ? styles.active : ''}`}
                                            onClick={() => handleStarClick(star)}
                                        >
                                            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                                                <g clipPath="url(#clip0_248_13358)">
                                                    <path d="M12 2.49023L15.51 8.17023L22 9.76023L17.68 14.8502L18.18 21.5102L12 18.9802L5.82 21.5102L6.32 14.8502L2 9.76023L8.49 8.17023L12 2.49023Z" stroke="currentColor" strokeWidth="2" strokeMiterlimit="10"/>
                                                    <path d="M12 19V18.98" stroke="currentColor" strokeWidth="2" strokeMiterlimit="10"/>
                                                </g>
                                                <defs>
                                                    <clipPath id="clip0_248_13358">
                                                        <rect width="24" height="24" fill="white"/>
                                                    </clipPath>
                                                </defs>
                                            </svg>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className={styles.modalActions}>
                            <button
                                className={styles.closeButton}
                                onClick={handleCloseReviewModal}
                                disabled={isSubmittingReview}
                            >
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <g clipPath="url(#clip0_551_2371)">
                                        <g clipPath="url(#clip1_551_2371)">
                                            <path d="M12 22.5C17.799 22.5 22.5 17.799 22.5 12C22.5 6.20101 17.799 1.5 12 1.5C6.20101 1.5 1.5 6.20101 1.5 12C1.5 17.799 6.20101 22.5 12 22.5Z" stroke="#101010" strokeWidth="2" strokeMiterlimit="10"/>
                                            <path d="M16.7705 7.22998L7.23047 16.77" stroke="#101010" strokeWidth="2" strokeMiterlimit="10"/>
                                            <path d="M7.23047 7.22998L16.7705 16.77" stroke="#101010" strokeWidth="2" strokeMiterlimit="10"/>
                                        </g>
                                    </g>
                                    <defs>
                                        <clipPath id="clip0_551_2371">
                                            <rect width="24" height="24" fill="white"/>
                                        </clipPath>
                                        <clipPath id="clip1_551_2371">
                                            <rect width="24" height="24" fill="white"/>
                                        </clipPath>
                                    </defs>
                                </svg>
                                Закрыть
                            </button>
                            <button
                                className={styles.submitButton}
                                onClick={handleSubmitReview}
                                disabled={isSubmittingReview || !reviewText.trim() || selectedStars === 0}
                            >
                                {isSubmittingReview ? 'Отправка...' : 'Отправить'}
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <g clipPath="url(#clip0_551_2758)">
                                        <path d="M12 22.5C17.799 22.5 22.5 17.799 22.5 12C22.5 6.20101 17.799 1.5 12 1.5C6.20101 1.5 1.5 6.20101 1.5 12C1.5 17.799 6.20101 22.5 12 22.5Z" stroke="white" strokeWidth="2" strokeMiterlimit="10"/>
                                        <path d="M6.26953 12H17.7295" stroke="white" strokeWidth="2" strokeMiterlimit="10"/>
                                        <path d="M12.96 7.22998L17.73 12L12.96 16.77" stroke="white" strokeWidth="2" strokeMiterlimit="10"/>
                                    </g>
                                    <defs>
                                        <clipPath id="clip0_551_2758">
                                            <rect width="24" height="24" fill="white"/>
                                        </clipPath>
                                    </defs>
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Master;