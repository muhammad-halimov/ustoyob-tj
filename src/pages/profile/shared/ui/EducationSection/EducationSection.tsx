import React from 'react';
import styles from './EducationSection.module.scss';

interface Education {
    id: string;
    institution: string;
    specialty: string;
    startYear: string;
    endYear: string;
    currentlyStudying: boolean;
}

interface EducationSectionProps {
    education: Education[];
    editingEducation: string | null;
    educationForm: {
        institution: string;
        selectedSpecialty?: number;
        startYear: string;
        endYear: string;
        currentlyStudying: boolean;
    };
    occupations: { id: number; title: string }[];
    occupationsLoading: boolean;
    readOnly?: boolean;
    onAddEducation: () => void;
    onEditEducationStart: (education: Education) => void;
    onEditEducationSave: () => Promise<void>;
    onEditEducationCancel: () => void;
    onEducationFormChange: (field: keyof Omit<Education, 'id'>, value: string | boolean) => void;
    onDeleteEducation: (educationId: string) => Promise<void>;
    setEducationForm: React.Dispatch<React.SetStateAction<{
        institution: string;
        selectedSpecialty?: number;
        startYear: string;
        endYear: string;
        currentlyStudying: boolean;
    }>>;
}

export const EducationSection: React.FC<EducationSectionProps> = ({
    education,
    editingEducation,
    educationForm,
    occupations,
    occupationsLoading,
    readOnly = false,
    onAddEducation,
    onEditEducationStart,
    onEditEducationSave,
    onEditEducationCancel,
    onEducationFormChange,
    onDeleteEducation,
    setEducationForm,
}) => {
    return (
        <div className={styles.section_item}>
            <h3>Образование и опыт</h3>
            <div className={styles.section_content}>
                {education.length > 0 ? (
                    <>
                        {education.map((edu, index) => (
                            <div key={edu.id} className={`${styles.education_item} ${index === education.length - 1 ? styles.education_item_last : ''}`}>
                        {editingEducation === edu.id ? (
                            <div className={styles.education_form}>
                                <div className={styles.form_group}>
                                    <label>Учебное заведение *</label>
                                    <input
                                        type="text"
                                        placeholder="Учебное заведение"
                                        value={educationForm.institution}
                                        onChange={(e) => onEducationFormChange('institution', e.target.value)}
                                    />
                                </div>

                                <div className={styles.form_group}>
                                    <label>Специальность</label>
                                    <select
                                        className={styles.specialty_select}
                                        value={educationForm.selectedSpecialty || ''}
                                        onChange={(e) => {
                                            const selectedId = parseInt(e.target.value);
                                            setEducationForm(prev => ({
                                                ...prev,
                                                selectedSpecialty: selectedId || undefined
                                            }));
                                        }}
                                    >
                                        <option value="">Выберите специальность</option>
                                        {occupationsLoading && (
                                            <option disabled>Загружается...</option>
                                        )}
                                        {occupations.map(occupation => (
                                            <option key={occupation.id} value={occupation.id}>
                                                {occupation.title}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className={styles.year_group}>
                                    <div className={styles.form_group}>
                                        <label>Год начала *</label>
                                        <input
                                            type="number"
                                            placeholder="Год начала"
                                            value={educationForm.startYear}
                                            onChange={(e) => onEducationFormChange('startYear', e.target.value)}
                                            min="1900"
                                            max={new Date().getFullYear()}
                                        />
                                    </div>

                                    <div className={styles.form_group}>
                                        <label>Год окончания</label>
                                        <input
                                            type="number"
                                            placeholder="Год окончания"
                                            value={educationForm.endYear}
                                            onChange={(e) => onEducationFormChange('endYear', e.target.value)}
                                            min={parseInt(educationForm.startYear) || 1900}
                                            max={new Date().getFullYear()}
                                            disabled={educationForm.currentlyStudying}
                                        />
                                    </div>
                                </div>

                                <div className={styles.checkbox_group}>
                                    <label className={styles.checkbox_label}>
                                        <input
                                            type="checkbox"
                                            checked={educationForm.currentlyStudying}
                                            onChange={(e) => onEducationFormChange('currentlyStudying', e.target.checked)}
                                        />
                                        Учусь сейчас
                                    </label>
                                </div>

                                <div className={styles.form_actions}>
                                    <button
                                        className={styles.save_button}
                                        onClick={onEditEducationSave}
                                        disabled={!educationForm.institution || !educationForm.startYear}
                                    >
                                        Сохранить
                                    </button>
                                    <button
                                        className={styles.cancel_button}
                                        onClick={onEditEducationCancel}
                                    >
                                        Отмена
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className={styles.education_main}>
                                <div className={styles.education_content}>
                                    <div className={styles.education_header}>
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ marginRight: '8px', flexShrink: 0 }}>
                                            <path d="M12 3L1 9L5 11.18V17.18L12 21L19 17.18V11.18L21 10.09V17H23V9L12 3ZM18.82 9L12 12.72L5.18 9L12 5.28L18.82 9ZM17 15.99L12 18.72L7 15.99V12.27L12 15L17 12.27V15.99Z" fill="#3A54DA"/>
                                        </svg>
                                        <strong>{edu.institution}</strong>
                                    </div>
                                    <div className={styles.education_years}>
                                        <span>{edu.startYear} - {edu.currentlyStudying ? 'По настоящее время' : edu.endYear}</span>
                                    </div>
                                    {edu.specialty && (
                                        <div className={styles.education_details}>
                                            <span>Специальность: {typeof edu.specialty === 'string' ? edu.specialty : ''}</span>
                                        </div>
                                    )}
                                </div>
                                {!readOnly && <div className={styles.education_actions}>
                                    <button
                                        className={styles.edit_icon}
                                        onClick={() => onEditEducationStart(edu)}
                                        title="Редактировать"
                                    >
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                            <path d="M7.2302 20.59L2.4502 21.59L3.4502 16.81L17.8902 2.29001C18.1407 2.03889 18.4385 1.83982 18.7663 1.70424C19.0941 1.56865 19.4455 1.49925 19.8002 1.50001C20.5163 1.50001 21.203 1.78447 21.7094 2.29082C22.2157 2.79717 22.5002 3.48392 22.5002 4.20001C22.501 4.55474 22.4315 4.90611 22.296 5.23391C22.1604 5.56171 21.9613 5.85945 21.7102 6.11001L7.2302 20.59Z" stroke="#3A54DA" strokeWidth="2" strokeMiterlimit="10"/>
                                        </svg>
                                    </button>
                                    <button
                                        className={styles.delete_icon}
                                        onClick={() => onDeleteEducation(edu.id)}
                                        title="Удалить"
                                    >
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                            <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" fill="#ff4444"/>
                                        </svg>
                                    </button>
                                </div>}
                            </div>
                        )}
                    </div>
                ))}
                    </>
                ) : (
                    !editingEducation && (
                        <div className={styles.empty_state}>
                            <span>{readOnly ? 'Пока нет информации об образовании' : 'Добавьте информацию об образовании'}</span>
                        </div>
                    )
                )}

                {/* Кнопка добавления нового образования */}
                {!readOnly && editingEducation === null ? (
                    <div className={styles.add_education_container}>
                        <button
                            className={styles.add_button}
                            onClick={onAddEducation}
                            title="Добавить образование"
                        >
                            +
                        </button>
                    </div>
                ) : editingEducation && editingEducation.startsWith('new-') ? (
                    <div className={styles.education_form}>
                        <div className={styles.form_group}>
                            <label>Учебное заведение *</label>
                            <input
                                type="text"
                                placeholder="Учебное заведение"
                                value={educationForm.institution}
                                onChange={(e) => onEducationFormChange('institution', e.target.value)}
                            />
                        </div>

                        <div className={styles.form_group}>
                            <label>Специальность</label>
                            <select
                                value={educationForm.selectedSpecialty || ''}
                                onChange={(e) => {
                                    const selectedId = parseInt(e.target.value);
                                    setEducationForm(prev => ({
                                        ...prev,
                                        selectedSpecialty: selectedId || undefined
                                    }));
                                }}
                            >
                                <option value="">Выберите специальность</option>
                                {occupationsLoading && (
                                    <option disabled>Загружается...</option>
                                )}
                                {occupations.map(occupation => (
                                    <option key={occupation.id} value={occupation.id}>
                                        {occupation.title}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className={styles.year_group}>
                            <div className={styles.form_group}>
                                <label>Год начала *</label>
                                <input
                                    type="number"
                                    placeholder="Год начала"
                                    value={educationForm.startYear}
                                    onChange={(e) => onEducationFormChange('startYear', e.target.value)}
                                    min="1900"
                                    max={new Date().getFullYear()}
                                />
                            </div>

                            <div className={styles.form_group}>
                                <label>Год окончания</label>
                                <input
                                    type="number"
                                    placeholder="Год окончания"
                                    value={educationForm.endYear}
                                    onChange={(e) => onEducationFormChange('endYear', e.target.value)}
                                    min={parseInt(educationForm.startYear) || 1900}
                                    max={new Date().getFullYear()}
                                    disabled={educationForm.currentlyStudying}
                                />
                            </div>
                        </div>

                        <div className={styles.checkbox_group}>
                            <label className={styles.checkbox_label}>
                                <input
                                    type="checkbox"
                                    checked={educationForm.currentlyStudying}
                                    onChange={(e) => onEducationFormChange('currentlyStudying', e.target.checked)}
                                />
                                Учусь сейчас
                            </label>
                        </div>

                        <div className={styles.form_actions}>
                            <button
                                className={styles.save_button}
                                onClick={onEditEducationSave}
                                disabled={!educationForm.institution || !educationForm.startYear}
                            >
                                Сохранить
                            </button>
                            <button
                                className={styles.cancel_button}
                                onClick={onEditEducationCancel}
                            >
                                Отмена
                            </button>
                        </div>
                    </div>
                ) : null}
            </div>
        </div>
    );
};
