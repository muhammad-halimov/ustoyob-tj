import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Marquee } from '../../../../../shared/ui/Text/Marquee';
import { Toggle } from '../../../../../shared/ui/Button/Toggle/Toggle';
import Status from '../../../../../shared/ui/Modal/Status';
import PageLoader from '../../../../../widgets/PageLoader/PageLoader';
import { ProfileSection } from '../ProfileSection';
import styles from './EducationSection.module.scss';
import { EditActions } from '../EditActions/EditActions';

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
    onReorder?: (education: Education[]) => void;
    onRefresh?: () => void;
    isLoading?: boolean;
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
    onReorder,
    onRefresh,
    isLoading = false,
}) => {
    const { t } = useTranslation(['profile']);

    const [statusMsg, setStatusMsg] = useState('');
    const [statusOpen, setStatusOpen] = useState(false);
    const [statusType, setStatusType] = useState<'success' | 'error'>('error');
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const showError = (msg: string) => { setStatusType('error'); setStatusMsg(msg); setStatusOpen(true); };

    const handleSave = async () => {
        try {
            await onEditEducationSave();
        } catch (err: unknown) {
            showError(err instanceof Error ? err.message : t('profile:eduSaveError', 'Ошибка сохранения'));
        }
    };

    const handleDelete = async (id: string) => {
        setDeletingId(id);
        try {
            await onDeleteEducation(id);
        } catch (err: unknown) {
            showError(err instanceof Error ? err.message : t('profile:eduDeleteError', 'Ошибка удаления'));
        } finally {
            setDeletingId(null);
        }
    };

    const renderEducationForm = () => (
        <>
            <div className={styles.form_group}>
                <label>{t('profile:institution')} *</label>
                <input
                    type="text"
                    placeholder={t('profile:institutionPlaceholder')}
                    value={educationForm.institution}
                    onChange={(e) => onEducationFormChange('institution', e.target.value)}
                />
            </div>
            <div className={styles.form_group}>
                <label>{t('profile:specialty')}</label>
                <select
                    className={styles.specialty_select}
                    value={educationForm.selectedSpecialty || ''}
                    onChange={(e) => {
                        const selectedId = parseInt(e.target.value);
                        setEducationForm(prev => ({ ...prev, selectedSpecialty: selectedId || undefined }));
                    }}
                >
                    <option value="">{t('profile:selectSpecialty')}</option>
                    {occupationsLoading && <option disabled>{t('profile:loadingSpecialties')}</option>}
                    {occupations.map(occupation => (
                        <option key={occupation.id} value={occupation.id}>{occupation.title}</option>
                    ))}
                </select>
            </div>
            <div className={styles.year_group}>
                <div className={styles.form_group}>
                    <label>{t('profile:startYear')} *</label>
                    <input
                        type="number"
                        placeholder={t('profile:startYear')}
                        value={educationForm.startYear}
                        onChange={(e) => onEducationFormChange('startYear', e.target.value)}
                        min="1900"
                        max={new Date().getFullYear()}
                    />
                </div>
                <div className={styles.form_group}>
                    <label>{t('profile:endYear')}</label>
                    <input
                        type="number"
                        placeholder={t('profile:endYear')}
                        value={educationForm.endYear}
                        onChange={(e) => onEducationFormChange('endYear', e.target.value)}
                        min={parseInt(educationForm.startYear) || 1900}
                        max={new Date().getFullYear()}
                        disabled={educationForm.currentlyStudying}
                    />
                </div>
            </div>
            <div className={styles.checkbox_group}>
                <Toggle
                    checked={educationForm.currentlyStudying}
                    onChange={(e) => onEducationFormChange('currentlyStudying', e.target.checked)}
                    label={t('profile:studyingNow')}
                />
            </div>
            <EditActions
                onSave={handleSave}
                onCancel={onEditEducationCancel}
                saveDisabled={!educationForm.institution || !educationForm.startYear}
            />
        </>
    );

    return (
        <>
            <Status type={statusType} isOpen={statusOpen} onClose={() => setStatusOpen(false)} message={statusMsg} />
            <ProfileSection<Education>
                title={t('profile:educationAndExp')}
                items={education}
                editingId={editingEducation}
                readOnly={readOnly}
                isLoading={isLoading}
                emptyTitle={readOnly ? t('profile:noEducation') : t('profile:addEducationInfo')}
                onAdd={!readOnly ? onAddEducation : undefined}
                onReorder={onReorder}
                onRefresh={onRefresh}
                wrapNewFormAsItem={true}
                busyItemId={deletingId}
                renderViewItem={(edu) => (
                    <div className={styles.education_main}>
                        <div className={styles.education_content}>
                            <div className={styles.education_header}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ marginRight: '8px', flexShrink: 0 }}>
                                    <path d="M12 3L1 9L5 11.18V17.18L12 21L19 17.18V11.18L21 10.09V17H23V9L12 3ZM18.82 9L12 12.72L5.18 9L12 5.28L18.82 9ZM17 15.99L12 18.72L7 15.99V12.27L12 15L17 12.27V15.99Z" fill="#3A54DA"/>
                                </svg>
                                <Marquee text={edu.institution} alwaysScroll className={styles.education_institution} />
                            </div>
                            <div className={styles.education_years}>
                                <span>{edu.startYear} - {edu.currentlyStudying ? t('profile:currentlyStudying') : edu.endYear}</span>
                            </div>
                            {edu.specialty && (
                                <div className={styles.education_details}>
                                    <span className={styles.education_details_prefix}>{t('profile:specialtyPrefix')}</span>
                                    <Marquee text={typeof edu.specialty === 'string' ? edu.specialty : ''} alwaysScroll />
                                </div>
                            )}
                        </div>
                        {!readOnly && (
                            <div className={styles.education_actions}>
                                <button className={styles.edit_icon} onClick={() => onEditEducationStart(edu)} title={t('profile:editBtn')}>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                        <path d="M7.2302 20.59L2.4502 21.59L3.4502 16.81L17.8902 2.29001C18.1407 2.03889 18.4385 1.83982 18.7663 1.70424C19.0941 1.56865 19.4455 1.49925 19.8002 1.50001C20.5163 1.50001 21.203 1.78447 21.7094 2.29082C22.2157 2.79717 22.5002 3.48392 22.5002 4.20001C22.501 4.55474 22.4315 4.90611 22.296 5.23391C22.1604 5.56171 21.9613 5.85945 21.7102 6.11001L7.2302 20.59Z" stroke="#3A54DA" strokeWidth="2" strokeMiterlimit="10"/>
                                    </svg>
                                </button>
                                <button className={styles.delete_icon} onClick={() => handleDelete(edu.id)} disabled={deletingId === edu.id} title={t('profile:deleteBtn')}>
                                    {deletingId === edu.id
                                        ? <PageLoader compact fullPage={false} />
                                        : <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                            <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" fill="#ff4444"/>
                                        </svg>
                                    }
                                </button>
                            </div>
                        )}
                    </div>
                )}
                renderEditItem={() => (
                    <div className={styles.education_form}>{renderEducationForm()}</div>
                )}
                renderNewForm={() => (
                    <div className={styles.education_form}>{renderEducationForm()}</div>
                )}

            />
        </>
    );
};
