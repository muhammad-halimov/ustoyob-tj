import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getAuthToken } from '../../utils/auth';
import styles from '../../pages/profile/ProfilePage.module.scss';

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

const API_BASE_URL = 'https://admin.ustoyob.tj';

function MasterProfileViewPage() {
    const { id } = useParams<{ id: string }>();
    const masterId = id ? parseInt(id) : null;
    const navigate = useNavigate();
    // const { masterId } = useParams<{ masterId: string }>();
    const [isLoading, setIsLoading] = useState(true);
    const [profileData, setProfileData] = useState<ProfileData | null>(null);
    const [reviews, setReviews] = useState<Review[]>([]);
    const [reviewsLoading, setReviewsLoading] = useState(false);
    const [usersCache, setUsersCache] = useState<Map<number, any>>(new Map());
    const [visibleCount, setVisibleCount] = useState(2);

    useEffect(() => {
        if (masterId) {
            fetchMasterData(masterId);
        }
    }, [masterId]);

    useEffect(() => {
        if (profileData?.id) {
            fetchUserGallery(parseInt(profileData.id));
            fetchReviews(parseInt(profileData.id));
        }
    }, [profileData?.id]);

    const handleShowMore = () => {
        setVisibleCount(reviews.length);
    };

    const fetchUser = async (userId: number, userType: 'master' | 'client'): Promise<any> => {
        try {
            if (usersCache.has(userId)) {
                return usersCache.get(userId) || null;
            }

            const token = getAuthToken();
            if (!token) {
                console.log('No token available for fetching user data');
                return null;
            }

            let endpoint = '';
            if (userType === 'master') {
                endpoint = `/api/users/masters`;
            } else if (userType === 'client') {
                endpoint = `/api/users/clients`;
            }

            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
            });

            if (!response.ok) {
                console.warn(`Failed to fetch ${userType} data:`, response.status);
                return null;
            }

            const usersData = await response.json();
            const userData = usersData.find((user: any) => user.id === userId) || null;

            if (userData) {
                setUsersCache(prev => new Map(prev).set(userId, userData));
            }

            return userData;

        } catch (error) {
            console.error(`Error fetching ${userType} data:`, error);
            return null;
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

    const fetchMasterData = async (masterId: number) => {
        try {
            setIsLoading(true);
            const token = getAuthToken();

            if (!token) {
                navigate('/');
                return;
            }

            const masterData = await fetchUser(masterId, 'master');
            if (!masterData) {
                console.error('Master not found');
                setProfileData(null);
                return;
            }

            console.log('Master data received:', masterData);

            const avatarUrl = await getAvatarUrl(masterData);

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
                specialty: masterData.occupation?.map((occ: any) => occ.title).join(', ') || 'Специальность',
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
            return {
                id: 0,
                email: '',
                name: userType === 'master' ? 'Мастер' : 'Клиент',
                surname: '',
                rating: 0,
                image: ''
            };
        }

        const userData = await fetchUser(userId, userType);

        if (userData) {
            const avatarUrl = await getAvatarUrl(userData, userType);
            return {
                id: userData.id,
                email: userData.email || '',
                name: userData.name || '',
                surname: userData.surname || '',
                rating: userData.rating || 0,
                image: avatarUrl || ''
            };
        }

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

            // ПРАВИЛЬНЫЙ ENDPOINT - согласно документации API
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

            let reviewsArray: any[] = [];

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
                    reviewsArray.map(async (review) => {
                        console.log('Processing review:', review);

                        const masterId = review.master?.id;
                        const clientId = review.client?.id;

                        const [masterData, clientData] = await Promise.all([
                            masterId ? getUserInfo(masterId, 'master') : Promise.resolve(null),
                            clientId ? getUserInfo(clientId, 'client') : Promise.resolve(null)
                        ]);

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

                const userReviews = transformedReviews.filter(r => r.user.id === parseInt(profileData?.id || '0'));
                const newRating = calculateAverageRating(userReviews);

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
                let galleryArray: any[] = [];

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
                            galleryItems.map(async (image: any) => {
                                const imagePath = image.image;
                                const imageUrl = getImageUrl(imagePath);
                                const exists = await checkImageExists(imageUrl);

                                return {
                                    id: image.id?.toString() || Date.now().toString(),
                                    image: exists ? imageUrl : "./fonTest6.png",
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

    const getAvatarUrl = async (userData: any, userType: 'master' | 'client' = 'master'): Promise<string | null> => {
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

    const transformEducation = (education: any[]): Education[] => {
        return education.map(edu => ({
            id: edu.id?.toString() || Date.now().toString(),
            institution: edu.uniTitle || '',
            faculty: edu.faculty || '',
            specialty: edu.occupation?.map((occ: any) => occ.title).join(', ') || '',
            startYear: edu.beginning?.toString() || '',
            endYear: edu.ending?.toString() || '',
            currentlyStudying: !edu.graduated
        }));
    };

    const getImageUrl = (imagePath: string): string => {
        if (!imagePath) return "./fonTest6.png";

        if (imagePath.startsWith("http")) return imagePath;
        if (imagePath.startsWith("/")) return `${API_BASE_URL}${imagePath}`;

        const galleryPhotoUrl = `${API_BASE_URL}/images/gallery_photos/${imagePath}`;

        return galleryPhotoUrl;
    };

    const handleImageError = async (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
        console.log('Image loading error, trying fallback sources');
        const img = e.currentTarget;

        if (!profileData?.id) {
            img.src = "./fonTest6.png";
            return;
        }

        const fallbackSources = [
            profileData.avatar?.includes("uploads/") ? `${API_BASE_URL}/api/${profileData.id}/profile-photo` : null,
            profileData.avatar?.includes("uploads/") ? `/uploads/avatars/${profileData.avatar.split("/").pop()}` : null,
            "./fonTest6.png"
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

        img.src = "./fonTest6.png";
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
                if (path && path !== "./fonTest6.png") {
                    console.log('Trying reviewer avatar path:', path);
                    return path;
                }
            }
        }

        console.log('Using default avatar for reviewer');
        return "./fonTest6.png";
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
        if (!url || url === "./fonTest6.png") return url;
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

    // const handleLeaveReview = () => {
    //     if (profileData?.id) {
    //         navigate(`/review/${profileData.id}`);
    //     }
    // };

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
                                    src="./fonTest6.png"
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
                            {profileData.services.length > 0 ? (
                                <div className={styles.services_display}>
                                    {profileData.services.map(service => (
                                        <div key={service.id} className={styles.service_display_item}>
                                            <span className={styles.service_name}>{service.name}</span>
                                            <span className={styles.service_price}>{service.price} ₽</span>
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
                        ) : reviews.length > 0 ? (
                            reviews.slice(0, visibleCount).map((review) => (
                                <div key={review.id} className={styles.review_item}>
                                    <div className={styles.review_header}>
                                        <div className={styles.reviewer_info}>
                                            <img
                                                src={getReviewerAvatarUrl(review)}
                                                alt={getReviewerName(review)}
                                                className={styles.reviewer_avatar}
                                                onError={(e) => {
                                                    e.currentTarget.src = "./fonTest5.png";
                                                }}
                                            />
                                            <div className={styles.reviewer_main_info}>
                                                <div className={styles.reviewer_name}>{getClientName(review)}</div>
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

                    {reviews.length > visibleCount && (
                        <div className={styles.reviews_actions}>
                            <button
                                className={styles.show_all_reviews_btn}
                                onClick={handleShowMore}
                            >
                                Показать все отзывы
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default MasterProfileViewPage;