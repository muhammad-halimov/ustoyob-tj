import {useState, useRef, useEffect, type ChangeEvent, useCallback} from 'react';
import { useNavigate } from 'react-router-dom';
import {getAuthToken} from '../../../../utils/auth.ts';
import styles from './Client.module.scss';
import ReviewList, { Review as ReviewWidget } from '../../../../widgets/RenderReviews/RenderReviews.tsx';

interface ReviewImage {
    id: number;
    image: string;
}

// Обновленный интерфейс Review для совместимости с ReviewList
interface Review {
    id: number;
    master: {
        id: number;
        name?: string;
        surname?: string;
        patronymic?: string;
        profession?: string;
        specialization?: string;
        image?: string;
    };
    reviewer: {
        id: number;
        name?: string;
        surname?: string;
        image?: string;
    };
    rating: number;
    description: string;
    forReviewer: boolean;
    services: {
        id: number;
        title: string;
    };
    images: ReviewImage[];
    createdAt?: string;
    vacation?: string;
    worker?: string;
}

interface UserData {
    id: number;
    firstName: string;
    lastName: string;
    middleName?: string;
    gender: string;
    phone: string;
    phone2: string;
    email: string;
    rating: number;
    isVerified: boolean;
    reviews: Review[];
    avatar: string | null;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const imageCache = new Map<string, boolean>();

function Client() {
    const navigate = useNavigate();
    const [userData, setUserData] = useState<UserData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [editingField, setEditingField] = useState<'fullName' | 'gender' | 'phone' | 'phone2' | 'email' | null>(null);
    const [tempValue, setTempValue] = useState('');
    const [editingFieldHeader, setEditingFieldHeader] = useState(false);
    const [tempValueHeader, setTempValueHeader] = useState('');
    const REVIEWS_PREVIEW_LIMIT = 2;
    const [showAllReviews, setShowAllReviews] = useState(false);
    const [showFullEmail, setShowFullEmail] = useState(false);
    const [copiedEmail, setCopiedEmail] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const emailRef = useRef<HTMLDivElement>(null);

    const getFullName = useCallback(() => {
        if (!userData) return 'Фамилия Имя Отчество';
        return `${userData.lastName} ${userData.firstName} ${userData.middleName || ''}`.trim();
    }, [userData]);

    // Функция для обрезки длинного текста
    const truncateText = useCallback((text: string, maxLength: number = 30): string => {
        if (!text) return '';
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength - 3) + '...';
    }, []);

    // Функция для копирования текста в буфер обмена
    const copyToClipboard = useCallback(async (text: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedEmail(true);
            setTimeout(() => setCopiedEmail(false), 2000);
        } catch (err) {
            console.error('Не удалось скопировать текст: ', err);
        }
    }, []);

    const checkImageExists = useCallback((url: string): Promise<boolean> => {
        return new Promise((resolve) => {
            if (imageCache.has(url)) {
                resolve(imageCache.get(url)!);
                return;
            }

            const img = new Image();
            const timer = setTimeout(() => {
                img.onload = img.onerror = null;
                imageCache.set(url, false);
                resolve(false);
            }, 3000);

            img.onload = () => {
                clearTimeout(timer);
                imageCache.set(url, true);
                resolve(true);
            };
            img.onerror = () => {
                clearTimeout(timer);
                imageCache.set(url, false);
                resolve(false);
            };

            if (!url.includes('?')) {
                img.src = url + '?t=' + Date.now();
            } else {
                img.src = url;
            }
        });
    }, []);

    // Функция для получения URL аватара пользователя
    const getAvatarUrl = useCallback(async (userData: any): Promise<string | null> => {
        if (!userData?.image) return null;

        const serverUrl = `${API_BASE_URL}/images/profile_photos/${userData.image}`;

        if (await checkImageExists(serverUrl)) {
            return serverUrl;
        }

        const alternativePaths = [
            `${API_BASE_URL}/uploads/profile_photos/${userData.image}`,
            userData.image.startsWith('http') ? userData.image : null
        ].filter((path): path is string => path !== null);

        for (const path of alternativePaths) {
            if (await checkImageExists(path)) {
                return path;
            }
        }

        return null;
    }, [checkImageExists]);

    // Функция загрузки отзывов (упрощенная версия)
    const fetchClientReviews = useCallback(async (userId: number): Promise<Review[]> => {
        try {
            const token = getAuthToken();
            if (!token) return [];

            console.log('Fetching reviews for user ID:', userId);

            let reviews: any[] = [];

            try {
                const response = await fetch(`${API_BASE_URL}/api/reviews?client=${userId}`, {
                    method: 'GET',
                    headers: {
                        Authorization: `Bearer ${token}`,
                        Accept: 'application/json',
                    },
                });

                if (response.ok) {
                    const data = await response.json();
                    reviews = data['hydra:member'] || data;
                    console.log('Reviews from API:', reviews.length);
                }
            } catch (error) {
                console.error('Error fetching reviews:', error);
                return [];
            }

            if (!reviews || !Array.isArray(reviews)) {
                console.log('No reviews array found');
                return [];
            }

            // Обрабатываем отзывы
            const processedReviews = reviews
                .map((review: any) => {
                    // Проверяем, что это отзыв о текущем пользователе
                    if (!review.client || String(review.client.id) !== String(userId)) {
                        console.log(`Skipping review ${review.id} - wrong client`);
                        return null;
                    }

                    // Проверяем, что отзыв о клиенте
                    if (review.type !== 'client') {
                        console.log(`Skipping review ${review.id} - not a client review (type: ${review.type})`);
                        return null;
                    }

                    // Получаем данные мастера
                    const masterData = review.master || {};

                    // Формируем данные reviewer (мастер, который оставил отзыв)
                    const reviewerData = {
                        id: masterData.id || 0,
                        name: masterData.name || '',
                        surname: masterData.surname || '',
                        image: masterData.image || ''
                    };

                    const processedReview: Review = {
                        id: review.id,
                        master: {
                            id: masterData.id || 0,
                            name: masterData.name || '',
                            surname: masterData.surname || '',
                            patronymic: masterData.patronymic || '',
                            profession: masterData.profession || '',
                            specialization: masterData.specialization || '',
                            image: masterData.image || '', // Сохраняем оригинальный путь
                        },
                        reviewer: reviewerData,
                        rating: review.rating || 0,
                        description: review.description || '',
                        forReviewer: true,
                        services: {
                            id: review.ticket?.service?.id || 0,
                            title: review.ticket?.service?.title || 'Услуга',
                        },
                        images: review.images?.map((img: any) => ({
                            id: img.id,
                            image: img.image
                        })) || [],
                        createdAt: review.createdAt,
                        vacation: review.ticket?.service?.title || 'Услуга',
                        worker: reviewerData.name && reviewerData.surname
                            ? `${reviewerData.name} ${reviewerData.surname}`.trim()
                            : 'Мастер'
                    };

                    console.log(`Review ${review.id} processed:`, {
                        masterImage: processedReview.master.image,
                        reviewerImage: processedReview.reviewer.image
                    });

                    return processedReview;
                })
                .filter((review): review is Review => review !== null);

            console.log('Processed reviews count:', processedReviews.length);
            return processedReviews;

        } catch (error) {
            console.error('Error in fetchClientReviews:', error);
            return [];
        }
    }, [API_BASE_URL]);

    // Основная функция загрузки данных
    const fetchUserData = useCallback(async () => {
        try {
            setIsLoading(true);
            const token = getAuthToken();

            if (!token) {
                navigate('/');
                return;
            }

            const userResponse = await fetch(`${API_BASE_URL}/api/users/me`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!userResponse.ok) {
                throw new Error(`Failed to fetch user data: ${userResponse.status}`);
            }

            const userDataFromApi = await userResponse.json();

            const avatarUrl = await getAvatarUrl(userDataFromApi);

            // Загружаем отзывы клиента
            const reviews = await fetchClientReviews(userDataFromApi.id);

            // Вычисляем средний рейтинг
            const averageRating = reviews.length > 0
                ? reviews.reduce((sum: number, review: Review) => sum + review.rating, 0) / reviews.length
                : 0;

            const userData: UserData = {
                id: userDataFromApi.id,
                firstName: userDataFromApi.name || '',
                lastName: userDataFromApi.surname || '',
                middleName: userDataFromApi.patronymic || '',
                gender: userDataFromApi.gender || 'gender_male',
                phone: userDataFromApi.phone1 || '+992 900 00-00-00',
                phone2: userDataFromApi.phone2 || '+992 900 00-00-00',
                email: userDataFromApi.email || 'E-mail',
                rating: parseFloat(averageRating.toFixed(1)),
                isVerified: userDataFromApi.isVerified || true,
                avatar: avatarUrl,
                reviews: reviews
            };

            setUserData(userData);

        } catch (error) {
            console.error('Error fetching user data:', error);
        } finally {
            setIsLoading(false);
        }
    }, [navigate, getAvatarUrl, fetchClientReviews]);

    useEffect(() => {
        fetchUserData();
    }, [fetchUserData]);

    // Обработчики редактирования
    const handleHeaderEditStart = useCallback(() => {
        setEditingFieldHeader(true);
        setTempValueHeader(getFullName());
    }, [getFullName]);

    const handleHeaderInputSave = useCallback(async () => {
        if (!userData || !tempValueHeader.trim()) {
            setEditingFieldHeader(false);
            return;
        }

        const trimmedValue = tempValueHeader.trim();
        if (trimmedValue !== getFullName()) {
            await updateUserData('fullName', trimmedValue);
        }

        setEditingFieldHeader(false);
        setTempValueHeader('');
    }, [userData, tempValueHeader, getFullName]);

    const handleHeaderInputKeyPress = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleHeaderInputSave();
        } else if (e.key === 'Escape') {
            setEditingFieldHeader(false);
            setTempValueHeader('');
        }
    }, [handleHeaderInputSave]);

    const updateUserData = useCallback(async (field: string, value: string) => {
        if (!userData?.id) return;

        try {
            const token = getAuthToken();
            if (!token) {
                navigate('/');
                return;
            }

            const apiData: any = {};
            if (field === 'fullName') {
                const nameParts = value.split(' ');
                apiData.surname = nameParts[0] || '';
                apiData.name = nameParts[1] || '';
                apiData.patronymic = nameParts.slice(2).join(' ') || '';
            } else if (field === 'gender') {
                apiData.gender = value;
            } else if (field === 'phone') {
                apiData.phone1 = value;
            } else if (field === 'phone2') {
                apiData.phone2 = value;
            } else if (field === 'email') {
                apiData.email = value;
            }

            const response = await fetch(`${API_BASE_URL}/api/users/${userData.id}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/merge-patch+json',
                },
                body: JSON.stringify(apiData),
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to update user data: ${response.status} - ${errorText}`);
            }

            // Обновляем локальное состояние
            setUserData(prev => {
                if (!prev) return null;

                if (field === 'fullName') {
                    const nameParts = value.split(' ');
                    return {
                        ...prev,
                        lastName: nameParts[0] || '',
                        firstName: nameParts[1] || '',
                        middleName: nameParts.slice(2).join(' ') || ''
                    };
                } else if (field === 'gender') {
                    return { ...prev, gender: value };
                } else if (field === 'phone') {
                    return { ...prev, phone: value };
                } else if (field === 'phone2') {
                    return { ...prev, phone2: value };
                } else if (field === 'email') {
                    return { ...prev, email: value };
                }
                return prev;
            });

        } catch (error) {
            console.error('Error updating user data:', error);
            alert('Ошибка при обновлении данных');
        }
    }, [userData?.id, navigate]);

    const handleEditStart = useCallback((field: 'fullName' | 'gender' | 'phone' | 'phone2' | 'email') => {
        setEditingField(field);
        if (field === 'fullName') {
            setTempValue(getFullName());
        } else if (field === 'gender') {
            setTempValue(userData?.gender || 'gender_male');
        } else if (field === 'phone') {
            setTempValue(userData?.phone || '');
        } else if (field === 'phone2') {
            setTempValue(userData?.phone2 || '');
        } else if (field === 'email') {
            setTempValue(userData?.email || '');
        }
    }, [getFullName, userData]);

    const handleInputSave = useCallback(async () => {
        if (!userData || !tempValue.trim() || !editingField) {
            setEditingField(null);
            return;
        }

        const trimmedValue = tempValue.trim();
        let hasChanged = false;

        if (editingField === 'fullName') {
            hasChanged = trimmedValue !== getFullName();
        } else if (editingField === 'gender') {
            hasChanged = trimmedValue !== userData.gender;
        } else if (editingField === 'phone') {
            hasChanged = trimmedValue !== userData.phone;
        } else if (editingField === 'phone2') {
            hasChanged = trimmedValue !== userData.phone2;
        } else if (editingField === 'email') {
            hasChanged = trimmedValue !== userData.email;
        }

        if (hasChanged) {
            await updateUserData(editingField, trimmedValue);
        }

        setEditingField(null);
        setTempValue('');
    }, [userData, tempValue, editingField, getFullName, updateUserData]);

    const handleInputKeyPress = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleInputSave();
        } else if (e.key === 'Escape') {
            setEditingField(null);
            setTempValue('');
        }
    }, [handleInputSave]);

    const handleAvatarClick = useCallback(() => {
        fileInputRef.current?.click();
    }, []);

    const handleFileChange = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !userData?.id) return;

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

            const response = await fetch(`${API_BASE_URL}/api/users/${userData.id}/update-photo`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`,
                },
                body: formData,
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Upload failed:', errorText);
                alert(`Ошибка при загрузке фото (${response.status})`);
                return;
            }

            const result = await response.json();

            if (result.image) {
                const newAvatarUrl = `${API_BASE_URL}/images/profile_photos/${result.image}`;

                if (await checkImageExists(newAvatarUrl)) {
                    setUserData(prev => prev ? { ...prev, avatar: newAvatarUrl } : null);
                }
            }

            alert("Фото успешно обновлено!");
        } catch (error) {
            console.error("Ошибка при загрузке фото:", error);
            alert("Ошибка при загрузке фото");
        } finally {
            setIsLoading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    }, [userData?.id, navigate, checkImageExists]);

    const handleImageError = useCallback((e: React.SyntheticEvent<HTMLImageElement, Event>) => {
        const img = e.currentTarget;
        img.src = "./fonTest6.png";
    }, []);

    const getGenderDisplay = useCallback((gender: string) => {
        const genderMap: { [key: string]: string } = {
            'gender_female': 'Женский',
            'gender_male': 'Мужской',
            'female': 'Женский',
            'male': 'Мужской',
            'other': 'Другой'
        };
        return genderMap[gender] || gender;
    }, []);

    // SVG компонент для звездочки
    const StarIcon = useCallback(() => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <g clipPath="url(#clip0_186_6434)">
                <g clipPath="url(#clip1_186_6434)">
                    <path d="M12 2.49023L15.51 8.17023L22 9.76023L17.68 14.8502L18.18 21.5102L12 18.9802L5.82 21.5102L6.32 14.8502L2 9.76023L8.49 8.17023L12 2.49023Z" stroke="#3A54DA" strokeWidth="2" strokeMiterlimit="10"/>
                    <path d="M12 19V18.98" stroke="#3A54DA" strokeWidth="2" strokeMiterlimit="10"/>
                </g>
            </g>
            <defs>
                <clipPath id="clip0_186_6434">
                    <rect width="24" height="24" fill="white"/>
                </clipPath>
                <clipPath id="clip1_186_6434">
                    <rect width="24" height="24" fill="white"/>
                </clipPath>
            </defs>
        </svg>
    ), []);

    // Рендер редактируемых полей
    const renderEditableField = useCallback((field: 'fullName' | 'gender' | 'phone' | 'phone2' | 'email', label: string, value: string) => {
        if (editingField === field) {
            if (field === 'gender') {
                return (
                    <select
                        value={tempValue}
                        onChange={(e) => setTempValue(e.target.value)}
                        onBlur={handleInputSave}
                        onKeyDown={handleInputKeyPress}
                        className={styles.edit_input}
                        autoFocus
                    >
                        <option value="gender_male">Мужской</option>
                        <option value="gender_female">Женский</option>
                        <option value="other">Другой</option>
                    </select>
                );
            } else {
                return (
                    <input
                        type={field === 'email' ? 'email' : 'tel'}
                        value={tempValue}
                        onChange={(e) => setTempValue(e.target.value)}
                        onBlur={handleInputSave}
                        onKeyDown={handleInputKeyPress}
                        className={styles.edit_input}
                        placeholder={label}
                        autoFocus
                    />
                );
            }
        } else {
            return (
                <div className={styles.data_value_with_edit}>
                    <span className={styles.data_value}>
                        {field === 'gender' ? getGenderDisplay(value) : value}
                    </span>
                    <button
                        className={styles.edit_icon_small}
                        onClick={() => handleEditStart(field)}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <g clipPath="url(#clip0_188_2958)">
                                <g clipPath="url(#clip1_188_2958)">
                                    <path d="M7.2302 20.59L2.4502 21.59L3.4502 16.81L17.8902 2.29001C18.1407 2.03889 18.4385 1.83982 18.7663 1.70424C19.0941 1.56865 19.4455 1.49925 19.8002 1.50001C20.5163 1.50001 21.203 1.78447 21.7094 2.29082C22.2157 2.79717 22.5002 3.48392 22.5002 4.20001C22.501 4.55474 22.4315 4.90611 22.296 5.23391C22.1604 5.56171 21.9613 5.85945 21.7102 6.11001L7.2302 20.59Z" stroke="#3A54DA" strokeWidth="2" strokeMiterlimit="10"/>
                                </g>
                            </g>
                        </svg>
                    </button>
                </div>
            );
        }
    }, [editingField, tempValue, handleInputSave, handleInputKeyPress, getGenderDisplay, handleEditStart]);

    // Рендер поля email с возможностью копирования и раскрытия
    const renderEmailField = useCallback(() => {
        if (!userData) return null;

        const displayEmail = showFullEmail ? userData.email : truncateText(userData.email, 25);
        const isTruncated = userData.email.length > 25;

        return (
            <div className={styles.data_item}>
                <div className={styles.data_label}>Эл. почта</div>
                <div
                    className={`${styles.email_container} ${copiedEmail ? styles.copied : ''}`}
                    ref={emailRef}
                >
                    <div className={styles.email_actions}>
                        {isTruncated && (
                            <button
                                className={styles.expand_button}
                                onClick={() => setShowFullEmail(!showFullEmail)}
                                title={showFullEmail ? "Свернуть" : "Раскрыть полностью"}
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M6 9L12 15L18 9" stroke="#3A54DA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                                          transform={showFullEmail ? "rotate(180 12 12)" : ""}
                                    />
                                </svg>
                            </button>
                        )}
                        <button
                            className={styles.copy_button}
                            onClick={() => copyToClipboard(userData.email)}
                            title="Скопировать email"
                        >
                            {copiedEmail ? (
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M20 6L9 17L4 12" stroke="#4CAF50" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                            ) : (
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M8 16H6C4.89543 16 4 15.1046 4 14V6C4 4.89543 4.89543 4 6 4H14C15.1046 4 16 4.89543 16 6V8M10 20H18C19.1046 20 20 19.1046 20 18V10C20 8.89543 19.1046 8 18 8H10C8.89543 8 8 8.89543 8 10V18C8 19.1046 8.89543 20 10 20Z" stroke="#3A54DA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                            )}
                        </button>
                    </div>
                    <span
                        className={styles.email_value}
                        onClick={() => {
                            if (isTruncated) {
                                setShowFullEmail(!showFullEmail);
                            }
                        }}
                        title={userData.email}
                    >
                        {displayEmail}
                    </span>
                </div>
            </div>
        );
    }, [userData, showFullEmail, copiedEmail, truncateText, copyToClipboard]);

    if (isLoading) {
        return (
            <div className={styles.profile}>
                <div className={styles.profile_wrap}>
                    <div className={styles.loading}>Загрузка профиля...</div>
                </div>
            </div>
        );
    }

    if (!userData) {
        return (
            <div className={styles.profile}>
                <div className={styles.profile_wrap}>
                    <div className={styles.error}>Ошибка загрузки профиля</div>
                </div>
            </div>
        );
    }

    // Конвертируем отзывы в формат для ReviewList
    // Теперь передаем оригинальные пути к изображениям, а преобразование будет в ReviewList
    const reviewsForWidget: ReviewWidget[] = userData.reviews.map(review => ({
        id: review.id,
        master: {
            id: review.master.id,
            name: review.master.name || '',
            surname: review.master.surname || '',
            patronymic: review.master.patronymic || '',
            profession: review.master.profession || '',
            specialization: review.master.specialization || '',
            image: review.master.image || '', // Оригинальный путь
        },
        reviewer: {
            id: review.reviewer.id,
            name: review.reviewer.name || '',
            surname: review.reviewer.surname || '',
            image: review.reviewer.image || '' // Оригинальный путь
        },
        rating: review.rating,
        description: review.description,
        forReviewer: review.forReviewer,
        services: review.services,
        // Передаем оригинальные пути, преобразование будет в ReviewList
        images: review.images.map(img => ({
            id: img.id,
            image: img.image
        })),
        createdAt: review.createdAt || '',
        vacation: review.vacation || review.services?.title || 'Услуга',
        worker: review.worker || `${review.reviewer.name || ''} ${review.reviewer.surname || ''}`.trim() || 'Мастер'
    }));

    return (
        <div className={styles.profile}>
            <div className={styles.profile_wrap}>
                {/* Шапка профиля с фото */}
                <div className={styles.profile_header}>
                    <div className={styles.profile_content}>
                        <div className={styles.avatar_section}>
                            <div
                                className={styles.avatar_container}
                                onClick={handleAvatarClick}
                            >
                                {userData.avatar ? (
                                    <img
                                        src={userData.avatar}
                                        alt="Аватар"
                                        className={styles.avatar}
                                        onError={handleImageError}
                                        loading="eager"
                                    />
                                ) : (
                                    <img
                                        src="./fonTest6.png"
                                        alt="FonTest6"
                                        className={styles.avatar_placeholder}
                                        loading="eager"
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
                                    {editingFieldHeader ? (
                                        <div className={styles.full_name_edit}>
                                            <input
                                                type="text"
                                                value={tempValueHeader}
                                                onChange={(e) => setTempValueHeader(e.target.value)}
                                                onBlur={handleHeaderInputSave}
                                                onKeyDown={handleHeaderInputKeyPress}
                                                className={styles.name_input}
                                                placeholder="Фамилия Имя Отчество"
                                                autoFocus
                                            />
                                        </div>
                                    ) : (
                                        <div className={styles.name_with_icon}>
                                            <span className={`${styles.name} ${styles.truncate}`}>
                                                {getFullName()}
                                            </span>
                                            <button
                                                className={styles.edit_icon}
                                                onClick={handleHeaderEditStart}
                                            >
                                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                    <g clipPath="url(#clip0_188_2958)">
                                                        <g clipPath="url(#clip1_188_2958)">
                                                            <path d="M7.2302 20.59L2.4502 21.59L3.4502 16.81L17.8902 2.29001C18.1407 2.03889 18.4385 1.83982 18.7663 1.70424C19.0941 1.56865 19.4455 1.49925 19.8002 1.50001C20.5163 1.50001 21.203 1.78447 21.7094 2.29082C22.2157 2.79717 22.5002 3.48392 22.5002 4.20001C22.501 4.55474 22.4315 4.90611 22.296 5.23391C22.1604 5.56171 21.9613 5.85945 21.7102 6.11001L7.2302 20.59Z" stroke="#3A54DA" strokeWidth="2" strokeMiterlimit="10"/>
                                                        </g>
                                                    </g>
                                                </svg>
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className={styles.rating_reviews}>
                                <span className={styles.rating}>
                                    <StarIcon />
                                    {userData.rating || '0'}
                                </span>
                                <span className={styles.reviews}>
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <g clipPath="url(#clip0_188_2937)">
                                        <g clipPath="url(#clip1_188_2937)">
                                        <path d="M12 1.47998C6.2 1.47998 1.5 5.74998 1.5 11C1.52866 13.0153 2.23294 14.9626 3.5 16.53L2.5 21.53L9.16 20.2C10.1031 20.4499 11.0744 20.5776 12.05 20.58C17.85 20.58 22.55 16.3 22.55 11.03C22.55 5.75998 17.8 1.47998 12 1.47998Z" stroke="#3A54DA" strokeWidth="2" strokeMiterlimit="10"/>
                                        </g>
                                        </g>
                                    </svg>
                                    {userData.reviews.length} отзыва
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className={styles.divider}></div>

                {/* Личные данные с редактированием */}
                <div className={styles.personal_data_section}>
                    <h2 className={styles.section_title}>Личные данные</h2>

                    <div className={styles.personal_data_list}>
                        {/* Email поле с особым поведением */}
                        {renderEmailField()}

                        <div className={styles.data_item_phone}>
                            <div className={styles.data_item_sex}>
                                <div className={styles.data_label}>Пол</div>
                                {renderEditableField('gender', 'Пол', userData.gender)}
                            </div>

                            <div className={styles.data_item}>
                                <div className={styles.data_label}>Основной номер</div>
                                {renderEditableField('phone', 'Основной номер', userData.phone)}
                            </div>

                            <div className={styles.data_item}>
                                <div className={styles.data_label}>Дополнительный номер</div>
                                {renderEditableField('phone2', 'Дополнительный номер', userData.phone2)}
                            </div>
                        </div>
                    </div>
                </div>

                <div className={styles.divider}></div>

                {/* Секция отзывов - используем ReviewList */}
                <div className={styles.reviews_section} id="reviews">
                    <h2 className={styles.section_title}>Отзывы от специалистов</h2>
                    <p className={styles.section_subtitle}>
                        Специалисты оставили отзывы о работе с вами
                    </p>

                    <div className={styles.reviews_list}>
                        <ReviewList
                            reviews={reviewsForWidget}
                            showAll={showAllReviews}
                            onToggleShowAll={() => setShowAllReviews(prev => !prev)}
                            previewLimit={REVIEWS_PREVIEW_LIMIT}
                            loading={isLoading}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Client;