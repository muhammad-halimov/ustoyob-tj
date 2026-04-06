import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Marquee } from '../../../../../shared/ui/Text/Marquee';
import Address from '../../../../../shared/ui/Address/Selector/Address.tsx';
import { AddressValue } from '../../../../../entities';
import Status from '../../../../../shared/ui/Modal/Status';
import PageLoader from '../../../../../widgets/PageLoader/PageLoader';
import { ProfileSection } from '../ProfileSection';
import styles from './WorkAreasSection.module.scss';
import { EditActions } from '../EditActions/EditActions';

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
    onReorder?: (addresses: Address[]) => void;
    onRefresh?: () => void;
    isLoading?: boolean;
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
            await onEditAddressSave();
        } catch (err: unknown) {
            showError(err instanceof Error ? err.message : t('profile:addrSaveError'));
        }
    };

    const handleDelete = async (id: string) => {
        setDeletingId(id);
        try {
            await onDeleteAddress(id);
        } catch (err: unknown) {
            showError(err instanceof Error ? err.message : t('profile:addrDeleteError'));
        } finally {
            setDeletingId(null);
        }
    };

    const remoteToggleSlot = userRole === 'master' ? (
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
    ) : undefined;

    return (
        <>
            <Status type={statusType} isOpen={statusOpen} onClose={() => setStatusOpen(false)} message={statusMsg} />
            <ProfileSection<Address>
                title={userRole === 'client' ? t('profile:workAreasTitleClient') : t('profile:workAreasTitle')}
                items={addresses}
                editingId={editingAddress}
                readOnly={readOnly}
                isLoading={isLoading}
                emptyTitle={readOnly ? t('profile:noWorkAreas') : t('profile:addWorkArea')}
                onAdd={!readOnly ? onAddAddress : undefined}
                onReorder={onReorder}
                onRefresh={onRefresh}
                wrapNewFormAsItem={true}
                busyItemId={deletingId}
                headerSlot={remoteToggleSlot}
                renderViewItem={(address) => (
                    <>
                        <div className={styles.list_item_content}>
                            <div className={styles.address_text}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ marginRight: '8px', flexShrink: 0 }}>
                                    <path d="M12 2C8.13 2 5 5.13 5 9C5 14.25 12 22 12 22C12 22 19 14.25 19 9C19 5.13 15.87 2 12 2ZM12 11.5C10.62 11.5 9.5 10.38 9.5 9C9.5 7.62 10.62 6.5 12 6.5C13.38 6.5 14.5 7.62 14.5 9C14.5 10.38 13.38 11.5 12 11.5Z" fill="#3A54DA"/>
                                </svg>
                                <Marquee text={address.displayText} alwaysScroll />
                            </div>
                        </div>
                        {!readOnly && (
                            <div className={styles.list_item_actions}>
                                <button className={styles.edit_icon} onClick={() => onEditAddressStart(address)} title={t('profile:editBtn')}>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                        <path d="M7.2302 20.59L2.4502 21.59L3.4502 16.81L17.8902 2.29001C18.1407 2.03889 18.4385 1.83982 18.7663 1.70424C19.0941 1.56865 19.4455 1.49925 19.8002 1.50001C20.5163 1.50001 21.203 1.78447 21.7094 2.29082C22.2157 2.79717 22.5002 3.48392 22.5002 4.20001C22.501 4.55474 22.4315 4.90611 22.296 5.23391C22.1604 5.56171 21.9613 5.85945 21.7102 6.11001L7.2302 20.59Z" stroke="#3A54DA" strokeWidth="2" strokeMiterlimit="10"/>
                                    </svg>
                                </button>
                                <button className={styles.delete_icon} onClick={() => handleDelete(address.id)} disabled={deletingId === address.id} title={t('profile:deleteBtn')}>
                                    {deletingId === address.id
                                        ? <PageLoader compact fullPage={false} />
                                        : <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                            <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" fill="#ff4444"/>
                                        </svg>
                                    }
                                </button>
                            </div>
                        )}
                    </>
                )}
                renderEditItem={() => (
                    <div className={styles.edit_form}>
                        <Address value={addressForm} onChange={setAddressForm} required={true} />
                        <EditActions onSave={handleSave} onCancel={onEditAddressCancel} className={styles.edit_actions_geo} />
                    </div>
                )}
                renderNewForm={() => (
                    <div className={styles.edit_form}>
                        <Address value={addressForm} onChange={setAddressForm} required={true} />
                        <EditActions onSave={handleSave} onCancel={onEditAddressCancel} className={styles.edit_actions_geo} />
                    </div>
                )}
            />
        </>
    );
};
