import {useState, useRef, useEffect, type ChangeEvent} from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuthToken } from '../../../utils/auth';
import styles from './ClientProfilePage.module.scss';

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
    };
    rating: number;
    description: string;
    forReviewer: boolean;
    services: {
        id: number;
        title: string;
    };
    images: Array<{
        id: number;
        image: string;
    }>;
    createdAt?: string;
}

interface UserData {
    id: number;
    firstName: string;
    lastName: string;
    middleName?: string;
    gender: string;
    phone: string;
    email: string;
    rating: number;
    isVerified: boolean;
    reviews: Review[];
    avatar: string | null;
}

function ClientProfilePage() {
    const navigate = useNavigate();
    const [userData, setUserData] = useState<UserData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [reviewsLoading, setReviewsLoading] = useState(false);
    const [editingField, setEditingField] = useState<'fullName' | 'gender' | 'phone' | 'email' | null>(null);
    const [tempValue, setTempValue] = useState('');
    const [editingFieldHeader, setEditingFieldHeader] = useState(false);
    const [tempValueHeader, setTempValueHeader] = useState('');
    const API_BASE_URL = 'https://admin.ustoyob.tj';

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Функции для шапки профиля
    const handleHeaderEditStart = () => {
        setEditingFieldHeader(true);
        setTempValueHeader(getFullName());
    };

    const handleHeaderInputSave = async () => {
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
    };

    const handleHeaderInputKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleHeaderInputSave();
        } else if (e.key === 'Escape') {
            setEditingFieldHeader(false);
            setTempValueHeader('');
        }
    };

    // Функция для загрузки отзывов клиента
    const fetchClientReviews = async (userId: number) => {
        try {
            setReviewsLoading(true);
            const token = getAuthToken();

            if (!token) {
                console.error('No auth token available');
                return [];
            }

            console.log('Fetching reviews for client ID:', userId);

            const response = await fetch(`${API_BASE_URL}/api/reviews/clients/${userId}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                if (response.status === 403) {
                    console.log('Access forbidden to reviews endpoint');
                    return [];
                }
                if (response.status === 404) {
                    console.log('Reviews endpoint not found, trying alternative...');
                    return await tryAlternativeReviewEndpoint(userId, token);
                }
                throw new Error(`Failed to fetch reviews: ${response.status}`);
            }

            const reviewsData: Review[] = await response.json();
            console.log('Raw reviews data from API:', reviewsData);

            return reviewsData;
        } catch (error) {
            console.error('Error fetching client reviews:', error);
            return [];
        } finally {
            setReviewsLoading(false);
        }
    };

    const tryAlternativeReviewEndpoint = async (userId: number, token: string) => {
        const alternativeEndpoints = [
            `${API_BASE_URL}/api/users/${userId}/reviews?forClient=true`,
            `${API_BASE_URL}/api/reviews?forReviewer=false&reviewer.id=${userId}`,
            `${API_BASE_URL}/api/reviews?client=${userId}`,
        ];

        for (const endpoint of alternativeEndpoints) {
            try {
                console.log('Trying alternative endpoint:', endpoint);
                const response = await fetch(endpoint, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                });

                if (response.ok) {
                    const data = await response.json();
                    console.log('Success with endpoint:', endpoint);
                    return data;
                }
            } catch (error) {
                console.log('Failed with endpoint:', endpoint, error);
                continue;
            }
        }

        return [];
    };

    useEffect(() => {
        fetchUserData();
    }, []);

    // Функция для проверки доступности изображения
    const checkImageExists = (url: string): Promise<boolean> => {
        return new Promise((resolve) => {
            const img = new Image();
            const timer = setTimeout(() => {
                img.onload = img.onerror = null;
                resolve(false);
            }, 5000); // 5 секунд таймаут

            img.onload = () => {
                clearTimeout(timer);
                console.log('Image exists:', url);
                resolve(true);
            };
            img.onerror = () => {
                clearTimeout(timer);
                console.log('Image does not exist:', url);
                resolve(false);
            };
            img.src = url;

            // Добавляем cache busting для избежания кэширования
            if (url.includes('?')) {
                img.src = url + '&t=' + Date.now();
            } else {
                img.src = url + '?t=' + Date.now();
            }
        });
    };

    const fetchUserData = async () => {
        try {
            setIsLoading(true);
            const token = getAuthToken();

            if (!token) {
                navigate('/');
                return;
            }

            // Загружаем основные данные пользователя
            const userResponse = await fetch(`${API_BASE_URL}/api/users/me`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!userResponse.ok) {
                throw new Error('Failed to fetch user data');
            }

            const userDataFromApi = await userResponse.json();
            console.log('Raw user data from API:', userDataFromApi);

            // Получаем URL аватара с приоритетами
            const avatarUrl = await getAvatarUrl(userDataFromApi);

            // Создаем базовый объект пользователя
            const userData: UserData = {
                id: userDataFromApi.id,
                firstName: userDataFromApi.name || '',
                lastName: userDataFromApi.surname || '',
                middleName: userDataFromApi.patronymic || '',
                gender: userDataFromApi.gender || 'gender_male',
                phone: userDataFromApi.phone1 || '+0 000 000 00 00',
                email: userDataFromApi.email || 'адрес емаил',
                rating: userDataFromApi.rating || 4.48,
                isVerified: userDataFromApi.isVerified || true,
                avatar: avatarUrl,
                reviews: []
            };

            // Загружаем отзывы для этого клиента
            console.log('Fetching reviews for user ID:', userDataFromApi.id);
            const reviews = await fetchClientReviews(userDataFromApi.id);

            // Обновляем данные пользователя с отзывами
            userData.reviews = reviews;

            setUserData(userData);
            console.log('Final user data with reviews:', userData);
        } catch (error) {
            console.error('Error fetching user data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // Функция для получения URL аватара с приоритетами
    const getAvatarUrl = async (userData: any): Promise<string | null> => {
        if (!userData) return null;

        console.log('Getting avatar URL for user:', userData.id);

        // Проверяем server image first
        if (userData.image) {
            const serverUrl = `${API_BASE_URL}/images/profile_photos/${userData.image}`;
            console.log('Checking server avatar:', serverUrl);

            if (await checkImageExists(serverUrl)) {
                console.log('Using server avatar');
                return serverUrl;
            }

            // Если основной URL не работает, пробуем альтернативные пути
            const alternativePaths = [
                `${API_BASE_URL}/uploads/profile_photos/${userData.image}`,
                `${API_BASE_URL}/api/images/profile_photos/${userData.image}`,
                userData.image.startsWith('http') ? userData.image : null
            ].filter(Boolean) as string[];

            for (const path of alternativePaths) {
                console.log('Trying alternative path:', path);
                if (await checkImageExists(path)) {
                    console.log('Using alternative avatar path');
                    return path;
                }
            }
        }

        console.log('No avatar found, using placeholder');
        return null;
    };

    const updateUserData = async (field: string, value: string) => {
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
            } else if (field === 'email') {
                apiData.email = value;
            }

            console.log('Sending update data:', apiData);

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
                console.error('Update failed:', errorText);
                throw new Error(`Failed to update user data: ${response.status}`);
            }

            const updatedUser = await response.json();
            console.log('User data updated successfully:', updatedUser);

            if (field === 'fullName') {
                const nameParts = value.split(' ');
                setUserData(prev => prev ? {
                    ...prev,
                    lastName: nameParts[0] || '',
                    firstName: nameParts[1] || '',
                    middleName: nameParts.slice(2).join(' ') || ''
                } : null);
            } else if (field === 'gender') {
                setUserData(prev => prev ? { ...prev, gender: value } : null);
            } else if (field === 'phone') {
                setUserData(prev => prev ? { ...prev, phone: value } : null);
            } else if (field === 'email') {
                setUserData(prev => prev ? { ...prev, email: value } : null);
            }

        } catch (error) {
            console.error('Error updating user data:', error);
            alert('Ошибка при обновлении данных');
        }
    };

    const getFullName = () => {
        if (!userData) return 'Фамилия Имя Отчество';
        return `${userData.lastName} ${userData.firstName} ${userData.middleName || ''}`.trim();
    };

    const handleEditStart = (field: 'fullName' | 'gender' | 'phone' | 'email') => {
        setEditingField(field);

        if (field === 'fullName') {
            setTempValue(getFullName());
        } else if (field === 'gender') {
            setTempValue(userData?.gender || 'gender_male');
        } else if (field === 'phone') {
            setTempValue(userData?.phone || '');
        } else if (field === 'email') {
            setTempValue(userData?.email || '');
        }
    };

    const handleInputSave = async () => {
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
        } else if (editingField === 'email') {
            hasChanged = trimmedValue !== userData.email;
        }

        if (hasChanged) {
            await updateUserData(editingField, trimmedValue);
        }

        setEditingField(null);
        setTempValue('');
    };

    const handleInputKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleInputSave();
        } else if (e.key === 'Escape') {
            setEditingField(null);
            setTempValue('');
        }
    };

    // Функция для получения URL аватара специалиста
    const getReviewerAvatarUrl = (review: Review) => {
        if (review.master?.image) {
            console.log('Master image from data:', review.master.image);

            const possiblePaths = [
                review.master.image,
                `${API_BASE_URL}/images/profile_photos/${review.master.image}`,
                `${API_BASE_URL}/uploads/profile_photos/${review.master.image}`,
                `${API_BASE_URL}/uploads/masters/${review.master.image}`,
                `${API_BASE_URL}/images/masters/${review.master.image}`,
                `${API_BASE_URL}/${review.master.image}`
            ];

            for (const path of possiblePaths) {
                if (path && path !== "./fonTest6.png") {
                    console.log('Trying master avatar path:', path);
                    return path;
                }
            }
        }

        console.log('Using default avatar for master');
        return "./fonTest5.png";
    };

    // Функция для получения полного имени специалиста
    const getReviewerName = (review: Review) => {
        return `${review.master?.surname || ''} ${review.master?.name || ''} ${review.master?.patronymic || ''}`.trim() || 'Специалист';
    };

    // Функция для получения профессии специалиста
    const getReviewerProfession = (review: Review) => {
        return review.master?.profession || review.master?.specialization || 'Специалист';
    };

    // Функция для форматирования даты
    const formatReviewDate = (dateString?: string) => {
        if (!dateString) return getFormattedDate();
        try {
            return new Date(dateString).toLocaleDateString('ru-RU');
        } catch {
            return getFormattedDate();
        }
    };

    const getFormattedDate = (): string => {
        const now = new Date();
        const day = now.getDate().toString().padStart(2, '0');
        const month = (now.getMonth() + 1).toString().padStart(2, '0');
        const year = now.getFullYear();
        return `${day}.${month}.${year}`;
    };

    // Функция для рендера отзывов в правильном формате
    const renderReviews = () => {
        if (reviewsLoading) {
            return <div className={styles.loading}>Загрузка отзывов...</div>;
        }

        if (!userData?.reviews || userData.reviews.length === 0) {
            return <div className={styles.no_reviews}>Пока нет отзывов от специалистов</div>;
        }

        return userData.reviews.map((review) => {
            const reviewerName = getReviewerName(review);
            const reviewerProfession = getReviewerProfession(review);
            const reviewDate = formatReviewDate(review.createdAt);

            return (
                <div key={review.id} className={styles.review_item}>
                    <div className={styles.review_header}>
                        <div className={styles.reviewer_info}>
                            <img
                                src={getReviewerAvatarUrl(review)}
                                alt={reviewerName}
                                className={styles.reviewer_avatar}
                                onError={(e) => {
                                    e.currentTarget.src = "./fonTest5.png";
                                }}
                            />
                            <div className={styles.reviewer_main_info}>
                                <div className={styles.reviewer_name}>{reviewerName}</div>
                                <div className={styles.review_vacation}><span className={styles.review_worker}>{getFullName()}</span> {reviewerProfession}</div>
                                <div className={styles.review_rating_main}>
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <g clipPath="url(#clip0_324_2272)">
                                            <g clipPath="url(#clip1_324_2272)">
                                                <path d="M12 2.49023L15.51 8.17023L22 9.76023L17.68 14.8502L18.18 21.5102L12 18.9802L5.82 21.5102L6.32 14.8502L2 9.76023L8.49 8.17023L12 2.49023Z" stroke="black" strokeWidth="2" strokeMiterlimit="10"/>
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
                            <span className={styles.review_date}>{reviewDate}</span>
                            <div className={styles.review_rating_secondary}>
                                <span>Поставил </span>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <g clipPath="url(#clip0_324_2272)">
                                        <g clipPath="url(#clip1_324_2272)">
                                            <path d="M12 2.49023L15.51 8.17023L22 9.76023L17.68 14.8502L18.18 21.5102L12 18.9802L5.82 21.5102L6.32 14.8502L2 9.76023L8.49 8.17023L12 2.49023Z" stroke="black" strokeWidth="2" strokeMiterlimit="10"/>
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

                    {review.description && (
                        <div className={styles.review_text}>
                            {review.description.replace(/<[^>]*>/g, '')}
                        </div>
                    )}

                    {review.images && review.images.length > 0 && (
                        <div className={styles.review_images}>
                            {review.images.map((image) => (
                                <img
                                    key={image.id}
                                    src={`${API_BASE_URL}${image.image}`}
                                    alt="Отзыв"
                                    className={styles.review_image}
                                />
                            ))}
                        </div>
                    )}
                </div>
            );
        });
    };

    const handleAvatarClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
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

            console.log('Uploading photo for user ID:', userData.id);
            console.log('File details:', {
                name: file.name,
                type: file.type,
                size: file.size
            });

            // Используем правильный endpoint согласно API документации
            const response = await fetch(`${API_BASE_URL}/api/users/${userData.id}/update-photo`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    // Не устанавливаем Content-Type - браузер сам установит multipart/form-data с boundary
                },
                body: formData,
            });

            console.log('Upload response status:', response.status);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Upload failed:', errorText);

                if (response.status === 400) {
                    alert("Неверный формат файла");
                } else if (response.status === 403) {
                    alert("Нет прав для изменения фото");
                } else if (response.status === 422) {
                    alert("Ошибка валидации данных");
                } else {
                    alert(`Ошибка при загрузке фото (${response.status})`);
                }
                return;
            }

            const result = await response.json();
            console.log("Фото успешно загружено:", result);

            // Обновляем URL аватара
            if (result.image) {
                const newAvatarUrl = `${API_BASE_URL}/images/profile_photos/${result.image}`;
                console.log('New avatar URL:', newAvatarUrl);

                // Проверяем, доступно ли новое изображение
                if (await checkImageExists(newAvatarUrl)) {
                    setUserData(prev => prev ? { ...prev, avatar: newAvatarUrl } : null);
                    console.log('Avatar updated successfully');
                } else {
                    console.log('New avatar image not accessible yet, using placeholder');
                    // Можно добавить задержку и повторную проверку
                    setTimeout(async () => {
                        if (await checkImageExists(newAvatarUrl)) {
                            setUserData(prev => prev ? { ...prev, avatar: newAvatarUrl } : null);
                        }
                    }, 2000);
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
    };

    const handleImageError = async (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
        console.log('Image loading error, trying fallback sources');
        const img = e.currentTarget;

        if (!userData?.id) {
            img.src = "./fonTest6.png";
            return;
        }

        const fallbackSources = [
            userData.avatar?.includes("uploads/") ? `${API_BASE_URL}/api/${userData.id}/profile-photo` : null,
            localStorage.getItem(`user_avatar_${userData.id}`),
            userData.avatar?.includes("uploads/") ? `/uploads/avatars/${userData.avatar.split("/").pop()}` : null,
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

    const getGenderDisplay = (gender: string) => {
        const genderMap: { [key: string]: string } = {
            'gender_female': 'Женский',
            'gender_male': 'Мужской',
            'female': 'Женский',
            'male': 'Мужской',
            'other': 'Другой'
        };
        return genderMap[gender] || gender;
    };

    const getGenderIcon = (gender: string) => {
        return (gender === 'gender_female' || gender === 'female');
    };

    // Рендер поля в зависимости от режима редактирования
    const renderEditableField = (field: 'fullName' | 'gender' | 'phone' | 'email', label: string, value: string) => {
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
                        type={field === 'email' ? 'email' : field === 'phone' ? 'tel' : 'text'}
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
                        {field === 'gender' && <span className={styles.gender_icon}>{getGenderIcon(value)}</span>}
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
    };

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
                                        onLoad={() => console.log('Avatar loaded successfully from:', userData.avatar)}
                                    />
                                ) : (
                                    <img
                                        src="./fonTest6.png"
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
                                        <span className={styles.name}>
                                            {getFullName()}
                                        </span>
                                            <button
                                                className={styles.edit_icon}
                                                onClick={handleHeaderEditStart}
                                            >
                                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                    <g clipPath="url(#clip0_188_2958)">
                                                        <g clipPath="url(#clip1_188_2958)">
                                                            <path d="M7.2302 20.59L2.4502 21.59L3.4502 16.81L17.8902 2.29001C18.1407 2.03889 18.4385 1.83982 18.7663 1.70424C19.0941 1.56865 19.4455 1.49925 19.8002 1.50001C20.5163 1.50001 21.203 1.78447 21.7094 2.29082C22.2157 2.79717 22.5002 3.48392 22.5002 4.20001C22.501 4.55474 22.4315 4.90611 22.296 5.23391C22.1604 5.56171 21.9613 5.85945 21.7102 6.11001L7.2302 20.59Z" stroke="#3A54DA" stroke-width="2" stroke-miterlimit="10"/>
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
                                        </g>
                                        </g>
                                    </svg>
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
                    <p className={styles.section_subtitle}>
                        Укажите адрес для определения района заказов. Клиенты его не увидят
                    </p>

                    <div className={styles.personal_data_list}>
                        <div className={styles.data_item}>
                            <div className={styles.data_label}>Имя</div>
                            <div className={styles.data_value}>
                                {getFullName()}
                            </div>
                        </div>

                        <div className={styles.data_item_sex}>
                            <div className={styles.data_label}>Пол</div>
                            {renderEditableField('gender', 'Пол', userData.gender)}
                        </div>

                        <div className={styles.data_item}>
                            <div className={styles.data_label}>номер телефона</div>
                            {renderEditableField('phone', 'Номер телефона', userData.phone)}
                            <p className={styles.data_hint}>
                                Не показываем номер мастерам без вашего одобрения
                            </p>
                        </div>

                        <div className={styles.data_item}>
                            <div className={styles.data_label}>электронная почта</div>
                            {renderEditableField('email', 'Электронная почта', userData.email)}
                        </div>
                    </div>
                </div>

                <div className={styles.divider}></div>

                {/* Секция отзывов */}
                <div className={styles.reviews_section} id="reviews">
                    <h2 className={styles.section_title}>Отзывы от специалистов</h2>
                    <p className={styles.section_subtitle}>
                        Специалисты оставили отзывы о работе с вами
                    </p>

                    <div className={styles.reviews_list}>
                        {renderReviews()}
                    </div>

                    <div className={styles.reviews_actions}>
                        {/*<button className={styles.leave_review_btn}>*/}
                        {/*    Оставить отзыв*/}
                        {/*</button>*/}
                        {userData.reviews.length > 2 && (
                            <button className={styles.show_all_reviews_btn}>
                                Показать все отзывы
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ClientProfilePage;