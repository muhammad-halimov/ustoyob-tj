import React, {useState, useEffect, useCallback, JSX} from 'react';
import { useParams } from 'react-router-dom';
import { getAuthToken } from '../../utils/auth';
import styles from '../../pages/profile/MasterProfilePage.module.scss';
import AuthModal from '../../shared/ui/AuthModal/AuthModal';

interface UserBasicInfo {
    id: number;
    email?: string;
    name?: string;
    surname?: string;
    rating?: number;
    image?: string | null;
}

interface SocialNetwork {
    id: string;
    network: string;
    handle: string;
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
    addresses: FormattedAddress[];
    socialNetworks?: SocialNetwork[];
}

interface UserUpdateResponse {
    id: number;
    rating: number;
    updatedAt: string;
    [key: string]: unknown;
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
    socialNetworks?: Array<{
        id?: number;
        network?: string;
        handle?: string;
        [key: string]: unknown;
    }>;
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

interface ReviewFormData {
    rating: number;
    description: string;
    images: File[];
}

interface AppealFormData {
    type: 'ticket' | 'chat' | 'user';
    title: string;
    description: string;
    reason: string;
    images: File[];
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

function MasterProfileViewPage() {
    const { id } = useParams<{ id: string }>();
    // const navigate = useNavigate();
    const masterId = id ? parseInt(id) : null;
    const [isLoading, setIsLoading] = useState(true);
    const [profileData, setProfileData] = useState<ProfileData | null>(null);
    const [reviews, setReviews] = useState<Review[]>([]);
    const [reviewsLoading, setReviewsLoading] = useState(false);
    const [showAllReviews, setShowAllReviews] = useState(false);
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [showReviewModal, setShowReviewModal] = useState(false);
    const [showAppealModal, setShowAppealModal] = useState(false);
    const [services, setServices] = useState<ServiceTicket[]>([]);
    const [socialNetworks, setSocialNetworks] = useState<SocialNetwork[]>([
        { id: '1', network: 'telegram', handle: '' },
        { id: '2', network: 'instagram', handle: '' },
        { id: '3', network: 'whatsapp', handle: '' }
    ]);
    const [editingSocialNetwork, setEditingSocialNetwork] = useState<string | null>(null);
    const [socialNetworkEditValue, setSocialNetworkEditValue] = useState('');

    // Формы
    const [reviewForm, setReviewForm] = useState<ReviewFormData>({
        rating: 0,
        description: '',
        images: []
    });
    const [appealForm, setAppealForm] = useState<AppealFormData>({
        type: 'user',
        title: '',
        description: '',
        reason: '',
        images: []
    });
    const [isSubmittingReview, setIsSubmittingReview] = useState(false);
    const [isSubmittingAppeal, setIsSubmittingAppeal] = useState(false);

    // Функция для расчета среднего рейтинга из отзывов
    const calculateAverageRating = useCallback((reviewsList: Review[]): number => {
        if (!reviewsList || reviewsList.length === 0) return 0;

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
        const roundedRating = Math.max(0.1, Math.round(averageRating * 10) / 10);

        return Math.min(5, roundedRating);
    }, []);

    // Функция для обновления рейтинга пользователя на сервере
    const updateUserRating = async (userId: number, newRating: number): Promise<boolean> => {
        const MAX_RETRIES = 3;
        const RETRY_DELAY = 1000;

        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            try {
                const token = getAuthToken();

                if (!token) {
                    console.warn(`Attempt ${attempt}: No token available for updating rating`);
                    if (attempt === MAX_RETRIES) return false;
                    await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
                    continue;
                }

                if (newRating < 0 || newRating > 5) {
                    console.error(`Invalid rating value: ${newRating}. Must be between 0 and 5.`);
                    return false;
                }

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
            const newAverageRating = calculateAverageRating(reviewsList);
            console.log(`Calculated new average rating: ${newAverageRating} from ${reviewsList.length} reviews`);

            const currentRating = profileData?.rating || 0;
            const hasSignificantChange = Math.abs(newAverageRating - currentRating) > 0.1;
            const hadNoReviewsBefore = reviewsList.length > 0 && (currentRating === 0 || !profileData?.reviews);

            if (hasSignificantChange || hadNoReviewsBefore || reviewsList.length === 0) {
                if (profileData) {
                    setProfileData(prev => prev ? {
                        ...prev,
                        rating: newAverageRating,
                        reviews: reviewsList.length
                    } : null);
                }

                if (newAverageRating >= 0 && newAverageRating <= 5) {
                    const updateSuccess = await updateUserRating(userId, newAverageRating);

                    if (updateSuccess) {
                        console.log(`Rating successfully updated to ${newAverageRating} for user ${userId}`);
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

    // Функции для социальных сетей
    const handleSocialNetworkEdit = (networkId: string, currentHandle: string) => {
        setEditingSocialNetwork(networkId);
        setSocialNetworkEditValue(currentHandle);
    };

    const handleSaveSocialNetwork = async (networkId: string) => {
        const newSocialNetworks = socialNetworks.map(network =>
            network.id === networkId
                ? { ...network, handle: socialNetworkEditValue.trim() }
                : network
        );

        setSocialNetworks(newSocialNetworks);
        setEditingSocialNetwork(null);
        setSocialNetworkEditValue('');

        // Сохраняем на сервере
        await updateSocialNetworks(newSocialNetworks);
    };

    const handleCancelEdit = () => {
        setEditingSocialNetwork(null);
        setSocialNetworkEditValue('');
    };

    const getNetworkDisplayName = (network: string): string => {
        switch (network) {
            case 'telegram': return 'Telegram';
            case 'instagram': return 'Instagram';
            case 'whatsapp': return 'WhatsApp';
            default: return network;
        }
    };

    const getNetworkIcon = (network: string): JSX.Element => {
        switch (network) {
            case 'telegram':
                return (
                    <img src="../telegram.png" alt="tg" width="25"/>
                );
            case 'instagram':
                return (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="#3A54DA">
                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                    </svg>
                );
            case 'whatsapp':
                return (
                    <img src="../whatsapp-icon-free-png.png" alt="whatsapp" width="25"/>
                );
            default:
                return (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="#3A54DA">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                    </svg>
                );
        }
    };

    const formatSocialHandle = (network: string, handle: string): string => {
        if (!handle.trim()) return 'Не указан';

        switch (network) {
            case 'telegram':
            case 'instagram':
                return handle.startsWith('@') ? handle : `@${handle}`;
            case 'whatsapp':
                return handle.replace(/\D/g, '');
            default:
                return handle;
        }
    };

    // Функция для обновления социальных сетей на сервере
    const updateSocialNetworks = async (updatedNetworks: SocialNetwork[]) => {
        if (!profileData?.id) {
            console.error('No profile ID available');
            return false;
        }

        try {
            const token = getAuthToken();
            if (!token) {
                setShowAuthModal(true);
                return false;
            }

            const socialNetworksData = updatedNetworks.map(network => {
                let handle = network.handle.trim();

                if (network.network === 'telegram' || network.network === 'instagram') {
                    handle = handle.replace(/^@/, '');
                } else if (network.network === 'whatsapp') {
                    handle = handle.replace(/\D/g, '');
                }

                return {
                    network: network.network.toLowerCase(),
                    handle: handle || null
                };
            });

            console.log('Sending social networks update...');

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

            if (response.ok) {
                const updatedData = await response.json();
                console.log('Social networks updated successfully:', updatedData.socialNetworks);

                if (profileData) {
                    setProfileData(prev => prev ? {
                        ...prev,
                        socialNetworks: updatedNetworks
                    } : null);
                }

                alert('Социальные сети успешно обновлены!');
                return true;
            } else {
                const errorText = await response.text();
                console.error('Error updating social networks:', response.status, errorText);

                try {
                    const errorData = JSON.parse(errorText);
                    console.error('Error details:', errorData);

                    if (response.status === 422) {
                        alert('Ошибка валидации данных. Проверьте формат введенных данных.');
                    } else if (response.status === 401 || response.status === 403) {
                        setShowAuthModal(true);
                    } else {
                        alert(`Ошибка сервера (${response.status}). Попробуйте еще раз.`);
                    }
                } catch {
                    alert('Ошибка при обновлении социальных сетей. Попробуйте еще раз.');
                }
                return false;
            }
        } catch (error) {
            console.error('Network error updating social networks:', error);
            alert('Сетевая ошибка. Проверьте подключение к интернету.');
            return false;
        }
    };

    // Функция для сброса социальных сетей
    const handleResetSocialNetworks = async () => {
        if (!confirm('Вы уверены, что хотите очистить все социальные сети?')) {
            return;
        }

        const resetNetworks = [
            { id: '1', network: 'telegram', handle: '' },
            { id: '2', network: 'instagram', handle: '' },
            { id: '3', network: 'whatsapp', handle: '' }
        ];

        setSocialNetworks(resetNetworks);
        const success = await updateSocialNetworks(resetNetworks);

        if (!success) {
            await fetchMasterData(masterId!);
        }
    };

    // Функции для форм
    const handleReviewSubmit = async () => {
        if (!masterId || !profileData) {
            alert('Ошибка: профиль мастера не загружен');
            return;
        }

        const token = getAuthToken();
        if (!token) {
            setShowAuthModal(true);
            return;
        }

        if (reviewForm.rating === 0) {
            alert('Пожалуйста, поставьте оценку');
            return;
        }

        if (!reviewForm.description.trim()) {
            alert('Пожалуйста, напишите отзыв');
            return;
        }

        setIsSubmittingReview(true);

        try {
            // Создаем отзыв
            const reviewData = {
                type: 'master',
                rating: reviewForm.rating,
                description: reviewForm.description,
                master: `${API_BASE_URL}/api/users/${masterId}`
            };

            console.log('Submitting review:', reviewData);

            const response = await fetch(`${API_BASE_URL}/api/reviews`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify(reviewData),
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to create review: ${response.status} ${errorText}`);
            }

            const createdReview = await response.json();
            console.log('Review created:', createdReview);

            // Загружаем фотографии, если они есть
            if (reviewForm.images.length > 0) {
                const formData = new FormData();
                reviewForm.images.forEach(image => {
                    formData.append('imageFile', image);
                });

                const uploadResponse = await fetch(`${API_BASE_URL}/api/reviews/${createdReview.id}/upload-photo`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    },
                    body: formData,
                });

                if (!uploadResponse.ok) {
                    console.warn('Failed to upload review images');
                }
            }

            // Обновляем список отзывов
            await fetchReviews(masterId);

            // Сбрасываем форму
            setReviewForm({
                rating: 0,
                description: '',
                images: []
            });
            setShowReviewModal(false);

            alert('Отзыв успешно отправлен!');

        } catch (error) {
            console.error('Error submitting review:', error);
            alert('Ошибка при отправке отзыва. Попробуйте еще раз.');
        } finally {
            setIsSubmittingReview(false);
        }
    };

    const handleAppealSubmit = async () => {
        if (!masterId || !profileData) {
            alert('Ошибка: профиль мастера не загружен');
            return;
        }

        const token = getAuthToken();
        if (!token) {
            setShowAuthModal(true);
            return;
        }

        if (!appealForm.title.trim()) {
            alert('Пожалуйста, укажите заголовок жалобы');
            return;
        }

        if (!appealForm.description.trim()) {
            alert('Пожалуйста, опишите жалобу');
            return;
        }

        if (!appealForm.reason.trim()) {
            alert('Пожалуйста, укажите причину жалобы');
            return;
        }

        setIsSubmittingAppeal(true);

        try {
            const appealData = {
                type: appealForm.type,
                title: appealForm.title,
                description: appealForm.description,
                reason: appealForm.reason,
                respondent: `${API_BASE_URL}/api/users/${masterId}`
            };

            console.log('Submitting appeal:', appealData);

            const response = await fetch(`${API_BASE_URL}/api/appeals`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify(appealData),
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to create appeal: ${response.status} ${errorText}`);
            }

            const createdAppeal = await response.json();
            console.log('Appeal created:', createdAppeal);

            // Сбрасываем форму
            setAppealForm({
                type: 'user',
                title: '',
                description: '',
                reason: '',
                images: []
            });
            setShowAppealModal(false);

            alert('Жалоба успешно отправлена! Мы рассмотрим ее в ближайшее время.');

        } catch (error) {
            console.error('Error submitting appeal:', error);
            alert('Ошибка при отправке жалобы. Попробуйте еще раз.');
        } finally {
            setIsSubmittingAppeal(false);
        }
    };

    const handleReviewImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files) {
            const newImages = Array.from(files).slice(0, 5 - reviewForm.images.length);
            setReviewForm(prev => ({
                ...prev,
                images: [...prev.images, ...newImages]
            }));
        }
    };

    const handleRemoveReviewImage = (index: number) => {
        setReviewForm(prev => ({
            ...prev,
            images: prev.images.filter((_, i) => i !== index)
        }));
    };

    const handleAppealImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files) {
            const newImages = Array.from(files).slice(0, 5 - appealForm.images.length);
            setAppealForm(prev => ({
                ...prev,
                images: [...prev.images, ...newImages]
            }));
        }
    };

    const handleRemoveAppealImage = (index: number) => {
        setAppealForm(prev => ({
            ...prev,
            images: prev.images.filter((_, i) => i !== index)
        }));
    };

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

    // Загрузка услуг мастера
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

            if (response.status === 401 || response.status === 403) {
                console.log(`Access denied (${response.status}) for user ${masterId}`);
            }

            if (!response.ok) {
                console.error(`Failed to fetch master ${masterId}: ${response.status} ${response.statusText}`);

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

            // Обработка социальных сетей из API
            const socialNetworksData: SocialNetwork[] = [];
            if (masterData.socialNetworks && Array.isArray(masterData.socialNetworks)) {
                masterData.socialNetworks.forEach((social: any) => {
                    if (social && social.network) {
                        socialNetworksData.push({
                            id: social.id?.toString() || Date.now().toString(),
                            network: social.network.toLowerCase(),
                            handle: social.handle || ''
                        });
                    }
                });
            }

            // Добавляем недостающие социальные сети
            const defaultNetworks = [
                { id: '1', network: 'telegram', handle: '' },
                { id: '2', network: 'instagram', handle: '' },
                { id: '3', network: 'whatsapp', handle: '' }
            ];

            const allSocialNetworks = defaultNetworks.map(defaultNetwork => {
                const apiNetwork = socialNetworksData.find(
                    sn => sn.network === defaultNetwork.network
                );
                return apiNetwork || defaultNetwork;
            });

            setSocialNetworks(allSocialNetworks);

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
                services: [],
                socialNetworks: allSocialNetworks
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

    // Загрузка отзывов
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

            const endpoint = `/api/reviews`;
            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                method: 'GET',
                headers: headers,
            });

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

            const masterReviews = reviewsArray.filter(review => {
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
            if ('client' in review && review.client) {
                const client = review.client as { image?: string | null };
                imagePath = client.image;
            }
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
        // После успешной авторизации можно обновить данные
        if (masterId) {
            fetchMasterData(masterId);
        }
    };

    const handleReviewModalClose = () => {
        setShowReviewModal(false);
        setReviewForm({
            rating: 0,
            description: '',
            images: []
        });
    };

    const handleAppealModalClose = () => {
        setShowAppealModal(false);
        setAppealForm({
            type: 'user',
            title: '',
            description: '',
            reason: '',
            images: []
        });
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

                    {/* Социальные сети */}
                    <div className={styles.section_item}>
                        <div className={styles.social_networks_header}>
                            <h3>Социальные сети</h3>
                            <button
                                onClick={handleResetSocialNetworks}
                                className={styles.reset_social_btn}
                                title="Очистить все социальные сети"
                            >
                                Очистить все
                            </button>
                        </div>

                        <div className={styles.social_networks}>
                            {socialNetworks.map((network) => (
                                <div key={network.id} className={styles.social_network_item}>
                                    <div className={styles.social_network_icon}>
                                        {getNetworkIcon(network.network)}
                                    </div>
                                    <div className={styles.social_network_info}>
                                        <div className={styles.social_network_name}>
                                            {getNetworkDisplayName(network.network)}
                                        </div>
                                        {editingSocialNetwork === network.id ? (
                                            <div className={styles.social_network_edit}>
                                                <input
                                                    type="text"
                                                    value={socialNetworkEditValue}
                                                    onChange={(e) => setSocialNetworkEditValue(e.target.value)}
                                                    className={styles.social_input}
                                                    placeholder={`Введите ${getNetworkDisplayName(network.network)}...`}
                                                    autoFocus
                                                />
                                                <div className={styles.social_edit_buttons}>
                                                    <button
                                                        className={styles.save_social_btn}
                                                        onClick={() => handleSaveSocialNetwork(network.id)}
                                                        title="Сохранить"
                                                        disabled={!socialNetworkEditValue.trim()}
                                                    >
                                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                                                            <path d="M20.285 2l-11.285 11.567-5.286-5.011-3.714 3.716 9 8.728 15-15.285z"/>
                                                        </svg>
                                                    </button>
                                                    <button
                                                        className={styles.cancel_social_btn}
                                                        onClick={handleCancelEdit}
                                                        title="Отменить"
                                                    >
                                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                                                            <path d="M24 20.188l-8.315-8.209 8.2-8.282-3.697-3.697-8.212 8.318-8.31-8.203-3.666 3.666 8.321 8.24-8.206 8.313 3.666 3.666 8.237-8.318 8.285 8.203z"/>
                                                        </svg>
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div
                                                className={`${styles.social_network_handle} ${
                                                    !network.handle.trim() ? styles.empty_handle : ''
                                                }`}
                                                onClick={() => handleSocialNetworkEdit(network.id, network.handle)}
                                                title="Нажмите для редактирования"
                                            >
                                                {network.handle.trim()
                                                    ? formatSocialHandle(network.network, network.handle)
                                                    : 'Не указан'}
                                                <span className={styles.edit_indicator}> (нажмите для редактирования)</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className={styles.social_hint}>
                            <p>• Для Telegram и Instagram можно указать имя пользователя (например: @username)</p>
                            <p>• Для WhatsApp укажите номер телефона</p>
                        </div>
                    </div>
                </div>

                {/* Отзывы */}
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
                            onClick={() => {
                                const token = getAuthToken();
                                if (!token) {
                                    setShowAuthModal(true);
                                } else {
                                    setShowReviewModal(true);
                                }
                            }}
                        >
                            Оставить отзыв
                        </button>
                        <div className={styles.complaint_section}>
                            <button
                                className={styles.complaint_button}
                                onClick={() => {
                                    const token = getAuthToken();
                                    if (!token) {
                                        setShowAuthModal(true);
                                    } else {
                                        setShowAppealModal(true);
                                    }
                                }}
                            >
                                Пожаловаться на мастера
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Модальное окно отзыва */}
            {showReviewModal && (
                <div className={styles.modalOverlay}>
                    <div className={styles.reviewModal}>
                        <div className={styles.modalHeader}>
                            <h2>Оставить отзыв</h2>
                            <p className={styles.modalSubtitle}>
                                Оцените работу мастера и поделитесь своим опытом
                            </p>
                        </div>

                        <div className={styles.modalContent}>
                            <div className={styles.ratingSection}>
                                <label className={styles.sectionLabel}>Оценка</label>
                                <div className={styles.stars}>
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <button
                                            key={star}
                                            className={`${styles.star} ${reviewForm.rating >= star ? styles.active : ''}`}
                                            onClick={() => setReviewForm(prev => ({ ...prev, rating: star }))}
                                            type="button"
                                        >
                                            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                                <path d="M12 2.49023L15.51 8.17023L22 9.76023L17.68 14.8502L18.18 21.5102L12 18.9802L5.82 21.5102L6.32 14.8502L2 9.76023L8.49 8.17023L12 2.49023Z"/>
                                            </svg>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className={styles.commentSection}>
                                <label className={styles.sectionLabel}>Комментарий</label>
                                <textarea
                                    className={styles.commentTextarea}
                                    value={reviewForm.description}
                                    onChange={(e) => setReviewForm(prev => ({ ...prev, description: e.target.value }))}
                                    placeholder="Расскажите о вашем опыте работы с мастером..."
                                    rows={4}
                                />
                            </div>

                            <div className={styles.photoSection}>
                                <label className={styles.sectionLabel}>
                                    Фотографии (до {5 - reviewForm.images.length} можно добавить)
                                </label>
                                <div className={styles.photoPreviews}>
                                    {reviewForm.images.map((image, index) => (
                                        <div key={index} className={styles.photoPreview}>
                                            <img
                                                src={URL.createObjectURL(image)}
                                                alt={`Preview ${index + 1}`}
                                            />
                                            <button
                                                type="button"
                                                className={styles.removePhoto}
                                                onClick={() => handleRemoveReviewImage(index)}
                                            >
                                                ×
                                            </button>
                                        </div>
                                    ))}
                                </div>
                                {reviewForm.images.length < 5 && (
                                    <div className={styles.photoUpload}>
                                        <input
                                            type="file"
                                            id="review-photo-upload"
                                            className={styles.fileInput}
                                            accept="image/*"
                                            multiple
                                            onChange={handleReviewImageUpload}
                                        />
                                        <label htmlFor="review-photo-upload" className={styles.photoUploadButton}>
                                            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                                <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                                            </svg>
                                            Добавить фото
                                        </label>
                                    </div>
                                )}
                                <p className={styles.photoHint}>
                                    Можно загрузить до 5 фотографий в форматах JPG, PNG
                                </p>
                            </div>
                        </div>

                        <div className={styles.modalActions}>
                            <button
                                className={styles.closeButton}
                                onClick={handleReviewModalClose}
                                disabled={isSubmittingReview}
                            >
                                Отмена
                            </button>
                            <button
                                className={styles.submitButton}
                                onClick={handleReviewSubmit}
                                disabled={isSubmittingReview || reviewForm.rating === 0 || !reviewForm.description.trim()}
                            >
                                {isSubmittingReview ? 'Отправка...' : 'Отправить отзыв'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Модальное окно жалобы */}
            {showAppealModal && (
                <div className={styles.modalOverlay}>
                    <div className={styles.complaintModal}>
                        <div className={styles.modalHeader}>
                            <h2>Пожаловаться на мастера</h2>
                            <p className={styles.modalSubtitle}>
                                Ваша жалоба будет рассмотрена администрацией сервиса
                            </p>
                        </div>

                        <div className={styles.modalContent}>
                            <div className={styles.complaintSection}>
                                <label className={styles.sectionLabel}>Тип жалобы</label>
                                <select
                                    className={styles.complaintSelect}
                                    value={appealForm.type}
                                    onChange={(e) => setAppealForm(prev => ({ ...prev, type: e.target.value as 'ticket' | 'chat' | 'user' }))}
                                >
                                    <option value="user">Жалоба на пользователя</option>
                                    <option value="ticket">Жалоба на услугу</option>
                                    <option value="chat">Жалоба на переписку</option>
                                </select>
                            </div>

                            <div className={styles.complaintSection}>
                                <label className={styles.sectionLabel}>Заголовок жалобы</label>
                                <input
                                    type="text"
                                    className={styles.complaintInput}
                                    value={appealForm.title}
                                    onChange={(e) => setAppealForm(prev => ({ ...prev, title: e.target.value }))}
                                    placeholder="Кратко опишите суть жалобы"
                                />
                            </div>

                            <div className={styles.complaintSection}>
                                <label className={styles.sectionLabel}>Причина жалобы</label>
                                <input
                                    type="text"
                                    className={styles.complaintInput}
                                    value={appealForm.reason}
                                    onChange={(e) => setAppealForm(prev => ({ ...prev, reason: e.target.value }))}
                                    placeholder="Укажите причину жалобы"
                                />
                            </div>

                            <div className={styles.complaintSection}>
                                <label className={styles.sectionLabel}>Подробное описание</label>
                                <textarea
                                    className={styles.complaintTextarea}
                                    value={appealForm.description}
                                    onChange={(e) => setAppealForm(prev => ({ ...prev, description: e.target.value }))}
                                    placeholder="Опишите ситуацию подробно..."
                                    rows={4}
                                />
                            </div>

                            <div className={styles.photoSection}>
                                <label className={styles.sectionLabel}>
                                    Доказательства (до {5 - appealForm.images.length} можно добавить)
                                </label>
                                <div className={styles.photoPreviews}>
                                    {appealForm.images.map((image, index) => (
                                        <div key={index} className={styles.photoPreview}>
                                            <img
                                                src={URL.createObjectURL(image)}
                                                alt={`Preview ${index + 1}`}
                                            />
                                            <button
                                                type="button"
                                                className={styles.removePhoto}
                                                onClick={() => handleRemoveAppealImage(index)}
                                            >
                                                ×
                                            </button>
                                        </div>
                                    ))}
                                </div>
                                {appealForm.images.length < 5 && (
                                    <div className={styles.photoUpload}>
                                        <input
                                            type="file"
                                            id="appeal-photo-upload"
                                            className={styles.fileInput}
                                            accept="image/*"
                                            multiple
                                            onChange={handleAppealImageUpload}
                                        />
                                        <label htmlFor="appeal-photo-upload" className={styles.photoUploadButton}>
                                            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                                <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                                            </svg>
                                            Добавить фото
                                        </label>
                                    </div>
                                )}
                                <p className={styles.photoHint}>
                                    Можно загрузить до 5 фотографий в качестве доказательств
                                </p>
                            </div>
                        </div>

                        <div className={styles.modalActions}>
                            <button
                                className={styles.closeButton}
                                onClick={handleAppealModalClose}
                                disabled={isSubmittingAppeal}
                            >
                                Отмена
                            </button>
                            <button
                                className={styles.submitButton}
                                onClick={handleAppealSubmit}
                                disabled={isSubmittingAppeal || !appealForm.title.trim() || !appealForm.description.trim() || !appealForm.reason.trim()}
                            >
                                {isSubmittingAppeal ? 'Отправка...' : 'Отправить жалобу'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

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