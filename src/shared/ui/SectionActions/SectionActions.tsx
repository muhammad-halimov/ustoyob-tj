import React from 'react';
import { PageLoader } from '../../../widgets/PageLoader';
import styles from './SectionActions.module.scss';

interface SectionActionsProps {
    /** Callback when add button (+) is clicked */
    onAdd: () => void;
    /** Callback when delete all button is clicked (optional) */
    onDeleteAll?: () => void;
    /** Show delete all button. Default: false */
    showDeleteAll?: boolean;
    /** Title attr for add button */
    addTitle?: string;
    /** Title attr for delete all button */
    deleteAllTitle?: string;
    /** Text inside delete all button */
    deleteAllText?: string;
    /** Disable all buttons */
    disabled?: boolean;
    /** Show loader instead of + icon */
    isLoading?: boolean;
    /** Button size. Default: 'sm' */
    size?: 'sm' | 'lg';
    /** Custom className for container */
    className?: string;
}

export const SectionActions: React.FC<SectionActionsProps> = ({
    onAdd,
    onDeleteAll,
    showDeleteAll = false,
    addTitle,
    deleteAllTitle,
    deleteAllText,
    disabled = false,
    isLoading = false,
    size = 'sm',
    className,
}) => {
    const addBtnClass = `${styles.add_btn} ${size === 'lg' ? styles.add_btn_lg : ''}`;
    const deleteBtnClass = `${styles.delete_all_btn} ${size === 'lg' ? styles.delete_all_btn_lg : ''}`;
    return (
        <div className={`${styles.actions_container} ${className || ''}`}>
            {showDeleteAll && onDeleteAll && (
                <button
                    className={deleteBtnClass}
                    onClick={onDeleteAll}
                    disabled={disabled}
                    title={deleteAllTitle}
                >
                    {deleteAllText}
                </button>
            )}
            <button
                className={addBtnClass}
                onClick={onAdd}
                disabled={disabled || isLoading}
                title={addTitle}
            >
                {isLoading ? <PageLoader compact /> : '+'}
            </button>
        </div>
    );
};
