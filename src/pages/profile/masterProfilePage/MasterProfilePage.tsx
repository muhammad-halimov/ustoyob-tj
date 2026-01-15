import { useState, useRef, useEffect, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuthToken, removeAuthToken } from '../../../utils/auth.ts';
import styles from '../MasterProfilePage.module.scss';

import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import { fetchUserById } from "../../../utils/api.ts";
import { cleanText } from "../../../utils/cleanText.ts";

interface TicketApiData {
    id: number;
    title: string;
    description: string;
    notice?: string;
    budget: number;
    service: boolean;
    active: boolean;
    master?: {
        id: number;
        email?: string;
        name?: string;
        surname?: string;
        rating?: number;
        image?: string;
        [key: string]: unknown;
    };
    category?: {
        id: number;
        title: string;
        image?: string;
    };
    unit?: {
        id: number;
        title: string;
    };
    addresses?: Array<{
        id: number;
        province?: { id: number; title: string };
        city?: { id: number; title: string; image?: string };
        district?: { id: number; title: string; image?: string };
        suburb?: { id: number; title: string };
        settlement?: { id: number; title: string };
        community?: { id: number; title: string };
        village?: { id: number; title: string };
    }>;
    images?: Array<{ id: number; image: string }>;
    createdAt?: string;
    updatedAt?: string;
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
    services: Service[];
}

interface ServiceTicket {
    id: number;
    title: string;
    budget: number;
    unit: {
        id: number;
        title: string;
    } | null;
    category?: {
        id: number;
        title: string;
    };
    description?: string;
    addresses?: Array<{
        id: number;
        province?: { id: number; title: string };
        city?: { id: number; title: string };
        district?: { id: number; title: string };
        suburb?: { id: number; title: string };
    }>;
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
    ticket?: { // Добавляем поле ticket
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
    occupation?: OccupationApiData[];
    education?: EducationApiData[];
    districts?: DistrictApiData[];
    addresses?: UserAddressApiData[];
    [key: string]: unknown;
}

interface UserAddressApiData {
    id: number;
    suburb?: string | { title: string };
    district?: string | { title: string };
    city?: string | { title: string };
    province?: string | { title: string };
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
    faculty?: string;
    beginning?: number;
    ending?: number;
    graduated?: boolean;
    occupation?: OccupationApiData[];
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
    ticket?: { // Добавляем поле ticket
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

function MasterProfilePage() {
    const navigate = useNavigate();
    const [editingField, setEditingField] = useState<'fullName' | 'specialty' | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [profileData, setProfileData] = useState<ProfileData | null>(null);
    const [tempValue, setTempValue] = useState('');
    const [editingEducation, setEditingEducation] = useState<string | null>(null);
    const [educationForm, setEducationForm] = useState<Omit<Education, 'id'>>({
        institution: '',
        faculty: '',
        specialty: '',
        startYear: '',
        endYear: '',
        currentlyStudying: false
    });
    const [reviews, setReviews] = useState<Review[]>([]);
    const [reviewsLoading, setReviewsLoading] = useState(false);
    const [visibleCount, setVisibleCount] = useState(2);
    const [showReviewModal, setShowReviewModal] = useState(false);
    const [reviewText, setReviewText] = useState('');
    const [selectedStars, setSelectedStars] = useState(0);
    const [reviewPhotos, setReviewPhotos] = useState<File[]>([]);
    const [isSubmittingReview, setIsSubmittingReview] = useState(false);

    // Состояние для списка специальностей
    const [occupations, setOccupations] = useState<Occupation[]>([]);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const workExampleInputRef = useRef<HTMLInputElement>(null);
    const reviewPhotoInputRef = useRef<HTMLInputElement>(null);
    const specialtyInputRef = useRef<HTMLSelectElement>(null);

    const [services, setServices] = useState<ServiceTicket[]>([]);
    const [servicesLoading, setServicesLoading] = useState(false);

    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

    // Проверка аутентификации при загрузке компонента
    useEffect(() => {
        const token = getAuthToken();
        if (!token) {
            console.log('No JWT token found, redirecting to login');
            navigate('/');
            return;
        }
        fetchUserData();
    }, [navigate]);

    // Загружаем отзывы после загрузки данных пользователя
    useEffect(() => {
        if (profileData?.id) {
            fetchUserGallery();
            fetchReviews();
            fetchMasterServices();
        }
    }, [profileData?.id]);

    // Загружаем список специальностей при редактировании специальности
    useEffect(() => {
        if (editingField === 'specialty' && occupations.length === 0) {
            fetchOccupationsList();
        }
    }, [editingField]);

    // Функция для загрузки списка специальностей
    const fetchOccupationsList = async () => {
        try {
            const token = getAuthToken();
            if (!token) return;

            console.log('Fetching occupations list...');

            const response = await fetch(`${API_BASE_URL}/api/occupations`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
            });

            if (response.ok) {
                const data = await response.json();
                console.log('Occupations API response:', data);

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

                console.log('Transformed occupations:', occupationsArray);
                setOccupations(occupationsArray);
            } else {
                console.error('Failed to fetch occupations:', response.status);
                setOccupations([]);
            }
        } catch (error) {
            console.error('Error fetching occupations:', error);
            setOccupations([]);
        }
    };

    const fetchMasterServices = async () => {
        if (!profileData?.id) return;

        try {
            setServicesLoading(true);
            const token = getAuthToken();

            if (!token) {
                console.log('No token available for fetching services');
                return;
            }

            const endpoint = `/api/tickets?service=true&master=${profileData.id}&active=true`;

            console.log('Fetching master services from:', endpoint);
            console.log('Filtering by master ID:', profileData.id);

            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
            });

            if (response.status === 401) {
                removeAuthToken();
                navigate('/login');
                return;
            }

            if (!response.ok) {
                console.error(`Failed to fetch services: ${response.status}`);
                setServices([]);
                return;
            }

            const servicesData = await response.json();
            console.log('Master services received:', servicesData);

            let servicesArray: TicketApiData[] = [];

            if (Array.isArray(servicesData)) {
                servicesArray = servicesData;
            } else if (servicesData && typeof servicesData === 'object') {
                const apiResponse = servicesData as ApiResponse<TicketApiData>;
                if (apiResponse['hydra:member'] && Array.isArray(apiResponse['hydra:member'])) {
                    servicesArray = apiResponse['hydra:member'];
                } else if ((servicesData as TicketApiData).id) {
                    servicesArray = [servicesData as TicketApiData];
                }
            }

            console.log(`Found ${servicesArray.length} services for master ${profileData.id}`);

            const masterServices: ServiceTicket[] = servicesArray
                .filter(service => {
                    if (!service.master || !service.master.id) {
                        console.log(`Service ${service.id} has no master field`);
                        return false;
                    }

                    const belongsToMaster = service.master.id.toString() === profileData.id;
                    if (!belongsToMaster) {
                        console.log(`Service ${service.id} belongs to master ${service.master.id}, not to ${profileData.id}`);
                    }
                    return belongsToMaster;
                })
                .map(service => ({
                    id: service.id,
                    title: service.title,
                    budget: service.budget,
                    unit: service.unit ? {
                        id: service.unit.id,
                        title: service.unit.title
                    } : null,
                    category: service.category,
                    description: service.description,
                    addresses: service.addresses || []
                }));

            console.log(`Processed ${masterServices.length} master services for user ${profileData.id}:`, masterServices);
            setServices(masterServices);

            const profileServices: Service[] = masterServices.map(service => ({
                id: service.id.toString(),
                name: service.title,
                price: service.budget.toString()
            }));

            setProfileData(prev => prev ? {
                ...prev,
                services: profileServices
            } : null);

        } catch (error) {
            console.error('Error fetching master services:', error);
            setServices([]);
        } finally {
            setServicesLoading(false);
        }
    };

    const handleDeleteService = async (serviceId: number) => {
        if (!confirm('Вы уверены, что хотите удалить эту услугу?')) {
            return;
        }

        try {
            setIsLoading(true);
            const token = getAuthToken();
            if (!token) {
                navigate('/login');
                return;
            }

            const response = await fetch(`${API_BASE_URL}/api/tickets/${serviceId}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/merge-patch+json',
                },
                body: JSON.stringify({
                    active: false
                }),
            });

            if (response.ok) {
                setServices(prev => prev.filter(service => service.id !== serviceId));

                setProfileData(prev => prev ? {
                    ...prev,
                    services: prev.services.filter(service => parseInt(service.id) !== serviceId)
                } : null);

                alert('Услуга успешно удалена!');
            } else {
                throw new Error('Не удалось удалить услугу');
            }
        } catch (error) {
            console.error('Error deleting service:', error);
            alert('Ошибка при удалении услуги');
        } finally {
            setIsLoading(false);
        }
    };

    const handleEditService = (serviceId: number) => {
        const service = services.find(s => s.id === serviceId);
        if (service) {
            navigate('/profile/services/edit', {
                state: {
                    serviceData: {
                        ...service,
                        selectedCategory: service.category?.id,
                        selectedUnit: service.unit?.id,
                        addresses: service.addresses
                    }
                }
            });
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
                navigate('/');
                return;
            }

            if (!response.ok) {
                throw new Error(`Failed to fetch user data: ${response.status} ${response.statusText}`);
            }

            const userData: UserApiData = await response.json();
            console.log('User data received:', userData);

            const avatarUrl = await getAvatarUrl(userData);

            let workArea = '';
            const userAddresses = userData.addresses as UserAddressApiData[] | undefined;

            if (userAddresses && Array.isArray(userAddresses) && userAddresses.length > 0) {
                console.log('Processing addresses for work area...');

                const addressParts: string[] = [];

                for (const address of userAddresses) {
                    try {
                        console.log('Processing address:', address);

                        const addressText = await getFullAddressText(address, token);

                        if (addressText) {
                            addressParts.push(addressText);
                        }
                    } catch (error) {
                        console.error('Error processing address:', error);
                    }
                }

                if (addressParts.length > 0) {
                    const uniqueAddresses = [...new Set(addressParts)];
                    workArea = uniqueAddresses.join(', ');
                }
            }

            console.log('Final work area:', workArea);

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
                services: []
            };

            setProfileData(transformedData);

        } catch (error) {
            console.error('Error fetching user data:', error);
            setProfileData({
                id: '',
                fullName: 'Фамилия Имя Отчество',
                specialty: 'Специальность',
                rating: 0,
                reviews: 0,
                avatar: null,
                education: [],
                workExamples: [],
                workArea: '',
                services: []
            });
        } finally {
            setIsLoading(false);
        }
    };

    const getFullAddressText = async (address: UserAddressApiData, token: string): Promise<string> => {
        const addressParts: string[] = [];

        try {
            if (address.province) {
                const provinceValue = address.province;
                if (typeof provinceValue === 'string') {
                    const provinceStr: string = provinceValue;
                    const provinceId = provinceStr.split('/').pop();
                    if (provinceId) {
                        const provinceInfo = await fetchResourceInfo(parseInt(provinceId), 'provinces', token);
                        if (provinceInfo && provinceInfo.title) {
                            addressParts.push(provinceInfo.title);
                        }
                    }
                } else if (typeof provinceValue === 'object' && provinceValue !== null && 'title' in provinceValue) {
                    const provinceObj = provinceValue as { title: string };
                    addressParts.push(provinceObj.title);
                }
            }

            if (address.city) {
                const cityValue = address.city;
                if (typeof cityValue === 'string') {
                    const cityStr: string = cityValue;
                    const cityId = cityStr.split('/').pop();
                    if (cityId) {
                        const cityInfo = await fetchResourceInfo(parseInt(cityId), 'cities', token);
                        if (cityInfo && cityInfo.title) {
                            addressParts.push(cityInfo.title);
                        }
                    }
                } else if (typeof cityValue === 'object' && cityValue !== null && 'title' in cityValue) {
                    const cityObj = cityValue as { title: string };
                    addressParts.push(cityObj.title);
                }
            }

            if (address.district) {
                const districtValue = address.district;
                if (typeof districtValue === 'string') {
                    const districtStr: string = districtValue;
                    const districtId = districtStr.split('/').pop();
                    if (districtId) {
                        const districtInfo = await fetchResourceInfo(parseInt(districtId), 'districts', token);
                        if (districtInfo && districtInfo.title) {
                            addressParts.push(districtInfo.title);
                        }
                    }
                } else if (typeof districtValue === 'object' && districtValue !== null && 'title' in districtValue) {
                    const districtObj = districtValue as { title: string };
                    addressParts.push(districtObj.title);
                }
            }

        } catch (error) {
            console.error('Error getting full address text:', error);
        }

        return addressParts.join(', ');
    };

    const fetchResourceInfo = async (resourceId: number, resourceType: string, token: string): Promise<any> => {
        try {
            console.log(`Fetching ${resourceType} info for ID: ${resourceId}`);

            let endpoint = '';
            switch (resourceType) {
                case 'provinces':
                    endpoint = `/api/provinces/${resourceId}`;
                    break;
                case 'cities':
                    endpoint = `/api/cities/${resourceId}`;
                    break;
                case 'districts':
                    endpoint = `/api/districts/${resourceId}`;
                    break;
                case 'suburbs':
                    endpoint = `/api/suburbs/${resourceId}`;
                    break;
                case 'settlements':
                    endpoint = `/api/settlements/${resourceId}`;
                    break;
                case 'communities':
                    endpoint = `/api/communities/${resourceId}`;
                    break;
                case 'villages':
                    endpoint = `/api/villages/${resourceId}`;
                    break;
                default:
                    return null;
            }

            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (response.ok) {
                const data = await response.json();
                console.log(`${resourceType} data loaded:`, data);
                return data;
            } else {
                console.error(`Failed to fetch ${resourceType} ${resourceId}: ${response.status}`);
                return null;
            }
        } catch (error) {
            console.error(`Error fetching ${resourceType} info:`, error);
            return null;
        }
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

            // Используем существующий эндпоинт
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

                        // Получаем название услуги из ticket.title
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
                            vacation: serviceTitle, // Используем название услуги
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

        setIsLoading(true);

        try {
            const token = getAuthToken();
            if (!token) {
                navigate("/");
                return;
            }

            console.log('Starting photo upload...');

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

            const uploadPromises: Array<Promise<{ success: boolean; fileName: string; data?: any }>> = [];

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

                const formData = new FormData();
                formData.append("imageFile", file);

                console.log(`Uploading photo ${i + 1}/${files.length} to gallery ${galleryId}, file:`, file.name);

                uploadPromises.push(
                    fetch(`${API_BASE_URL}/api/galleries/${galleryId}/upload-photo`, {
                        method: "POST",
                        headers: {
                            "Authorization": `Bearer ${token}`,
                        },
                        body: formData,
                    }).then(async (response) => {
                        const responseText = await response.text();
                        console.log(`Upload response for ${file.name}:`, response.status, responseText);

                        if (!response.ok) {
                            if (response.status === 404) {
                                console.log(`Gallery ${galleryId} not found, trying to create new one...`);
                                const newGalleryId = await createUserGallery(token);
                                if (newGalleryId) {
                                    const newResponse = await fetch(`${API_BASE_URL}/api/galleries/${newGalleryId}/upload-photo`, {
                                        method: "POST",
                                        headers: {
                                            "Authorization": `Bearer ${token}`,
                                        },
                                        body: formData,
                                    });

                                    if (newResponse.ok) {
                                        return { success: true, fileName: file.name };
                                    }
                                }
                            }

                            console.error(`Ошибка при загрузке ${file.name}:`, responseText);
                            throw new Error(`Не удалось загрузить ${file.name}`);
                        }

                        try {
                            const jsonResponse = JSON.parse(responseText);
                            console.log(`Successfully uploaded ${file.name}:`, jsonResponse);
                            return { success: true, fileName: file.name, data: jsonResponse };
                        } catch (e) {
                            console.log(`Response is not JSON for ${file.name}:`, responseText);
                            return { success: true, fileName: file.name };
                        }
                    }).catch(error => {
                        console.error(`Upload failed for ${file.name}:`, error);
                        return { success: false, fileName: file.name, error: error.message };
                    })
                );
            }

            const results = await Promise.allSettled(uploadPromises);

            let successCount = 0;
            let errorCount = 0;

            results.forEach((result) => {
                if (result.status === 'fulfilled' && result.value.success) {
                    successCount++;
                    console.log(`${result.value.fileName} успешно загружен`);
                } else {
                    errorCount++;
                    console.error(`Ошибка загрузки файла:`, result);
                }
            });

            await fetchUserGallery();

            if (successCount > 0) {
                alert(`${successCount} фото успешно добавлены в портфолио!${errorCount > 0 ? ` (${errorCount} не загружено)` : ''}`);
            } else {
                alert("Не удалось загрузить ни одного фото");
            }

        } catch (error) {
            console.error("Ошибка при загрузке фото в портфолио:", error);
            alert("Ошибка при загрузке фото в портфолио");
        } finally {
            setIsLoading(false);
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

        setIsLoading(true);

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
                return;
            }

            const galleryId = gallery.id;
            console.log('Found gallery ID for deletion:', galleryId);

            const checkResponse = await fetch(`${API_BASE_URL}/api/galleries/${galleryId}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json',
                },
            });

            if (!checkResponse.ok) {
                console.error('Failed to check gallery:', checkResponse.status);
                alert('Не удалось проверить галерею');
                return;
            }

            const galleryData: GalleryApiData = await checkResponse.json();
            console.log('Current gallery data:', galleryData);

            const imageToDelete = galleryData.images?.find(img => img.id.toString() === workExampleId);

            if (!imageToDelete) {
                console.log('Image not found in gallery:', workExampleId);

                setProfileData(prev => {
                    if (!prev) return null;
                    return {
                        ...prev,
                        workExamples: prev.workExamples.filter(work => work.id !== workExampleId)
                    };
                });

                alert('Изображение не найдено в галерее');
                return;
            }

            console.log('Image to delete found:', imageToDelete);

            try {
                let deleteSuccess = false;

                if (imageToDelete.id) {
                    try {
                        const deleteResponse = await fetch(`${API_BASE_URL}/api/gallery_images/${imageToDelete.id}`, {
                            method: 'DELETE',
                            headers: {
                                'Authorization': `Bearer ${token}`,
                            },
                        });

                        if (deleteResponse.ok || deleteResponse.status === 204) {
                            console.log('Image deleted successfully via direct DELETE');
                            deleteSuccess = true;
                        }
                    } catch (error) {
                        console.log('Direct DELETE failed, trying PATCH method');
                    }
                }

                if (!deleteSuccess) {
                    const updatedImages = galleryData.images
                        ?.filter(img => img.id.toString() !== workExampleId)
                        .map(img => ({ image: img.image })) || [];

                    console.log(`Filtered images: ${galleryData.images?.length} -> ${updatedImages.length}`);

                    const patchData = { images: updatedImages };
                    console.log('Sending PATCH data:', patchData);

                    const updateResponse = await fetch(`${API_BASE_URL}/api/galleries/${galleryId}`, {
                        method: 'PATCH',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/merge-patch+json',
                            'Accept': 'application/json',
                        },
                        body: JSON.stringify(patchData),
                    });

                    if (updateResponse.ok) {
                        deleteSuccess = true;
                        console.log('Gallery updated successfully via PATCH');
                    } else {
                        const errorText = await updateResponse.text();
                        console.error('PATCH failed:', errorText);
                    }
                }

                if (!deleteSuccess) {
                    console.log('Trying delete and recreate approach...');

                    const currentUserId = await getCurrentUserId(token);
                    if (!currentUserId) {
                        throw new Error('Не удалось определить ID пользователя');
                    }

                    const currentImages = galleryData.images
                        ?.filter(img => img.id.toString() !== workExampleId)
                        .map(img => ({ image: img.image })) || [];

                    await fetch(`${API_BASE_URL}/api/galleries/${galleryId}`, {
                        method: 'DELETE',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                        },
                    });

                    const recreateData = {
                        images: currentImages,
                        user: `/api/users/${currentUserId}`
                    };

                    const recreateResponse = await fetch(`${API_BASE_URL}/api/galleries`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json',
                            'Accept': 'application/json',
                        },
                        body: JSON.stringify(recreateData),
                    });

                    if (recreateResponse.ok) {
                        deleteSuccess = true;
                        console.log('Gallery recreated successfully');
                    }
                }

                if (deleteSuccess) {
                    setProfileData(prev => {
                        if (!prev) return null;
                        return {
                            ...prev,
                            workExamples: prev.workExamples.filter(work => work.id !== workExampleId)
                        };
                    });

                    await fetchUserGallery();

                    alert('Фото успешно удалено из портфолио!');
                } else {
                    alert('Не удалось удалить фото. Попробуйте еще раз.');
                }

            } catch (error) {
                console.error('Error in deletion process:', error);
                alert('Ошибка при удалении фото. Пожалуйста, попробуйте еще раз.');
            }

        } catch (error) {
            console.error('Error deleting work example:', error);
            alert('Ошибка при удалении фото. Пожалуйста, попробуйте еще раз.');
        } finally {
            setIsLoading(false);
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
        return education.map(edu => ({
            id: edu.id?.toString() || Date.now().toString(),
            institution: edu.uniTitle || '',
            faculty: edu.faculty || '',
            specialty: edu.occupation?.map((occ) => occ.title).join(', ') || '',
            startYear: edu.beginning?.toString() || '',
            endYear: edu.ending?.toString() || '',
            currentlyStudying: !edu.graduated
        }));
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

            // Обработка специальности - нужно найти occupation по названию и отправить его IRI
            if (updatedData.specialty !== undefined) {
                // Разделяем специальности по запятой
                const specialtyTitles = updatedData.specialty.split(',').map(title => title.trim());

                // Ищем соответствующие occupations
                const occupationIris: string[] = [];

                for (const title of specialtyTitles) {
                    // Ищем occupation по точному совпадению названия
                    const occupation = occupations.find(occ => occ.title === title);
                    if (occupation) {
                        occupationIris.push(`/api/occupations/${occupation.id}`);
                    } else {
                        // Если не нашли точное совпадение, пробуем найти похожее
                        const similarOccupation = occupations.find(occ =>
                            occ.title.toLowerCase().includes(title.toLowerCase()) ||
                            title.toLowerCase().includes(occ.title.toLowerCase())
                        );
                        if (similarOccupation) {
                            occupationIris.push(`/api/occupations/${similarOccupation.id}`);
                        } else {
                            console.warn(`Occupation not found for title: "${title}"`);
                            // Если occupation не найден, можно создать новый или пропустить
                            // В этом случае просто пропускаем
                        }
                    }
                }

                // Если нашли хотя бы одну occupation, отправляем IRI
                if (occupationIris.length > 0) {
                    apiData.occupation = occupationIris;
                } else {
                    console.warn('No valid occupations found for:', updatedData.specialty);
                    // Если не нашли ни одной occupation, не отправляем поле
                    // или можно отправить пустой массив в зависимости от требований API
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
                navigate('/login');
                return;
            }

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Update failed:', errorText);
                throw new Error(`Failed to update user data: ${response.status}`);
            }

            console.log('User data updated successfully');

            // Обновляем локальное состояние
            setProfileData(prev => prev ? {
                ...prev,
                ...updatedData
            } : null);

        } catch (error) {
            console.error('Error updating user data:', error);
            alert('Ошибка при обновлении данных');
        }
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

            let updatedEducationArray = userData.education || [];

            const existingIndex = updatedEducationArray.findIndex(edu =>
                edu.id?.toString() === educationId
            );

            const educationData = {
                uniTitle: updatedEducation.institution,
                faculty: updatedEducation.faculty,
                beginning: parseInt(updatedEducation.startYear) || new Date().getFullYear(),
                ending: updatedEducation.currentlyStudying ? undefined : (parseInt(updatedEducation.endYear) || undefined),
                graduated: !updatedEducation.currentlyStudying
            };

            if (existingIndex >= 0) {
                updatedEducationArray[existingIndex] = {
                    ...updatedEducationArray[existingIndex],
                    ...educationData
                };
            } else {
                updatedEducationArray.push({
                    ...educationData,
                    id: parseInt(educationId) || Date.now()
                });
            }

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
                const updatedUser = await updateResponse.json();

                setProfileData(prev => prev ? {
                    ...prev,
                    education: transformEducation(updatedUser.education || [])
                } : null);

                setEditingEducation(null);
                setEducationForm({
                    institution: '',
                    faculty: '',
                    specialty: '',
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
            alert('Ошибка при обновлении образования');
        }
    };

    const handleAddEducation = () => {
        const newEducationId = `new-${Date.now()}`;
        setEditingEducation(newEducationId);
        setEducationForm({
            institution: '',
            faculty: '',
            specialty: '',
            startYear: new Date().getFullYear().toString(),
            endYear: new Date().getFullYear().toString(),
            currentlyStudying: false
        });
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
        setEducationForm({
            institution: education.institution,
            faculty: education.faculty,
            specialty: education.specialty,
            startYear: education.startYear,
            endYear: education.endYear,
            currentlyStudying: education.currentlyStudying
        });
    };

    const handleEditEducationSave = async () => {
        if (!editingEducation || !educationForm.institution) {
            alert('Пожалуйста, заполните учебное заведение');
            return;
        }

        if (!educationForm.startYear) {
            alert('Пожалуйста, укажите год начала обучения');
            return;
        }

        await updateEducation(editingEducation, educationForm);
    };

    const handleEditEducationCancel = () => {
        setEditingEducation(null);
        setEducationForm({
            institution: '',
            faculty: '',
            specialty: '',
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
                                                    // Сохраняем выбранную специальность
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
                            {profileData.education.map(edu => (
                                <div key={edu.id} className={styles.education_item}>
                                    {editingEducation === edu.id ? (
                                        <div className={styles.education_form}>
                                            <div className={styles.form_group}>
                                                <input
                                                    type="text"
                                                    placeholder="Укажите информацию"
                                                    value={educationForm.institution}
                                                    onChange={(e) => handleEducationFormChange('institution', e.target.value)}
                                                />
                                                <label>Укажите учебное заведение, факультет, специальность</label>
                                            </div>

                                            <div className={styles.year_group}>
                                                <div className={styles.form_group}>
                                                    <input
                                                        type="text"
                                                        placeholder="Год начала"
                                                        value={educationForm.startYear}
                                                        onChange={(e) => handleEducationFormChange('startYear', e.target.value)}
                                                    />
                                                </div>

                                                <div className={styles.form_group}>
                                                    <input
                                                        type="text"
                                                        placeholder="Год окончания"
                                                        value={educationForm.endYear}
                                                        onChange={(e) => handleEducationFormChange('endYear', e.target.value)}
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
                                                    disabled={!educationForm.institution}
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
                                            <div className={styles.education_header}>
                                                <strong>{edu.institution}</strong>
                                                <button
                                                    className={styles.edit_icon}
                                                    onClick={() => handleEditEducationStart(edu)}
                                                >
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
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
                                        <label>Факультет</label>
                                        <input
                                            type="text"
                                            placeholder="Факультет"
                                            value={educationForm.faculty}
                                            onChange={(e) => handleEducationFormChange('faculty', e.target.value)}
                                        />

                                    </div>

                                    <div className={styles.year_group}>
                                        <div className={styles.form_group}>
                                            <input
                                                type="number"
                                                placeholder="Год начала"
                                                value={educationForm.startYear}
                                                onChange={(e) => handleEducationFormChange('startYear', e.target.value)}
                                                min="1900"
                                                max={new Date().getFullYear()}
                                            />
                                            <label>Год начала *</label>
                                        </div>

                                        <div className={styles.form_group}>
                                            <input
                                                type="number"
                                                placeholder="Год окончания"
                                                value={educationForm.endYear}
                                                onChange={(e) => handleEducationFormChange('endYear', e.target.value)}
                                                min={parseInt(educationForm.startYear) || 1900}
                                                max={new Date().getFullYear()}
                                                disabled={educationForm.currentlyStudying}
                                            />
                                            <label>Год окончания</label>
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

                    {/* Примеры работ */}
                    <div className={styles.section_item}>
                        <h3>Примеры работ</h3>
                        <div className={styles.work_examples}>
                            {profileData.workExamples.length > 0 ? (
                                <div className={styles.work_examples_grid}>
                                    {profileData.workExamples.map(work => (
                                        <div key={work.id} className={styles.work_example}>
                                            <img
                                                src={getImageUrlWithCacheBust(work.image)}
                                                alt={work.title}
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
                                                onClick={() => handleDeleteWorkExample(work.id)}
                                                title="Удалить фото"
                                            >
                                                ×
                                            </button>
                                        </div>
                                    ))}
                                    <button
                                        className={styles.add_work_button}
                                        onClick={() => workExampleInputRef.current?.click()}
                                        title="Добавить фото в портфолио"
                                    >
                                        +
                                    </button>
                                </div>
                            ) : (
                                <div className={styles.empty_state}>
                                    <span>Добавить фото в портфолио</span>
                                    <button
                                        className={styles.add_button}
                                        onClick={() => workExampleInputRef.current?.click()}
                                    >
                                        +
                                    </button>
                                </div>
                            )}
                        </div>
                        <input
                            type="file"
                            ref={workExampleInputRef}
                            onChange={handleWorkExampleUpload}
                            accept="image/*"
                            multiple
                            style={{ display: 'none' }}
                        />
                    </div>

                    {/* Район работы */}
                    <div className={styles.section_item}>
                        <h3>Район работы</h3>
                        <div className={styles.section_content}>
                            {profileData.workArea ? (
                                <div className={styles.work_area}>
                                    <span className={styles.work_area_text}>{profileData.workArea}</span>
                                    <button
                                        className={styles.edit_icon}
                                        onClick={() => navigate('/profile/city')}
                                        title="Редактировать адрес"
                                    >
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M7.2302 20.59L2.4502 21.59L3.4502 16.81L17.8902 2.29001C18.1407 2.03889 18.4385 1.83982 18.7663 1.70424C19.0941 1.56865 19.4455 1.49925 19.8002 1.50001C20.5163 1.50001 21.203 1.78447 21.7094 2.29082C22.2157 2.79717 22.5002 3.48392 22.5002 4.20001C22.501 4.55474 22.4315 4.90611 22.296 5.23391C22.1604 5.56171 21.9613 5.85945 21.7102 6.11001L7.2302 20.59Z" stroke="#3A54DA" strokeWidth="2" strokeMiterlimit="10"/>
                                        </svg>
                                    </button>
                                </div>
                            ) : (
                                <div className={styles.empty_state}>
                                    <span>Укажите район работы</span>
                                    <button
                                        className={styles.add_button}
                                        onClick={() => navigate('/profile/city')}
                                    >
                                        +
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Услуги и цены */}
                    <div className={styles.section_item}>
                        <h3>Услуги и цены</h3>
                        <div className={styles.section_content}>
                            {servicesLoading ? (
                                <div className={styles.loading}>Загрузка услуг...</div>
                            ) : services.length > 0 ? (
                                <div className={styles.services_list}>
                                    {services.map(service => (
                                        <div key={service.id} className={styles.service_item}>
                                            <div className={styles.service_header}>
                                                <span className={styles.service_name}>
                                                    {service.title}
                                                    {service.description && (
                                                        <div className={styles.service_description}>
                                                            {cleanText(service.description)}
                                                        </div>
                                                    )}
                                                </span>
                                                <div className={styles.service_actions}>
                                                    <button
                                                        className={styles.edit_service_btn}
                                                        onClick={() => handleEditService(service.id)}
                                                        title="Редактировать услугу"
                                                    >
                                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
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
                                                    <button
                                                        className={styles.delete_service_btn}
                                                        onClick={() => handleDeleteService(service.id)}
                                                        title="Удалить услугу"
                                                    >
                                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                            <g clipPath="url(#clip0_184_3774)">
                                                                <g clipPath="url(#clip1_184_3774)">
                                                                    <path d="M18 6.5L17 21.5H7L6 6.5" stroke="#FF3B30" strokeWidth="2" strokeMiterlimit="10"/>
                                                                    <path d="M3.5 6.5H20.5" stroke="#FF3B30" strokeWidth="2" strokeMiterlimit="10"/>
                                                                    <path d="M9 3.5H15" stroke="#FF3B30" strokeWidth="2" strokeMiterlimit="10"/>
                                                                    <path d="M15 10V17" stroke="#FF3B30" strokeWidth="2" strokeMiterlimit="10"/>
                                                                    <path d="M9 10V17" stroke="#FF3B30" strokeWidth="2" strokeMiterlimit="10"/>
                                                                </g>
                                                            </g>
                                                            <defs>
                                                                <clipPath id="clip0_184_3774">
                                                                    <rect width="24" height="24" fill="white"/>
                                                                </clipPath>
                                                                <clipPath id="clip1_184_3774">
                                                                    <rect width="24" height="24" fill="white"/>
                                                                </clipPath>
                                                            </defs>
                                                        </svg>
                                                    </button>
                                                </div>
                                            </div>
                                            <span className={styles.service_price}>
                                                {service.budget} TJS, {service.unit?.title || 'TJS'}
                                            </span>
                                        </div>
                                    ))}

                                    {/* Кнопка добавления новой услуги */}
                                    <div className={styles.add_service_container}>
                                        <button
                                            className={styles.add_button}
                                            onClick={() => navigate('/profile/services')}
                                            title="Добавить новую услугу"
                                        >
                                            +
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className={styles.empty_state}>
                                    <span>Услуги и цены</span>
                                    <button
                                        className={styles.add_button}
                                        onClick={() => navigate('/profile/services')}
                                    >
                                        +
                                    </button>
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
                                    {reviews.slice(0, visibleCount).map((review) => (
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
                                                        {/* Показываем название услуги из ticket.title */}
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
                                                {/*<div className={styles.review_rating_secondary}>*/}
                                                    {/*<span>Поставил </span>*/}
                                                    {/*<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">*/}
                                                    {/*    <g clipPath="url(#clip0_324_2272)">*/}
                                                    {/*        <g clipPath="url(#clip1_324_2272)">*/}
                                                    {/*            <path d="M12 2.49023L15.51 8.17023L22 9.76023L17.68 14.8502L18.18 21.5102L12 18.9802L5.82 21.5102L6.32 14.8502L2 9.76023L8.49 8.17023L12 2.49023Z" stroke="#3A54DA" strokeWidth="2" strokeMiterlimit="10"/>*/}
                                                    {/*            <path d="M12 19V18.98" stroke="black" strokeWidth="2" strokeMiterlimit="10"/>*/}
                                                    {/*        </g>*/}
                                                    {/*    </g>*/}
                                                    {/*    <defs>*/}
                                                    {/*        <clipPath id="clip0_324_2272">*/}
                                                    {/*            <rect width="24" height="24" fill="white"/>*/}
                                                    {/*        </clipPath>*/}
                                                    {/*        <clipPath id="clip1_324_2272">*/}
                                                    {/*            <rect width="24" height="24" fill="white"/>*/}
                                                    {/*        </clipPath>*/}
                                                    {/*    </defs>*/}
                                                    {/*</svg>*/}
                                                    {/*<span className={styles.rating_value}>{review.rating}</span>*/}
                                                {/*</div>*/}
                                            </div>

                                            {review.description && (
                                                <div className={styles.review_text}>
                                                    {review.description.replace(/<[^>]*>/g, '')}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                <div className={styles.reviews_mobile}>
                                    <Swiper
                                        spaceBetween={16}
                                        slidesPerView={1}
                                        className={styles.reviews_slider}
                                    >
                                        {reviews.slice(0, visibleCount).map((review) => (
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
                                                                {/* Показываем название услуги из ticket.title */}
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

                                                    {review.description && (
                                                        <div className={styles.review_text}>
                                                            {review.description.replace(/<[^>]*>/g, '')}
                                                        </div>
                                                    )}
                                                </div>
                                            </SwiperSlide>
                                        ))}
                                    </Swiper>
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

export default MasterProfilePage;