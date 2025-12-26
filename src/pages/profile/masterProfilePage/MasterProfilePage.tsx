import { useState, useRef, useEffect, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuthToken, removeAuthToken } from '../../../utils/auth.ts';
import styles from '../ProfilePage.module.scss';
// import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
// import { fetchUserById } from "../../../utils/api.ts";
import { cleanText } from "../../../utils/cleanText.ts";

// Интерфейсы
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
    bio?: string;
    socialNetworks?: SocialNetwork[];
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
    user: UserInfo;
    reviewer: UserInfo;
    rating: number;
    description: string;
    forReviewer: boolean;
    services: { id: number; title: string };
    images: { id: number; image: string }[];
    vacation?: string;
    worker?: string;
    date?: string;
}

interface UserInfo {
    id: number;
    email: string;
    name: string;
    surname: string;
    rating: number;
    image: string;
}

interface SocialNetwork {
    network: string;
    handle: string;
}

// API интерфейсы
interface UserApiData {
    id: number;
    email?: string;
    name?: string;
    surname?: string;
    patronymic?: string;
    rating?: number;
    image?: string;
    bio?: string;
    occupation?: { id: number; title: string }[];
    education?: EducationApiData[];
    addresses?: any[];
    socialNetworks?: SocialNetwork[];
    [key: string]: unknown;
}

interface EducationApiData {
    id?: number;
    uniTitle?: string;
    faculty?: string;
    beginning?: number;
    ending?: number;
    graduated?: boolean;
    [key: string]: unknown;
}

function MasterProfilePage() {
    const navigate = useNavigate();
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

    // Состояния
    const [isLoading, setIsLoading] = useState(true);
    const [profileData, setProfileData] = useState<ProfileData | null>(null);
    const [editingField, setEditingField] = useState<'fullName' | 'specialty' | 'bio' | null>(null);
    const [editingEducation, setEditingEducation] = useState<string | null>(null);
    const [editingSocials, setEditingSocials] = useState(false);
    const [tempValue, setTempValue] = useState('');

    const [reviews, setReviews] = useState<Review[]>([]);
    const [reviewsLoading, setReviewsLoading] = useState(false);
    const [visibleCount, setVisibleCount] = useState(2);

    const [services, setServices] = useState<any[]>([]);
    const [servicesLoading, setServicesLoading] = useState(false);

    const [socialNetworks, setSocialNetworks] = useState<SocialNetwork[]>([
        { network: 'telegram', handle: '' },
        { network: 'whatsapp', handle: '' },
        { network: 'vk', handle: '' },
        { network: 'instagram', handle: '' },
        { network: 'facebook', handle: '' }
    ]);

    // Формы
    const [educationForm, setEducationForm] = useState<Omit<Education, 'id'>>({
        institution: '',
        faculty: '',
        specialty: '',
        startYear: '',
        endYear: '',
        currentlyStudying: false
    });

    const [newServiceForm, setNewServiceForm] = useState({
        title: '',
        description: '',
        budget: '',
        unit: 'TJS'
    });

    // Рефы
    const fileInputRef = useRef<HTMLInputElement>(null);
    const workExampleInputRef = useRef<HTMLInputElement>(null);

    // Инициализация
    useEffect(() => {
        const token = getAuthToken();
        if (!token) {
            navigate('/');
            return;
        }
        fetchUserData();
    }, [navigate]);

    // Загрузка дополнительных данных
    useEffect(() => {
        if (profileData?.id) {
            fetchUserGallery();
            fetchReviews();
            fetchMasterServices();
        }
    }, [profileData?.id]);

    // Основная функция загрузки данных пользователя
    const fetchUserData = async () => {
        try {
            setIsLoading(true);
            const token = getAuthToken();

            if (!token) {
                navigate('/login');
                return;
            }

            const response = await fetch(`${API_BASE_URL}/api/users/me`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (response.status === 401) {
                removeAuthToken();
                navigate('/');
                return;
            }

            if (!response.ok) {
                throw new Error(`Failed to fetch user data: ${response.status}`);
            }

            const userData: UserApiData = await response.json();

            // Получаем URL аватара
            const avatarUrl = await getAvatarUrl(userData);

            // Получаем район работы
            const workArea = await getWorkArea(userData.addresses || [], token);

            // Преобразуем образование
            const education = transformEducation(userData.education || []);

            // Обрабатываем социальные сети
            if (userData.socialNetworks) {
                const updatedSocials = [...socialNetworks];
                userData.socialNetworks.forEach(social => {
                    const index = updatedSocials.findIndex(s => s.network === social.network);
                    if (index !== -1) {
                        updatedSocials[index] = social;
                    } else {
                        updatedSocials.push(social);
                    }
                });
                setSocialNetworks(updatedSocials);
            }

            const transformedData: ProfileData = {
                id: userData.id.toString(),
                fullName: [userData.surname, userData.name, userData.patronymic]
                    .filter(Boolean).join(' ') || 'Фамилия Имя Отчество',
                specialty: userData.occupation?.map((occ) => occ.title).join(', ') || 'Специальность',
                rating: userData.rating || 0,
                reviews: 0,
                avatar: avatarUrl,
                education: education,
                workExamples: [],
                workArea: workArea,
                services: [],
                bio: userData.bio || '',
                socialNetworks: userData.socialNetworks || []
            };

            setProfileData(transformedData);

        } catch (error) {
            console.error('Error fetching user data:', error);
            // Создаем пустой профиль в случае ошибки
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
                services: [],
                bio: '',
                socialNetworks: []
            });
        } finally {
            setIsLoading(false);
        }
    };

    // Получение района работы
    const getWorkArea = async (addresses: any[], token: string): Promise<string> => {
        if (!addresses || addresses.length === 0) return '';

        const addressParts: string[] = [];

        for (const address of addresses) {
            const text = await getFullAddressText(address, token);
            if (text) addressParts.push(text);
        }

        const uniqueAddresses = [...new Set(addressParts)];
        return uniqueAddresses.join(', ');
    };

    // Получение полного адреса
    const getFullAddressText = async (address: any, token: string): Promise<string> => {
        const parts: string[] = [];

        // Функция для обработки адресного поля
        const processField = async (field: any, resourceType: string) => {
            if (!field) return;

            if (typeof field === 'string') {
                // Извлекаем ID из URL
                const match = field.match(/\/(\d+)$/);
                if (match) {
                    const id = parseInt(match[1]);
                    const info = await fetchResourceInfo(id, resourceType, token);
                    if (info?.title) parts.push(info.title);
                }
            } else if (field && typeof field === 'object') {
                // Прямой объект
                if (field.title) {
                    parts.push(field.title);
                } else if (field.id) {
                    const info = await fetchResourceInfo(field.id, resourceType, token);
                    if (info?.title) parts.push(info.title);
                }
            }
        };

        // Обрабатываем все уровни адреса
        await processField(address.province, 'provinces');
        await processField(address.city, 'cities');
        await processField(address.district, 'districts');
        await processField(address.suburb, 'suburbs');
        await processField(address.settlement, 'settlements');
        await processField(address.community, 'communities');
        await processField(address.village, 'villages');

        return parts.join(', ');
    };

    // Загрузка информации о ресурсе
    const fetchResourceInfo = async (resourceId: number, resourceType: string, token: string): Promise<any> => {
        try {
            const endpoint = `/api/${resourceType}/${resourceId}`;
            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                return await response.json();
            }
            return null;
        } catch (error) {
            console.error(`Error fetching ${resourceType}:`, error);
            return null;
        }
    };

    // Получение URL аватара
    const getAvatarUrl = async (userData: UserApiData): Promise<string | null> => {
        if (!userData?.image) return null;

        const checkImage = (url: string): Promise<boolean> => {
            return new Promise((resolve) => {
                const img = new Image();
                img.onload = () => resolve(true);
                img.onerror = () => resolve(false);
                img.src = url;
            });
        };

        // Проверяем разные возможные пути
        const possiblePaths = [
            `${API_BASE_URL}/images/profile_photos/${userData.image}`,
            `${API_BASE_URL}/uploads/profile_photos/${userData.image}`,
            `${API_BASE_URL}/${userData.image}`,
            userData.image.startsWith('http') ? userData.image : null
        ].filter(Boolean) as string[];

        for (const path of possiblePaths) {
            if (await checkImage(path)) {
                return path;
            }
        }

        return null;
    };

    // Преобразование образования
    const transformEducation = (education: EducationApiData[]): Education[] => {
        return education.map(edu => ({
            id: edu.id?.toString() || `edu-${Date.now()}-${Math.random()}`,
            institution: edu.uniTitle || '',
            faculty: edu.faculty || '',
            specialty: '', // В API может не быть этого поля
            startYear: edu.beginning?.toString() || '',
            endYear: edu.ending?.toString() || '',
            currentlyStudying: !edu.graduated
        }));
    };

    // Загрузка галереи
    const fetchUserGallery = async () => {
        try {
            const token = getAuthToken();
            if (!token) return;

            const response = await fetch(`${API_BASE_URL}/api/galleries/me`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const galleryData = await response.json();

                // Обрабатываем разные форматы ответа
                let galleryArray = [];
                if (Array.isArray(galleryData)) {
                    galleryArray = galleryData;
                } else if (galleryData && typeof galleryData === 'object') {
                    galleryArray = [galleryData];
                }

                if (galleryArray.length > 0) {
                    const gallery = galleryArray[0];
                    const workExamples: WorkExample[] = (gallery.images || []).map((img: any) => ({
                        id: img.id?.toString() || `img-${Date.now()}-${Math.random()}`,
                        image: getImageUrl(img.image),
                        title: "Пример работы"
                    }));

                    setProfileData(prev => prev ? { ...prev, workExamples } : null);
                }
            }
        } catch (error) {
            console.error('Error fetching gallery:', error);
        }
    };

    // Получение URL изображения
    const getImageUrl = (imagePath: string): string => {
        if (!imagePath) return "../fonTest6.png";

        if (imagePath.startsWith("http")) return imagePath;
        if (imagePath.startsWith("/")) return `${API_BASE_URL}${imagePath}`;

        return `${API_BASE_URL}/images/gallery_photos/${imagePath}`;
    };

    // Создание или получение галереи
    const getOrCreateGallery = async (): Promise<number | null> => {
        try {
            const token = getAuthToken();
            if (!token) return null;

            // Пытаемся получить существующую галерею
            const response = await fetch(`${API_BASE_URL}/api/galleries/me`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const galleryData = await response.json();
                let galleryArray = [];

                if (Array.isArray(galleryData)) {
                    galleryArray = galleryData;
                } else if (galleryData && typeof galleryData === 'object') {
                    galleryArray = [galleryData];
                }

                if (galleryArray.length > 0 && galleryArray[0].id) {
                    return galleryArray[0].id;
                }
            }

            // Если галереи нет, создаем новую
            const createResponse = await fetch(`${API_BASE_URL}/api/galleries`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    images: []
                })
            });

            if (createResponse.ok) {
                const newGallery = await createResponse.json();
                return newGallery.id;
            }

            return null;
        } catch (error) {
            console.error('Error getting/creating gallery:', error);
            return null;
        }
    };

    // Загрузка фото в портфолио
    const handleWorkExampleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            alert('Пожалуйста, выберите изображение');
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            alert('Размер файла не должен превышать 5MB');
            return;
        }

        setIsLoading(true);
        try {
            const token = getAuthToken();
            if (!token) {
                navigate("/");
                return;
            }

            const galleryId = await getOrCreateGallery();
            if (!galleryId) {
                alert('Не удалось создать галерею');
                return;
            }

            const formData = new FormData();
            formData.append("imageFile", file);

            const response = await fetch(`${API_BASE_URL}/api/galleries/${galleryId}/upload-photo`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`,
                },
                body: formData,
            });

            if (response.ok) {
                await fetchUserGallery();
                alert("Фото успешно добавлено в портфолио!");
            } else {
                const errorText = await response.text();
                console.error('Upload error:', errorText);
                alert('Ошибка при загрузке фото');
            }
        } catch (error) {
            console.error("Error uploading photo:", error);
            alert("Ошибка при загрузке фото");
        } finally {
            setIsLoading(false);
            if (workExampleInputRef.current) {
                workExampleInputRef.current.value = "";
            }
        }
    };

    // Удаление фото из портфолио
    const handleDeleteWorkExample = async (workExampleId: string) => {
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

            const galleryId = await getOrCreateGallery();
            if (!galleryId) {
                alert('Галерея не найдена');
                return;
            }

            // Получаем текущую галерею
            const galleryResponse = await fetch(`${API_BASE_URL}/api/galleries/${galleryId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!galleryResponse.ok) {
                throw new Error('Не удалось получить данные галереи');
            }

            const galleryData = await galleryResponse.json();

            // Фильтруем изображения
            const updatedImages = (galleryData.images || []).filter((img: any) =>
                img.id.toString() !== workExampleId
            );

            // Обновляем галерею
            const updateResponse = await fetch(`${API_BASE_URL}/api/galleries/${galleryId}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/merge-patch+json',
                },
                body: JSON.stringify({
                    images: updatedImages
                }),
            });

            if (updateResponse.ok) {
                // Обновляем локальное состояние
                setProfileData(prev => prev ? {
                    ...prev,
                    workExamples: prev.workExamples.filter(work => work.id !== workExampleId)
                } : null);

                alert('Фото успешно удалено из портфолио!');
            } else {
                throw new Error('Не удалось удалить фото');
            }
        } catch (error) {
            console.error('Error deleting work example:', error);
            alert('Ошибка при удалении фото');
        } finally {
            setIsLoading(false);
        }
    };

    // Обновление данных пользователя
    const updateUserData = async (updatedData: Partial<ProfileData>) => {
        if (!profileData?.id) return;

        try {
            const token = getAuthToken();
            if (!token) {
                navigate('/login');
                return;
            }

            const apiData: Record<string, any> = {};

            if (updatedData.fullName !== undefined) {
                const nameParts = updatedData.fullName.split(' ');
                apiData.surname = nameParts[0] || '';
                apiData.name = nameParts[1] || '';
                apiData.patronymic = nameParts.slice(2).join(' ') || '';
            }

            if (updatedData.specialty !== undefined) {
                apiData.occupation = updatedData.specialty.split(',').map(title => title.trim());
            }

            if (updatedData.bio !== undefined) {
                apiData.bio = updatedData.bio;
            }

            const response = await fetch(`${API_BASE_URL}/api/users/${profileData.id}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/merge-patch+json',
                },
                body: JSON.stringify(apiData),
            });

            if (response.ok) {
                const updatedUser = await response.json();
                console.log('User data updated successfully:', updatedUser);

                // Обновляем локальное состояние
                setProfileData(prev => prev ? { ...prev, ...updatedData } : null);
            } else {
                const errorText = await response.text();
                console.error('Update failed:', errorText);
                throw new Error('Failed to update user data');
            }
        } catch (error) {
            console.error('Error updating user data:', error);
            alert('Ошибка при обновлении данных');
        }
    };

    // Сохранение образования
    const handleSaveEducation = async () => {
        if (!profileData?.id || !educationForm.institution.trim()) {
            alert('Пожалуйста, заполните учебное заведение');
            return;
        }

        try {
            const token = getAuthToken();
            if (!token) {
                navigate('/login');
                return;
            }

            // Создаем объект образования для API
            const educationData = {
                uniTitle: educationForm.institution,
                faculty: educationForm.faculty,
                beginning: parseInt(educationForm.startYear) || new Date().getFullYear(),
                ending: educationForm.currentlyStudying ? null : parseInt(educationForm.endYear) || new Date().getFullYear(),
                graduated: !educationForm.currentlyStudying
            };

            // Получаем текущие данные пользователя
            const userResponse = await fetch(`${API_BASE_URL}/api/users/${profileData.id}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!userResponse.ok) {
                throw new Error('Failed to fetch user data');
            }

            const userData = await userResponse.json();
            const currentEducation = userData.education || [];

            let updatedEducation;

            if (editingEducation && editingEducation !== 'new') {
                // Обновляем существующее образование
                updatedEducation = currentEducation.map((edu: any) =>
                    edu.id?.toString() === editingEducation ? { ...edu, ...educationData } : edu
                );
            } else {
                // Добавляем новое образование
                updatedEducation = [...currentEducation, educationData];
            }

            // Отправляем обновленные данные
            const updateResponse = await fetch(`${API_BASE_URL}/api/users/${profileData.id}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/merge-patch+json'
                },
                body: JSON.stringify({
                    education: updatedEducation
                }),
            });

            if (updateResponse.ok) {
                // Обновляем локальное состояние
                const newEducationItem: Education = {
                    ...educationForm,
                    id: editingEducation && editingEducation !== 'new' ? editingEducation : `edu-${Date.now()}`
                };

                setProfileData(prev => {
                    if (!prev) return null;

                    if (editingEducation && editingEducation !== 'new') {
                        return {
                            ...prev,
                            education: prev.education.map(edu =>
                                edu.id === editingEducation ? newEducationItem : edu
                            )
                        };
                    } else {
                        return {
                            ...prev,
                            education: [...prev.education, newEducationItem]
                        };
                    }
                });

                // Сбрасываем форму
                setEditingEducation(null);
                setEducationForm({
                    institution: '',
                    faculty: '',
                    specialty: '',
                    startYear: '',
                    endYear: '',
                    currentlyStudying: false
                });

                alert('Образование успешно сохранено!');
            } else {
                throw new Error('Failed to update education');
            }
        } catch (error) {
            console.error('Error saving education:', error);
            alert('Ошибка при сохранении образования');
        }
    };

    // Удаление образования
    const handleDeleteEducation = async (educationId: string) => {
        if (!confirm('Вы уверены, что хотите удалить эту запись об образовании?')) {
            return;
        }

        try {
            const token = getAuthToken();
            if (!token || !profileData?.id) return;

            // Получаем текущие данные пользователя
            const userResponse = await fetch(`${API_BASE_URL}/api/users/${profileData.id}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!userResponse.ok) {
                throw new Error('Failed to fetch user data');
            }

            const userData = await userResponse.json();
            const currentEducation = userData.education || [];

            // Фильтруем массив образования
            const updatedEducation = currentEducation.filter((edu: any) =>
                edu.id?.toString() !== educationId
            );

            // Отправляем обновленные данные
            const updateResponse = await fetch(`${API_BASE_URL}/api/users/${profileData.id}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/merge-patch+json'
                },
                body: JSON.stringify({
                    education: updatedEducation
                }),
            });

            if (updateResponse.ok) {
                // Обновляем локальное состояние
                setProfileData(prev => prev ? {
                    ...prev,
                    education: prev.education.filter(edu => edu.id !== educationId)
                } : null);

                alert('Запись об образовании удалена!');
            }
        } catch (error) {
            console.error('Error deleting education:', error);
            alert('Ошибка при удалении записи об образовании');
        }
    };

    // Сохранение социальных сетей
    const handleSaveSocials = async () => {
        try {
            const token = getAuthToken();
            if (!token || !profileData?.id) return;

            // Фильтруем пустые значения
            const validSocials = socialNetworks
                .filter(social => social.handle.trim() !== '')
                .map(social => ({
                    network: social.network,
                    handle: social.handle.trim()
                }));

            const updateResponse = await fetch(`${API_BASE_URL}/api/users/${profileData.id}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/merge-patch+json'
                },
                body: JSON.stringify({
                    socialNetworks: validSocials
                }),
            });

            if (updateResponse.ok) {
                setEditingSocials(false);
                alert('Ссылки на социальные сети сохранены!');

                // Обновляем локальное состояние
                setProfileData(prev => prev ? {
                    ...prev,
                    socialNetworks: validSocials
                } : null);
            } else {
                throw new Error('Failed to save social networks');
            }
        } catch (error) {
            console.error('Error saving social networks:', error);
            alert('Ошибка при сохранении социальных сетей');
        }
    };

    // Обновление социальной сети
    const updateSocialNetwork = (network: string, handle: string) => {
        setSocialNetworks(prev => {
            const newSocials = [...prev];
            const index = newSocials.findIndex(s => s.network === network);

            if (index !== -1) {
                newSocials[index] = { network, handle };
            } else {
                newSocials.push({ network, handle });
            }

            return newSocials;
        });
    };

    // Загрузка отзывов
    const fetchReviews = async () => {
        if (!profileData?.id) return;

        try {
            setReviewsLoading(true);
            const token = getAuthToken();
            if (!token) return;

            const response = await fetch(
                `${API_BASE_URL}/api/reviews?master.id=${profileData.id}`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (response.ok) {
                const data = await response.json();
                // API Platform возвращает данные в формате hydra:member
                const reviewsData = data['hydra:member'] || data || [];
                setReviews(reviewsData);

                // Обновляем количество отзывов в профиле
                setProfileData(prev => prev ? {
                    ...prev,
                    reviews: reviewsData.length
                } : null);
            }
        } catch (error) {
            console.error('Error fetching reviews:', error);
        } finally {
            setReviewsLoading(false);
        }
    };

    // Загрузка услуг
    const fetchMasterServices = async () => {
        if (!profileData?.id) return;

        try {
            setServicesLoading(true);
            const token = getAuthToken();
            if (!token) return;

            const response = await fetch(
                `${API_BASE_URL}/api/tickets?service=true&master.id=${profileData.id}&active=true`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (response.ok) {
                const data = await response.json();
                const servicesData = data['hydra:member'] || data || [];
                setServices(servicesData);
            }
        } catch (error) {
            console.error('Error fetching services:', error);
        } finally {
            setServicesLoading(false);
        }
    };

    // Удаление услуги
    const handleDeleteService = async (serviceId: number) => {
        if (!confirm('Вы уверены, что хотите удалить эту услугу?')) return;

        try {
            const token = getAuthToken();
            if (!token) return;

            const response = await fetch(`${API_BASE_URL}/api/tickets/${serviceId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                setServices(prev => prev.filter(service => service.id !== serviceId));
                alert('Услуга удалена!');
            }
        } catch (error) {
            console.error('Error deleting service:', error);
            alert('Ошибка при удалении услуги');
        }
    };

    // Добавление новой услуги
    const handleAddService = async () => {
        if (!newServiceForm.title.trim() || !newServiceForm.budget) {
            alert('Заполните обязательные поля: название и бюджет');
            return;
        }

        try {
            const token = getAuthToken();
            if (!token || !profileData?.id) return;

            const serviceData = {
                title: newServiceForm.title,
                description: newServiceForm.description,
                budget: parseFloat(newServiceForm.budget),
                service: true,
                active: true,
                master: `/api/users/${profileData.id}`,
                unit: newServiceForm.unit === 'TJS' ? null : newServiceForm.unit
            };

            const response = await fetch(`${API_BASE_URL}/api/tickets`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(serviceData)
            });

            if (response.ok) {
                const newService = await response.json();
                setServices(prev => [...prev, newService]);
                setNewServiceForm({
                    title: '',
                    description: '',
                    budget: '',
                    unit: 'TJS'
                });
                alert('Услуга добавлена!');
            }
        } catch (error) {
            console.error('Error adding service:', error);
            alert('Ошибка при добавлении услуги');
        }
    };

    // Обработчики UI
    const handleEditStart = (field: 'fullName' | 'specialty' | 'bio') => {
        setEditingField(field);
        setTempValue(profileData?.[field] || '');
    };

    const handleSaveField = () => {
        if (!editingField || !profileData || !tempValue.trim()) {
            setEditingField(null);
            setTempValue('');
            return;
        }

        updateUserData({ [editingField]: tempValue.trim() });
        setEditingField(null);
        setTempValue('');
    };

    const handleCancelEdit = () => {
        setEditingField(null);
        setTempValue('');
    };

    const handleEditEducationStart = (education?: Education) => {
        if (education) {
            setEditingEducation(education.id);
            setEducationForm({
                institution: education.institution,
                faculty: education.faculty,
                specialty: education.specialty,
                startYear: education.startYear,
                endYear: education.endYear,
                currentlyStudying: education.currentlyStudying
            });
        } else {
            setEditingEducation('new');
            setEducationForm({
                institution: '',
                faculty: '',
                specialty: '',
                startYear: '',
                endYear: '',
                currentlyStudying: false
            });
        }
    };

    const handleCancelEducation = () => {
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

    const handleCancelSocials = () => {
        setEditingSocials(false);
        // Восстанавливаем оригинальные значения
        if (profileData?.socialNetworks) {
            const updatedSocials = [...socialNetworks];
            profileData.socialNetworks.forEach(social => {
                const index = updatedSocials.findIndex(s => s.network === social.network);
                if (index !== -1) {
                    updatedSocials[index] = social;
                }
            });
            setSocialNetworks(updatedSocials);
        }
    };

    // Вспомогательные функции
    // const getSocialIcon = (network: string) => {
    //     const icons: Record<string, string> = {
    //         telegram: 'telegram',
    //         whatsapp: 'whatsapp',
    //         vk: 'vk',
    //         instagram: 'instagram',
    //         facebook: 'facebook'
    //     };
    //     return icons[network] || 'link';
    // };

    const getSocialDisplayName = (network: string) => {
        const names: Record<string, string> = {
            telegram: 'Telegram',
            whatsapp: 'WhatsApp',
            vk: 'ВКонтакте',
            instagram: 'Instagram',
            facebook: 'Facebook'
        };
        return names[network] || network;
    };

    // Загрузка аватара
    const handleAvatarUpload = async (event: ChangeEvent<HTMLInputElement>) => {
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

            const response = await fetch(`${API_BASE_URL}/api/users/${profileData.id}/update-photo`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`,
                },
                body: formData,
            });

            if (response.ok) {
                await fetchUserData();
                alert("Фото профиля успешно обновлено!");
            } else {
                throw new Error('Failed to upload photo');
            }
        } catch (error) {
            console.error("Error uploading avatar:", error);
            alert("Ошибка при загрузке фото профиля");
        } finally {
            setIsLoading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    // Рендер звезд рейтинга
    const renderStars = (rating: number) => {
        const stars = [];
        for (let i = 1; i <= 5; i++) {
            stars.push(
                <span key={i} className={i <= rating ? styles.star_filled : styles.star_empty}>
          ★
        </span>
            );
        }
        return stars;
    };

    if (isLoading) {
        return <div className={styles.profileSet}>Загрузка...</div>;
    }

    if (!profileData) {
        return <div className={styles.profileSet}>Ошибка загрузки данных профиля</div>;
    }

    return (
        <div className={styles.profile}>
            <div className={styles.profile_wrap}>
                {/* Основная информация */}
                <div className={styles.profile_content}>
                    <div className={styles.avatar_section}>
                        <div className={styles.avatar_container} onClick={() => fileInputRef.current?.click()}>
                            {profileData.avatar ? (
                                <img
                                    src={profileData.avatar}
                                    alt="Аватар"
                                    className={styles.avatar}
                                    onError={(e) => {
                                        e.currentTarget.src = "../fonTest6.png";
                                    }}
                                />
                            ) : (
                                <img
                                    src="../fonTest6.png"
                                    alt="Аватар"
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
                            onChange={handleAvatarUpload}
                            accept="image/*"
                            style={{ display: 'none' }}
                        />
                    </div>

                    <div className={styles.profile_info}>
                        <div className={styles.name_specialty}>
                            {/* ФИО */}
                            <div className={styles.name_row}>
                                {editingField === 'fullName' ? (
                                    <div className={styles.edit_container}>
                                        <input
                                            type="text"
                                            value={tempValue}
                                            onChange={(e) => setTempValue(e.target.value)}
                                            className={styles.edit_input}
                                            autoFocus
                                        />
                                        <div className={styles.edit_actions}>
                                            <button onClick={handleSaveField} className={styles.save_btn}>✓</button>
                                            <button onClick={handleCancelEdit} className={styles.cancel_btn}>✕</button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className={styles.name_with_icon}>
                                        <span className={styles.name}>{profileData.fullName}</span>
                                        <button
                                            className={styles.edit_icon}
                                            onClick={() => handleEditStart('fullName')}
                                        >
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M7.2302 20.59L2.4502 21.59L3.4502 16.81L17.8902 2.29001C18.1407 2.03889 18.4385 1.83982 18.7663 1.70424C19.0941 1.56865 19.4455 1.49925 19.8002 1.50001C20.5163 1.50001 21.203 1.78447 21.7094 2.29082C22.2157 2.79717 22.5002 3.48392 22.5002 4.20001C22.501 4.55474 22.4315 4.90611 22.296 5.23391C22.1604 5.56171 21.9613 5.85945 21.7102 6.11001L7.2302 20.59Z" stroke="#3A54DA" strokeWidth="2" strokeMiterlimit="10"/>
                                            </svg>
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Специальность */}
                            <div className={styles.specialty_row}>
                                {editingField === 'specialty' ? (
                                    <div className={styles.edit_container}>
                                        <input
                                            type="text"
                                            value={tempValue}
                                            onChange={(e) => setTempValue(e.target.value)}
                                            className={styles.edit_input}
                                            autoFocus
                                        />
                                        <div className={styles.edit_actions}>
                                            <button onClick={handleSaveField} className={styles.save_btn}>✓</button>
                                            <button onClick={handleCancelEdit} className={styles.cancel_btn}>✕</button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className={styles.specialty_with_icon}>
                                        <span className={styles.specialty}>{profileData.specialty}</span>
                                        <button
                                            className={styles.edit_icon}
                                            onClick={() => handleEditStart('specialty')}
                                        >
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M7.2302 20.59L2.4502 21.59L3.4502 16.81L17.8902 2.29001C18.1407 2.03889 18.4385 1.83982 18.7663 1.70424C19.0941 1.56865 19.4455 1.49925 19.8002 1.50001C20.5163 1.50001 21.203 1.78447 21.7094 2.29082C22.2157 2.79717 22.5002 3.48392 22.5002 4.20001C22.501 4.55474 22.4315 4.90611 22.296 5.23391C22.1604 5.56171 21.9613 5.85945 21.7102 6.11001L7.2302 20.59Z" stroke="#3A54DA" strokeWidth="2" strokeMiterlimit="10"/>
                                            </svg>
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Рейтинг и отзывы */}
                        <div className={styles.rating_reviews}>
                            <div className={styles.rating}>
                                <span className={styles.stars}>{renderStars(Math.round(profileData.rating))}</span>
                                <span className={styles.rating_value}>{profileData.rating.toFixed(1)}</span>
                            </div>
                            <div className={styles.reviews_count}>
                                <span className={styles.reviews_icon}>💬</span>
                                <span>{profileData.reviews} отзывов</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Основные секции */}
                <div className={styles.about_section}>

                    {/* Образование и опыт */}
                    <h3 className={styles.section_subtitle}>Образование и опыт</h3>
                    <div className={styles.section_item}>
                        {editingEducation ? (
                            <div className={styles.education_form}>
                                <div className={styles.form_group}>
                                    <input
                                        type="text"
                                        placeholder="Учебное заведение *"
                                        value={educationForm.institution}
                                        onChange={(e) => setEducationForm(prev => ({ ...prev, institution: e.target.value }))}
                                        className={styles.form_input}
                                    />
                                </div>
                                <div className={styles.form_group}>
                                    <input
                                        type="text"
                                        placeholder="Факультет"
                                        value={educationForm.faculty}
                                        onChange={(e) => setEducationForm(prev => ({ ...prev, faculty: e.target.value }))}
                                        className={styles.form_input}
                                    />
                                </div>
                                <div className={styles.year_group}>
                                    <div className={styles.form_group}>
                                        <input
                                            type="text"
                                            placeholder="Год начала"
                                            value={educationForm.startYear}
                                            onChange={(e) => setEducationForm(prev => ({ ...prev, startYear: e.target.value }))}
                                            className={styles.form_input}
                                        />
                                    </div>
                                    <div className={styles.form_group}>
                                        <input
                                            type="text"
                                            placeholder="Год окончания"
                                            value={educationForm.endYear}
                                            onChange={(e) => setEducationForm(prev => ({ ...prev, endYear: e.target.value }))}
                                            disabled={educationForm.currentlyStudying}
                                            className={styles.form_input}
                                        />
                                    </div>
                                </div>
                                <div className={styles.checkbox_group}>
                                    <label className={styles.checkbox_label}>
                                        <input
                                            type="checkbox"
                                            checked={educationForm.currentlyStudying}
                                            onChange={(e) => setEducationForm(prev => ({ ...prev, currentlyStudying: e.target.checked }))}
                                        />
                                        Учусь сейчас
                                    </label>
                                </div>
                                <div className={styles.form_actions}>
                                    <button onClick={handleSaveEducation} className={styles.save_button}>
                                        Сохранить
                                    </button>
                                    <button onClick={handleCancelEducation} className={styles.cancel_button}>
                                        Отмена
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <>
                                {profileData.education.length > 0 ? (
                                    profileData.education.map(edu => (
                                        <div key={edu.id} className={styles.education_item}>
                                            <div className={styles.education_header}>
                                                <strong>{edu.institution}</strong>
                                                <div className={styles.education_actions}>
                                                    <button
                                                        onClick={() => handleEditEducationStart(edu)}
                                                        className={styles.edit_icon}
                                                    >
                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                            <path d="M7.2302 20.59L2.4502 21.59L3.4502 16.81L17.8902 2.29001C18.1407 2.03889 18.4385 1.83982 18.7663 1.70424C19.0941 1.56865 19.4455 1.49925 19.8002 1.50001C20.5163 1.50001 21.203 1.78447 21.7094 2.29082C22.2157 2.79717 22.5002 3.48392 22.5002 4.20001C22.501 4.55474 22.4315 4.90611 22.296 5.23391C22.1604 5.56171 21.9613 5.85945 21.7102 6.11001L7.2302 20.59Z" stroke="#3A54DA" strokeWidth="2" strokeMiterlimit="10"/>
                                                        </svg>
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteEducation(edu.id)}
                                                        className={styles.delete_icon}
                                                    >
                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                            <path d="M18 6.5L17 21.5H7L6 6.5" stroke="#FF3B30" strokeWidth="2" strokeMiterlimit="10"/>
                                                            <path d="M3.5 6.5H20.5" stroke="#FF3B30" strokeWidth="2" strokeMiterlimit="10"/>
                                                            <path d="M9 3.5H15" stroke="#FF3B30" strokeWidth="2" strokeMiterlimit="10"/>
                                                        </svg>
                                                    </button>
                                                </div>
                                            </div>
                                            <div className={styles.education_years}>
                                                {edu.startYear} - {edu.currentlyStudying ? 'По настоящее время' : edu.endYear}
                                            </div>
                                            {edu.faculty && (
                                                <div className={styles.education_details}>
                                                    Факультет: {edu.faculty}
                                                </div>
                                            )}
                                        </div>
                                    ))
                                ) : (
                                    <div className={styles.empty_state}>
                                        <span>Нет информации об образовании</span>
                                    </div>
                                )}
                                <button
                                    onClick={() => handleEditEducationStart()}
                                    className={styles.add_button}
                                >
                                    + Добавить образование
                                </button>
                            </>
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
                                            src={work.image}
                                            alt={work.title}
                                            onError={(e) => {
                                                e.currentTarget.src = "../fonTest6.png";
                                            }}
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
                                    title="Добавить фото"
                                >
                                    +
                                </button>
                            </div>
                        ) : (
                            <div className={styles.empty_state}>
                                <span>Нет примеров работ</span>
                                <button
                                    className={styles.add_button}
                                    onClick={() => workExampleInputRef.current?.click()}
                                >
                                    + Добавить фото
                                </button>
                            </div>
                        )}
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
                        <div className={styles.work_area}>
              <span className={styles.work_area_text}>
                {profileData.workArea || 'Не указан'}
              </span>
                            <button
                                className={styles.edit_icon}
                                onClick={() => navigate('/profile/city')}
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M7.2302 20.59L2.4502 21.59L3.4502 16.81L17.8902 2.29001C18.1407 2.03889 18.4385 1.83982 18.7663 1.70424C19.0941 1.56865 19.4455 1.49925 19.8002 1.50001C20.5163 1.50001 21.203 1.78447 21.7094 2.29082C22.2157 2.79717 22.5002 3.48392 22.5002 4.20001C22.501 4.55474 22.4315 4.90611 22.296 5.23391C22.1604 5.56171 21.9613 5.85945 21.7102 6.11001L7.2302 20.59Z" stroke="#3A54DA" strokeWidth="2" strokeMiterlimit="10"/>
                                </svg>
                            </button>
                        </div>
                    </div>

                    {/* О себе */}
                    <h3 className={styles.section_subtitle}>О себе</h3>
                    <div className={styles.section_item}>
                        {editingField === 'bio' ? (
                            <div className={styles.edit_container}>
                <textarea
                    value={tempValue}
                    onChange={(e) => setTempValue(e.target.value)}
                    className={styles.bio_textarea}
                    placeholder="Расскажите о себе..."
                    rows={4}
                />
                                <div className={styles.edit_actions}>
                                    <button onClick={handleSaveField} className={styles.save_btn}>✓</button>
                                    <button onClick={handleCancelEdit} className={styles.cancel_btn}>✕</button>
                                </div>
                            </div>
                        ) : (
                            <div className={styles.bio_content}>
                                <p>{profileData.bio || 'Расскажите о себе...'}</p>
                                <button
                                    className={styles.edit_icon}
                                    onClick={() => handleEditStart('bio')}
                                >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M7.2302 20.59L2.4502 21.59L3.4502 16.81L17.8902 2.29001C18.1407 2.03889 18.4385 1.83982 18.7663 1.70424C19.0941 1.56865 19.4455 1.49925 19.8002 1.50001C20.5163 1.50001 21.203 1.78447 21.7094 2.29082C22.2157 2.79717 22.5002 3.48392 22.5002 4.20001C22.501 4.55474 22.4315 4.90611 22.296 5.23391C22.1604 5.56171 21.9613 5.85945 21.7102 6.11001L7.2302 20.59Z" stroke="#3A54DA" strokeWidth="2" strokeMiterlimit="10"/>
                                    </svg>
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Социальные сети */}
                    <h3 className={styles.section_subtitle}>Социальные сети</h3>
                    <div className={styles.section_item}>
                        {editingSocials ? (
                            <div className={styles.socials_edit}>
                                {socialNetworks.map(social => (
                                    <div key={social.network} className={styles.social_input_group}>
                    <span className={styles.social_label}>
                      {getSocialDisplayName(social.network)}:
                    </span>
                                        <input
                                            type="text"
                                            value={social.handle}
                                            onChange={(e) => updateSocialNetwork(social.network, e.target.value)}
                                            placeholder={`Ваш ${getSocialDisplayName(social.network)}`}
                                            className={styles.social_input}
                                        />
                                    </div>
                                ))}
                                <div className={styles.form_actions}>
                                    <button onClick={handleSaveSocials} className={styles.save_button}>
                                        Сохранить
                                    </button>
                                    <button onClick={handleCancelSocials} className={styles.cancel_button}>
                                        Отмена
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className={styles.socials_display}>
                                {socialNetworks
                                    .filter(social => social.handle.trim() !== '')
                                    .map(social => (
                                        <a
                                            key={social.network}
                                            href={social.handle}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className={styles.social_link}
                                        >
                      <span className={styles.social_icon}>
                        {getSocialDisplayName(social.network)}
                      </span>
                                            <span className={styles.social_handle}>
                        {social.handle.replace(/^https?:\/\//, '').split('/').pop()}
                      </span>
                                        </a>
                                    ))
                                }
                                {socialNetworks.filter(s => s.handle.trim() !== '').length === 0 && (
                                    <div className={styles.empty_state}>
                                        <span>Ссылки на социальные сети не добавлены</span>
                                    </div>
                                )}
                                <button
                                    onClick={() => setEditingSocials(true)}
                                    className={styles.add_button}
                                >
                                    ✏️ Редактировать
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Услуги и цены */}
                    <h3 className={styles.section_subtitle}>Услуги и цены</h3>
                    <div className={styles.section_item}>
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
                                                    onClick={() => navigate(`/profile/services/edit/${service.id}`)}
                                                    className={styles.edit_service_btn}
                                                >
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                        <path d="M7.2302 20.59L2.4502 21.59L3.4502 16.81L17.8902 2.29001C18.1407 2.03889 18.4385 1.83982 18.7663 1.70424C19.0941 1.56865 19.4455 1.49925 19.8002 1.50001C20.5163 1.50001 21.203 1.78447 21.7094 2.29082C22.2157 2.79717 22.5002 3.48392 22.5002 4.20001C22.501 4.55474 22.4315 4.90611 22.296 5.23391C22.1604 5.56171 21.9613 5.85945 21.7102 6.11001L7.2302 20.59Z" stroke="#3A54DA" strokeWidth="2" strokeMiterlimit="10"/>
                                                    </svg>
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteService(service.id)}
                                                    className={styles.delete_service_btn}
                                                >
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                        <path d="M18 6.5L17 21.5H7L6 6.5" stroke="#FF3B30" strokeWidth="2" strokeMiterlimit="10"/>
                                                        <path d="M3.5 6.5H20.5" stroke="#FF3B30" strokeWidth="2" strokeMiterlimit="10"/>
                                                        <path d="M9 3.5H15" stroke="#FF3B30" strokeWidth="2" strokeMiterlimit="10"/>
                                                    </svg>
                                                </button>
                                            </div>
                                        </div>
                                        <span className={styles.service_price}>
                      {service.budget} {service.unit?.title || 'TJS'}
                    </span>
                                    </div>
                                ))}

                                {/* Форма добавления новой услуги */}
                                <div className={styles.add_service_form}>
                                    <h4>Добавить новую услугу</h4>
                                    <div className={styles.form_group}>
                                        <input
                                            type="text"
                                            placeholder="Название услуги *"
                                            value={newServiceForm.title}
                                            onChange={(e) => setNewServiceForm(prev => ({ ...prev, title: e.target.value }))}
                                            className={styles.form_input}
                                        />
                                    </div>
                                    <div className={styles.form_group}>
                    <textarea
                        placeholder="Описание услуги"
                        value={newServiceForm.description}
                        onChange={(e) => setNewServiceForm(prev => ({ ...prev, description: e.target.value }))}
                        className={styles.form_textarea}
                        rows={3}
                    />
                                    </div>
                                    <div className={styles.price_group}>
                                        <input
                                            type="number"
                                            placeholder="Цена *"
                                            value={newServiceForm.budget}
                                            onChange={(e) => setNewServiceForm(prev => ({ ...prev, budget: e.target.value }))}
                                            className={styles.price_input}
                                        />
                                        <select
                                            value={newServiceForm.unit}
                                            onChange={(e) => setNewServiceForm(prev => ({ ...prev, unit: e.target.value }))}
                                            className={styles.unit_select}
                                        >
                                            <option value="TJS">TJS</option>
                                            <option value="USD">USD</option>
                                            <option value="EUR">EUR</option>
                                            <option value="RUB">RUB</option>
                                        </select>
                                    </div>
                                    <button
                                        onClick={handleAddService}
                                        className={styles.save_button}
                                        disabled={!newServiceForm.title.trim() || !newServiceForm.budget}
                                    >
                                        Добавить услугу
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className={styles.empty_state}>
                                <span>Услуги не добавлены</span>
                                <div className={styles.add_service_form}>
                                    <h4>Добавить первую услугу</h4>
                                    <div className={styles.form_group}>
                                        <input
                                            type="text"
                                            placeholder="Название услуги *"
                                            value={newServiceForm.title}
                                            onChange={(e) => setNewServiceForm(prev => ({ ...prev, title: e.target.value }))}
                                            className={styles.form_input}
                                        />
                                    </div>
                                    <div className={styles.form_group}>
                    <textarea
                        placeholder="Описание услуги"
                        value={newServiceForm.description}
                        onChange={(e) => setNewServiceForm(prev => ({ ...prev, description: e.target.value }))}
                        className={styles.form_textarea}
                        rows={3}
                    />
                                    </div>
                                    <div className={styles.price_group}>
                                        <input
                                            type="number"
                                            placeholder="Цена *"
                                            value={newServiceForm.budget}
                                            onChange={(e) => setNewServiceForm(prev => ({ ...prev, budget: e.target.value }))}
                                            className={styles.price_input}
                                        />
                                        <select
                                            value={newServiceForm.unit}
                                            onChange={(e) => setNewServiceForm(prev => ({ ...prev, unit: e.target.value }))}
                                            className={styles.unit_select}
                                        >
                                            <option value="TJS">TJS</option>
                                            <option value="USD">USD</option>
                                            <option value="EUR">EUR</option>
                                            <option value="RUB">RUB</option>
                                        </select>
                                    </div>
                                    <button
                                        onClick={handleAddService}
                                        className={styles.save_button}
                                        disabled={!newServiceForm.title.trim() || !newServiceForm.budget}
                                    >
                                        Добавить услугу
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Отзывы */}
                <h2 className={styles.section_title}>Отзывы</h2>
                <div className={styles.reviews_section}>
                    {reviewsLoading ? (
                        <div className={styles.loading}>Загрузка отзывов...</div>
                    ) : reviews.length > 0 ? (
                        <>
                            <div className={styles.reviews_list}>
                                {reviews.slice(0, visibleCount).map(review => (
                                    <div key={review.id} className={styles.review_item}>
                                        <div className={styles.review_header}>
                                            <div className={styles.reviewer_info}>
                                                <img
                                                    src={review.reviewer.image || "../fonTest6.png"}
                                                    alt={review.reviewer.name}
                                                    className={styles.reviewer_avatar}
                                                    onError={(e) => {
                                                        e.currentTarget.src = "../fonTest6.png";
                                                    }}
                                                />
                                                <div className={styles.reviewer_main_info}>
                                                    <div className={styles.reviewer_name}>
                                                        {review.reviewer.name} {review.reviewer.surname}
                                                    </div>
                                                    <div className={styles.review_rating_main}>
                                                        {renderStars(review.rating)}
                                                        <span className={styles.rating_value}>{review.rating}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className={styles.review_details}>
                                            <div className={styles.review_date}>
                                                {review.date || new Date().toLocaleDateString('ru-RU')}
                                            </div>
                                        </div>

                                        {review.description && (
                                            <div className={styles.review_text}>
                                                {review.description.replace(/<[^>]*>/g, '')}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {/* Кнопки управления отзывами */}
                            <div className={styles.reviews_actions}>
                                {reviews.length > 2 && (
                                    <button
                                        className={styles.show_all_btn}
                                        onClick={() => setVisibleCount(prev => prev === reviews.length ? 2 : reviews.length)}
                                    >
                                        {visibleCount === reviews.length ? 'Скрыть отзывы' : 'Показать все отзывы'}
                                    </button>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className={styles.no_reviews}>
                            Пока нет отзывов от клиентов
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default MasterProfilePage;