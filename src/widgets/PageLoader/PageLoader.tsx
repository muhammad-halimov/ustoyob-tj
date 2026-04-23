import styles from './PageLoader.module.scss';

interface PageLoaderProps {
    text?: string;
    fullPage?: boolean;
    overlay?: boolean;
    compact?: boolean;
    asSpan?: boolean;
}

const PageLoader = ({ text, fullPage = true, overlay = false, compact = false, asSpan = false }: PageLoaderProps) => {
    const className = `${styles.container} ${!fullPage ? styles.inline : ''} ${overlay ? styles.overlay : ''} ${compact ? styles.compact : ''}`;
    const spinnerClassName = `${styles.spinner} ${compact ? styles.spinnerCompact : ''}`;

    if (asSpan) {
        return (
            <span className={className}>
                <span className={spinnerClassName} />
                {text && <span className={styles.text}>{text}</span>}
            </span>
        );
    }

    return (
        <div className={className}>
            <div className={spinnerClassName} />
            {text && <p className={styles.text}>{text}</p>}
        </div>
    );
};

export default PageLoader;
