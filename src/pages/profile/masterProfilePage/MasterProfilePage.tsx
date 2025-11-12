import { useState, useRef, useEffect, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuthToken, removeAuthToken } from '../../../utils/auth.ts';
import styles from '../ProfilePage.module.scss';

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
    vacation?: string; // специалист профессия
    worker?: string;   // фио того кто отзывался
    date?: string;
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
    const [reviewsError, setReviewsError] = useState<string | null>(null);

    const API_BASE_URL = 'http://usto.tj.auto-schule.ru';

    const fileInputRef = useRef<HTMLInputElement>(null);
    const workExampleInputRef = useRef<HTMLInputElement>(null);

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
            fetchReviews();
        }
    }, [profileData?.id]);

    // Функция для проверки доступности изображения
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

            console.log('Making authenticated request to /api/users/me with token:', token);

            const response = await fetch(`${API_BASE_URL}/api/users/me`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
            });

            console.log('Response status:', response.status);

            if (response.status === 401) {
                console.log('Token is invalid or expired');
                removeAuthToken();
                navigate('/');
                return;
            }

            if (!response.ok) {
                throw new Error(`Failed to fetch user data: ${response.status} ${response.statusText}`);
            }

            const userData = await response.json();
            console.log('User data received:', userData);

            // Получаем URL аватара с приоритетами
            const avatarUrl = await getAvatarUrl(userData);

            // Трансформируем данные из формата сервера в наш формат
            const transformedData: ProfileData = {
                id: userData.id.toString(),
                fullName: [userData.surname, userData.name, userData.patronymic]
                    .filter(Boolean)
                    .join(' ') || 'Фамилия Имя Отчество',
                specialty: userData.occupation?.map((occ: any) => occ.title).join(', ') || 'Специальность',
                rating: userData.rating || 0,
                reviews: 0,
                avatar: avatarUrl,
                education: transformEducation(userData.education || []),
                workExamples: [],
                workArea: userData.districts?.map((d: any) => d.title).join(', ') || '',
                services: []
            };

            setProfileData(transformedData);
        } catch (error) {
            console.error('Error fetching user data:', error);
            // Если ошибка аутентификации, перенаправляем на логин
            if (error instanceof Error && error.message.includes('401')) {
                removeAuthToken();
                navigate('/login');
                return;
            }
            // Если другие ошибки, создаем пустые данные
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

            const updatedUser = await response.json();
            console.log('User rating updated successfully:', updatedUser);

        } catch (error) {
            console.error('Error updating user rating:', error);
            // Не показываем alert, чтобы не беспокоить пользователя
        }
    };

    // Функция для получения отзывов
    const fetchReviews = async () => {
        try {
            setReviewsLoading(true);
            setReviewsError(null);
            const token = getAuthToken();

            if (!token) {
                console.log('No token available for fetching reviews');
                return;
            }

            // Пробуем разные endpoints для получения отзывов
            const endpoints = [
                `/api/reviews/masters/${profileData?.id}`,
                '/api/reviews/me',
                `/api/reviews/clients/${profileData?.id}`
            ];

            let reviewsData: Review[] = [];

            // Пробуем каждый endpoint пока не найдем рабочий
            for (const endpoint of endpoints) {
                try {
                    console.log(`Trying endpoint: ${endpoint}`);
                    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                        method: 'GET',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json',
                        },
                    });

                    if (response.ok) {
                        reviewsData = await response.json();
                        console.log(`Successfully loaded reviews from ${endpoint}:`, reviewsData);
                        break; // Выходим из цикла если успешно
                    } else {
                        console.warn(`Failed to fetch from ${endpoint}:`, response.status);
                    }
                } catch (error) {
                    console.warn(`Error fetching from ${endpoint}:`, error);
                    continue; // Продолжаем пробовать следующий endpoint
                }
            }

            if (reviewsData.length > 0) {
                // Обогащаем данные отзывов недостающими полями
                const enrichedReviews = reviewsData.map(review => ({
                    ...review,
                    vacation: profileData?.specialty || 'специалист профессия',
                    worker: `${review.user.name} ${review.user.surname}`.trim(),
                    date: getFormattedDate(),
                }));

                setReviews(enrichedReviews);

                // Рассчитываем новый рейтинг
                const newRating = calculateAverageRating(enrichedReviews);

                // Обновляем счетчик отзывов и рейтинг в profileData
                setProfileData(prev => prev ? {
                    ...prev,
                    reviews: enrichedReviews.length,
                    rating: newRating
                } : null);

                // Отправляем обновленный рейтинг на сервер
                await updateUserRating(newRating);

            } else {
                setReviewsError('Не удалось загрузить отзывы. Возможно, у вас еще нет отзывов.');
                console.log('No reviews data found from any endpoint');

                // Используем mock данные для демонстрации с правильной структурой
                const mockReviews: Review[] = [
                    {
                        id: 1,
                        user: {
                            id: 1,
                            email: "client@example.com",
                            name: "Иван",
                            surname: "Петров",
                            rating: 4.8,
                            image: ""
                        },
                        reviewer: {
                            id: parseInt(profileData?.id || '0'),
                            email: "master@example.com",
                            name: profileData?.fullName.split(' ')[1] || "Мастер",
                            surname: profileData?.fullName.split(' ')[0] || "",
                            rating: profileData?.rating || 0,
                            image: profileData?.avatar || ""
                        },
                        rating: 4.8,
                        description: "Текст отзыва",
                        forReviewer: true,
                        services: {
                            id: 1,
                            title: "Ремонт техники"
                        },
                        images: [],
                        vacation: profileData?.specialty || "специалист профессия",
                        worker: "Иван Петров",
                        date: "12.12.2023, Москва"
                    },
                    {
                        id: 2,
                        user: {
                            id: 2,
                            email: "client2@example.com",
                            name: "Мария",
                            surname: "Сидорова",
                            rating: 4.9,
                            image: ""
                        },
                        reviewer: {
                            id: parseInt(profileData?.id || '0'),
                            email: "master@example.com",
                            name: profileData?.fullName.split(' ')[1] || "Мастер",
                            surname: profileData?.fullName.split(' ')[0] || "",
                            rating: profileData?.rating || 0,
                            image: profileData?.avatar || ""
                        },
                        rating: 4.8,
                        description: "Текст отзыва",
                        forReviewer: true,
                        services: {
                            id: 2,
                            title: "Консультация"
                        },
                        images: [],
                        vacation: profileData?.specialty || "специалист профессия",
                        worker: "Мария Сидорова",
                        date: "15.12.2023, Санкт-Петербург"
                    }
                ];

                setReviews(mockReviews);

                // Рассчитываем рейтинг для mock данных
                const newRating = calculateAverageRating(mockReviews);

                setProfileData(prev => prev ? {
                    ...prev,
                    reviews: mockReviews.length,
                    rating: newRating
                } : null);

                // Отправляем обновленный рейтинг на сервер
                await updateUserRating(newRating);
            }

        } catch (error) {
            console.error('Error fetching reviews:', error);
            setReviewsError('Произошла ошибка при загрузке отзывов');

            // Fallback: используем mock данные
            const mockReviews: Review[] = [
                {
                    id: 1,
                    user: {
                        id: 1,
                        email: "client@example.com",
                        name: "Иван",
                        surname: "Петров",
                        rating: 4.8,
                        image: ""
                    },
                    reviewer: {
                        id: parseInt(profileData?.id || '0'),
                        email: "master@example.com",
                        name: profileData?.fullName.split(' ')[1] || "Мастер",
                        surname: profileData?.fullName.split(' ')[0] || "",
                        rating: profileData?.rating || 0,
                        image: profileData?.avatar || ""
                    },
                    rating: 4.8,
                    description: "Текст отзыва",
                    forReviewer: true,
                    services: {
                        id: 1,
                        title: "Основная услуга"
                    },
                    images: [],
                    vacation: profileData?.specialty || "специалист профессия",
                    worker: "Иван Петров",
                    date: "12.12.2023, Москва"
                }
            ];

            setReviews(mockReviews);

            const newRating = calculateAverageRating(mockReviews);

            setProfileData(prev => prev ? {
                ...prev,
                reviews: mockReviews.length,
                rating: newRating
            } : null);

            await updateUserRating(newRating);
        } finally {
            setReviewsLoading(false);
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

    // Функция для получения URL аватара с приоритетами
    const getAvatarUrl = async (userData: any): Promise<string | null> => {
        if (!userData) return null;

        console.log('Getting avatar URL for user:', userData.id);

        // 1. ПРИОРИТЕТ: Серверное фото (основной источник)
        if (userData.image) {
            const serverUrl = `${API_BASE_URL}/images/profile_photos/${userData.image}`;
            console.log('Checking server avatar:', serverUrl);

            if (await checkImageExists(serverUrl)) {
                console.log('Using server avatar');
                return serverUrl;
            }
        }

        // 2. ФАЛЛБЭК: Фото из папки public/uploads/avatars (если существует)
        if (userData.image) {
            const localFilePath = `/uploads/avatars/${userData.image}`;
            console.log('Checking local file path:', localFilePath);

            if (await checkImageExists(localFilePath)) {
                console.log('Using local file avatar');
                return localFilePath;
            }
        }

        // 3. ЗАГЛУШКА: Если ничего не найдено
        console.log('No avatar found, using placeholder');
        return null;
    };

    // Функция для трансформации образования
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

    const updateUserData = async (updatedData: Partial<ProfileData>) => {
        if (!profileData?.id) return;

        try {
            const token = getAuthToken();
            if (!token) {
                navigate('/login');
                return;
            }

            // Подготавливаем данные для отправки в формате API
            const apiData: any = {};

            if (updatedData.fullName !== undefined) {
                const nameParts = updatedData.fullName.split(' ');
                apiData.surname = nameParts[0] || '';
                apiData.name = nameParts[1] || '';
                apiData.patronymic = nameParts.slice(2).join(' ') || '';
            }

            if (updatedData.specialty !== undefined) {
                // Для специальности нужно отправлять ID occupations
                // Пока оставляем как есть, нужно будет доработать
                apiData.occupation = updatedData.specialty.split(',').map((title: string) => ({
                    title: title.trim()
                }));
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

            const updatedUser = await response.json();
            console.log('User data updated successfully:', updatedUser);

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

    // Функция для обновления образования
    const updateEducation = async (educationId: string, updatedEducation: Omit<Education, 'id'>) => {
        if (!profileData?.id) return;

        try {
            const token = getAuthToken();
            if (!token) {
                navigate('/login');
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
                throw new Error('Failed to fetch user data');
            }

            const userData = await userResponse.json();

            // Обновляем массив образования
            const updatedEducationArray = userData.education?.map((edu: any) =>
                edu.id?.toString() === educationId ? {
                    ...edu,
                    uniTitle: updatedEducation.institution,
                    faculty: updatedEducation.faculty,
                    beginning: parseInt(updatedEducation.startYear) || new Date().getFullYear(),
                    ending: updatedEducation.currentlyStudying ? null : parseInt(updatedEducation.endYear) || new Date().getFullYear(),
                    graduated: !updatedEducation.currentlyStudying,
                    occupation: updatedEducation.specialty ? [{ title: updatedEducation.specialty }] : []
                } : edu
            ) || [];

            // Отправляем обновленные данные
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
                // Обновляем локальное состояние
                setProfileData(prev => prev ? {
                    ...prev,
                    education: prev.education.map(edu =>
                        edu.id === educationId ? { ...updatedEducation, id: educationId } : edu
                    )
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
                throw new Error('Failed to update education');
            }

        } catch (error) {
            console.error('Error updating education:', error);
            alert('Ошибка при обновлении образования');
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

        // Проверяем, изменилось ли значение
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

    // Функции для работы с образованием
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

    // ИСПРАВЛЕННАЯ ФУНКЦИЯ: Загрузка фото профиля через POST-запрос
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
            formData.append("imageFile", file); // Ключевой параметр

            const response = await fetch(`${API_BASE_URL}/api/users/${profileData.id}/profile-photo`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`,
                },
                body: formData,
            });

            const text = await response.text();
            console.log('Photo upload response:', text);

            if (!response.ok) {
                console.error(`Ошибка при загрузке (${response.status}):`, text);
                alert(`Ошибка при загрузке фото (${response.status})`);
                return;
            }

            const result = JSON.parse(text);
            console.log("Фото успешно загружено:", result);

            if (result.image) {
                // Обновляем аватар с сервера
                const newAvatarUrl = `${API_BASE_URL}/images/profile_photos/${result.image}`;
                setProfileData(prev => prev ? { ...prev, avatar: newAvatarUrl } : null);
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

    // Обработчик ошибки загрузки изображения
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

    const handleWorkExampleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !profileData) return;

        if (!file.type.startsWith('image/')) {
            alert('Пожалуйста, выберите изображение');
            return;
        }

        const reader = new FileReader();
        reader.onload = async (e) => {
            const newWorkExample: WorkExample = {
                id: Date.now().toString(),
                image: e.target?.result as string,
                title: 'Пример работы'
            };

            const updatedWorkExamples = [...profileData.workExamples, newWorkExample];
            const updatedData = {
                ...profileData,
                workExamples: updatedWorkExamples
            };

            setProfileData(updatedData);

            // Сохраняем на сервер
            await updateUserData({ workExamples: updatedWorkExamples });
        };
        reader.readAsDataURL(file);
    };

    // Функция для получения полного имени пользователя из отзыва
    const getReviewerName = (review: Review) => {
        return `${review.reviewer.name} ${review.reviewer.surname}`.trim();
    };

    // Функция для получения URL аватара ревьюера
    const getReviewerAvatarUrl = (review: Review) => {
        if (review.reviewer.image) {
            return `${API_BASE_URL}/images/profile_photos/${review.reviewer.image}`;
        }
        return "./fonTest6.png";
    };

    const calculateAverageRating = (reviews: Review[]): number => {
        if (reviews.length === 0) return 0;

        const sum = reviews.reduce((total, review) => total + review.rating, 0);
        const average = sum / reviews.length;

        // Округляем до одного знака после запятой
        return Math.round(average * 10) / 10;
    };

    // Функция для повторной загрузки отзывов
    const handleRetryLoadReviews = () => {
        fetchReviews();
    };

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
                                    <input
                                        type="text"
                                        value={tempValue}
                                        onChange={(e) => setTempValue(e.target.value)}
                                        onBlur={() => handleInputSave('specialty')}
                                        onKeyDown={(e) => handleInputKeyPress(e, 'specialty')}
                                        className={styles.specialty_input}
                                        placeholder="Специальность"
                                        autoFocus
                                    />
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
                    <h2 className={styles.section_title}>О себе</h2>

                    {/* Образование и опыт */}
                    <h3 className={styles.section_subtitle}>Образование и опыт</h3>
                    <div className={styles.section_item}>
                        <div className={styles.section_content}>
                            {profileData.education.length > 0 ? (
                                profileData.education.map(edu => (
                                    <div key={edu.id} className={styles.education_item}>
                                        {editingEducation === edu.id ? (
                                            // Режим редактирования (как в EducationPage)
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
                                            // Режим просмотра
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
                                ))
                            ) : (
                                <div className={styles.empty_state}>
                                    <span>Добавить образование</span>
                                    <button
                                        className={styles.add_button}
                                        onClick={() => navigate('/profile/education')}
                                    >
                                        +
                                    </button>
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
                                            <img src={work.image} alt={work.title} />
                                        </div>
                                    ))}
                                    <button
                                        className={styles.add_work_button}
                                        onClick={() => workExampleInputRef.current?.click()}
                                    >
                                        +
                                    </button>
                                </div>
                            ) : (
                                <div className={styles.empty_state}>
                                    <span>Добавить фото</span>
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
                            style={{ display: 'none' }}
                        />
                    </div>

                    {/* Район работы */}
                    <h3 className={styles.section_subtitle}>Район работы</h3>
                    <div className={styles.section_item}>
                        <div className={styles.section_content}>
                            {profileData.workArea ? (
                                <div className={styles.work_area}>
                                    <span>{profileData.workArea}</span>
                                    <button
                                        className={styles.edit_icon}
                                        onClick={() => navigate('/profile/city')}
                                    >
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M7.2302 20.59L2.4502 21.59L3.4502 16.81L17.8902 2.29001C18.1407 2.03889 18.4385 1.83982 18.7663 1.70424C19.0941 1.56865 19.4455 1.49925 19.8002 1.50001C20.5163 1.50001 21.203 1.78447 21.7094 2.29082C22.2157 2.79717 22.5002 3.48392 22.5002 4.20001C22.501 4.55474 22.4315 4.90611 22.296 5.23391C22.1604 5.56171 21.9613 5.85945 21.7102 6.11001L7.2302 20.59Z" stroke="#3A54DA" strokeWidth="2" strokeMiterlimit="10"/>
                                        </svg>
                                    </button>
                                </div>
                            ) : (
                                <div className={styles.empty_state}>
                                    <span>Добавить город</span>
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

                <h2 className={styles.section_title}>Отзывы</h2>
                {/* Секция отзывов */}
                <div className={styles.reviews_section}>
                    <p className={styles.section_subtitle_revievs}>
                        Отзывы
                    </p>

                    {reviewsError && (
                        <div className={styles.reviews_error}>
                            <p>{reviewsError}</p>
                            <button
                                className={styles.retry_button}
                                onClick={handleRetryLoadReviews}
                            >
                                Попробовать снова
                            </button>
                        </div>
                    )}

                    <div className={styles.reviews_list}>
                        {reviewsLoading ? (
                            <div className={styles.loading}>Загрузка отзывов...</div>
                        ) : reviews.length > 0 ? (
                            reviews.map((review) => (
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
                                                <div className={styles.reviewer_name}>{getReviewerName(review)}</div>
                                                <div className={styles.review_vacation}>{review.vacation}</div>
                                                <span className={styles.review_worker}>{review.worker}</span>
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

                                    {/*<span className={styles.review_more}>Еще</span>*/}
                                </div>
                            ))
                        ) : (
                            <div className={styles.no_reviews}>
                                Пока нет отзывов от клиентов
                            </div>
                        )}
                    </div>

                    {reviews.length > 2 && (
                        <div className={styles.reviews_actions}>
                            <button className={styles.show_all_reviews_btn}>
                                Показать все отзывы
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default MasterProfilePage;