import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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

    const handleSave = () => {
        // Здесь будет логика сохранения в общее состояние или бэкенд
        console.log('Сохраненное образование:', education);
        navigate('/profile');
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
                        <label>Учебное заведение</label>
                        <input
                            type="text"
                            placeholder="Укажите учебное заведение"
                            value={education.institution}
                            onChange={(e) => handleInputChange('institution', e.target.value)}
                        />
                    </div>

                    <div className={styles.form_group}>
                        <label>Факультет</label>
                        <input
                            type="text"
                            placeholder="Укажите факультет"
                            value={education.faculty}
                            onChange={(e) => handleInputChange('faculty', e.target.value)}
                        />
                    </div>

                    <div className={styles.form_group}>
                        <label>Специальность</label>
                        <input
                            type="text"
                            placeholder="Укажите специальность"
                            value={education.specialty}
                            onChange={(e) => handleInputChange('specialty', e.target.value)}
                        />
                    </div>

                    <div className={styles.year_group}>
                        <div className={styles.form_group}>
                            <label>Год начала</label>
                            <input
                                type="text"
                                placeholder="Год начала"
                                value={education.startYear}
                                onChange={(e) => handleInputChange('startYear', e.target.value)}
                            />
                        </div>

                        <div className={styles.form_group}>
                            <label>Год окончания</label>
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
                            disabled={!education.institution || !education.specialty}
                        >
                            Создать
                        </button>
                        <button
                            className={styles.cancel_button}
                            onClick={() => navigate('/profile')}
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