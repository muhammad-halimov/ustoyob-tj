import styles from './PageLoader.module.scss';

interface PageLoaderProps {
    text?: string;
    fullPage?: boolean;
    overlay?: boolean;
    compact?: boolean;
}

const PageLoader = ({ text, fullPage = true, overlay = false, compact = false }: PageLoaderProps) => {
    return (
        <div className={`${styles.container} ${!fullPage ? styles.inline : ''} ${overlay ? styles.overlay : ''} ${compact ? styles.compact : ''}`}>
            <div className={`${styles.spinner} ${compact ? styles.spinnerCompact : ''}`} />
            {text && <p className={styles.text}>{text}</p>}
        </div>
    );
};

export default PageLoader;
