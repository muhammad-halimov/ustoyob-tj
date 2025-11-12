import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuthToken } from '../../utils/auth';
import styles from '../profile/ProfilePage.module.scss';

interface Education {
    id: string;
    institution: string;
    faculty: string;
    specialty: string;
    startYear: string;
    endYear: string;
    currentlyStudying: boolean;
}

function EducationPage() {
    const navigate = useNavigate();
    const [education, setEducation] = useState<Omit<Education, 'id'>>({
        institution: '',
        faculty: '',
        specialty: '',
        startYear: '',
        endYear: '',
        currentlyStudying: false
    });
    const [isLoading, setIsLoading] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);
    const API_BASE_URL = 'http://usto.tj.auto-schule.ru';

    // Получаем ID пользователя при загрузке компонента
    useEffect(() => {
        const fetchUserId = async () => {
            try {
                const token = getAuthToken();
                if (!token) {
                    navigate('/');
                    return;
                }

                const response = await fetch(`${API_BASE_URL}/api/users/me`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                });

                if (response.ok) {
                    const userData = await response.json();
                    setUserId(userData.id.toString());
                    localStorage.setItem('userId', userData.id.toString());
                } else {
                    console.error('Failed to fetch user data');
                    navigate('/');
                }
            } catch (error) {
                console.error('Error fetching user ID:', error);
                navigate('/');
            }
        };

        fetchUserId();
    }, [navigate]);

    const handleSave = async () => {
        if (!education.institution || !userId) {
            alert('Пожалуйста, заполните учебное заведение');
            return;
        }

        setIsLoading(true);
        try {
            const token = getAuthToken();
            if (!token) {
                navigate('/');
                return;
            }

            // Подготавливаем данные для API
            const educationData = {
                uniTitle: education.institution,
                faculty: education.faculty || '',
                beginning: parseInt(education.startYear) || new Date().getFullYear(),
                ending: education.currentlyStudying ? 0 : parseInt(education.endYear) || new Date().getFullYear(),
                graduated: !education.currentlyStudying,
                occupation: []
            };

            console.log('Sending education data:', educationData);

            // Отправляем PATCH запрос для обновления пользователя
            const response = await fetch(`${API_BASE_URL}/api/users/${userId}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/merge-patch+json',
                },
                body: JSON.stringify({
                    education: [educationData]
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Server response:', errorText);
                throw new Error(`Ошибка при сохранении образования: ${response.status}`);
            }

            const updatedUser = await response.json();
            console.log('Пользователь успешно обновлен:', updatedUser);

            navigate('/profile');

        } catch (error) {
            console.error('Ошибка при сохранении:', error);
            alert('Произошла ошибка при сохранении данных. Проверьте консоль для подробностей.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleInputChange = (field: keyof Omit<Education, 'id'>, value: string | boolean) => {
        setEducation(prev => ({
            ...prev,
            [field]: value
        }));
    };

    return (
        <div className={styles.profile}>
            <div className={styles.profile_wrap}>
                <div className={styles.education_form}>
                    <h1>Образование</h1>
                    <div className={styles.form_group}>
                        <input
                            type="text"
                            placeholder="Укажите информацию"
                            value={education.institution}
                            onChange={(e) => handleInputChange('institution', e.target.value)}
                        />
                        <label>Укажите учебное заведение, факультет, специальность</label>
                    </div>

                    <div className={styles.year_group}>
                        <div className={styles.form_group}>
                            <input
                                type="text"
                                placeholder="Год начала"
                                value={education.startYear}
                                onChange={(e) => handleInputChange('startYear', e.target.value)}
                            />
                        </div>

                        <div className={styles.form_group}>
                            <input
                                type="text"
                                placeholder="Год окончания"
                                value={education.endYear}
                                onChange={(e) => handleInputChange('endYear', e.target.value)}
                                disabled={education.currentlyStudying}
                            />
                        </div>
                    </div>

                    <div className={styles.checkbox_group}>
                        <label className={styles.checkbox_label}>
                            <input
                                type="checkbox"
                                checked={education.currentlyStudying}
                                onChange={(e) => handleInputChange('currentlyStudying', e.target.checked)}
                            />
                            Учусь сейчас
                        </label>
                    </div>

                    <div className={styles.form_actions}>
                        <button
                            className={styles.save_button}
                            onClick={handleSave}
                            disabled={!education.institution || isLoading || !userId}
                        >
                            {isLoading ? 'Сохранение...' : 'Создать'}
                        </button>
                        <button
                            className={styles.cancel_button}
                            onClick={() => navigate('/profile')}
                            disabled={isLoading}
                        >
                            Отмена
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default EducationPage;