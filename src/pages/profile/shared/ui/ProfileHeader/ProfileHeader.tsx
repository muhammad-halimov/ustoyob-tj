import React, { ChangeEvent, RefObject, useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { UserRole, Occupation } from '../../../../../entities';
import { smartNameTranslator } from '../../../../../utils/textHelper';
import { Marquee } from '../../../../../shared/ui/Text/Marquee/Marquee';
import { DateInput } from '../../../../../widgets/DateInput/DateInput';
import styles from './ProfileHeader.module.scss';
import { EditActions } from '../EditActions/EditActions';

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
    editingField: 'fullName' | 'specialty' | 'gender' | 'dateOfBirth' | null;
    tempValue: string;
    selectedSpecialties?: string[];
    occupations: Occupation[];
    fileInputRef?: RefObject<HTMLInputElement | null>;
    specialtyInputRef?: RefObject<HTMLSelectElement | null>;
    isLoading: boolean;
    readOnly?: boolean;
    userRole?: UserRole | null;
    onAvatarClick: () => void;
    onFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
    onImageError: (e: React.SyntheticEvent<HTMLImageElement, Event>) => void;
    onEditStart: (field: 'fullName' | 'specialty' | 'gender' | 'dateOfBirth') => void;
    onTempValueChange: (value: string) => void;
    onInputSave: (field: 'fullName' | 'specialty' | 'gender' | 'dateOfBirth') => void;
    onInputKeyPress: (e: React.KeyboardEvent, field: 'fullName' | 'specialty' | 'gender' | 'dateOfBirth') => void;
    onSpecialtySave: () => void;
    onEditCancel: () => void;
    onAddSpecialty?: (specialty: string) => void;
    onRemoveSpecialty?: (specialty: string) => void;
    isOnline?: boolean;
    lastSeen?: string;
    isLiked?: boolean;
    isLikeLoading?: boolean;
    onLike?: () => void;
    onChat?: () => void;
    onReview?: () => void;
    onComplaint?: () => void;
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
    isOnline,
    lastSeen,
    isLiked,
    isLikeLoading,
    onLike,
    onChat,
    onReview,
    onComplaint,
}) => {
    const { t, i18n } = useTranslation(['profile', 'components']);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Split tempValue into surname / firstName for the two-input edit
    const nameParts = tempValue.trim().split(/\s+/);
    const [surnameInput, setSurnameInput] = useState(nameParts[0] || '');
    const [firstNameInput, setFirstNameInput] = useState(nameParts.slice(1).join(' ') || '');

    // Sync local split state whenever tempValue is reset externally (e.g. onEditStart)
    useEffect(() => {
        if (editingField === 'fullName') {
            const parts = tempValue.trim().split(/\s+/);
            setSurnameInput(parts[0] || '');
            setFirstNameInput(parts.slice(1).join(' ') || '');
        }
    }, [editingField]);

    const handleSurnameChange = (value: string) => {
        setSurnameInput(value);
        onTempValueChange(`${value} ${firstNameInput}`.trim());
    };

    const handleFirstNameChange = (value: string) => {
        setFirstNameInput(value);
        onTempValueChange(`${surnameInput} ${value}`.trim());
    };

    useEffect(() => {
        if (!dropdownOpen) return;
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [dropdownOpen]);

    // Транслитерация имени пользователя
    const translatedFullName = smartNameTranslator(fullName, i18n.language as 'ru' | 'tj' | 'eng');

    // const getLastSeenTime = (ls: string): string => {
    //     const date = new Date(ls);
    //     const now = new Date();
    //     const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    //     if (diffInMinutes < 1) return t('components:chat.justNow');
    //     if (diffInMinutes < 60) return t('components:chat.minutesAgo', { count: diffInMinutes });
    //     if (diffInMinutes < 1440) return t('components:chat.hoursAgo', { count: Math.floor(diffInMinutes / 60) });
    //     return t('components:chat.daysAgo', { count: Math.floor(diffInMinutes / 1440) });
    // };

    const getGenderDisplay = (value: string | undefined): string => {
        if (!value) return 'н/у';
        if (value === 'male' || value === 'gender_male') return t('profile:genderMale');
        if (value === 'female' || value === 'gender_female') return t('profile:genderFemale');
        return 'н/у';
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
        <div className={`${styles.profile_content}${dropdownOpen ? ` ${styles.profile_content_raised}` : ''}`}>
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
                            src="../default_user.png"
                            alt="Default Avatar"
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
                {!readOnly && fileInputRef && <input
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
                                <div className={styles.name_edit_container}>
                                    <div className={styles.name_split_inputs}>
                                        <label className={styles.name_input_group}>
                                            <span className={styles.name_input_label}>{t('profile:surnamePlaceholder')}</span>
                                            <input
                                                name='surname_input'
                                                type="text"
                                                value={surnameInput}
                                                onChange={(e) => handleSurnameChange(e.target.value)}
                                                onKeyDown={(e) => onInputKeyPress(e, 'fullName')}
                                                className={styles.name_input}
                                                placeholder={t('profile:surnamePlaceholder')}
                                                autoFocus
                                            />
                                        </label>
                                        <label className={styles.name_input_group}>
                                            <span className={styles.name_input_label}>{t('profile:firstNamePlaceholder')}</span>
                                            <input
                                                name='name_input'
                                                type="text"
                                                value={firstNameInput}
                                                onChange={(e) => handleFirstNameChange(e.target.value)}
                                                onKeyDown={(e) => onInputKeyPress(e, 'fullName')}
                                                className={styles.name_input}
                                                placeholder={t('profile:firstNamePlaceholder')}
                                            />
                                        </label>
                                    </div>
                                    <EditActions onSave={() => onInputSave('fullName')} onCancel={onEditCancel} />
                                </div>
                            </div>
                        ) : (
                            <div className={styles.name_with_icon}>
                                <div className={styles.name_info}>
                                    <div className={styles.name_container}>
                                        <div className={styles.name}>
                                            <Marquee text={translatedFullName} alwaysScroll />
                                        </div>
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
                                            <div className={styles.gender_edit_container}>
                                                <select
                                                    value={tempValue}
                                                    onChange={(e) => onTempValueChange(e.target.value)}
                                                    onKeyDown={(e) => onInputKeyPress(e, 'gender')}
                                                    className={styles.specialty_select}
                                                    autoFocus
                                                >
                                                    <option value="">{t('profile:genderNotSpecified')}</option>
                                                    <option value="male">{t('profile:genderMale')}</option>
                                                    <option value="female">{t('profile:genderFemale')}</option>
                                                </select>
                                                <EditActions onSave={() => onInputSave('gender')} onCancel={onEditCancel} />
                                            </div>
                                        ) : editingField === 'dateOfBirth' ? (
                                            <div className={styles.dob_edit_container}>
                                                <DateInput
                                                    value={tempValue}
                                                    onChange={onTempValueChange}
                                                    className={styles.dob_date_input}
                                                    max={new Date().toISOString().split('T')[0]}
                                                />
                                                <EditActions onSave={() => onInputSave('dateOfBirth')} onCancel={onEditCancel} />
                                            </div>
                                        ) : (
                                            <>
                                                <div 
                                                    className={styles.gender_tag} 
                                                    onClick={!readOnly ? () => onEditStart('gender') : undefined}
                                                    style={!readOnly ? { cursor: 'pointer' } : undefined}
                                                >
                                                    <Marquee text={`${t('profile:genderPrefix')}: ${getGenderDisplay(gender)}`} alwaysScroll />
                                                </div>
                                                {age !== null ? (
                                                    <div
                                                        className={styles.age_tag}
                                                        onClick={!readOnly ? () => onEditStart('dateOfBirth') : undefined}
                                                        style={!readOnly ? { cursor: 'pointer' } : undefined}
                                                    >
                                                        <Marquee text={`${t('profile:agePrefix')}: ${age} ${t('profile:ageLabel')}`} alwaysScroll />
                                                    </div>
                                                ) : !readOnly && (
                                                    <div
                                                        className={`${styles.age_tag} ${styles.age_tag_add}`}
                                                        onClick={() => onEditStart('dateOfBirth')}
                                                    >
                                                        + {t('profile:dobPrefix')}
                                                    </div>
                                                )}
                                                {email && (
                                                    <div className={styles.email_tag}>
                                                        <a href={`mailto:${email}`}><Marquee text={email} alwaysScroll /></a>
                                                    </div>
                                                )}
                                                {readOnly && (
                                                    <div className={`${styles.online_status} ${isOnline ? styles.online_status_online : styles.online_status_offline}`}>
                                                        <span className={styles.online_dot} />
                                                        {isOnline
                                                            ? t('components:chat.online')
                                                            : lastSeen
                                                                ? `${t('components:chat.offline')}`
                                                                : t('components:chat.offline')}
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
                                    <div className={styles.specialty_edit_form}>
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
                                                ref={specialtyInputRef ?? null}
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
                                    </div>

                                    <EditActions onSave={onSpecialtySave} onCancel={onEditCancel} saveDisabled={isLoading || currentSelectedSpecialties.length === 0} />
                                </div>
                            ) : (
                                <div className={styles.specialty_with_icon}>
                                    <div className={styles.specialties_display}>
                                        {displaySpecialties.map((spec, index) => (
                                            <span key={index} className={styles.specialty_badge}>
                                                <Marquee text={typeof spec === 'string' ? spec : ''} alwaysScroll />
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

                {/* Action buttons: Chat (standalone) + Like (standalone) + ⋮ dropdown (Review/Complaint) */}
                {(onChat || onReview || onComplaint || onLike) && (
                    <div className={styles.action_buttons}>
                        {onChat && (
                            <button
                                className={styles.action_chat_btn}
                                onClick={(e) => { e.stopPropagation(); onChat(); }}
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M12 1.5C6.2 1.5 1.5 5.77 1.5 11.02C1.52866 13.0353 2.23294 14.9826 3.5 16.55L2.5 21.55L9.16 20.22C10.1031 20.4699 11.0744 20.5976 12.05 20.6C17.85 20.6 22.55 16.32 22.55 11.05C22.55 5.78 17.8 1.5 12 1.5Z"
                                          stroke="currentColor" strokeWidth="2" strokeMiterlimit="10"/>
                                </svg>
                                {t('components:pages.favorites.writeMessage')}
                            </button>
                        )}
                        {onLike && (
                            <button
                                className={`${styles.action_like_btn} ${isLiked ? styles.action_like_btn_active : ''}`}
                                onClick={(e) => { e.stopPropagation(); onLike(); }}
                                disabled={isLikeLoading}
                                title={isLiked
                                    ? t('components:pages.favorites.removeFromFavorites')
                                    : t('components:pages.favorites.addToFavorites')
                                }
                            >
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path
                                        d="M16.77 2.45C15.7961 2.47092 14.8444 2.74461 14.0081 3.24424C13.1719 3.74388 12.4799 4.45229 12 5.3C11.5201 4.45229 10.8281 3.74388 9.99186 3.24424C9.15563 2.74461 8.2039 2.47092 7.23 2.45C4.06 2.45 1.5 5.3 1.5 8.82C1.5 15.18 12 21.55 12 21.55C12 21.55 22.5 15.18 22.5 8.82C22.5 5.3 19.94 2.45 16.77 2.45Z"
                                        fill={isLiked ? '#3A54DA' : 'none'}
                                        stroke="#3A54DA"
                                        strokeWidth="2"
                                        strokeMiterlimit="10"
                                    />
                                </svg>
                            </button>
                        )}
                        {(onReview || onComplaint) && (
                            <div className={styles.action_dropdown_wrapper} ref={dropdownRef}>
                                <button
                                    className={styles.action_dropdown_btn}
                                    onClick={(e) => { e.stopPropagation(); setDropdownOpen(o => !o); }}
                                    title={t('components:pages.favorites.actions')}
                                >
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                                        <circle cx="12" cy="5" r="2"/>
                                        <circle cx="12" cy="12" r="2"/>
                                        <circle cx="12" cy="19" r="2"/>
                                    </svg>
                                </button>
                                {dropdownOpen && (
                                    <div className={styles.action_dropdown_menu}>
                                        {onReview && (
                                            <button
                                                className={styles.action_dropdown_item}
                                                onClick={(e) => { e.stopPropagation(); setDropdownOpen(false); onReview(); }}
                                            >
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                    <path d="M12 2.5L15.09 8.76L22 9.77L17 14.64L18.18 21.52L12 18.27L5.82 21.52L7 14.64L2 9.77L8.91 8.76L12 2.5Z"
                                                          stroke="currentColor" strokeWidth="2" strokeMiterlimit="10"/>
                                                </svg>
                                                {t('components:pages.favorites.leaveReview')}
                                            </button>
                                        )}
                                        {onComplaint && (
                                            <button
                                                className={`${styles.action_dropdown_item} ${styles.action_dropdown_item_danger}`}
                                                onClick={(e) => { e.stopPropagation(); setDropdownOpen(false); onComplaint(); }}
                                            >
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                    <path d="M12 9V13M12 17H12.01M10.29 3.86L1.82 18C1.64539 18.3024 1.55299 18.6453 1.55201 18.9945C1.55103 19.3437 1.64151 19.6871 1.81445 19.9905C1.98738 20.2939 2.23675 20.5467 2.53773 20.7239C2.83871 20.9011 3.18082 20.9965 3.53 21H20.47C20.8192 20.9965 21.1613 20.9011 21.4623 20.7239C21.7633 20.5467 22.0126 20.2939 22.1856 19.9905C22.3585 19.6871 22.449 19.3437 22.448 18.9945C22.447 18.6453 22.3546 18.3024 22.18 18L13.71 3.86C13.5317 3.56611 13.2807 3.32313 12.9812 3.15449C12.6817 2.98585 12.3437 2.89725 12 2.89725C11.6563 2.89725 11.3183 2.98585 11.0188 3.15449C10.7193 3.32313 10.4683 3.56611 10.29 3.86Z"
                                                          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                                </svg>
                                                {t('components:pages.favorites.complaint')}
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
