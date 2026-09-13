import React from 'react';
import { PageLoader } from '../../../widgets/PageLoader';
import { Reset } from '../Button/Reset/Reset';
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
    /** Render delete all as the shared Reset button instead of the red button. Default: false */
    deleteAllAsReset?: boolean;
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
    deleteAllAsReset = false,
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
                deleteAllAsReset ? (
                    <Reset
                        label={deleteAllText ?? ''}
                        onClick={onDeleteAll}
                        disabled={disabled}
                        altIcon={(
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M3 6H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                <path d="M19 6L18.133 19.142C18.0971 19.6929 17.8544 20.2101 17.4535 20.5904C17.0526 20.9707 16.5233 21.1858 15.971 21.193H8.029C7.47667 21.1858 6.94744 20.9707 6.54651 20.5904C6.14558 20.2101 5.90289 19.6929 5.867 19.142L5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                <path d="M9 6V3.5C9 3.10218 9.15804 2.72064 9.43934 2.43934C9.72064 2.15804 10.1022 2 10.5 2H13.5C13.8978 2 14.2794 2.15804 14.5607 2.43934C14.842 2.72064 15 3.10218 15 3.5V6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                <path d="M10 11V16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                <path d="M14 11V16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                        )}
                    />
                ) : (
                    <button
                        className={deleteBtnClass}
                        onClick={onDeleteAll}
                        disabled={disabled}
                        title={deleteAllTitle}
                    >
                        {deleteAllText}
                    </button>
                )
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
