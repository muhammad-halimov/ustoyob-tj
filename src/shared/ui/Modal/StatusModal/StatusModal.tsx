import React from 'react';
import styles from './StatusModal.module.scss';

interface StatusModalProps {
    type: 'success' | 'error' | 'info';
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    message: string;
    buttonText?: string;
}

const StatusModal: React.FC<StatusModalProps> = ({
    type,
    isOpen,
    onClose,
    title,
    message,
    buttonText = 'Понятно'
}) => {
    if (!isOpen) return null;

    const getDefaultTitle = () => {
        switch (type) {
            case 'success':
                return 'Успешно!';
            case 'error':
                return 'Ошибка';
            case 'info':
                return 'Информация';
            default:
                return '';
        }
    };

    const getIconSrc = () => {
        switch (type) {
            case 'success':
                return '/uspeh.png';
            case 'error':
                return '/error.png';
            default:
                return null;
        }
    };

    const displayTitle = title || getDefaultTitle();
    const iconSrc = getIconSrc();

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={`${styles.modalContent} ${styles[type]}`} onClick={(e) => e.stopPropagation()}>
                <h2 className={styles.title}>{displayTitle}</h2>
                {iconSrc && (
                    <div className={styles.icon}>
                        <img src={iconSrc} alt={displayTitle} />
                    </div>
                )}
                <p className={styles.message}>{message}</p>
                <button className={styles.button} onClick={onClose}>
                    {buttonText}
                </button>
            </div>
        </div>
    );
};

export default StatusModal;
