import React from 'react';
import { useTranslation } from 'react-i18next';
import AddressSelector from '../../../../../shared/ui/AddressSelector/AddressSelector';
import { AddressValue } from '../../../../../entities';
import styles from './WorkAreasSection.module.scss';

interface Address {
    id: string;
    displayText: string;
    addressValue: AddressValue;
}

interface WorkAreasSectionProps {
    addresses: Address[];
    canWorkRemotely: boolean;
    editingAddress: string | null;
    addressForm: AddressValue;
    readOnly?: boolean;
    userRole?: 'master' | 'client' | null;
    setAddressForm: (form: AddressValue) => void;
    onAddAddress: () => void;
    onEditAddressStart: (address: Address) => void;
    onEditAddressSave: () => Promise<void>;
    onEditAddressCancel: () => void;
    onDeleteAddress: (addressId: string) => Promise<void>;
    onCanWorkRemotelyToggle: () => Promise<void>;
}

export const WorkAreasSection: React.FC<WorkAreasSectionProps> = ({
    addresses,
    canWorkRemotely,
    editingAddress,
    addressForm,
    readOnly = false,
    userRole,
    setAddressForm,
    onAddAddress,
    onEditAddressStart,
    onEditAddressSave,
    onEditAddressCancel,
    onDeleteAddress,
    onCanWorkRemotelyToggle,
}) => {
    const { t } = useTranslation(['profile']);
    return (
        <div className={styles.section_item}>
            <h3>{userRole === 'client' ? t('profile:workAreasTitleClient') : t('profile:workAreasTitle')}</h3>

            {/* Переключатель удаленной работы - только для мастеров */}
            {userRole === 'master' && (
                <div className={styles.remote_work}>
                    <div className={styles.switch_container}>
                        <div className={styles.switch_label}>
                            <span className={styles.label_main}>{t('profile:remoteWork')}</span>
                            <span className={styles.label_sub}>{t('profile:remoteWorkSub')}</span>
                        </div>
                        <label className={styles.switch}>
                            <input
                                type="checkbox"
                                checked={canWorkRemotely}
                                onChange={readOnly ? undefined : onCanWorkRemotelyToggle}
                                disabled={readOnly}
                            />
                            <span className={styles.slider}></span>
                        </label>
                    </div>
                </div>
            )}

            <div className={styles.section_content}>
                {addresses && addresses.length > 0 ? (
                    addresses.map((address, index) => (
                        <div key={address.id} className={`${styles.list_item} ${index === addresses.length - 1 ? styles.list_item_last : ''}`}>
                            {editingAddress === address.id ? (
                                <div className={styles.edit_form}>
                                    <AddressSelector
                                        value={addressForm}
                                        onChange={setAddressForm}
                                        required={true}
                                        multipleSuburbs={true}
                                    />
                                    <div className={styles.form_actions}>
                                        <button
                                            className={styles.save_button}
                                            onClick={onEditAddressSave}
                                        >
                                            {t('profile:saveBtn')}
                                        </button>
                                        <button
                                            className={styles.cancel_button}
                                            onClick={onEditAddressCancel}
                                        >
                                            {t('profile:cancelBtn')}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className={styles.list_item_content}>
                                        <span className={styles.address_text}>
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ marginRight: '8px', flexShrink: 0 }}>
                                                <path d="M12 2C8.13 2 5 5.13 5 9C5 14.25 12 22 12 22C12 22 19 14.25 19 9C19 5.13 15.87 2 12 2ZM12 11.5C10.62 11.5 9.5 10.38 9.5 9C9.5 7.62 10.62 6.5 12 6.5C13.38 6.5 14.5 7.62 14.5 9C14.5 10.38 13.38 11.5 12 11.5Z" fill="#3A54DA"/>
                                            </svg>
                                            {address.displayText}
                                        </span>
                                    </div>
                                    {!readOnly && <div className={styles.list_item_actions}>
                                        <button
                                            className={styles.edit_icon}
                                            onClick={() => onEditAddressStart(address)}
                                            title={t('profile:editBtn')}
                                        >
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                                <path d="M7.2302 20.59L2.4502 21.59L3.4502 16.81L17.8902 2.29001C18.1407 2.03889 18.4385 1.83982 18.7663 1.70424C19.0941 1.56865 19.4455 1.49925 19.8002 1.50001C20.5163 1.50001 21.203 1.78447 21.7094 2.29082C22.2157 2.79717 22.5002 3.48392 22.5002 4.20001C22.501 4.55474 22.4315 4.90611 22.296 5.23391C22.1604 5.56171 21.9613 5.85945 21.7102 6.11001L7.2302 20.59Z" stroke="#3A54DA" strokeWidth="2" strokeMiterlimit="10"/>
                                            </svg>
                                        </button>
                                        <button
                                            className={styles.delete_icon}
                                            onClick={() => onDeleteAddress(address.id)}
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
                    ))
                ) : (
                    <div className={styles.empty_state}>
                        <span>{readOnly ? t('profile:noWorkAreas') : t('profile:addWorkArea')}</span>
                    </div>
                )}

                {/* Кнопка добавления нового адреса */}
                {!readOnly && !editingAddress && (
                    <div className={styles.add_education_container}>
                        <button
                            className={styles.add_button}
                            onClick={onAddAddress}
                            title={t('profile:addWorkArea')}
                        >
                            +
                        </button>
                    </div>
                )}

                {/* Форма добавления нового адреса */}
                {editingAddress && editingAddress.startsWith('new-') && (
                    <div className={styles.edit_form}>
                        <AddressSelector
                            value={addressForm}
                            onChange={setAddressForm}
                            required={true}
                            multipleSuburbs={true}
                        />
                        <div className={styles.form_actions}>
                            <button
                                className={styles.save_button}
                                onClick={onEditAddressSave}
                            >
                                {t('profile:addBtn')}
                            </button>
                            <button
                                className={styles.cancel_button}
                                onClick={onEditAddressCancel}
                            >
                                {t('profile:cancelBtn')}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
