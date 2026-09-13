import type { ReactNode } from 'react';
import { Clear } from '../../Button/Clear/Clear';
import styles from './InfoModal.module.scss';

interface InfoModalProps {
    isOpen: boolean;
    onClose: () => void;
    children: ReactNode;
}

/**
 * Bare overlay + centered content shell for one-off informational modals (illustrated
 * explainers, etc.) that don't need the Auth modal's multi-screen wizard machinery — just
 * an X button and a click-outside-to-close overlay. Content (icons/steps/etc.) is the
 * caller's responsibility; StepsNotice is the usual choice.
 */
export function InfoModal({ isOpen, onClose, children }: InfoModalProps) {
    if (!isOpen) return null;

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.content} onClick={(e) => e.stopPropagation()}>
                <Clear className={styles.closeButton} onClick={onClose} />
                {children}
            </div>
        </div>
    );
}

export default InfoModal;
