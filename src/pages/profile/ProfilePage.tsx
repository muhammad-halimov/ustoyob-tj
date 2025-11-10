import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuthToken, removeAuthToken } from '../../utils/auth';
import styles from './ProfilePage.module.scss';

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

function ProfilePage() {
    const navigate = useNavigate();
    const [editingField, setEditingField] = useState<'fullName' | 'specialty' | null>(null);
    const [showCityModal, setShowCityModal] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [profileData, setProfileData] = useState<ProfileData | null>(null);
    const [tempValue, setTempValue] = useState('');

    const API_BASE_URL = 'http://usto.tj.auto-schule.site';

    // Тестовые города (в будущем будут с сервера)
    const cities = ['Москва', 'Санкт-Петербург'];

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
                navigate('/login');
                return;
            }

            if (!response.ok) {
                throw new Error(`Failed to fetch user data: ${response.status} ${response.statusText}`);
            }

            const userData = await response.json();
            console.log('User data received:', userData);

            // Получаем локально сохраненное фото
            const localAvatar = localStorage.getItem(`user_avatar_${userData.id}`);
            const serverAvatar = userData.image ? `${API_BASE_URL}/uploads/${userData.image}` : null;

            // Трансформируем данные из формата сервера в наш формат
            const transformedData: ProfileData = {
                id: userData.id.toString(),
                fullName: [userData.surname, userData.name, userData.patronymic]
                    .filter(Boolean)
                    .join(' ') || 'Фамилия Имя Отчество',
                specialty: userData.occupation?.map((occ: any) => occ.title).join(', ') || 'Специальность',
                rating: userData.rating || 0,
                reviews: 0,
                // Используем локальное фото если есть, иначе серверное
                avatar: localAvatar || serverAvatar,
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

    // Функция для трансформации образования
    const transformEducation = (education: any[]): Education[] => {
        return education.map(edu => ({
            id: edu.id.toString(),
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

    const handleAvatarClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !profileData?.id) return;

        if (!file.type.startsWith('image/')) {
            alert('Пожалуйста, выберите изображение');
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            alert('Размер файла не должен превышать 5MB');
            return;
        }

        const formData = new FormData();
        formData.append('imageFile', file);

        try {
            const token = getAuthToken();
            if (!token) {
                navigate('/login');
                return;
            }

            console.log('Uploading profile photo...');

            const response = await fetch(`${API_BASE_URL}/api/users/${profileData.id}/profile-photo`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
                body: formData,
            });

            if (response.status === 401) {
                removeAuthToken();
                navigate('/login');
                return;
            }

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Photo upload failed:', errorText);
                throw new Error('Failed to upload photo');
            }

            const result = await response.json();
            console.log('Photo upload successful:', result);

            // Сохраняем фото локально
            if (result.image && file) {
                await savePhotoLocally(file, result.image);
            }

            // Полностью перезагружаем данные пользователя
            await fetchUserData();

            // Очищаем input
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }

            alert('Фото успешно обновлено!');

        } catch (error) {
            console.error('Error uploading photo:', error);
            alert('Ошибка при загрузке фото');
        }
    };

// Функция для сохранения фото локально
    const savePhotoLocally = async (file: File, serverFileName: string): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (e) => {
                try {
                    // Создаем уникальное имя файла с timestamp
                    const timestamp = new Date().getTime();
                    const fileExtension = file.name.split('.').pop() || 'jpg';
                    const localFileName = `avatar_${timestamp}.${fileExtension}`;

                    // Сохраняем в localStorage как fallback
                    localStorage.setItem(`user_avatar_${profileData?.id}`, e.target?.result as string);
                    localStorage.setItem(`user_avatar_filename_${profileData?.id}`, localFileName);
                    localStorage.setItem(`user_avatar_server_filename_${profileData?.id}`, serverFileName);

                    console.log('Photo saved locally with name:', localFileName);
                    resolve(localFileName);
                } catch (error) {
                    console.error('Error saving photo locally:', error);
                    reject(error);
                }
            };

            reader.onerror = () => {
                reject(new Error('Failed to read file'));
            };

            reader.readAsDataURL(file);
        });
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

    const handleCitySelect = async (city: string) => {
        if (!profileData) return;

        const updatedData = {
            ...profileData,
            workArea: city
        };

        setProfileData(updatedData);
        setShowCityModal(false);

        // Сохраняем на сервер
        await updateUserData({ workArea: city });
    };

    // const handleLogout = () => {
    //     removeAuthToken();
    //     localStorage.removeItem('authToken');
    //     localStorage.removeItem('userRole');
    //     localStorage.removeItem('userData');
    //     localStorage.removeItem('userEmail');
    //
    //     window.dispatchEvent(new Event('storage'));
    //     window.dispatchEvent(new Event('logout'));
    //     navigate('/');
    // };

    if (isLoading) {
        return <div className={styles.profile}>Загрузка...</div>;
    }

    if (!profileData) {
        return <div className={styles.profile}>Ошибка загрузки данных</div>;
    }

    return (
        <div className={styles.profile}>
            {/*/!* Добавляем кнопку выхода *!/*/}
            {/*<div className={styles.header}>*/}
            {/*    <button onClick={handleLogout} className={styles.logoutButton}>*/}
            {/*        Выйти*/}
            {/*    </button>*/}
            {/*</div>*/}

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
                                {profileData.reviews} отзыва
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
                                        <div className={styles.education_main}>
                                            <strong>{edu.institution}</strong>
                                            <span>{edu.startYear} - {edu.currentlyStudying ? 'По настоящее время' : edu.endYear}</span>
                                        </div>
                                        <div className={styles.education_details}>
                                            {edu.faculty && <span>{edu.faculty}</span>}
                                            <span>{edu.specialty}</span>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className={styles.empty_state}>
                                    <span>Образование</span>
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

                    <h3 className={styles.section_subtitle}>Примеры работ</h3>
                    {/* Примеры работ */}
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
                                        onClick={() => setShowCityModal(true)}
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
                                        onClick={() => setShowCityModal(true)}
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
            </div>

            {/* Модальное окно выбора города */}
            {showCityModal && (
                <div className={styles.modal}>
                    <div className={styles.modal_content}>
                        <h3>Выберите город</h3>
                        <div className={styles.city_list}>
                            {cities.map(city => (
                                <button
                                    key={city}
                                    className={styles.city_item}
                                    onClick={() => handleCitySelect(city)}
                                >
                                    {city}
                                </button>
                            ))}
                        </div>
                        <div className={styles.modal_actions}>
                            <button
                                className={styles.cancel_button}
                                onClick={() => setShowCityModal(false)}
                            >
                                Отмена
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default ProfilePage;