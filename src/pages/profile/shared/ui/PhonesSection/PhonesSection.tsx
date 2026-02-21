import React from 'react';
import { useTranslation } from 'react-i18next';
import styles from './PhonesSection.module.scss';

interface Phone {
    id: string;
    number: string;
    type: 'tj' | 'international';
}

interface PhonesSectionProps {
    phones: Phone[];
    editingPhone: string | null;
    phoneForm: { number: string; type: 'tj' | 'international' };
    readOnly?: boolean;
    onAddPhone: () => void;
    onEditPhoneStart: (phone: Phone) => void;
    onEditPhoneSave: () => Promise<void>;
    onEditPhoneCancel: () => void;
    onDeletePhone: (phoneId: string) => Promise<void>;
    onCopyPhone: (phoneNumber: string) => Promise<void>;
    setPhoneForm: React.Dispatch<React.SetStateAction<{ number: string; type: 'tj' | 'international' }>>;
}

export const PhonesSection: React.FC<PhonesSectionProps> = ({
    phones,
    editingPhone,
    phoneForm,
    readOnly = false,
    onAddPhone,
    onEditPhoneStart,
    onEditPhoneSave,
    onEditPhoneCancel,
    onDeletePhone,
    onCopyPhone,
    setPhoneForm,
}) => {
    const { t } = useTranslation(['profile']);
    return (
        <div className={styles.section_item}>
            <h3>{t('profile:phonesTitle')}</h3>
            <div className={styles.section_content}>
                {phones && phones.length > 0 ? (
                    <>
                        {phones.map((phone, index) => (
                    <div key={phone.id} className={`${styles.list_item} ${index === phones.length - 1 ? styles.list_item_last : ''}`}>
                        {editingPhone === phone.id ? (
                            <div className={styles.edit_form}>
                                <div className={styles.form_group}>
                                    <label>{t('profile:phoneType')}</label>
                                    <select
                                        value={phoneForm.type}
                                        onChange={(e) => setPhoneForm(prev => ({ ...prev, type: e.target.value as 'tj' | 'international' }))}
                                        disabled
                                    >
                                        <option value="tj">{t('profile:phoneTypeTj')}</option>
                                        <option value="international">{t('profile:phoneTypeInt')}</option>
                                    </select>
                                </div>
                                <div className={styles.form_group}>
                                    <label>{t('profile:phoneNumber')}</label>
                                    <input
                                        type="tel"
                                        placeholder={phoneForm.type === 'tj' ? '+992XXXXXXXXX' : '+XXXXXXXXXXX'}
                                        value={phoneForm.number}
                                        onChange={(e) => {
                                            let value = e.target.value;
                                            if (!value.startsWith('+')) value = '+' + value;
                                            if (phoneForm.type === 'tj' && !value.startsWith('+992')) {
                                                value = '+992';
                                            }
                                            setPhoneForm(prev => ({ ...prev, number: value }));
                                        }}
                                    />
                                </div>
                                <div className={styles.form_actions}>
                                    <button
                                        className={styles.save_button}
                                        onClick={onEditPhoneSave}
                                    >
                                        {t('profile:saveBtn')}
                                    </button>
                                    <button
                                        className={styles.cancel_button}
                                        onClick={onEditPhoneCancel}
                                    >
                                        {t('profile:cancelBtn')}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className={styles.list_item_content}>
                                    <div className={styles.address_text}>
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ marginRight: '8px', flexShrink: 0 }}>
                                            <path d="M6.62 10.79C8.06 13.62 10.38 15.94 13.21 17.38L15.41 15.18C15.69 14.9 16.08 14.82 16.43 14.93C17.55 15.3 18.75 15.5 20 15.5C20.55 15.5 21 15.95 21 16.5V20C21 20.55 20.55 21 20 21C10.61 21 3 13.39 3 4C3 3.45 3.45 3 4 3H7.5C8.05 3 8.5 3.45 8.5 4C8.5 5.25 8.7 6.45 9.07 7.57C9.18 7.92 9.1 8.31 8.82 8.59L6.62 10.79Z" fill="#3A54DA"/>
                                        </svg>
                                        <strong>{phone.type === 'tj' ? '🇹🇯 ' : '🌍 '}</strong>
                                        <a 
                                            href={`tel:${phone.number}`}
                                            className={styles.phone_link}
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            {phone.number}
                                        </a>
                                    </div>
                                </div>
                                {!readOnly && <div className={styles.list_item_actions}>
                                    <button
                                        className={styles.copy_icon}
                                        onClick={() => onCopyPhone(phone.number)}
                                        title={t('profile:copyBtn')}
                                    >
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                            <path d="M16 1H4C2.9 1 2 1.9 2 3V17H4V3H16V1ZM19 5H8C6.9 5 6 5.9 6 7V21C6 22.1 6.9 23 8 23H19C20.1 23 21 22.1 21 21V7C21 5.9 20.1 5 19 5ZM19 21H8V7H19V21Z" fill="#3A54DA"/>
                                        </svg>
                                    </button>
                                    <button
                                        className={styles.edit_icon}
                                        onClick={() => onEditPhoneStart(phone)}
                                        title={t('profile:editBtn')}
                                    >
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                            <path d="M7.2302 20.59L2.4502 21.59L3.4502 16.81L17.8902 2.29001C18.1407 2.03889 18.4385 1.83982 18.7663 1.70424C19.0941 1.56865 19.4455 1.49925 19.8002 1.50001C20.5163 1.50001 21.203 1.78447 21.7094 2.29082C22.2157 2.79717 22.5002 3.48392 22.5002 4.20001C22.501 4.55474 22.4315 4.90611 22.296 5.23391C22.1604 5.56171 21.9613 5.85945 21.7102 6.11001L7.2302 20.59Z" stroke="#3A54DA" strokeWidth="2" strokeMiterlimit="10"/>
                                        </svg>
                                    </button>
                                    <button
                                        className={styles.delete_icon}
                                        onClick={() => onDeletePhone(phone.id)}
                                        title={t('profile:deleteBtn')}
                                    >
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                            <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" fill="#ff4444"/>
                                        </svg>
                                    </button>
                                </div>}
                            </>
                        )}
                    </div>
                ))}
                    </>
                ) : (
                    !editingPhone && (
                        <div className={styles.empty_state}>
                            <span>{readOnly ? t('profile:noPhones') : t('profile:addPhone')}</span>
                        </div>
                    )
                )}

                {/* Кнопка добавления или форма нового телефона */}
                {!readOnly && editingPhone === null && phones.length < 2 ? (
                    <div className={styles.add_education_container}>
                        <button
                            className={styles.add_button}
                            onClick={onAddPhone}
                            title={t('profile:phonesTitle')}
                        >
                            +
                        </button>
                    </div>
                ) : !readOnly && editingPhone === 'new' ? (
                    <div className={styles.edit_form}>
                        <div className={styles.form_group}>
                            <label>{t('profile:phoneType')}</label>
                            <select
                                value={phoneForm.type}
                                onChange={(e) => {
                                    const type = e.target.value as 'tj' | 'international';
                                    setPhoneForm({
                                        type,
                                        number: type === 'tj' ? '+992' : '+'
                                    });
                                }}
                            >
                                <option value="tj" disabled={phones.some(p => p.type === 'tj')}>
                                    {t('profile:phoneTypeTj')}
                                </option>
                                <option value="international" disabled={phones.some(p => p.type === 'international')}>
                                    {t('profile:phoneTypeIntTj')}
                                </option>
                            </select>
                        </div>
                        <div className={styles.form_group}>
                            <label>{t('profile:phoneNumber')}</label>
                            <input
                                type="tel"
                                placeholder={phoneForm.type === 'tj' ? '+992XXXXXXXXX' : '+XXXXXXXXXXX'}
                                value={phoneForm.number}
                                onChange={(e) => {
                                    let value = e.target.value;
                                    if (!value.startsWith('+')) value = '+' + value;
                                    if (phoneForm.type === 'tj' && !value.startsWith('+992')) {
                                        value = '+992';
                                    }
                                    setPhoneForm(prev => ({ ...prev, number: value }));
                                }}
                            />
                        </div>
                        <div className={styles.form_actions}>
                            <button
                                className={styles.save_button}
                                onClick={onEditPhoneSave}
                            >
                                {t('profile:addBtn')}
                            </button>
                            <button
                                className={styles.cancel_button}
                                onClick={onEditPhoneCancel}
                            >
                                {t('profile:cancelBtn')}
                            </button>
                        </div>
                    </div>
                ) : null}
            </div>
        </div>
    );
};
