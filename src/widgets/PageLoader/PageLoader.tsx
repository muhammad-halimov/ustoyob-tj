import styles from './PageLoader.module.scss';

/** Props for PageLoader. Most cases only need `text`. */
interface PageLoaderProps {
    text?: string;
    /** Fills the entire viewport height. Default: true. */
    fullPage?: boolean;
    /** Shows as a semi-transparent overlay above content. */
    overlay?: boolean;
    /** Renders a smaller spinner. */
    compact?: boolean;
    /** Renders the container as a `<span>` instead of `<div>` (inline usage). */
    asSpan?: boolean;
    /** Uses the primary (brand) colour. Default: true. */
    primary?: boolean;
}

/**
 * Spinner loading indicator.
 * Used throughout the app while async data is being fetched.
 */
const PageLoader = ({ text, fullPage = true, overlay = false, compact = false, asSpan = false, primary = true }: PageLoaderProps) => {
    const className = `${styles.container} ${primary ? styles.primary : ''} ${!fullPage ? styles.inline : ''} ${overlay ? styles.overlay : ''} ${compact ? styles.compact : ''}`;
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
