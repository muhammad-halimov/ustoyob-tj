import React, { ChangeEvent, RefObject } from 'react';
import { useTranslation } from 'react-i18next';
import { UserRole, Occupation } from '../../../../../entities';
import styles from './ProfileHeader.module.scss';

interface ProfileHeaderProps {
    avatar: string | null;
    fullName: string;
    email?: string;
    gender?: string;
    dateOfBirth?: string;
    specialty: string;
    specialties?: string[];
    rating: number;
    reviewsCount: number;
    editingField: 'fullName' | 'specialty' | 'gender' | null;
    tempValue: string;
    selectedSpecialties?: string[];
    occupations: Occupation[];
    fileInputRef: RefObject<HTMLInputElement | null>;
    specialtyInputRef: RefObject<HTMLSelectElement | null>;
    isLoading: boolean;
    readOnly?: boolean;
    userRole?: UserRole | null;
    onAvatarClick: () => void;
    onFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
    onImageError: (e: React.SyntheticEvent<HTMLImageElement, Event>) => void;
    onEditStart: (field: 'fullName' | 'specialty' | 'gender') => void;
    onTempValueChange: (value: string) => void;
    onInputSave: (field: 'fullName' | 'specialty' | 'gender') => void;
    onInputKeyPress: (e: React.KeyboardEvent, field: 'fullName' | 'specialty' | 'gender') => void;
    onSpecialtySave: () => void;
    onEditCancel: () => void;
    onAddSpecialty?: (specialty: string) => void;
    onRemoveSpecialty?: (specialty: string) => void;
}

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({
    avatar,
    fullName,
    email,
    gender,
    dateOfBirth,
    specialty,
    specialties = [],
    rating,
    reviewsCount,
    editingField,
    tempValue,
    selectedSpecialties = [],
    occupations,
    fileInputRef,
    specialtyInputRef,
    isLoading,
    readOnly = false,
    userRole,
    onAvatarClick,
    onFileChange,
    onImageError,
    onEditStart,
    onTempValueChange,
    onInputSave,
    onInputKeyPress,
    onSpecialtySave,
    onEditCancel,
    onAddSpecialty,
    onRemoveSpecialty,
}) => {
    const { t } = useTranslation(['profile']);

    const getGenderDisplay = (value: string | undefined): string => {
        if (!value) return t('profile:notSpecified');
        if (value === 'male' || value === 'gender_male') return t('profile:genderMale');
        if (value === 'female' || value === 'gender_female') return t('profile:genderFemale');
        return t('profile:notSpecified');
    };

    const calculateAge = (dob: string | undefined): number | null => {
        if (!dob) return null;
        const birth = new Date(dob);
        if (isNaN(birth.getTime())) return null;
        const today = new Date();
        let age = today.getFullYear() - birth.getFullYear();
        const m = today.getMonth() - birth.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
        return age > 0 ? age : null;
    };

    const age = calculateAge(dateOfBirth);

    // Ensure displaySpecialties contains only strings
    const safeSpecialties = specialties.length > 0 
        ? specialties.map(s => typeof s === 'string' ? s : (typeof s === 'object' && s && 'title' in s ? String((s as any).title) : '')).filter(Boolean)
        : [specialty].filter(s => s && typeof s === 'string');
    
    const displaySpecialties = safeSpecialties.length > 0 ? safeSpecialties : [t('profile:specialty')];
    
    // В режиме редактирования используем selectedSpecialties, иначе specialties для отображения
    const currentSelectedSpecialties = editingField === 'specialty' 
        ? selectedSpecialties 
        : safeSpecialties;

    const handleAddSpecialty = () => {
        if (tempValue.trim() && onAddSpecialty && !currentSelectedSpecialties.includes(tempValue)) {
            onAddSpecialty(tempValue);
            // Сброс значения селекта после добавления
            setTimeout(() => onTempValueChange(''), 0);
        }
    };

    const handleRemoveSpecialty = (specialtyToRemove: string) => {
        if (onRemoveSpecialty) {
            onRemoveSpecialty(specialtyToRemove);
        }
    };

    return (
        <div className={styles.profile_content}>
            {userRole && (
                <div className={styles.profile_type_badge}>
                    {userRole === 'master' ? t('profile:profileMaster') : t('profile:profileClient')}
                </div>
            )}
            <div className={styles.avatar_section}>
                <div
                    className={styles.avatar_container}
                    onClick={readOnly ? undefined : onAvatarClick}
                    style={readOnly ? { cursor: 'default' } : undefined}
                >
                    {avatar ? (
                        <img
                            src={avatar}
                            alt="Аватар"
                            className={styles.avatar}
                            onError={onImageError}
                        />
                    ) : (
                        <img
                            src="../fonTest6.png"
                            alt="FonTest6"
                            className={styles.avatar_placeholder}
                        />
                    )}
                    {!readOnly && <div className={styles.avatar_overlay}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M17 8L12 3L7 8" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M12 3V15" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        <span>{t('profile:changePhoto')}</span>
                    </div>}
                </div>
                {!readOnly && <input
                    type="file"
                    ref={fileInputRef}
                    onChange={onFileChange}
                    accept="image/*"
                    style={{ display: 'none' }}
                />}
            </div>

            <div className={styles.profile_info}>
                <div className={styles.name_specialty}>
                    <div className={styles.name_row}>
                        {editingField === 'fullName' ? (
                            <div className={styles.full_name_edit}>
                                <input
                                    type="text"
                                    value={tempValue}
                                    onChange={(e) => onTempValueChange(e.target.value)}
                                    onBlur={() => onInputSave('fullName')}
                                    onKeyDown={(e) => onInputKeyPress(e, 'fullName')}
                                    className={styles.name_input}
                                    placeholder="Фамилия Имя Отчество"
                                    autoFocus
                                />
                            </div>
                        ) : (
                            <div className={styles.name_with_icon}>
                                <div>
                                    <div className={styles.name_container}>
                                        <span className={styles.name}>{fullName}</span>
                                        {!readOnly && <button
                                            className={styles.edit_icon}
                                            onClick={() => onEditStart('fullName')}
                                        >
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                                <path d="M7.2302 20.59L2.4502 21.59L3.4502 16.81L17.8902 2.29001C18.1407 2.03889 18.4385 1.83982 18.7663 1.70424C19.0941 1.56865 19.4455 1.49925 19.8002 1.50001C20.5163 1.50001 21.203 1.78447 21.7094 2.29082C22.2157 2.79717 22.5002 3.48392 22.5002 4.20001C22.501 4.55474 22.4315 4.90611 22.296 5.23391C22.1604 5.56171 21.9613 5.85945 21.7102 6.11001L7.2302 20.59Z" stroke="#3A54DA" strokeWidth="2" strokeMiterlimit="10"/>
                                            </svg>
                                        </button>}
                                    </div>
                                    <div className={styles.subinfo}>
                                        {editingField === 'gender' ? (
                                            <select
                                                value={tempValue}
                                                onChange={(e) => onTempValueChange(e.target.value)}
                                                onBlur={() => onInputSave('gender')}
                                                onKeyDown={(e) => onInputKeyPress(e, 'gender')}
                                                className={styles.specialty_select}
                                                autoFocus
                                            >
                                                <option value="">{t('profile:genderNotSpecified')}</option>
                                                <option value="male">{t('profile:genderMale')}</option>
                                                <option value="female">{t('profile:genderFemale')}</option>
                                            </select>
                                        ) : (
                                            <>
                                                <div 
                                                    className={styles.gender_tag} 
                                                    onClick={!readOnly ? () => onEditStart('gender') : undefined}
                                                    style={!readOnly ? { cursor: 'pointer' } : undefined}
                                                >
                                                    <span>{getGenderDisplay(gender)}</span>
                                                </div>
                                                {age !== null && (
                                                    <div className={styles.age_tag}>
                                                        <span>{age} {t('profile:ageLabel')}</span>
                                                    </div>
                                                )}
                                                {email && (
                                                    <div className={styles.email_tag}>
                                                        <a href={`mailto:${email}`}>{email}</a>
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {userRole === 'master' && (
                        <div className={styles.specialty_row}>
                            {editingField === 'specialty' ? (
                                <div className={styles.specialty_edit_container}>
                                    {/* Список выбранных специальностей */}
                                    {currentSelectedSpecialties.length > 0 && (
                                        <div className={styles.selected_specialties}>
                                            {currentSelectedSpecialties.map((spec, index) => (
                                                <div key={index} className={styles.specialty_tag}>
                                                    <span>{typeof spec === 'string' ? spec : ''}</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveSpecialty(spec)}
                                                        className={styles.remove_specialty_btn}
                                                        aria-label="Удалить специальность"
                                                    >
                                                        ×
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Селект для добавления новой специальности */}
                                    <div className={styles.add_specialty_container}>
                                        <select
                                            key={`specialty-select-${currentSelectedSpecialties.length}`}
                                            ref={specialtyInputRef}
                                            value={tempValue}
                                            onChange={(e) => onTempValueChange(e.target.value)}
                                            className={styles.specialty_select}
                                        >
                                            <option value="">{t('profile:addSpecialty')}</option>
                                            {occupations
                                                .filter(occupation => !currentSelectedSpecialties.includes(occupation.title))
                                                .map(occupation => (
                                                    <option
                                                        key={occupation.id}
                                                        value={occupation.title}
                                                    >
                                                        {occupation.title}
                                                    </option>
                                                ))}
                                        </select>
                                        <button
                                            type="button"
                                            className={styles.add_specialty_btn}
                                            onClick={handleAddSpecialty}
                                            disabled={!tempValue.trim()}
                                        >
                                            {t('profile:addBtn')}
                                        </button>
                                    </div>

                                    <div className={styles.specialty_actions}>
                                        <button
                                            className={styles.save_occupations_btn}
                                            onClick={onSpecialtySave}
                                            disabled={isLoading || currentSelectedSpecialties.length === 0}
                                        >
                                            {isLoading ? t('profile:savingBtn') : t('profile:saveBtn')}
                                        </button>
                                        <button
                                            className={styles.cancel_occupations_btn}
                                            onClick={onEditCancel}
                                        >
                                            {t('profile:cancelBtn')}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className={styles.specialty_with_icon}>
                                    <div className={styles.specialties_display}>
                                        {displaySpecialties.map((spec, index) => (
                                            <span key={index} className={styles.specialty_badge}>
                                                {typeof spec === 'string' ? spec : ''}
                                            </span>
                                        ))}
                                    </div>
                                    {!readOnly && <button
                                        className={styles.edit_icon}
                                        onClick={() => onEditStart('specialty')}
                                    >
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                            <path d="M7.2302 20.59L2.4502 21.59L3.4502 16.81L17.8902 2.29001C18.1407 2.03889 18.4385 1.83982 18.7663 1.70424C19.0941 1.56865 19.4455 1.49925 19.8002 1.50001C20.5163 1.50001 21.203 1.78447 21.7094 2.29082C22.2157 2.79717 22.5002 3.48392 22.5002 4.20001C22.501 4.55474 22.4315 4.90611 22.296 5.23391C22.1604 5.56171 21.9613 5.85945 21.7102 6.11001L7.2302 20.59Z" stroke="#3A54DA" strokeWidth="2" strokeMiterlimit="10"/>
                                        </svg>
                                    </button>}
                                </div>
                            )}
                        </div>
                    )}
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
                        {rating.toFixed(1)} {t('profile:ratingLabel')}
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
                        {reviewsCount} {t('profile:reviewsLabel')}
                    </span>
                </div>
            </div>
        </div>
    );
};
