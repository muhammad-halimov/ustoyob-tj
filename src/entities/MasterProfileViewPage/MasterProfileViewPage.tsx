import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { getAuthToken } from '../../utils/auth';
import styles from '../../pages/profile/MasterProfilePage.module.scss';
// import { fetchUserById } from "../../utils/api.ts";
import AuthModal from '../../shared/ui/AuthModal/AuthModal';

// Базовый интерфейс для пользователя
interface UserBasicInfo {
    id: number;
    email?: string;
    name?: string;
    surname?: string;
    rating?: number;
    image?: string | null;
}


interface UserUpdateResponse {
    id: number;
    rating: number;
    updatedAt: string;
    [key: string]: unknown;
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
    type?: string;
    rating?: number;
    description?: string;
    forClient?: boolean;
    services?: { id: number; title: string };
    images?: Array<{ id: number; image: string }>;
    master?: {
        id: number;
        name?: string;
        surname?: string;
        email?: string;
        image?: string;
    };
    client?: {
        id: number;
        name?: string;
        surname?: string;
        email?: string;
        image?: string;
    };
    createdAt?: string;
    [key: string]: unknown;
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

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

function MasterProfileViewPage() {
    const { id } = useParams<{ id: string }>();
    const masterId = id ? parseInt(id) : null;
    const [isLoading, setIsLoading] = useState(true);
    const [profileData, setProfileData] = useState<ProfileData | null>(null);
    const [reviews, setReviews] = useState<Review[]>([]);
    const [reviewsLoading, setReviewsLoading] = useState(false);
    const [showAllReviews, setShowAllReviews] = useState(false);
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [services, setServices] = useState<ServiceTicket[]>([]);

    // Функция для расчета среднего рейтинга из отзывов
    const calculateAverageRating = useCallback((reviewsList: Review[]): number => {
        if (!reviewsList || reviewsList.length === 0) return 0;

        // Фильтруем только валидные рейтинги
        const validReviews = reviewsList.filter(review => {
            return review.rating !== undefined &&
                review.rating !== null &&
                !isNaN(review.rating) &&
                review.rating >= 0 &&
                review.rating <= 5;
        });

        if (validReviews.length === 0) return 0;

        const totalRating = validReviews.reduce((sum, review) => sum + review.rating, 0);
        const averageRating = totalRating / validReviews.length;

        // Округляем до одного знака после запятой, но не меньше 0.1
        const roundedRating = Math.max(0.1, Math.round(averageRating * 10) / 10);

        return Math.min(5, roundedRating); // Ограничиваем максимум 5
    }, []);

    // Функция для обновления рейтинга пользователя на сервере
    const updateUserRating = async (userId: number, newRating: number): Promise<boolean> => {
        const MAX_RETRIES = 3;
        const RETRY_DELAY = 1000; // 1 секунда

        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            try {
                const token = getAuthToken();

                if (!token) {
                    console.warn(`Attempt ${attempt}: No token available for updating rating`);
                    if (attempt === MAX_RETRIES) return false;
                    await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
                    continue;
                }

                // Валидация данных
                if (newRating < 0 || newRating > 5) {
                    console.error(`Invalid rating value: ${newRating}. Must be between 0 and 5.`);
                    return false;
                }

                console.log(`Attempt ${attempt}: Updating rating for user ${userId} to ${newRating}`);

                const response = await fetch(`${API_BASE_URL}/api/users/${userId}`, {
                    method: 'PATCH',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/merge-patch+json',
                        'Accept': 'application/json',
                    },
                    body: JSON.stringify({
                        rating: newRating,
                        updatedAt: new Date().toISOString()
                    }),
                });

                if (response.status === 401) {
                    console.warn(`Attempt ${attempt}: Unauthorized to update rating`);
                    if (attempt === MAX_RETRIES) return false;
                    await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
                    continue;
                }

                if (response.status === 403) {
                    console.error(`Attempt ${attempt}: Forbidden to update rating`);
                    return false;
                }

                if (response.status === 404) {
                    console.error(`Attempt ${attempt}: User ${userId} not found`);
                    return false;
                }

                if (response.status === 422) {
                    const errorData = await response.json();
                    console.error(`Attempt ${attempt}: Validation error:`, errorData);
                    return false;
                }

                if (!response.ok) {
                    const errorText = await response.text();
                    console.error(`Attempt ${attempt}: Failed to update rating: ${response.status}`, errorText);
                    if (attempt === MAX_RETRIES) return false;
                    await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
                    continue;
                }

                const updatedUser: UserUpdateResponse = await response.json();
                console.log(`Successfully updated rating for user ${userId}: ${updatedUser.rating} (attempt ${attempt})`);

                // Проверяем, что рейтинг действительно обновился
                if (Math.abs(updatedUser.rating - newRating) > 0.01) {
                    console.warn(`Rating mismatch: sent ${newRating}, received ${updatedUser.rating}`);
                }

                return true;

            } catch (error) {
                console.error(`Attempt ${attempt}: Error updating user rating:`, error);
                if (attempt === MAX_RETRIES) return false;
                await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
            }
        }

        return false;
    };

    // Функция для обработки загрузки отзывов с обновлением рейтинга
    const processReviewsAndUpdateRating = useCallback(async (reviewsList: Review[], userId: number) => {
        try {
            // Рассчитываем новый средний рейтинг
            const newAverageRating = calculateAverageRating(reviewsList);

            console.log(`Calculated new average rating: ${newAverageRating} from ${reviewsList.length} reviews`);

            // Получаем текущий рейтинг из профиля
            const currentRating = profileData?.rating || 0;

            // Обновляем только если есть значительные изменения (больше 0.1) или если отзывов не было
            const hasSignificantChange = Math.abs(newAverageRating - currentRating) > 0.1;
            const hadNoReviewsBefore = reviewsList.length > 0 && (currentRating === 0 || !profileData?.reviews);

            if (hasSignificantChange || hadNoReviewsBefore || reviewsList.length === 0) {
                // Обновляем локальное состояние профиля
                if (profileData) {
                    setProfileData(prev => prev ? {
                        ...prev,
                        rating: newAverageRating,
                        reviews: reviewsList.length
                    } : null);
                }

                // Обновляем рейтинг на сервере
                if (newAverageRating >= 0 && newAverageRating <= 5) {
                    const updateSuccess = await updateUserRating(userId, newAverageRating);

                    if (updateSuccess) {
                        console.log(`Rating successfully updated to ${newAverageRating} for user ${userId}`);

                        // Обновляем список отзывов с новыми данными
                        setReviews(prevReviews =>
                            prevReviews.map(review => ({
                                ...review,
                                user: {
                                    ...review.user,
                                    rating: newAverageRating
                                }
                            }))
                        );
                    } else {
                        console.warn(`Failed to update rating on server for user ${userId}, but local state updated`);
                    }
                } else {
                    console.error(`Invalid calculated rating: ${newAverageRating}. Skipping update.`);
                }
            } else {
                console.log(`Rating change is insignificant (${newAverageRating} vs ${currentRating}). Skipping update.`);
            }

        } catch (error) {
            console.error('Error in processReviewsAndUpdateRating:', error);
        }
    }, [calculateAverageRating, profileData]);

    // Функция debounce
    const debounce = useCallback(<T extends (...args: unknown[]) => unknown>(
        func: T,
        delay: number
    ): ((...args: Parameters<T>) => void) => {
        let timeoutId: NodeJS.Timeout;
        return (...args: Parameters<T>) => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func(...args), delay);
        };
    }, []);

    // Debounced версия обновления рейтинга
    const debouncedUpdateRating = useCallback(debounce(async (...args: unknown[]) => {
        if (args.length >= 2 && typeof args[0] === 'number' && Array.isArray(args[1])) {
            const masterId = args[0] as number;
            const reviewsList = args[1] as Review[];
            if (masterId && reviewsList.length > 0) {
                await processReviewsAndUpdateRating(reviewsList, masterId);
            }
        }
    }, 500), [processReviewsAndUpdateRating]);

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

    useEffect(() => {
        if (reviews.length > 0 && masterId) {
            debouncedUpdateRating(masterId, reviews);
        }
    }, [reviews, masterId, debouncedUpdateRating]);

    const getAddressId = (address: UserAddressApiData | null | undefined): number => {
        if (!address) return Date.now();

        if (typeof address === 'object' && 'id' in address && typeof address.id === 'number') {
            return address.id;
        }

        return Date.now();
    };

    const getTitle = (item: unknown): string => {
        if (!item) return '';

        if (typeof item === 'string') {
            return item.trim();
        }

        if (typeof item === 'object' && 'title' in item) {
            const titleValue = (item as { title: unknown }).title;
            if (typeof titleValue === 'string') {
                return titleValue.trim();
            }
        }

        return '';
    };

    const formatAddress = (address: UserAddressApiData): FormattedAddress => {
        if (!address || typeof address !== 'object') {
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

    const getAllAddresses = (addresses: unknown): FormattedAddress[] => {
        if (!addresses || !Array.isArray(addresses) || addresses.length === 0) {
            return [];
        }

        return addresses.map((item: unknown) => {
            if (!item || typeof item !== 'object') {
                return {
                    id: Date.now(),
                    fullAddress: 'Неверный формат адреса'
                };
            }

            const address = item as UserAddressApiData;
            return formatAddress(address);
        });
    };

    // Загрузка услуг мастера (тикетов)
    const fetchMasterServices = async (masterId: number) => {
        try {
            const token = getAuthToken();

            const headers: HeadersInit = {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            };

            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const endpoint = `/api/tickets?service=true&master.id=${masterId}&active=true`;
            console.log('Fetching master services from:', endpoint);

            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                method: 'GET',
                headers: headers,
            });

            // Обработка ошибок авторизации
            if (response.status === 401 || response.status === 403) {
                console.log('Access denied for services, showing empty list');
                setServices([]);
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

            if (Array.isArray(servicesData)) {
                servicesArray = servicesData;
            } else if (servicesData && typeof servicesData === 'object') {
                if (servicesData['hydra:member'] && Array.isArray(servicesData['hydra:member'])) {
                    servicesArray = servicesData['hydra:member'];
                } else if (servicesData.id) {
                    servicesArray = [servicesData];
                }
            }

            console.log(`Found ${servicesArray.length} services for master ${masterId}`);

            const masterServices: ServiceTicket[] = servicesArray
                .filter(service => {
                    const isService = service.service === true;
                    const belongsToMaster = service.master?.id === masterId;
                    const isActive = service.active !== false;

                    console.log(`Service ${service.id}: service=${isService}, masterMatch=${belongsToMaster}, active=${isActive}`);
                    return isService && belongsToMaster && isActive;
                })
                .map(service => {
                    const budget = service.budget.toString();
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

    const fetchMasterData = async (masterId: number) => {
        try {
            setIsLoading(true);
            const token = getAuthToken();

            const headers: HeadersInit = {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            };

            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            console.log(`Fetching master ${masterId}...`);

            const response = await fetch(`${API_BASE_URL}/api/users/${masterId}`, {
                method: 'GET',
                headers: headers,
            });

            // Обработка ошибок авторизации
            if (response.status === 401 || response.status === 403) {
                console.log(`Access denied (${response.status}) for user ${masterId}`);
                // Можно попробовать публичный эндпоинт или продолжить без данных
                // Но если API возвращает данные даже при 401, оставляем как есть
            }

            if (!response.ok) {
                console.error(`Failed to fetch master ${masterId}: ${response.status} ${response.statusText}`);

                // Показываем базовую информацию даже при ошибке
                const fallbackData: ProfileData = {
                    id: masterId.toString(),
                    fullName: 'Мастер',
                    specialty: 'Специалист',
                    rating: 0,
                    reviews: 0,
                    avatar: null,
                    education: [],
                    workExamples: [],
                    workArea: 'Адрес не указан',
                    addresses: [],
                    services: []
                };

                setProfileData(fallbackData);
                return;
            }

            const rawMasterData = await response.json();

            if (!rawMasterData) {
                console.error('Empty response from server');
                setProfileData(null);
                return;
            }

            console.log('Master data received:', rawMasterData);

            const masterData = rawMasterData as UserApiData;

            const avatarUrl = await getAvatarUrl(masterData);

            const formattedAddresses = getAllAddresses(masterData.addresses);

            const primaryAddress = formattedAddresses.length > 0
                ? formattedAddresses[0].fullAddress
                : 'Адрес не указан';

            let educationArray: EducationApiData[] = [];
            if (masterData.education && Array.isArray(masterData.education)) {
                educationArray = masterData.education as EducationApiData[];
            }

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

    // Загрузка отзывов с обновлением рейтинга
    const fetchReviews = async (masterId: number) => {
        try {
            setReviewsLoading(true);
            const token = getAuthToken();

            const headers: HeadersInit = {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            };

            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            console.log('Fetching reviews for master ID:', masterId);
            console.log('Master ID type:', typeof masterId, 'value:', masterId);

            const endpoint = `/api/reviews`;
            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                method: 'GET',
                headers: headers,
            });

            // Обработка ошибок авторизации
            if (response.status === 401 || response.status === 403) {
                console.log('Access denied for reviews, showing empty list');
                setReviews([]);
                await processReviewsAndUpdateRating([], masterId);
                return;
            }

            if (response.status === 404) {
                console.log('No reviews found (404)');
                setReviews([]);
                await processReviewsAndUpdateRating([], masterId);
                return;
            }

            if (!response.ok) {
                console.error(`Failed to fetch reviews: ${response.status} ${response.statusText}`);
                setReviews([]);
                await processReviewsAndUpdateRating([], masterId);
                return;
            }

            const reviewsData = await response.json();
            console.log('Reviews data received:', reviewsData);

            let reviewsArray: ReviewApiResponse[] = [];

            if (Array.isArray(reviewsData)) {
                reviewsArray = reviewsData;
            } else if (reviewsData && typeof reviewsData === 'object') {
                if (reviewsData['hydra:member'] && Array.isArray(reviewsData['hydra:member'])) {
                    reviewsArray = reviewsData['hydra:member'];
                } else if (reviewsData.id) {
                    reviewsArray = [reviewsData];
                }
            }

            console.log(`Total reviews found: ${reviewsArray.length}`);

            // Детальное логирование каждого отзыва
            reviewsArray.forEach((review, index) => {
                console.log(`Review ${index}:`, {
                    id: review.id,
                    type: review.type,
                    master: review.master,
                    masterIdInReview: review.master?.id,
                    requestedMasterId: masterId,
                    isMasterType: review.type === "master",
                    masterIdsMatch: review.master?.id === masterId
                });
            });

            const masterReviews = reviewsArray.filter(review => {
                // Проверяем тип отзыва
                if (review.type !== "master") {
                    console.log(`Review ${review.id} filtered out: not master type (type: ${review.type})`);
                    return false;
                }

                const reviewMaster = review.master as { id?: number } | undefined;
                const masterIdInReview = reviewMaster?.id;

                console.log(`Checking review ${review.id}: master.id = ${masterIdInReview}, requested = ${masterId}, match = ${masterIdInReview === masterId}`);

                return masterIdInReview === masterId;
            });

            console.log(`Found ${masterReviews.length} reviews for master ${masterId}`);

            const transformedReviews: Review[] = masterReviews.map(review => {
                const client = review.client as {
                    id?: number;
                    name?: string;
                    surname?: string;
                    email?: string;
                    image?: string | null;
                } || {};

                const clientId = client.id || 0;
                const clientName = client.name || 'Клиент';
                const clientSurname = client.surname || '';
                const clientEmail = client.email || '';
                const clientImage = client.image || null;

                return {
                    id: review.id,
                    user: {
                        id: masterId,
                        rating: review.rating || 0
                    },
                    reviewer: {
                        id: clientId,
                        name: clientName,
                        surname: clientSurname,
                        email: clientEmail,
                        image: clientImage
                    },
                    rating: review.rating || 0,
                    description: review.description || '',
                    forReviewer: false,
                    services: review.services || { id: 0, title: '' },
                    images: review.images || [],
                    date: review.createdAt ? new Date(review.createdAt).toLocaleDateString('ru-RU') : ''
                };
            });

            console.log('Transformed reviews:', transformedReviews);

            setReviews(transformedReviews);

            await processReviewsAndUpdateRating(transformedReviews, masterId);

        } catch (error) {
            console.error('Error fetching reviews:', error);
            setReviews([]);
            if (masterId) {
                await processReviewsAndUpdateRating([], masterId);
            }
        } finally {
            setReviewsLoading(false);
        }
    };

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
                    const workExamplesLocal: WorkExample[] = await Promise.all(
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

    const updateWorkExamples = (workExamples: WorkExample[]) => {
        setProfileData(prev => prev ? {
            ...prev,
            workExamples
        } : null);
    };

    const getReviewerAvatarUrl = (review: Review | ReviewApiResponse) => {
        let imagePath: string | null | undefined = null;

        try {
            // Если это ReviewApiResponse
            if ('client' in review && review.client) {
                const client = review.client as { image?: string | null };
                imagePath = client.image;
            }
            // Если это обычный Review
            else if ('reviewer' in review && review.reviewer) {
                const reviewer = review.reviewer as { image?: string | null };
                imagePath = reviewer.image;
            }
        } catch (error) {
            console.error('Error getting reviewer avatar:', error);
        }

        if (imagePath && imagePath !== "../fonTest6.png") {
            const possiblePaths = [
                imagePath,
                `${API_BASE_URL}/images/profile_photos/${imagePath}`,
                `${API_BASE_URL}/${imagePath}`
            ];

            for (const path of possiblePaths) {
                if (path) return path;
            }
        }

        return "../fonTest6.png";
    };

    const getClientName = (review: Review | ReviewApiResponse): string => {
        // Если это ReviewApiResponse, то проверяем client
        if ('client' in review && review.client) {
            const client = review.client as {
                name?: string;
                surname?: string;
                [key: string]: unknown;
            };
            const name = client.name || '';
            const surname = client.surname || '';
            if (!name && !surname) {
                return 'Клиент';
            }
            return `${name} ${surname}`.trim();
        }

        // Если это обычный Review, используем reviewer
        if ('reviewer' in review && review.reviewer) {
            const reviewer = review.reviewer as {
                name?: string;
                surname?: string;
                [key: string]: unknown;
            };
            const name = reviewer.name || '';
            const surname = reviewer.surname || '';
            if (!name && !surname) {
                return 'Клиент';
            }
            return `${name} ${surname}`.trim();
        }

        return 'Клиент';
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
                    {/*<h3 className={styles.section_subtitle}>Образование и опыт</h3>*/}
                    <div className={styles.section_item}>
                        <h3>Образование и опыт</h3>
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
                    {/*<h3 className={styles.section_subtitle}>Примеры работ</h3>*/}
                    <div className={styles.section_item}>
                        <h3>Примеры работ</h3>
                        <div>
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

                    </div>

                    {/* Адреса мастера */}
                    {/*<h3 className={styles.section_subtitle}>Адреса работы</h3>*/}
                    <div className={styles.section_item}>
                        <h3>Адреса работы</h3>
                        {profileData.addresses.length > 0 ? (
                            <div className={styles.addresses_list}>
                                {profileData.addresses.map(address => (
                                    <div key={address.id} className={styles.address_item}>
                                        <div className={styles.address_full}>
                                            {address.fullAddress}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className={styles.empty_state}>Адреса не указаны</div>
                        )}
                    </div>

                    {/* Услуги и цены */}
                    {/*<h3 className={styles.section_subtitle}>Услуги и цены</h3>*/}
                    <div className={styles.section_item}>
                        <h3>Услуги и цены</h3>
                        {services.length > 0 ? (
                            <div className={styles.services_display}>
                                {services.map(service => (
                                    <div key={service.id} className={styles.service_display_item}>
                                        <span className={styles.service_name}>{service.title}</span>
                                        <span className={styles.service_price}>{service.budget} TJS, {service.unit} </span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className={styles.empty_state}>Услуги не указаны</div>
                        )}
                    </div>
                </div>

                {/* Отзывы */}
                {/*<h2 className={styles.section_title}>Отзывы</h2>*/}
                <div className={styles.reviews_section}>
                    <h3>Отзывы</h3>
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