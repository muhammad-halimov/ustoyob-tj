import React from 'react';
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
}) => {
    return (
        <div className={styles.section_item}>
            <h3>Социальные сети</h3>
            <div className={styles.section_content}>
                <div className={styles.social_networks}>
                    {socialNetworks.length === 0 && (
                        <div className={styles.empty_social_networks}>
                            <span>{readOnly ? 'Социальные сети не указаны' : 'Добавьте социальные сети'}</span>
                        </div>
                    )}

                    {socialNetworks.map(network => (
                        <div key={network.id} className={styles.social_network_item}>
                            <div className={styles.social_network_icon}>
                                {renderSocialIcon(network.network)}
                            </div>
                            <div className={styles.social_network_info}>
                                <span className={styles.social_network_name}>
                                    {SOCIAL_NETWORK_CONFIG[network.network]?.label || network.network}
                                </span>
                                {editingSocialNetwork === network.id ? (
                                    <div className={styles.social_network_edit}>
                                        <input
                                            type="text"
                                            value={socialNetworkEditValue}
                                            placeholder={SOCIAL_NETWORK_CONFIG[network.network]?.placeholder || 'Введите контактные данные'}
                                            onChange={(e) => {
                                                setSocialNetworkEditValue(e.target.value);
                                                setSocialNetworkValidationError('');
                                            }}
                                            className={styles.social_input}
                                            autoFocus
                                        />
                                        <div className={styles.social_edit_buttons}>
                                            <button
                                                className={styles.save_social_btn}
                                                onClick={async () => {
                                                    const trimmedValue = socialNetworkEditValue.trim();
                                                    const config = SOCIAL_NETWORK_CONFIG[network.network];
                                                    
                                                    if (!trimmedValue) {
                                                        setSocialNetworkValidationError('Поле не может быть пустым');
                                                        return;
                                                    }

                                                    if (config && !config.validate(trimmedValue)) {
                                                        setSocialNetworkValidationError(`Неверный формат для ${config.label}`);
                                                        return;
                                                    }

                                                    try {
                                                        const formattedValue = config?.format(trimmedValue) || trimmedValue;
                                                        const updatedNetworks = socialNetworks.map(n =>
                                                            n.id === network.id
                                                                ? { ...n, handle: formattedValue }
                                                                : n
                                                        );
                                                        setSocialNetworks(updatedNetworks);
                                                        const success = await onUpdateSocialNetworks(updatedNetworks);
                                                        if (success) {
                                                            setEditingSocialNetwork(null);
                                                            setSocialNetworkEditValue('');
                                                            setSocialNetworkValidationError('');
                                                        } else {
                                                            setSocialNetworkValidationError('Ошибка при сохранении');
                                                        }
                                                    } catch (error) {
                                                        console.error('Error saving social network:', error);
                                                        setSocialNetworkValidationError('Ошибка при сохранении');
                                                    }
                                                }}
                                                title="Сохранить"
                                                disabled={!socialNetworkEditValue.trim()}
                                            >
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                                                    <path d="M20.285 2l-11.285 11.567-5.286-5.011-3.714 3.716 9 8.728 15-15.285z"/>
                                                </svg>
                                            </button>
                                        </div>
                                        {socialNetworkValidationError && (
                                            <div className={styles.validation_error}>
                                                {socialNetworkValidationError}
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className={styles.social_network_display}>
                                        <div className={`${styles.social_network_handle} ${!network.handle ? styles.empty_handle : ''}`}>
                                            {network.handle ? (
                                                <a 
                                                    href={SOCIAL_NETWORK_CONFIG[network.network]?.generateUrl(network.handle) || '#'}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className={styles.handle_value_link}
                                                >
                                                    {(['telegram', 'instagram'].includes(network.network) && !network.handle.startsWith('@'))
                                                        ? `@${network.handle}`
                                                        : network.handle}
                                                </a>
                                            ) : (
                                                <span className={styles.handle_placeholder}>
                                                    Не указано
                                                </span>
                                            )}
                                        </div>
                                        {!readOnly && <div className={styles.list_item_actions}>
                                            {network.handle && (
                                                <button
                                                    className={styles.copy_icon}
                                                    onClick={() => onCopySocialNetwork(network.handle)}
                                                    title="Копировать"
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
                                                title="Редактировать"
                                            >
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                                    <path d="M7.2302 20.59L2.4502 21.59L3.4502 16.81L17.8902 2.29001C18.1407 2.03889 18.4385 1.83982 18.7663 1.70424C19.0941 1.56865 19.4455 1.49925 19.8002 1.50001C20.5163 1.50001 21.203 1.78447 21.7094 2.29082C22.2157 2.79717 22.5002 3.48392 22.5002 4.20001C22.501 4.55474 22.4315 4.90611 22.296 5.23391C22.1604 5.56171 21.9613 5.85945 21.7102 6.11001L7.2302 20.59Z" stroke="#3A54DA" strokeWidth="2" strokeMiterlimit="10"/>
                                                </svg>
                                            </button>
                                            <button
                                                className={styles.delete_icon}
                                                onClick={() => {
                                                    if (confirm(`Удалить ${SOCIAL_NETWORK_CONFIG[network.network]?.label || network.network}?`)) {
                                                        onRemoveSocialNetwork(network.id);
                                                    }
                                                }}
                                                title={`Удалить ${SOCIAL_NETWORK_CONFIG[network.network]?.label || network.network}`}
                                            >
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                                    <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" fill="#ff4444"/>
                                                </svg>
                                            </button>
                                        </div>}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}

                    {/* Кнопки управления социальными сетями */}
                    {!readOnly && !showAddSocialNetwork && (getAvailableNetworks().length > 0 || socialNetworks.length > 0) && (
                        <div className={styles.add_education_container}>
                            {socialNetworks.length > 0 && (
                                <button
                                    onClick={onResetSocialNetworks}
                                    className={styles.reset_social_btn}
                                    title="Удалить все социальные сети"
                                >
                                    Удалить все
                                </button>
                            )}
                            {getAvailableNetworks().length > 0 && (
                                <button
                                    className={styles.add_button}
                                    onClick={() => setShowAddSocialNetwork(true)}
                                    title="Добавить социальную сеть"
                                >
                                    +
                                </button>
                            )}
                        </div>
                    )}

                    {/* Интерфейс добавления новой социальной сети */}
                    {showAddSocialNetwork && (
                        <div className={styles.add_social_network_form}>
                            <h4>Добавить социальную сеть</h4>
                            <div className={styles.social_network_select}>
                                <label>Выберите социальную сеть:</label>
                                <select
                                    value={selectedNewNetwork}
                                    onChange={(e) => setSelectedNewNetwork(e.target.value)}
                                >
                                    <option value="">-- Выберите --</option>
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
                            <div className={styles.add_social_buttons}>
                                <button
                                    onClick={onAddSocialNetwork}
                                    disabled={!selectedNewNetwork}
                                    className={styles.confirm_add_btn}
                                >
                                    Добавить
                                </button>
                                <button
                                    onClick={() => {
                                        setShowAddSocialNetwork(false);
                                        setSelectedNewNetwork('');
                                    }}
                                    className={styles.cancel_add_btn}
                                >
                                    Отмена
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
