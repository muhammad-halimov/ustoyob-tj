import React, { ChangeEvent, RefObject } from 'react';
import styles from './ProfileHeader.module.scss';

interface ProfileHeaderProps {
    avatar: string | null;
    fullName: string;
    specialty: string;
    specialties?: string[];
    rating: number;
    reviewsCount: number;
    editingField: 'fullName' | 'specialty' | null;
    tempValue: string;
    selectedSpecialties?: string[];
    occupations: { id: number; title: string }[];
    fileInputRef: RefObject<HTMLInputElement | null>;
    specialtyInputRef: RefObject<HTMLSelectElement | null>;
    isLoading: boolean;
    readOnly?: boolean;
    onAvatarClick: () => void;
    onFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
    onImageError: (e: React.SyntheticEvent<HTMLImageElement, Event>) => void;
    onEditStart: (field: 'fullName' | 'specialty') => void;
    onTempValueChange: (value: string) => void;
    onInputSave: (field: 'fullName' | 'specialty') => void;
    onInputKeyPress: (e: React.KeyboardEvent, field: 'fullName' | 'specialty') => void;
    onSpecialtySave: () => void;
    onEditCancel: () => void;
    onAddSpecialty?: (specialty: string) => void;
    onRemoveSpecialty?: (specialty: string) => void;
}

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({
    avatar,
    fullName,
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
    const displaySpecialties = specialties.length > 0 ? specialties : [specialty];
    // В режиме редактирования используем selectedSpecialties, иначе specialties для отображения
    const currentSelectedSpecialties = editingField === 'specialty' 
        ? selectedSpecialties 
        : (specialties.length > 0 ? specialties : []);

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
                        <span>Изменить фото</span>
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
                                <span className={styles.name}>{fullName}</span>
                                {!readOnly && <button
                                    className={styles.edit_icon}
                                    onClick={() => onEditStart('fullName')}
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
                                </button>}
                            </div>
                        )}
                    </div>

                    <div className={styles.specialty_row}>
                        {editingField === 'specialty' ? (
                            <div className={styles.specialty_edit_container}>
                                {/* Список выбранных специальностей */}
                                {currentSelectedSpecialties.length > 0 && (
                                    <div className={styles.selected_specialties}>
                                        {currentSelectedSpecialties.map((spec, index) => (
                                            <div key={index} className={styles.specialty_tag}>
                                                <span>{spec}</span>
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
                                        <option value="">Добавить специальность</option>
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
                                        Добавить
                                    </button>
                                </div>

                                <div className={styles.specialty_actions}>
                                    <button
                                        className={styles.save_occupations_btn}
                                        onClick={onSpecialtySave}
                                        disabled={isLoading || currentSelectedSpecialties.length === 0}
                                    >
                                        {isLoading ? 'Сохранение...' : 'Сохранить'}
                                    </button>
                                    <button
                                        className={styles.cancel_occupations_btn}
                                        onClick={onEditCancel}
                                    >
                                        Отмена
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className={styles.specialty_with_icon}>
                                <div className={styles.specialties_display}>
                                    {displaySpecialties.map((spec, index) => (
                                        <span key={index} className={styles.specialty_badge}>
                                            {spec}
                                        </span>
                                    ))}
                                </div>
                                {!readOnly && <button
                                    className={styles.edit_icon}
                                    onClick={() => onEditStart('specialty')}
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
                                </button>}
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
                        {rating.toFixed(1)} рейтинга
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
                        {reviewsCount} отзыва
                    </span>
                </div>
            </div>
        </div>
    );
};
