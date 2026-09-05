import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {PageLoader} from "../../../../../widgets/PageLoader";
import styles from './EditActions.module.scss';

interface EditActionsProps {
    onSave: () => void | Promise<void>;
    onCancel: () => void;
    saveDisabled?: boolean;
    className?: string;
    /**
     * Когда EditActions стоит в одном ряду с соседними контролами (например, кнопкой
     * «Добавить» в форме специальности) вместо отдельной строки под полем — отключает
     * встроенный margin-top: 20px (он рассчитан только на второй случай, в первом он
     * тянет ✓/✕ вниз относительно соседей по ряду).
     */
    inline?: boolean;
}

export const EditActions: React.FC<EditActionsProps> = ({ onSave, onCancel, saveDisabled, className, inline = false }) => {
    const { t } = useTranslation('profile');
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        if (isSaving) return;
        setIsSaving(true);
        try {
            await onSave();
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className={`${styles.edit_actions}${inline ? ` ${styles.edit_actions_inline}` : ''}${className ? ` ${className}` : ''}`}>
            <button
                type="button"
                className={styles.save_btn}
                onClick={handleSave}
                disabled={saveDisabled || isSaving}
                title={t('saveBtn')}
            >
                {isSaving ? (
                    <PageLoader compact fullPage={false} />
                ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                        <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                )}
            </button>
            <button
                type="button"
                className={styles.cancel_btn}
                onClick={onCancel}
                disabled={isSaving}
                title={t('cancelBtn')}
            >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
            </button>
        </div>
    );
};
