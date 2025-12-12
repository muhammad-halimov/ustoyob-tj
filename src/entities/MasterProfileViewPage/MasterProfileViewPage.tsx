import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getAuthToken } from '../../utils/auth';
import styles from '../../pages/profile/ProfilePage.module.scss';
import { fetchUserById } from "../../utils/api.ts";
import AuthModal from '../../shared/ui/AuthModal/AuthModal';

// Базовый интерфейс для пользователя
interface UserBasicInfo {
    id: number;
    email?: string;
    name?: string;
    surname?: string;
    rating?: number;
    image?: string;
}

// Интерфейсы данных
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
    services: Service[];
    addresses: FormattedAddress[];
}

interface Occupation {
    id: number;
    title: string;
}

interface Education {
    id: string;
    institution: string;
    faculty: string;
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
    unit?: string;
}

interface FormattedAddress {
    id: number;
    province?: string;
    city?: string;
    district?: string;
    suburb?: string;
    settlement?: string;
    community?: string;
    village?: string;
    fullAddress: string;
}

interface Review {
    id: number;
    user: UserBasicInfo;
    reviewer: UserBasicInfo;
    rating: number;
    description: string;
    forReviewer: boolean;
    services: {
        id: number;
        title: string;
    };
    images: {
        id: number;
        image: string;
    }[];
    vacation?: string;
    worker?: string;
    date?: string;
}

interface ServiceTicket {
    id: number;
    title: string;
    budget: string;
    unit: string;
}

// Интерфейсы для API ответов
interface ReviewApiResponse {
    id: number;
    rating?: number;
    description?: string;
    forClient?: boolean;
    services?: { id: number; title: string };
    images?: Array<{ id: number; image: string }>;
    master?: { id: number };
    client?: { id: number };
    createdAt?: string;
}

interface ServiceTicketResponse {
    id: number;
    title: string;
    budget: number;
    unit?: { title: string };
    service?: boolean;
    active?: boolean;
    master?: {
        id: number;
        [key: string]: unknown;
    };
}

interface GalleryItem {
    id?: number;
    image?: string;
}

interface GalleryResponse {
    id?: number;
    images?: GalleryItem[];
    user?: {
        id: number;
        [key: string]: unknown;
    };
}

interface UserApiData {
    id: number;
    email?: string;
    name?: string;
    surname?: string;
    patronymic?: string;
    rating?: number;
    image?: string;
    occupation?: Occupation[];
    education?: EducationApiData[] | unknown;
    districts?: DistrictApiData[];
    addresses?: UserAddressApiData[] | unknown;
    [key: string]: unknown;
}

interface EducationApiData {
    id?: number;
    uniTitle?: string;
    faculty?: string;
    occupation?: Occupation[];
    beginning?: number;
    ending?: number;
    graduated?: boolean;
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

interface UserAddressApiData {
    id: number;
    suburb?: string | { title: string };
    district?: string | { title: string };
    city?: string | { title: string };
    province?: string | { title: string };
    settlement?: string | { title: string };
    community?: string | { title: string };
    village?: string | { title: string };
    [key: string]: unknown;
}

const API_BASE_URL = 'https://admin.ustoyob.tj';

function MasterProfileViewPage() {
    const { id } = useParams<{ id: string }>();
    const masterId = id ? parseInt(id) : null;
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(true);
    const [profileData, setProfileData] = useState<ProfileData | null>(null);
    const [reviews, setReviews] = useState<Review[]>([]);
    const [reviewsLoading, setReviewsLoading] = useState(false);
    const [showAllReviews, setShowAllReviews] = useState(false);
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [services, setServices] = useState<ServiceTicket[]>([]);

    useEffect(() => {
        if (masterId) {
            fetchMasterData(masterId);
        }
    }, [masterId]);

    useEffect(() => {
        if (profileData?.id) {
            fetchUserGallery(parseInt(profileData.id));
            fetchReviews(parseInt(profileData.id));
            fetchMasterServices(parseInt(profileData.id));
        }
    }, [profileData?.id]);


    const getAddressId = (address: UserAddressApiData | null | undefined): number => {
        if (!address) return Date.now();

        if (typeof address === 'object' && 'id' in address && typeof address.id === 'number') {
            return address.id;
        }

        return Date.now();
    };

    // Функция для получения названия из объекта или строки
    const getTitle = (item: unknown): string => {
        if (!item) return '';

        // Если это строка
        if (typeof item === 'string') {
            return item.trim();
        }

        // Если это объект с полем title
        if (typeof item === 'object' && item !== null && 'title' in item) {
            const titleValue = (item as { title: unknown }).title;
            if (typeof titleValue === 'string') {
                return titleValue.trim();
            }
        }

        return '';
    };

    // Функция для форматирования адреса
    const formatAddress = (address: UserAddressApiData): FormattedAddress => {
        // Проверяем, что адрес это объект
        if (!address || typeof address !== 'object' || address === null) {
            return {
                id: Date.now(),
                fullAddress: 'Неверный формат адреса'
            };
        }

        const id = getAddressId(address);
        const province = getTitle(address.province);
        const city = getTitle(address.city);
        const district = getTitle(address.district);
        const suburb = getTitle(address.suburb);
        const settlement = getTitle(address.settlement);
        const community = getTitle(address.community);
        const village = getTitle(address.village);

        // Собираем полный адрес из непустых частей
        const addressParts = [
            province,
            city,
            district,
            suburb,
            settlement,
            community,
            village
        ].filter(part => part && part.trim() !== '');

        const fullAddress = addressParts.join(', ') || 'Адрес не указан';

        return {
            id,
            province,
            city,
            district,
            suburb,
            settlement,
            community,
            village,
            fullAddress
        };
    };

    // Функция для получения всех адресов мастера
    const getAllAddresses = (addresses: unknown): FormattedAddress[] => {
        // Проверяем, что addresses это массив
        if (!addresses || !Array.isArray(addresses) || addresses.length === 0) {
            return [];
        }

        return addresses.map((item: unknown) => {
            // Проверяем, что это объект
            if (!item || typeof item !== 'object' || item === null) {
                return {
                    id: Date.now(),
                    fullAddress: 'Неверный формат адреса'
                };
            }

            // Приводим к типу UserAddressApiData
            const address = item as UserAddressApiData;
            return formatAddress(address);
        });
    };

    // Загрузка услуг мастера (тикетов)
    const fetchMasterServices = async (masterId: number) => {
        try {
            const token = getAuthToken();

            if (!token) {
                console.log('No token available for fetching services');
                setServices([]);
                return;
            }

            // Используем правильный endpoint для получения услуг (тикетов) мастера
            const endpoint = `/api/tickets?service=true&master.id=${masterId}&active=true`;
            console.log('Fetching master services from:', endpoint);

            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
            });

            if (response.status === 401) {
                navigate('/');
                return;
            }

            if (!response.ok) {
                console.error(`Failed to fetch services: ${response.status} ${response.statusText}`);
                setServices([]);
                return;
            }

            const servicesData = await response.json();
            console.log('Master services received:', servicesData);

            let servicesArray: ServiceTicketResponse[] = [];

            // Обрабатываем разные форматы ответа
            if (Array.isArray(servicesData)) {
                servicesArray = servicesData;
            } else if (servicesData && typeof servicesData === 'object') {
                // Проверяем, есть ли hydra:member
                if (servicesData['hydra:member'] && Array.isArray(servicesData['hydra:member'])) {
                    servicesArray = servicesData['hydra:member'];
                } else if (servicesData.id) {
                    // Если это один объект
                    servicesArray = [servicesData];
                }
            }

            console.log(`Found ${servicesArray.length} services for master ${masterId}`);

            // Преобразуем услуги в нужный формат
            const masterServices: ServiceTicket[] = servicesArray
                .filter(service => {
                    // Фильтруем только услуги, принадлежащие текущему мастеру
                    const isService = service.service === true;
                    const belongsToMaster = service.master?.id === masterId;
                    const isActive = service.active !== false;

                    console.log(`Service ${service.id}: service=${isService}, masterMatch=${belongsToMaster}, active=${isActive}`);
                    return isService && belongsToMaster && isActive;
                })
                .map(service => {
                    const budget = typeof service.budget === 'number' ? service.budget.toString() : String(service.budget || '0');
                    const unit = service.unit?.title || 'TJS';

                    return {
                        id: service.id,
                        title: service.title || 'Услуга',
                        budget: budget,
                        unit: unit
                    };
                });

            console.log('Filtered and transformed master services:', masterServices);
            setServices(masterServices);

        } catch (error) {
            console.error('Error fetching master services:', error);
            setServices([]);
        }
    };

    // Функция для получения URL аватара
    const getAvatarUrl = async (userData: UserApiData): Promise<string | null> => {
        if (!userData || !userData.image) return null;

        const serverUrl = `${API_BASE_URL}/images/profile_photos/${userData.image}`;
        if (await checkImageExists(serverUrl)) {
            return serverUrl;
        }

        const alternativeUrl = `${API_BASE_URL}/${userData.image}`;
        if (await checkImageExists(alternativeUrl)) {
            return alternativeUrl;
        }

        return null;
    };

    // Загрузка данных мастера
    const fetchMasterData = async (masterId: number) => {
        try {
            setIsLoading(true);
            const token = getAuthToken();

            if (!token) {
                navigate('/');
                return;
            }

            const rawMasterData = await fetchUserById(masterId);

            if (!rawMasterData) {
                console.error('Master not found');
                setProfileData(null);
                return;
            }

            console.log('Master data received:', rawMasterData);

            // Приводим данные к UserApiData
            const masterData = rawMasterData as UserApiData;

            const avatarUrl = await getAvatarUrl(masterData);

            // Получаем все адреса мастера
            const formattedAddresses = getAllAddresses(masterData.addresses);

            // Берем первый адрес для отображения в основной информации
            const primaryAddress = formattedAddresses.length > 0
                ? formattedAddresses[0].fullAddress
                : 'Адрес не указан';

            // Преобразуем education в правильный формат
            let educationArray: EducationApiData[] = [];
            if (masterData.education && Array.isArray(masterData.education)) {
                educationArray = masterData.education as EducationApiData[];
            }

            // Получаем специальность
            let specialty = 'Специальность';
            if (masterData.occupation && Array.isArray(masterData.occupation)) {
                const occupations = masterData.occupation as Occupation[];
                specialty = occupations.map((occ: Occupation) => occ.title).join(', ');
            }

            const transformedData: ProfileData = {
                id: masterData.id.toString(),
                fullName: [masterData.surname, masterData.name, masterData.patronymic]
                    .filter(Boolean)
                    .join(' ') || 'Фамилия Имя Отчество',
                specialty,
                rating: typeof masterData.rating === 'number' ? masterData.rating : 0,
                reviews: 0,
                avatar: avatarUrl,
                education: transformEducation(educationArray),
                workExamples: [],
                workArea: primaryAddress,
                addresses: formattedAddresses,
                services: []
            };

            setProfileData(transformedData);

        } catch (error) {
            console.error('Error fetching master data:', error);
            setProfileData(null);
        } finally {
            setIsLoading(false);
        }
    };

    // Вспомогательная функция для создания UserBasicInfo из UserApiData
    const createUserBasicInfo = async (userData: UserApiData | null, defaultName: string = 'Пользователь'): Promise<UserBasicInfo> => {
        if (!userData) {
            return {
                id: 0,
                name: defaultName,
                surname: '',
                rating: 0
            };
        }

        return {
            id: userData.id,
            email: userData.email || '',
            name: userData.name || defaultName,
            surname: userData.surname || '',
            rating: typeof userData.rating === 'number' ? userData.rating : 0,
            image: await getAvatarUrl(userData) || ''
        };
    };

    // Загрузка отзывов
    const fetchReviews = async (masterId: number) => {
        try {
            setReviewsLoading(true);
            const token = getAuthToken();

            if (!token) {
                console.log('No token available for fetching reviews');
                setReviews([]);
                return;
            }

            console.log('Fetching reviews for master ID:', masterId);

            const endpoint = `/api/reviews?master=${masterId}`;
            console.log('Fetching reviews from endpoint:', endpoint);

            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
            });

            if (response.status === 401) {
                console.log('Unauthorized, redirecting to login');
                navigate('/');
                return;
            }

            if (response.status === 404) {
                console.log('No reviews found (404)');
                setReviews([]);
                return;
            }

            if (!response.ok) {
                console.error(`Failed to fetch reviews: ${response.status} ${response.statusText}`);
                setReviews([]);
                return;
            }

            const reviewsData = await response.json();
            console.log('Raw reviews data structure:', reviewsData);

            let reviewsArray: ReviewApiResponse[] = [];

            if (Array.isArray(reviewsData)) {
                reviewsArray = reviewsData;
                console.log(`Got ${reviewsArray.length} reviews as array`);
            } else if (reviewsData && typeof reviewsData === 'object') {
                if (reviewsData['hydra:member'] && Array.isArray(reviewsData['hydra:member'])) {
                    reviewsArray = reviewsData['hydra:member'];
                    console.log(`Got ${reviewsArray.length} reviews from hydra:member`);
                } else if (reviewsData.id) {
                    reviewsArray = [reviewsData];
                    console.log('Got single review object');
                } else {
                    console.log('No reviews found in response');
                }
            }

            if (reviewsArray.length > 0) {
                console.log('Processing reviews:', reviewsArray);

                const transformedReviews = await Promise.all(
                    reviewsArray.map(async (review: ReviewApiResponse) => {
                        console.log('Processing review:', review);

                        // Получаем данные клиента (автора отзыва)
                        let clientData: UserApiData | null = null;
                        if (review.client?.id) {
                            try {
                                clientData = await fetchUserById(review.client.id);
                            } catch (error) {
                                console.error('Error fetching client data:', error);
                            }
                        }

                        // Получаем данные мастера
                        let masterData: UserApiData | null = null;
                        if (review.master?.id) {
                            try {
                                masterData = await fetchUserById(review.master.id);
                            } catch (error) {
                                console.error('Error fetching master data:', error);
                            }
                        }

                        // Создаем базовую информацию о пользователях
                        const clientBasicInfo = await createUserBasicInfo(clientData, 'Клиент');
                        const masterBasicInfo = await createUserBasicInfo(masterData, 'Мастер');

                        // Определяем кто оставил отзыв (клиент или другой мастер)
                        const isReviewForCurrentMaster = review.master?.id === masterId;

                        // Если отзыв о текущем мастере, то автор - клиент
                        if (isReviewForCurrentMaster) {
                            const author = clientBasicInfo;
                            const masterProfile = masterBasicInfo;

                            const transformedReview: Review = {
                                id: review.id,
                                rating: review.rating || 0,
                                description: review.description || '',
                                forReviewer: review.forClient || false,
                                services: review.services || { id: 0, title: 'Услуга' },
                                images: review.images || [],
                                user: masterProfile,
                                reviewer: author,
                                vacation: profileData?.specialty,
                                worker: `${author.name || ''} ${author.surname || ''}`.trim() || 'Пользователь',
                                date: review.createdAt ?
                                    new Date(review.createdAt).toLocaleDateString('ru-RU', {
                                        day: 'numeric',
                                        month: 'long',
                                        year: 'numeric'
                                    }) :
                                    getFormattedDate()
                            };

                            return transformedReview;
                        } else {
                            // Отзыв о другом мастере или другой тип отзыва
                            const author = masterBasicInfo.id !== 0 ? masterBasicInfo : clientBasicInfo;
                            const targetUser = clientBasicInfo.id !== 0 ? clientBasicInfo : masterBasicInfo;

                            const transformedReview: Review = {
                                id: review.id,
                                rating: review.rating || 0,
                                description: review.description || '',
                                forReviewer: review.forClient || false,
                                services: review.services || { id: 0, title: 'Услуга' },
                                images: review.images || [],
                                user: targetUser,
                                reviewer: author,
                                vacation: profileData?.specialty,
                                worker: `${author.name || ''} ${author.surname || ''}`.trim() || 'Пользователь',
                                date: review.createdAt ?
                                    new Date(review.createdAt).toLocaleDateString('ru-RU', {
                                        day: 'numeric',
                                        month: 'long',
                                        year: 'numeric'
                                    }) :
                                    getFormattedDate()
                            };

                            return transformedReview;
                        }
                    })
                );

                console.log('Transformed reviews:', transformedReviews);
                setReviews(transformedReviews);

                if (profileData) {
                    setProfileData(prev => prev ? {
                        ...prev,
                        reviews: transformedReviews.length
                    } : null);
                }

            } else {
                console.log('No reviews to display');
                setReviews([]);
            }

        } catch (error) {
            console.error('Error fetching reviews:', error);
            setReviews([]);
        } finally {
            setReviewsLoading(false);
        }
    };

    // Загрузка галереи работ
    const fetchUserGallery = async (masterId: number) => {
        try {
            const token = getAuthToken();
            if (!token) {
                console.log('No token for gallery fetch');
                return;
            }

            const endpoint = `/api/galleries?user=${masterId}`;
            console.log('Fetching gallery from:', endpoint);

            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
            });

            if (!response.ok) {
                console.log(`Gallery fetch failed: ${response.status} ${response.statusText}`);
                updateWorkExamples([]);
                return;
            }

            const galleriesData = await response.json();
            console.log('Gallery data received:', galleriesData);

            let galleryArray: GalleryResponse[] = [];

            if (Array.isArray(galleriesData)) {
                galleryArray = galleriesData;
            } else if (galleriesData && typeof galleriesData === 'object') {
                if (galleriesData['hydra:member'] && Array.isArray(galleriesData['hydra:member'])) {
                    galleryArray = galleriesData['hydra:member'];
                } else if (galleriesData.id) {
                    galleryArray = [galleriesData];
                }
            }

            console.log(`Found ${galleryArray.length} galleries`);

            if (galleryArray.length > 0) {
                const userGallery = galleryArray.find(gallery =>
                    gallery.user?.id === masterId
                ) || galleryArray[0];

                const galleryItems = userGallery?.images || [];
                console.log(`Found ${galleryItems.length} images in gallery`);

                if (galleryItems.length > 0) {
                    const workExamplesLocal = await Promise.all(
                        galleryItems.map(async (image: GalleryItem, index: number) => {
                            let imageUrl = "../fonTest6.png";

                            if (image.image) {
                                const imagePath = image.image;
                                const possibleUrls = [
                                    imagePath,
                                    `${API_BASE_URL}${imagePath}`,
                                    `${API_BASE_URL}/images/gallery_photos/${imagePath}`,
                                    `${API_BASE_URL}/images/${imagePath}`
                                ];

                                for (const url of possibleUrls) {
                                    if (await checkImageExists(url)) {
                                        imageUrl = url;
                                        break;
                                    }
                                }
                            }

                            return {
                                id: image.id?.toString() || `gallery-${index}-${Date.now()}`,
                                image: imageUrl,
                                title: "Пример работы"
                            };
                        })
                    );

                    console.log('Processed work examples:', workExamplesLocal);
                    updateWorkExamples(workExamplesLocal);
                } else {
                    console.log('No images in gallery');
                    updateWorkExamples([]);
                }
            } else {
                console.log('No galleries found');
                updateWorkExamples([]);
            }

        } catch (error) {
            console.error('Error fetching user gallery:', error);
            updateWorkExamples([]);
        }
    };

    // Вспомогательная функция для обновления примеров работ
    const updateWorkExamples = (workExamples: WorkExample[]) => {
        setProfileData(prev => prev ? {
            ...prev,
            workExamples
        } : null);
    };

    // Вспомогательные функции
    const checkImageExists = (url: string): Promise<boolean> => {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => resolve(true);
            img.onerror = () => resolve(false);
            img.src = url;
        });
    };

    const transformEducation = (education: EducationApiData[]): Education[] => {
        return education.map(edu => ({
            id: edu.id?.toString() || Date.now().toString(),
            institution: edu.uniTitle || '',
            faculty: edu.faculty || '',
            specialty: edu.occupation?.map((occ: Occupation) => occ.title).join(', ') || '',
            startYear: edu.beginning?.toString() || '',
            endYear: edu.ending?.toString() || '',
            currentlyStudying: !edu.graduated
        }));
    };

    const getFormattedDate = (): string => {
        const now = new Date();
        const day = now.getDate().toString().padStart(2, '0');
        const month = (now.getMonth() + 1).toString().padStart(2, '0');
        const year = now.getFullYear();
        return `${day}.${month}.${year}`;
    };

    const getReviewerAvatarUrl = (review: Review) => {
        if (review.reviewer.image && review.reviewer.image !== "../fonTest6.png") {
            const possiblePaths = [
                review.reviewer.image,
                `${API_BASE_URL}/images/profile_photos/${review.reviewer.image}`,
                `${API_BASE_URL}/${review.reviewer.image}`
            ];

            for (const path of possiblePaths) {
                if (path) return path;
            }
        }

        return "../fonTest6.png";
    };

    const getClientName = (review: Review) => {
        if (!review.reviewer.name && !review.reviewer.surname) {
            return 'Клиент';
        }
        return `${review.reviewer.name || ''} ${review.reviewer.surname || ''}`.trim();
    };

    const getImageUrlWithCacheBust = (url: string): string => {
        if (!url || url === "../fonTest6.png") return url;
        const timestamp = new Date().getTime();
        const separator = url.includes('?') ? '&' : '?';
        return `${url}${separator}t=${timestamp}`;
    };

    const handleShowMore = () => {
        setShowAllReviews(!showAllReviews);
    };

    const handleAuthModalClose = () => {
        setShowAuthModal(false);
    };

    const handleAuthSuccess = () => {
        setShowAuthModal(false);
    };

    const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
        const img = e.currentTarget;
        img.src = "../fonTest6.png";
    };

    const displayedReviews = showAllReviews ? reviews : reviews.slice(0, 2);
    const hasMoreReviews = reviews.length > 2;

    if (isLoading) {
        return <div className={styles.profile}>Загрузка профиля...</div>;
    }

    if (!profileData) {
        return <div className={styles.profile}>Профиль не найден</div>;
    }

    return (
        <div className={styles.profile}>
            <div className={styles.profile_wrap}>
                {/* Основная информация */}
                <div className={styles.profile_content}>
                    <div className={styles.avatar_section}>
                        <div className={styles.avatar_container}>
                            {profileData.avatar ? (
                                <img
                                    src={profileData.avatar}
                                    alt="Аватар"
                                    className={styles.avatar}
                                    onError={handleImageError}
                                />
                            ) : (
                                <img
                                    src="../fonTest6.png"
                                    alt="Фото профиля"
                                    className={styles.avatar_placeholder}
                                />
                            )}
                        </div>
                    </div>

                    <div className={styles.profile_info}>
                        <div className={styles.name_specialty}>
                            <h1 className={styles.name}>
                                {profileData.fullName}
                            </h1>
                            <div className={styles.specialty}>
                                {profileData.specialty}
                            </div>
                        </div>

                        <div className={styles.rating_reviews}>
                            <div className={styles.rating}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M12 2.49023L15.51 8.17023L22 9.76023L17.68 14.8502L18.18 21.5102L12 18.9802L5.82 21.5102L6.32 14.8502L2 9.76023L8.49 8.17023L12 2.49023Z"
                                          stroke="#3A54DA" strokeWidth="2" strokeMiterlimit="10"/>
                                </svg>
                                <span>{profileData.rating.toFixed(1)}</span>
                            </div>
                            <div className={styles.reviews}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M12 1.47998C6.2 1.47998 1.5 5.74998 1.5 11C1.52866 13.0153 2.23294 14.9626 3.5 16.53L2.5 21.53L9.16 20.2C10.1031 20.4499 11.0744 20.5776 12.05 20.58C17.85 20.58 22.55 16.3 22.55 11.03C22.55 5.75998 17.8 1.47998 12 1.47998Z"
                                          stroke="#3A54DA" strokeWidth="2" strokeMiterlimit="10"/>
                                </svg>
                                <span>{reviews.length} отзывов</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Секция "О себе" */}
                <div className={styles.about_section}>
                    {/* Образование */}
                    <h3 className={styles.section_subtitle}>Образование и опыт</h3>
                    <div className={styles.section_item}>
                        {profileData.education.length > 0 ? (
                            profileData.education.map(edu => (
                                <div key={edu.id} className={styles.education_item}>
                                    <div className={styles.education_main}>
                                        <div className={styles.education_header}>
                                            <strong>{edu.institution}</strong>
                                        </div>
                                        <div className={styles.education_years}>
                                            <span>{edu.startYear} - {edu.currentlyStudying ? 'По настоящее время' : edu.endYear}</span>
                                        </div>
                                        {(edu.faculty || edu.specialty) && (
                                            <div className={styles.education_details}>
                                                {edu.faculty && <span>Факультет: {edu.faculty}</span>}
                                                {edu.specialty && <span>Специальность: {edu.specialty}</span>}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className={styles.empty_state}>Образование не указано</div>
                        )}
                    </div>

                    {/* Примеры работ */}
                    <h3 className={styles.section_subtitle}>Примеры работ</h3>
                    <div className={styles.section_item}>
                        {profileData.workExamples.length > 0 ? (
                            <div className={styles.work_examples_grid}>
                                {profileData.workExamples.map(work => (
                                    <div key={work.id} className={styles.work_example}>
                                        <img
                                            src={getImageUrlWithCacheBust(work.image)}
                                            alt={work.title}
                                            onError={handleImageError}
                                        />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className={styles.empty_state}>Примеры работ не добавлены</div>
                        )}
                    </div>

                    {/* Адреса мастера */}
                    <h3 className={styles.section_subtitle}>Адреса работы</h3>
                    <div className={styles.section_item}>
                        {profileData.addresses.length > 0 ? (
                            <div className={styles.addresses_list}>
                                {profileData.addresses.map(address => (
                                    <div key={address.id} className={styles.address_item}>
                                        <div className={styles.address_full}>
                                            {address.fullAddress}
                                        </div>
                                        <div className={styles.address_details}>
                                            {address.province && (
                                                <div className={styles.address_detail}>
                                                    <span className={styles.address_label}>Провинция:</span>
                                                    <span className={styles.address_value}>{address.province}</span>
                                                </div>
                                            )}
                                            {address.district && (
                                                <div className={styles.address_detail}>
                                                    <span className={styles.address_label}>Район:</span>
                                                    <span className={styles.address_value}>{address.district}</span>
                                                </div>
                                            )}
                                            {address.suburb && (
                                                <div className={styles.address_detail}>
                                                    <span className={styles.address_label}>Микрорайон:</span>
                                                    <span className={styles.address_value}>{address.suburb}</span>
                                                </div>
                                            )}
                                            {address.settlement && (
                                                <div className={styles.address_detail}>
                                                    <span className={styles.address_label}>Поселение:</span>
                                                    <span className={styles.address_value}>{address.settlement}</span>
                                                </div>
                                            )}
                                            {address.community && (
                                                <div className={styles.address_detail}>
                                                    <span className={styles.address_label}>Община:</span>
                                                    <span className={styles.address_value}>{address.community}</span>
                                                </div>
                                            )}
                                            {address.village && (
                                                <div className={styles.address_detail}>
                                                    <span className={styles.address_label}>Деревня:</span>
                                                    <span className={styles.address_value}>{address.village}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className={styles.empty_state}>Адреса не указаны</div>
                        )}
                    </div>

                    {/* Услуги и цены */}
                    <h3 className={styles.section_subtitle}>Услуги и цены</h3>
                    <div className={styles.section_item}>
                        {services.length > 0 ? (
                            <div className={styles.services_display}>
                                {services.map(service => (
                                    <div key={service.id} className={styles.service_display_item}>
                                        <span className={styles.service_name}>{service.title}</span>
                                        <span className={styles.service_price}>{service.budget} {service.unit}</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className={styles.empty_state}>Услуги не указаны</div>
                        )}
                    </div>
                </div>

                {/* Отзывы */}
                <h2 className={styles.section_title}>Отзывы</h2>
                <div className={styles.reviews_section}>
                    <div className={styles.reviews_list}>
                        {reviewsLoading ? (
                            <div className={styles.loading}>Загрузка отзывов...</div>
                        ) : displayedReviews.length > 0 ? (
                            displayedReviews.map((review) => (
                                <div key={review.id} className={styles.review_item}>
                                    <div className={styles.review_header}>
                                        <div className={styles.reviewer_info}>
                                            <img
                                                src={getReviewerAvatarUrl(review)}
                                                alt={getClientName(review)}
                                                className={styles.reviewer_avatar}
                                                onError={handleImageError}
                                            />
                                            <div className={styles.reviewer_main_info}>
                                                <div className={styles.reviewer_name}>
                                                    {getClientName(review)}
                                                </div>
                                                <div className={styles.review_rating_main}>
                                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                        <path d="M12 2.49023L15.51 8.17023L22 9.76023L17.68 14.8502L18.18 21.5102L12 18.9802L5.82 21.5102L6.32 14.8502L2 9.76023L8.49 8.17023L12 2.49023Z"
                                                              stroke="#3A54DA" strokeWidth="2" strokeMiterlimit="10"/>
                                                    </svg>
                                                    <span className={styles.rating_value}>{review.rating.toFixed(1)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className={styles.review_details}>
                                        <div className={styles.review_worker_date}>
                                            <span className={styles.review_date}>{review.date}</span>
                                        </div>
                                    </div>
                                    {review.description && (
                                        <div className={styles.review_text}>
                                            {review.description}
                                        </div>
                                    )}
                                </div>
                            ))
                        ) : (
                            <div className={styles.no_reviews}>Пока нет отзывов</div>
                        )}
                    </div>

                    {hasMoreReviews && (
                        <div className={styles.reviews_actions}>
                            <button
                                className={styles.show_all_reviews_btn}
                                onClick={handleShowMore}
                            >
                                {showAllReviews ? 'Скрыть отзывы' : 'Показать все отзывы'}
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Модальное окно авторизации */}
            {showAuthModal && (
                <div className={styles.modalOverlay}>
                    <AuthModal
                        isOpen={showAuthModal}
                        onClose={handleAuthModalClose}
                        onLoginSuccess={handleAuthSuccess}
                    />
                </div>
            )}
        </div>
    );
}

export default MasterProfileViewPage;