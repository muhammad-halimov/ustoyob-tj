import styles from './ShowMore.module.scss';

interface ShowMoreProps {
    expanded: boolean;
    onToggle: () => void;
    showMoreText: string;
    showLessText: string;
}

export const ShowMore = ({ expanded, onToggle, showMoreText, showLessText }: ShowMoreProps) => {
    return (
        <button className={styles.btn} onClick={onToggle}>
            {expanded ? showLessText : showMoreText}
            <span className={styles.icon}>
                {expanded ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                        <path d="M18 15l-6-6-6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                        <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                )}
            </span>
        </button>
    );
};
