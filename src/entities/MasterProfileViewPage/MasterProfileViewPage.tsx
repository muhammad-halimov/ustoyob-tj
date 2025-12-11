import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getAuthToken } from '../../utils/auth';
import styles from '../../pages/profile/ProfilePage.module.scss';
import { fetchUserById, fetchUserWithRole } from "../../utils/api.ts";
import AuthModal from '../../shared/ui/AuthModal/AuthModal';

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

interface Occupation {
    id: number;
    title: string;
}

interface EducationItem {
    id?: number;
    uniTitle?: string;
    faculty?: string;
    occupation?: Occupation[];
    beginning?: string;
    ending?: string;
    graduated?: boolean;
}

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

interface GalleryItem {
    id?: number;
    image?: string;
}

interface GalleryResponse {
    images?: GalleryItem[];
}

interface ServiceTicketResponse {
    id: number;
    title: string;
    budget: string;
    unit?: { title: string };
    service?: boolean;
    active?: boolean;
}


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
    budget: string;
    unit?: { title: string };
    service?: boolean;
    active?: boolean;
}

interface Occupation {
    id: number;
    title: string;
}

interface EducationItem {
    id?: number;
    uniTitle?: string;
    faculty?: string;
    occupation?: Occupation[];
    beginning?: string;
    ending?: string;
    graduated?: boolean;
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
    images: {
        id: number;
        image: string;
    }[];
    vacation?: string;
    worker?: string;
    date?: string;
}

// Интерфейсы для жалобы
// interface AppealData {
//     type: string;
//     title: string;
//     complaintReason: string;
//     supportReason?: string;
//     status?: string;
//     priority?: string;
//     administrant?: string;
//     author: string;
//     respondent: string;
//     description: string;
//     ticket?: string;
//     ticketAppeal?: boolean;
// }

// Интерфейсы для отзыва
interface ReviewData {
    type: string;
    rating: number;
    description: string;
    ticket?: string;
    images?: Array<{
        image: string;
    }>;
    master: string;
    client: string;
}

interface ServiceTicket {
    id: number;
    title: string;
    budget: string;
    unit: string;
}

interface UserData {
    id: number;
    image?: string;
}

interface GalleryItem {
    id?: number;
    image?: string;
}

interface GalleryResponse {
    images?: GalleryItem[];
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
    // const [usersCache, setUsersCache] = useState<Map<number, any>>(new Map());
    const [showComplaintModal, setShowComplaintModal] = useState(false);
    const [showReviewModal, setShowReviewModal] = useState(false);
    const [showAllReviews, setShowAllReviews] = useState(false);
    const [showAuthModal, setShowAuthModal] = useState(false);

    // Состояния для формы жалобы
    const [complaintReason, setComplaintReason] = useState('');
    const [complaintDescription, setComplaintDescription] = useState('');
    const [complaintTitle, setComplaintTitle] = useState('');
    const [complaintPhotos, setComplaintPhotos] = useState<File[]>([]);
    const [isSubmittingComplaint, setIsSubmittingComplaint] = useState(false);

    // Состояния для формы отзыва
    const [reviewText, setReviewText] = useState('');
    const [selectedStars, setSelectedStars] = useState(0);
    const [reviewPhotos, setReviewPhotos] = useState<File[]>([]);
    const [isSubmittingReview, setIsSubmittingReview] = useState(false);

    // Добавляем состояние для услуг
    const [services, setServices] = useState<ServiceTicket[]>([]);
    // const [servicesLoading, setServicesLoading] = useState(false);

    useEffect(() => {
        if (masterId) {
            fetchMasterData(masterId);
        }
    }, [masterId]);

    useEffect(() => {
        if (profileData?.id) {
            fetchUserGallery(parseInt(profileData.id));
            fetchReviews(parseInt(profileData.id));
            fetchMasterServices(parseInt(profileData.id)); // Загружаем услуги
        }
    }, [profileData?.id]);

    // Функция для загрузки услуг мастера
    const fetchMasterServices = async (masterId: number) => {
        try {
            // setServicesLoading(true);
            const token = getAuthToken();

            if (!token) {
                console.log('No token available for fetching services');
                return;
            }

            const endpoint = `/api/tickets/masters/${masterId}`;

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
                console.error(`Failed to fetch services: ${response.status}`);
                setServices([]);
                return;
            }

            const servicesData = await response.json();
            console.log('Master services received:', servicesData);

            // Обрабатываем разные форматы ответа
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

            // Фильтруем только активные услуги мастера
            const masterServices = servicesArray
                .filter(service => service.service === true && service.active === true)
                .map(service => ({
                    id: service.id,
                    title: service.title,
                    budget: service.budget,
                    unit: service.unit?.title || 'tjs'
                }));

            console.log('Filtered master services:', masterServices);
            setServices(masterServices);

        } catch (error) {
            console.error('Error fetching master services:', error);
            setServices([]);
        } finally {
            // setServicesLoading(false);
        }
    };

    const handleShowMore = () => {
        setShowAllReviews(!showAllReviews);
    };

    // const fetchUser = async (userId: number, userType: 'master' | 'client'): Promise<any> => {
    //     try {
    //         if (usersCache.has(userId)) {
    //             return usersCache.get(userId) || null;
    //         }
    //
    //         const token = getAuthToken();
    //         if (!token) {
    //             console.log('No token available for fetching user data');
    //             return null;
    //         }
    //
    //         let endpoint = '';
    //         if (userType === 'master') {
    //             endpoint = `/api/users/masters`;
    //         } else if (userType === 'client') {
    //             endpoint = `/api/users/clients`;
    //         }
    //
    //         const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    //             method: 'GET',
    //             headers: {
    //                 'Authorization': `Bearer ${token}`,
    //                 'Content-Type': 'application/json',
    //                 'Accept': 'application/json',
    //             },
    //         });
    //
    //         if (!response.ok) {
    //             console.warn(`Failed to fetch ${userType} data:`, response.status);
    //             return null;
    //         }
    //
    //         const usersData = await response.json();
    //         const userData = usersData.find((user: any) => user.id === userId) || null;
    //
    //         if (userData) {
    //             setUsersCache(prev => new Map(prev).set(userId, userData));
    //         }
    //
    //         return userData;
    //
    //     } catch (error) {
    //         console.error(`Error fetching ${userType} data:`, error);
    //         return null;
    //     }
    // };

    const checkImageExists = (url: string): Promise<boolean> => {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => resolve(true);
            img.onerror = () => resolve(false);
            img.src = url;
        });
    };

    const fetchMasterData = async (masterId: number) => {
        try {
            setIsLoading(true);
            const token = getAuthToken();

            if (!token) {
                navigate('/');
                return;
            }

            // ЗАМЕНИТЬ старый вызов fetchUser на fetchUserById
            const masterData = await fetchUserById(masterId);

            if (!masterData) {
                console.error('Master not found');
                setProfileData(null);
                return;
            }

            if (!masterData.roles || !masterData.roles.includes('ROLE_MASTER')) {
                console.warn('User is not a master, roles:', masterData.roles);
                alert('Пользователь не является мастером');
                navigate('/');
                return;
            }

            console.log('Master data received:', masterData);

            const avatarUrl = await getAvatarUrl(masterData);

            // ДОБАВЬТЕ код для получения адреса:
            let workArea = '';
            if (masterData.districts && masterData.districts.length > 0) {
                const district = masterData.districts[0];
                if (district && district.city && district.city.id) {
                    try {
                        const cityResponse = await fetch(`${API_BASE_URL}/api/cities/${district.city.id}`, {
                            method: 'GET',
                            headers: {
                                'Authorization': `Bearer ${token}`,
                                'Content-Type': 'application/json',
                            },
                        });

                        if (cityResponse.ok) {
                            const cityData = await cityResponse.json();
                            workArea = cityData.title || '';

                            if (district.title) {
                                workArea = `${district.title}, ${workArea}`;
                            }
                        } else {
                            workArea = district.title || 'Город не указан';
                        }
                    } catch (error) {
                        console.error('Error fetching city data:', error);
                        workArea = district.title || 'Город не указан';
                    }
                } else if (district.title) {
                    workArea = district.title;
                }
            }

            const transformedData: ProfileData = {
                id: masterData.id.toString(),
                fullName: [masterData.surname, masterData.name, masterData.patronymic]
                    .filter(Boolean)
                    .join(' ') || 'Фамилия Имя Отчество',
                specialty: masterData.occupation?.map((occ: Occupation) => occ.title).join(', ') || 'Специальность',
                rating: masterData.rating || 0,
                reviews: 0,
                avatar: avatarUrl,
                education: transformEducation(masterData.education || []),
                workExamples: [],
                workArea: workArea,
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

    const getUserInfo = async (userId: number, userType: 'master' | 'client') => {
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
                // Получаем URL аватара
                const avatarUrl = await getAvatarUrl(userData, userType);

                const userInfo = {
                    id: userData.id,
                    email: userData.email || '',
                    name: userData.name || '',
                    surname: userData.surname || '',
                    rating: userData.rating || 0,
                    image: avatarUrl || ''
                };
                console.log(`User info for ${userType}:`, userInfo);
                return userInfo;
            }
        } catch (error) {
            console.error(`Error fetching user ${userId}:`, error);
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

    const fetchReviews = async (masterId: number) => {
        try {
            setReviewsLoading(true);
            const token = getAuthToken();

            if (!token) {
                console.log('No token available for fetching reviews');
                return;
            }

            console.log('Fetching reviews for master ID:', masterId);

            // ИСПРАВЛЕННЫЙ ENDPOINT согласно документации API
            // Используем фильтрацию по master
            const endpoint = `/api/reviews?master.id=${masterId}`;

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

            console.log(`Processing ${reviewsArray.length} reviews`);

            if (reviewsArray.length > 0) {
                const transformedReviews = await Promise.all(
                    reviewsArray.map(async (review: ReviewApiResponse) => {
                        console.log('Processing review:', review);

                        const masterId = review.master?.id;
                        const clientId = review.client?.id;

                        // Получаем данные мастера и клиента
                        const [masterData, clientData] = await Promise.all([
                            masterId ? getUserInfo(masterId, 'master') : Promise.resolve(null),
                            clientId ? getUserInfo(clientId, 'client') : Promise.resolve(null)
                        ]);

                        // Определяем user (мастер) и reviewer (клиент)
                        const user = masterData || {
                            id: parseInt(profileData?.id || '0'),
                            email: '',
                            name: profileData?.fullName.split(' ')[1] || 'Мастер',
                            surname: profileData?.fullName.split(' ')[0] || '',
                            rating: profileData?.rating || 0,
                            image: profileData?.avatar || ''
                        };

                        const reviewer = clientData || {
                            id: 0,
                            email: '',
                            name: 'Клиент',
                            surname: '',
                            rating: 0,
                            image: ''
                        };

                        const transformedReview: Review = {
                            id: review.id,
                            rating: review.rating || 0,
                            description: review.description || '',
                            forReviewer: review.forClient || false,
                            services: review.services || { id: 0, title: 'Услуга' },
                            images: review.images || [],
                            user: user,
                            reviewer: reviewer,
                            vacation: profileData?.specialty,
                            worker: clientData ?
                                `${clientData.name || 'Клиент'} ${clientData.surname || ''}`.trim() :
                                'Клиент',
                            date: review.createdAt ?
                                new Date(review.createdAt).toLocaleDateString('ru-RU') :
                                getFormattedDate()
                        };

                        return transformedReview;
                    })
                );

                console.log('All transformed reviews:', transformedReviews);
                setReviews(transformedReviews);

                // Рассчитываем средний рейтинг только для отзывов, где этот мастер является получателем
                const userReviews = transformedReviews.filter(r => r.user.id === parseInt(profileData?.id || '0'));
                const newRating = calculateAverageRating(userReviews);

                // Обновляем профиль
                setProfileData(prev => prev ? {
                    ...prev,
                    reviews: userReviews.length,
                    rating: newRating
                } : null);

            } else {
                console.log('No reviews data found');
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

    const fetchUserGallery = async (masterId: number) => {
        try {
            const token = getAuthToken();
            if (!token) return;

            const endpoints = [
                `/api/galleries/master/${masterId}`,
                '/api/galleries/me'
            ];

            let galleriesData = null;

            for (const endpoint of endpoints) {
                try {
                    console.log(`Trying gallery endpoint: ${endpoint}`);
                    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                        method: 'GET',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json',
                        },
                    });

                    console.log(`Response status for ${endpoint}: ${response.status}`);

                    if (response.ok) {
                        galleriesData = await response.json();
                        console.log(`Gallery data from ${endpoint}:`, galleriesData);
                        break;
                    } else if (response.status === 404) {
                        console.log(`Gallery not found at ${endpoint}`);
                        continue;
                    }
                } catch (error) {
                    console.warn(`Error fetching from ${endpoint}:`, error);
                    continue;
                }
            }

            if (galleriesData) {
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

                console.log('Processed gallery array:', galleryArray);

                if (galleryArray.length > 0) {
                    const userGallery = galleryArray[0];
                    const galleryItems = userGallery.images || [];
                    console.log('Gallery images found:', galleryItems);

                    if (galleryItems.length > 0) {
                        const workExamplesLocal = await Promise.all(
                            galleryItems.map(async (image: GalleryItem) => {
                                const imagePath = image.image;
                                if (!imagePath) {
                                    return {
                                        id: Date.now().toString(),
                                        image: "../fonTest6.png",
                                        title: "Пример работы"
                                    };
                                }

                                const imageUrl = getImageUrl(imagePath);
                                const exists = await checkImageExists(imageUrl);

                                return {
                                    id: image.id?.toString() || Date.now().toString(),
                                    image: exists ? imageUrl : "../fonTest6.png",
                                    title: "Пример работы"
                                };
                            })
                        );

                        console.log("Work examples updated:", workExamplesLocal);

                        setProfileData(prev => prev ? {
                            ...prev,
                            workExamples: workExamplesLocal
                        } : null);
                    } else {
                        setProfileData(prev => prev ? {
                            ...prev,
                            workExamples: []
                        } : null);
                    }
                } else {
                    setProfileData(prev => prev ? {
                        ...prev,
                        workExamples: []
                    } : null);
                }
            } else {
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

    const getAvatarUrl = async (userData: UserData, userType: 'master' | 'client' = 'master'): Promise<string | null> => {
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

    const transformEducation = (education: EducationItem[]): Education[] => {
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

    const getImageUrl = (imagePath: string): string => {
        if (!imagePath) return "../fonTest6.png";

        if (imagePath.startsWith("http")) return imagePath;
        if (imagePath.startsWith("/")) return `${API_BASE_URL}${imagePath}`;

        const galleryPhotoUrl = `${API_BASE_URL}/images/gallery_photos/${imagePath}`;

        return galleryPhotoUrl;
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
        return `${review.user.name} ${review.user.surname}`.trim();
    };

    const getClientName = (review: Review) => {
        return `${review.reviewer.name} ${review.reviewer.surname}`.trim();
    };

    const handleClientProfileClick = async (clientId: number) => {
        console.log('Navigating to client profile:', clientId);

        const token = getAuthToken();

        // Если пользователь не авторизован, показываем модалку авторизации
        if (!token) {
            setShowAuthModal(true);
            return;
        }

        try {
            // Использовать fetchUserWithRole для определения роли
            const { role } = await fetchUserWithRole(clientId);

            if (role === 'client') {
                navigate(`/client/${clientId}`);
            } else {
                console.warn('User is not a client, role:', role);
                // Все равно перенаправляем на клиентский профиль
                navigate(`/client/${clientId}`);
            }
        } catch (error) {
            console.error('Error checking user role:', error);
            // Fallback
            navigate(`/client/${clientId}`);
        }
    };

    const handleAuthModalClose = () => {
        setShowAuthModal(false);
    };

    const handleAuthSuccess = (token: string, email?: string) => {
        console.log('Login successful', token, email);
        setShowAuthModal(false);
    };

    // Функции для работы с жалобой
    const handleComplaintClick = () => {
        const token = getAuthToken();
        if (!token) {
            setShowAuthModal(true);
            return;
        }

        setShowComplaintModal(true);
    };

    const handleComplaintClose = () => {
        setShowComplaintModal(false);
        setComplaintReason('');
        setComplaintDescription('');
        setComplaintTitle('');
        setComplaintPhotos([]);
    };

    const handleComplaintPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files);
            setComplaintPhotos(prev => [...prev, ...files]);
        }
    };

    const removeComplaintPhoto = (index: number) => {
        setComplaintPhotos(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmitComplaint = async () => {
        if (!complaintReason.trim()) {
            alert('Пожалуйста, выберите причину жалобы');
            return;
        }

        if (!complaintDescription.trim()) {
            alert('Пожалуйста, опишите ситуацию подробнее');
            return;
        }

        try {
            setIsSubmittingComplaint(true);
            const token = getAuthToken();
            if (!token) {
                alert('Необходима авторизация');
                return;
            }

            const currentUserId = await getCurrentUserId();
            if (!currentUserId || !profileData) {
                alert('Не удалось определить пользователя или мастера');
                return;
            }

            // Используем структуру из документации API
            const appealData = {
                type: 'ticket', // тип жалобы
                title: complaintTitle.trim() || `Жалоба на мастера ${profileData.fullName}`,
                description: complaintDescription,
                reason: complaintReason, // поле "reason" как в документации
                respondent: `/api/users/${profileData.id}`,
                // ticket и chat могут быть добавлены если это жалоба на конкретный тикет или чат
                // ticket: "/api/tickets/{id}", // если жалоба связана с тикетом
                // chat: "/api/chats/{id}", // если жалоба связана с чатом
            };

            console.log('Sending appeal data:', appealData);

            const response = await fetch(`${API_BASE_URL}/api/appeals`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(appealData)
            });

            if (response.ok) {
                const appealResponse = await response.json();
                console.log('Appeal created successfully:', appealResponse);

                // Загружаем фото через отдельный эндпоинт, если есть
                if (complaintPhotos.length > 0) {
                    try {
                        await uploadAppealPhotos(appealResponse.id, complaintPhotos, token);
                        console.log('All appeal photos uploaded successfully');
                    } catch (uploadError) {
                        console.error('Error uploading appeal photos, but appeal was created:', uploadError);
                        alert('Жалоба отправлена, но возникла ошибка при загрузке фото');
                    }
                }

                handleComplaintClose();
                alert('Жалоба успешно отправлена! Администрация рассмотрит её в ближайшее время.');

            } else {
                const errorText = await response.text();
                console.error('Error creating appeal. Status:', response.status, 'Response:', errorText);

                // Попробуем парсить JSON для получения более детальной информации
                try {
                    const errorJson = JSON.parse(errorText);
                    console.log('Error JSON:', errorJson);

                    if (errorJson.message) {
                        if (errorJson.message === "Wrong complaint reason") {
                            alert('Неверная причина жалобы. Пожалуйста, выберите другую причину из списка.');
                            return;
                        }
                        alert(`Ошибка: ${errorJson.message}`);
                        return;
                    }

                    interface Violation {
                        propertyPath?: string;
                        message?: string;
                        code?: string;
                    }

                    if (errorJson.violations && Array.isArray(errorJson.violations)) {
                        const violationMessages = errorJson.violations
                            .map((v: Violation) => v.message)
                            .filter((message: string | undefined): message is string => Boolean(message))
                            .join(', ');

                        if (violationMessages) {
                            alert(`Ошибки валидации: ${violationMessages}`);
                        } else {
                            alert('Произошла ошибка валидации данных.');
                        }
                        return;
                    }
                } catch {
                    // Не удалось распарсить JSON, показываем общую ошибку
                }

                let errorMessage = 'Ошибка при отправке жалобы';
                if (response.status === 422) {
                    errorMessage = 'Ошибка валидации данных. Проверьте введенные данные.';
                } else if (response.status === 400) {
                    errorMessage = 'Неверные данные для отправки жалобы.';
                } else if (response.status === 404) {
                    errorMessage = 'Ресурс не найден.';
                }

                alert(errorMessage);
            }

        } catch (error) {
            console.error('Error submitting complaint:', error);
            alert('Произошла непредвиденная ошибка при отправке жалобы');
        } finally {
            setIsSubmittingComplaint(false);
        }
    };

    const uploadAppealPhotos = async (appealId: number, photos: File[], token: string) => {
        try {
            console.log(`Uploading ${photos.length} photos for appeal ${appealId}`);

            const formData = new FormData();

            // Добавляем все файлы как массив
            photos.forEach((photo) => {
                // Вариант: добавляем как массив с префиксом []
                formData.append('imageFile[]', photo);
            });

            console.log(`Uploading ${photos.length} photos at once`);

            const response = await fetch(`${API_BASE_URL}/api/appeals/${appealId}/upload-photo`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
                body: formData
            });

            console.log(`Photos upload response status: ${response.status}`);

            if (response.ok) {
                const uploadResult = await response.json();
                console.log('Appeal photos uploaded successfully:', uploadResult);
                return uploadResult;
            } else {
                const errorText = await response.text();
                console.error(`Error uploading photos for appeal ${appealId}:`, response.status, errorText);

                // Если массовая загрузка не работает, пробуем по одному
                console.log('Trying to upload photos one by one...');

                const results = [];
                for (const photo of photos) {
                    try {
                        const singleFormData = new FormData();
                        singleFormData.append('imageFile', photo);

                        const singleResponse = await fetch(`${API_BASE_URL}/api/appeals/${appealId}/upload-photo`, {
                            method: 'POST',
                            headers: {
                                'Authorization': `Bearer ${token}`,
                            },
                            body: singleFormData
                        });

                        if (singleResponse.ok) {
                            const result = await singleResponse.json();
                            results.push(result);
                            console.log(`Photo ${photo.name} uploaded successfully`);
                        } else {
                            console.error(`Failed to upload ${photo.name}`);
                        }
                    } catch (error) {
                        console.error(`Error uploading ${photo.name}:`, error);
                    }
                }

                return results;
            }

        } catch (error) {
            console.error('Error uploading appeal photos:', error);
            throw error;
        }
    };


    // Функции для работы с отзывами
    const handleLeaveReview = () => {
        const token = getAuthToken();
        if (!token) {
            setShowAuthModal(true);
            return;
        }

        setShowReviewModal(true);
    };

    const handleReviewClose = () => {
        setShowReviewModal(false);
        setReviewText('');
        setSelectedStars(0);
        setReviewPhotos([]);
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

    const handleStarClick = (starCount: number) => {
        setSelectedStars(starCount);
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

            const currentUserId = await getCurrentUserId();
            if (!currentUserId || !profileData) {
                alert('Не удалось определить пользователя или мастера');
                return;
            }

            // Подготавливаем данные для отправки отзыва
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

                // Загружаем фото через отдельный эндпоинт, если есть
                if (reviewPhotos.length > 0) {
                    try {
                        await uploadReviewPhotos(reviewResponse.id, reviewPhotos, token);
                        console.log('All review photos uploaded successfully');
                    } catch (uploadError) {
                        console.error('Error uploading review photos, but review was created:', uploadError);
                        alert('Отзыв отправлен, но возникла ошибка при загрузке фото');
                    }
                }

                handleReviewClose();
                alert('Отзыв успешно отправлен!');

                // Обновляем список отзывов
                if (profileData?.id) {
                    fetchReviews(parseInt(profileData.id));
                }

            } else {
                const errorText = await response.text();
                console.error('Error creating review. Status:', response.status, 'Response:', errorText);

                let errorMessage = 'Ошибка при отправке отзыва';
                if (response.status === 422) {
                    errorMessage = 'Ошибка валидации данных. Проверьте введенные данные.';
                } else if (response.status === 400) {
                    errorMessage = 'Неверные данные для отправки отзыва.';
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

    const getCurrentUserId = async (): Promise<number | null> => {
        try {
            const token = getAuthToken();
            if (!token) return null;

            const response = await fetch(`${API_BASE_URL}/api/users/me`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json',
                },
            });

            if (response.ok) {
                const userData = await response.json();
                return userData.id;
            }
            return null;
        } catch (error) {
            console.error('Error getting current user ID:', error);
            return null;
        }
    };

    // Получаем отзывы для отображения (первые 2 или все)
    const displayedReviews = showAllReviews ? reviews : reviews.slice(0, 2);
    const hasMoreReviews = reviews.length > 2;

    if (isLoading) {
        return <div className={styles.profile}>Загрузка...</div>;
    }

    if (!profileData) {
        return <div className={styles.profile}>Ошибка загрузки данных</div>;
    }

    return (
        <div className={styles.profile}>
            <div className={styles.profile_wrap}>
                <div className={styles.profile_content}>
                    <div className={styles.avatar_section}>
                        <div className={styles.avatar_container}>
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
                        </div>
                    </div>

                    <div className={styles.profile_info}>
                        <div className={styles.name_specialty}>
                            <div className={styles.name_row}>
                                <div className={styles.name_with_icon}>
                                    <span className={styles.name}>
                                        {profileData.fullName}
                                    </span>
                                </div>
                            </div>

                            <div className={styles.specialty_row}>
                                <div className={styles.specialty_with_icon}>
                                    <span className={styles.specialty}>{profileData.specialty}</span>
                                </div>
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

                        {/* Кнопка жалобы на мастера */}
                        <div className={styles.complaint_section}>
                            <button
                                className={styles.complaint_button}
                                onClick={handleComplaintClick}
                            >
                                Пожаловаться на мастера
                            </button>
                        </div>
                    </div>
                </div>

                {/* Секция "О себе" */}
                <div className={styles.about_section}>
                    <h3 className={styles.section_subtitle}>Образование и опыт</h3>
                    <div className={styles.section_item}>
                        <div className={styles.section_content}>
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
                                <div className={styles.empty_state}>
                                    <span>Образование не указано</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Примеры работ */}
                    <h3 className={styles.section_subtitle}>Примеры работ</h3>
                    <div className={styles.section_item}>
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
                                                        "../fonTest6.png"
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
                                                            img.src = "../fonTest6.png";
                                                        }
                                                    };

                                                    tryNextSource();
                                                }}
                                                onLoad={() => console.log('Portfolio image loaded successfully:', work.image)}
                                            />
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className={styles.empty_state}>
                                    <span>Примеры работ не добавлены</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Район работы */}
                    <h3 className={styles.section_subtitle}>Район работы</h3>
                    <div className={styles.section_item}>
                        <div className={styles.section_content}>
                            {profileData.workArea ? (
                                <div className={styles.work_area}>
                                    <span>{profileData.workArea}</span>
                                </div>
                            ) : (
                                <div className={styles.empty_state}>
                                    <span>Район работы не указан</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Услуги и цены */}
                    <h3 className={styles.section_subtitle}>Услуги и цены</h3>
                    <div className={styles.section_item}>
                        <div className={styles.section_content}>
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
                                <div className={styles.empty_state}>
                                    <span>Услуги не указаны</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <h2 className={styles.section_title}>Отзывы</h2>
                {/* Секция отзывов */}
                <div className={styles.reviews_section}>
                    <p className={styles.section_subtitle_revievs}>
                        Отзывы
                    </p>

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
                                                alt={getReviewerName(review)}
                                                className={styles.reviewer_avatar}
                                                onClick={() => handleClientProfileClick(review.reviewer.id)}
                                                style={{ cursor: 'pointer' }}
                                                onError={(e) => {
                                                    e.currentTarget.src = "../fonTest6.png";
                                                }}
                                            />
                                            <div className={styles.reviewer_main_info}>
                                                <div
                                                    className={styles.reviewer_name}
                                                    onClick={() => handleClientProfileClick(review.reviewer.id)}
                                                    style={{ cursor: 'pointer' }}
                                                >
                                                    {getClientName(review)}
                                                </div>
                                                <div className={styles.review_vacation}>{review.vacation}</div>
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
                                    <div className={styles.review_details}>
                                        <div className={styles.review_worker_date}>
                                            <span className={styles.review_date}>{review.date}</span>
                                        </div>
                                        <div className={styles.review_rating_secondary}>
                                            <span>Поставил </span>
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

                                    {review.description && (
                                        <div className={styles.review_text}>
                                            {review.description.replace(/<[^>]*>/g, '')}
                                        </div>
                                    )}
                                </div>
                            ))
                        ) : (
                            <div className={styles.no_reviews}>
                                Пока нет отзывов от клиентов
                            </div>
                        )}
                    </div>

                    {/* Кнопки действий с отзывами */}
                    <div className={styles.reviews_actions}>
                        {hasMoreReviews && (
                            <button
                                className={styles.show_all_reviews_btn}
                                onClick={handleShowMore}
                            >
                                {showAllReviews ? 'Скрыть отзывы' : 'Показать все отзывы'}
                            </button>
                        )}
                        <button
                            className={styles.leave_review_btn}
                            onClick={handleLeaveReview}
                        >
                            Оставить отзыв
                        </button>
                    </div>
                </div>
            </div>

            {/* Модальное окно для жалобы на мастера */}
            {showComplaintModal && (
                <div className={styles.modalOverlay}>
                    <div className={styles.complaintModal}>
                        <div className={styles.modalHeader}>
                            <h2>Пожаловаться на мастера</h2>
                            <p className={styles.modalSubtitle}>
                                Опишите проблему, с которой вы столкнулись при работе с мастером
                            </p>
                        </div>

                        <div className={styles.modalContent}>
                            {/* Причина жалобы */}
                            <div className={styles.complaintSection}>
                                <label className={styles.sectionLabel}>Причина жалобы *</label>
                                <select
                                    value={complaintReason}
                                    onChange={(e) => setComplaintReason(e.target.value)}
                                    className={styles.complaintSelect}
                                >
                                    <option value="">Выберите причину</option>
                                    <option value="quality_issue">Проблема с качеством работы</option>
                                    <option value="late_arrival">Опоздание мастера</option>
                                    <option value="unprofessional_behavior">Непрофессиональное поведение</option>
                                    <option value="price_disagreement">Несогласие с ценой</option>
                                    <option value="communication_issue">Проблемы с коммуникацией</option>
                                    <option value="property_damage">Повреждение имущества</option>
                                    <option value="other">Другое</option>
                                </select>
                            </div>

                            {/* Заголовок жалобы */}
                            <div className={styles.complaintSection}>
                                <label className={styles.sectionLabel}>Заголовок жалобы</label>
                                <input
                                    type="text"
                                    value={complaintTitle}
                                    onChange={(e) => setComplaintTitle(e.target.value)}
                                    placeholder="Краткое описание проблемы"
                                    className={styles.complaintInput}
                                />
                            </div>

                            {/* Подробное описание */}
                            <div className={styles.complaintSection}>
                                <label className={styles.sectionLabel}>Подробное описание ситуации *</label>
                                <textarea
                                    value={complaintDescription}
                                    onChange={(e) => setComplaintDescription(e.target.value)}
                                    placeholder="Опишите ситуацию подробно, укажите дату и время, если это уместно..."
                                    className={styles.complaintTextarea}
                                    rows={5}
                                />
                            </div>

                            {/* Загрузка доказательств */}
                            <div className={styles.complaintSection}>
                                <label className={styles.sectionLabel}>Доказательства (необязательно)</label>
                                <p className={styles.photoHint}>
                                    Вы можете приложить скриншоты переписки, фото или другие материалы
                                </p>
                                <div className={styles.photoUploadContainer}>
                                    <div className={styles.photoPreviews}>
                                        {complaintPhotos.map((photo, index) => (
                                            <div key={index} className={styles.photoPreview}>
                                                <img
                                                    src={URL.createObjectURL(photo)}
                                                    alt={`Доказательство ${index + 1}`}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => removeComplaintPhoto(index)}
                                                    className={styles.removePhoto}
                                                >
                                                    ×
                                                </button>
                                            </div>
                                        ))}

                                        <div className={styles.photoUpload}>
                                            <input
                                                type="file"
                                                id="complaint-photos"
                                                multiple
                                                accept="image/*"
                                                onChange={handleComplaintPhotoUpload}
                                                className={styles.fileInput}
                                            />
                                            <label htmlFor="complaint-photos" className={styles.photoUploadButton}>
                                                +
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Кнопки модалки жалобы */}
                        <div className={styles.modalActions}>
                            <button
                                className={styles.closeButton}
                                onClick={handleComplaintClose}
                                disabled={isSubmittingComplaint}
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
                                Отмена
                            </button>
                            <button
                                className={styles.submitButton}
                                onClick={handleSubmitComplaint}
                                disabled={isSubmittingComplaint || !complaintReason || !complaintDescription}
                            >
                                {isSubmittingComplaint ? 'Отправка...' : 'Отправить жалобу'}
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

            {/* Модальное окно для оставления отзыва */}
            {showReviewModal && (
                <div className={styles.modalOverlay}>
                    <div className={styles.reviewModal}>
                        <div className={styles.modalHeader}>
                            <h2>Оставьте отзыв о мастере</h2>
                        </div>

                        <div className={styles.modalContent}>
                            {/* Поле для комментария */}
                            <div className={styles.commentSection}>
                                <textarea
                                    value={reviewText}
                                    onChange={(e) => setReviewText(e.target.value)}
                                    placeholder="Расскажите о вашем опыте работы с мастером..."
                                    className={styles.commentTextarea}
                                    rows={5}
                                />
                            </div>

                            {/* Загрузка фото */}
                            <div className={styles.photoSection}>
                                <label className={styles.sectionLabel}>Приложите фото</label>
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
                                            />
                                            <label htmlFor="review-photos" className={styles.photoUploadButton}>
                                                +
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            {/* Рейтинг звездами */}
                            <div className={styles.ratingSection}>
                                <label className={styles.sectionLabel}>Поставьте оценку</label>
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

                        {/* Кнопки модалки отзыва */}
                        <div className={styles.modalActions}>
                            <button
                                className={styles.closeButton}
                                onClick={handleReviewClose}
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
                                Отмена
                            </button>
                            <button
                                className={styles.submitButton}
                                onClick={handleSubmitReview}
                                disabled={isSubmittingReview || !reviewText || selectedStars === 0}
                            >
                                {isSubmittingReview ? 'Отправка...' : 'Отправить отзыв'}
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