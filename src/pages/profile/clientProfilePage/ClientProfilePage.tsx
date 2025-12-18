import {useState, useRef, useEffect, type ChangeEvent, useCallback} from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuthToken } from '../../../utils/auth';
import styles from './ClientProfilePage.module.scss';

import ReviewList, { Review as ReviewWidget } from '../../../widgets/RenderReviews/RenderReviews';

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
    phone2: string;
    email: string;
    rating: number;
    isVerified: boolean;
    reviews: Review[];
    avatar: string | null;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const imageCache = new Map<string, boolean>();

function ClientProfilePage() {
    const navigate = useNavigate();
    const [userData, setUserData] = useState<UserData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [reviewsLoading, setReviewsLoading] = useState(false);
    const [editingField, setEditingField] = useState<'fullName' | 'gender' | 'phone' | 'phone2' | 'email' | null>(null);
    const [tempValue, setTempValue] = useState('');
    const [editingFieldHeader, setEditingFieldHeader] = useState(false);
    const [tempValueHeader, setTempValueHeader] = useState('');
    const REVIEWS_PREVIEW_LIMIT = 2;
    const [showAllReviews, setShowAllReviews] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const getFullName = useCallback(() => {
        if (!userData) return 'Фамилия Имя Отчество';
        return `${userData.lastName} ${userData.firstName} ${userData.middleName || ''}`.trim();
    }, [userData]);

    const checkImageExists = useCallback((url: string): Promise<boolean> => {
        return new Promise((resolve) => {
            // Проверяем кэш
            if (imageCache.has(url)) {
                resolve(imageCache.get(url)!);
                return;
            }

            const img = new Image();
            const timer = setTimeout(() => {
                img.onload = img.onerror = null;
                imageCache.set(url, false);
                resolve(false);
            }, 3000); // Уменьшен таймаут до 3 секунд

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

    // Функция для получения URL аватара с приоритетами
    const getAvatarUrl = useCallback(async (userData: any): Promise<string | null> => {
        if (!userData?.image) return null;

        const serverUrl = `${API_BASE_URL}/images/profile_photos/${userData.image}`;

        if (await checkImageExists(serverUrl)) {
            return serverUrl;
        }

        // Проверяем альтернативные пути
        const alternativePaths = [
            `${API_BASE_URL}/uploads/profile_photos/${userData.image}`,
            userData.image.startsWith('http') ? userData.image : null
        ].filter(Boolean) as string[];

        for (const path of alternativePaths) {
            if (await checkImageExists(path)) {
                return path;
            }
        }

        return null;
    }, [checkImageExists]);

    // Оптимизированная функция загрузки отзывов
    const fetchClientReviews = useCallback(async (userId: number) => {
        try {
            setReviewsLoading(true);
            const token = getAuthToken();
            if (!token) return [];

            const response = await fetch(
                `${API_BASE_URL}/api/reviews?client.id=${userId}`,
                {
                    method: 'GET',
                    headers: {
                        Authorization: `Bearer ${token}`,
                        Accept: 'application/json',
                    },
                }
            );

            if (!response.ok) {
                console.warn('Failed to fetch reviews:', response.status);
                return [];
            }

            const reviews = await response.json();
            return reviews;
        } catch (error) {
            console.error('Error fetching client reviews:', error);
            return [];
        } finally {
            setReviewsLoading(false);
        }
    }, []);

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

            if (!userResponse.ok) throw new Error('Failed to fetch user data');

            const userDataFromApi = await userResponse.json();
            const avatarUrl = await getAvatarUrl(userDataFromApi);
            const reviews = await fetchClientReviews(userDataFromApi.id);

            const userData: UserData = {
                id: userDataFromApi.id,
                firstName: userDataFromApi.name || '',
                lastName: userDataFromApi.surname || '',
                middleName: userDataFromApi.patronymic || '',
                gender: userDataFromApi.gender || 'gender_male',
                phone: userDataFromApi.phone1 || '+0 000 000 00 00',
                phone2: userDataFromApi.phone2 || '+0 000 000 00 00',
                email: userDataFromApi.email || 'E-mail',
                rating: userDataFromApi.rating || 0,
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

    // Оптимизированные обработчики
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

            if (!response.ok) throw new Error(`Failed to update user data: ${response.status}`);

            const updatedUser = await response.json();
            console.log('User data updated successfully:', updatedUser);

            // Обновляем локальное состояние
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
            } else if (field === 'phone1') {
                setUserData(prev => prev ? { ...prev, phone: value } : null);
            } else if (field === 'phone2') {
                setUserData(prev => prev ? { ...prev, phone2: value } : null);
            } else if (field === 'email') {
                setUserData(prev => prev ? { ...prev, email: value } : null);
            }

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

    const handleImageError = useCallback(async (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
        const img = e.currentTarget;
        if (!userData?.id) {
            img.src = "./fonTest6.png";
            return;
        }

        img.src = "./fonTest6.png";
    }, [userData?.id]);

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

    // Мемоизированный рендер редактируемых полей
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
                        type={field === 'email'
                            ? 'email'
                            : field === 'phone' || field === 'phone2'
                                ? 'tel'
                                : 'text'}
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

    // Условный рендеринг для избежания лишних вычислений
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
                        <ReviewList
                            reviews={userData.reviews as unknown as ReviewWidget[]}
                            showAll={showAllReviews}
                            onToggleShowAll={() => setShowAllReviews(prev => !prev)}
                            previewLimit={REVIEWS_PREVIEW_LIMIT}
                            getFullName={getFullName}
                            loading={reviewsLoading}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ClientProfilePage;