import React, { useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { getAuthToken } from '../../../../../utils/auth';
import { Marquee } from '../../../../../shared/ui/Text/Marquee';
import { AuthBanner } from '../../../../../widgets/Banners/AuthBanner/AuthBanner';
import { ProfileSection } from '../ProfileSection';
import { EditActions } from '../EditActions/EditActions';
import styles from './SocialNetworksSection.module.scss';

interface SocialNetwork {
    id: string;
    network: string;
    handle: string;
}

interface AvailableSocialNetwork {
    id: number;
    network: string;
}

interface SocialNetworkConfig {
    label: string;
    icon: string;
    validate: (value: string) => boolean;
    format: (value: string) => string;
    generateUrl: (handle: string) => string;
    placeholder: string;
}

interface SocialNetworksSectionProps {
    socialNetworks: SocialNetwork[];
    editingSocialNetwork: string | null;
    socialNetworkEditValue: string;
    socialNetworkValidationError: string;
    showAddSocialNetwork: boolean;
    selectedNewNetwork: string;
    availableSocialNetworks: AvailableSocialNetwork[];
    SOCIAL_NETWORK_CONFIG: Record<string, SocialNetworkConfig>;
    readOnly?: boolean;
    setEditingSocialNetwork: (id: string | null) => void;
    setSocialNetworkEditValue: (value: string) => void;
    setSocialNetworkValidationError: (error: string) => void;
    setShowAddSocialNetwork: (show: boolean) => void;
    setSelectedNewNetwork: (network: string) => void;
    setSocialNetworks: React.Dispatch<React.SetStateAction<SocialNetwork[]>>;
    onUpdateSocialNetworks: (networks: SocialNetwork[]) => Promise<boolean>;
    onRemoveSocialNetwork: (networkId: string) => Promise<void>;
    onAddSocialNetwork: () => Promise<void>;
    onResetSocialNetworks: () => Promise<void>;
    onCopySocialNetwork: (handle: string) => Promise<void>;
    renderSocialIcon: (networkType: string) => React.ReactElement | null;
    getAvailableNetworks: () => AvailableSocialNetwork[];
    className?: string;
    onRefresh?: () => void;
    isLoading?: boolean;
    onLoginClick?: () => void;
}

export const SocialNetworksSection: React.FC<SocialNetworksSectionProps> = ({
    socialNetworks,
    editingSocialNetwork,
    socialNetworkEditValue,
    socialNetworkValidationError,
    showAddSocialNetwork,
    selectedNewNetwork,
    SOCIAL_NETWORK_CONFIG,
    readOnly = false,
    setEditingSocialNetwork,
    setSocialNetworkEditValue,
    setSocialNetworkValidationError,
    setShowAddSocialNetwork,
    setSelectedNewNetwork,
    setSocialNetworks,
    onUpdateSocialNetworks,
    onRemoveSocialNetwork,
    onAddSocialNetwork,
    onResetSocialNetworks,
    onCopySocialNetwork,
    renderSocialIcon,
    getAvailableNetworks,
    className,
    onRefresh,
    isLoading = false,
    onLoginClick,
}) => {
    const { t } = useTranslation(['profile']);

    const isAuthenticated = !!getAuthToken();
    const showAuthBanner = readOnly && !!onLoginClick && !isAuthenticated;

    const editingNetworkRef = useRef<HTMLDivElement>(null);
    const pendingEditIdRef = useRef<string | null>(null);

    const handleCancelEdit = () => {
        setEditingSocialNetwork(null);
        setSocialNetworkEditValue('');
        setSocialNetworkValidationError('');
    };

    const handleSaveEdit = async (networkId: string) => {
        const network = socialNetworks.find(n => n.id === networkId);
        if (!network) return;

        const trimmedValue = socialNetworkEditValue.trim();
        const config = SOCIAL_NETWORK_CONFIG[network.network];

        if (!trimmedValue) {
            setSocialNetworkValidationError(t('profile:fieldEmpty'));
            return;
        }

        if (config && !config.validate(trimmedValue)) {
            setSocialNetworkValidationError(t('profile:invalidFormat', { label: config.label }));
            return;
        }

        try {
            const formattedValue = config?.format(trimmedValue) || trimmedValue;
            const updatedNetworks = socialNetworks.map(n =>
                n.id === networkId ? { ...n, handle: formattedValue } : n
            );
            setSocialNetworks(updatedNetworks);
            const success = await onUpdateSocialNetworks(updatedNetworks);
            if (success) {
                setEditingSocialNetwork(null);
                setSocialNetworkEditValue('');
                setSocialNetworkValidationError('');
            } else {
                setSocialNetworkValidationError(t('profile:saveError'));
            }
        } catch (error) {
            console.error('Error saving social network:', error);
            setSocialNetworkValidationError(t('profile:saveError'));
        }
    };

    useEffect(() => {
        if (!editingSocialNetwork) return;
        pendingEditIdRef.current = editingSocialNetwork;
        const handleClickOutside = (e: MouseEvent) => {
            if (editingNetworkRef.current && !editingNetworkRef.current.contains(e.target as Node)) {
                const id = pendingEditIdRef.current;
                if (id) handleSaveEdit(id);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [editingSocialNetwork, socialNetworkEditValue]);

    const canAddNetwork = !readOnly && !showAuthBanner && getAvailableNetworks().length > 0 && !showAddSocialNetwork && !editingSocialNetwork;

    const editingId = editingSocialNetwork || (showAddSocialNetwork ? 'new-social' : null);

    return (
        <ProfileSection<SocialNetwork>
            title={t('profile:socialNetworksTitle')}
            items={showAuthBanner ? [] : socialNetworks}
            editingId={editingId}
            readOnly={readOnly}
            isLoading={showAuthBanner ? false : isLoading}
            hideEmpty={showAuthBanner}
            emptyTitle={readOnly ? t('profile:noSocialNetworks') : t('profile:addSocialNetworks')}
            onReorder={(reordered) => {
                setSocialNetworks(reordered);
                onUpdateSocialNetworks(reordered);
            }}
            onRefresh={showAuthBanner ? undefined : onRefresh}
            className={className}
            wrapNewFormAsItem={true}
            headerSlot={showAuthBanner ? (
                <AuthBanner onLoginClick={onLoginClick!} message={t('profile:loginToSeeSocialNetworks', 'Войдите, чтобы увидеть соц. сети')} />
            ) : undefined}
            renderViewItem={(network) => (
                <div className={styles.network_row}>
                    <div className={styles.social_network_icon}>
                        {renderSocialIcon(network.network)}
                    </div>
                    <div className={styles.social_network_info}>
                        <div className={styles.social_network_display}>
                            <div className={`${styles.social_network_handle} ${!network.handle ? styles.empty_handle : ''}`}>
                                {network.handle ? (
                                    <a
                                        href={SOCIAL_NETWORK_CONFIG[network.network]?.generateUrl(network.handle) || '#'}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={styles.handle_value_link}
                                    >
                                        <Marquee
                                            text={(['telegram', 'instagram'].includes(network.network) && !network.handle.startsWith('@'))
                                                ? `@${network.handle}`
                                                : network.handle}
                                            alwaysScroll
                                            duration={6}
                                        />
                                    </a>
                                ) : (
                                    <span className={styles.handle_placeholder}>
                                        {t('profile:notSpecified')}
                                    </span>
                                )}
                            </div>
                            {!readOnly && (
                                <div className={styles.list_item_actions}>
                                    {network.handle && (
                                        <button
                                            className={styles.copy_icon}
                                            onClick={() => onCopySocialNetwork(network.handle)}
                                            title={t('profile:copyBtn')}
                                        >
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                                <path d="M16 1H4C2.9 1 2 1.9 2 3V17H4V3H16V1ZM19 5H8C6.9 5 6 5.9 6 7V21C6 22.1 6.9 23 8 23H19C20.1 23 21 22.1 21 21V7C21 5.9 20.1 5 19 5ZM19 21H8V7H19V21Z" fill="#3A54DA"/>
                                            </svg>
                                        </button>
                                    )}
                                    <button
                                        className={styles.edit_icon}
                                        onClick={() => {
                                            setEditingSocialNetwork(network.id);
                                            setSocialNetworkEditValue(network.handle || '');
                                            setSocialNetworkValidationError('');
                                        }}
                                        title={t('profile:editBtn')}
                                    >
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                            <path d="M7.2302 20.59L2.4502 21.59L3.4502 16.81L17.8902 2.29001C18.1407 2.03889 18.4385 1.83982 18.7663 1.70424C19.0941 1.56865 19.4455 1.49925 19.8002 1.50001C20.5163 1.50001 21.203 1.78447 21.7094 2.29082C22.2157 2.79717 22.5002 3.48392 22.5002 4.20001C22.501 4.55474 22.4315 4.90611 22.296 5.23391C22.1604 5.56171 21.9613 5.85945 21.7102 6.11001L7.2302 20.59Z" stroke="#3A54DA" strokeWidth="2" strokeMiterlimit="10"/>
                                        </svg>
                                    </button>
                                    <button
                                        className={styles.delete_icon}
                                        onClick={() => {
                                            const label = SOCIAL_NETWORK_CONFIG[network.network]?.label || network.network;
                                            if (confirm(t('profile:deleteNetworkConfirm', { name: label }))) {
                                                onRemoveSocialNetwork(network.id);
                                            }
                                        }}
                                        title={t('profile:deleteNetworkTitle', { name: SOCIAL_NETWORK_CONFIG[network.network]?.label || network.network })}
                                    >
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                            <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" fill="#ff4444"/>
                                        </svg>
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
            renderEditItem={(network) => (
                <div className={styles.network_row}>
                    <div className={styles.social_network_icon}>
                        {renderSocialIcon(network.network)}
                    </div>
                    <div className={styles.social_network_info}>
                        <div className={styles.social_network_edit} ref={editingNetworkRef}>
                            <input
                                type="text"
                                value={socialNetworkEditValue}
                                placeholder={SOCIAL_NETWORK_CONFIG[network.network]?.placeholder || t('profile:enterContact')}
                                onChange={(e) => {
                                    setSocialNetworkEditValue(e.target.value);
                                    setSocialNetworkValidationError('');
                                }}
                                className={styles.social_input}
                                autoFocus
                            />
                            <EditActions
                                onSave={() => handleSaveEdit(network.id)}
                                onCancel={handleCancelEdit}
                                saveDisabled={!socialNetworkEditValue.trim()}
                            />
                            {socialNetworkValidationError && (
                                <div className={styles.validation_error}>
                                    {socialNetworkValidationError}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
            renderNewForm={() => (
                <div style={{ width: '100%' }}>
                    <div className={styles.social_network_select}>
                        <label>{t('profile:selectNetwork')}</label>
                        <select
                            value={selectedNewNetwork}
                            onChange={(e) => setSelectedNewNetwork(e.target.value)}
                        >
                            <option value="">{t('profile:selectPlaceholder')}</option>
                            {getAvailableNetworks().map((availableNetwork: AvailableSocialNetwork) => {
                                const config = SOCIAL_NETWORK_CONFIG[availableNetwork.network] || { label: availableNetwork.network, icon: '🌐' };
                                return (
                                    <option key={availableNetwork.id} value={availableNetwork.network}>
                                        {config.icon} {config.label}
                                    </option>
                                );
                            })}
                        </select>
                    </div>
                    <EditActions
                        onSave={onAddSocialNetwork}
                        onCancel={() => { setShowAddSocialNetwork(false); setSelectedNewNetwork(''); }}
                        saveDisabled={!selectedNewNetwork}
                    />
                </div>
            )}
            footerSlot={!readOnly && !showAuthBanner && !editingSocialNetwork && !showAddSocialNetwork && (socialNetworks.length > 0 || canAddNetwork) ? (
                <div className={styles.add_education_container}>
                    {socialNetworks.length > 0 && (
                        <button
                            onClick={onResetSocialNetworks}
                            className={styles.reset_social_btn}
                            title={t('profile:deleteAllNetworksTitle')}
                        >
                            {t('profile:deleteAllPhotos')}
                        </button>
                    )}
                    {canAddNetwork && (
                        <button
                            className={styles.add_btn}
                            onClick={() => setShowAddSocialNetwork(true)}
                            title={t('profile:addSocialNetworks')}
                        >
                            +
                        </button>
                    )}
                </div>
            ) : undefined}
        />
    );
};
