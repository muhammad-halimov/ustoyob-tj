import styles from './PageLoader.module.scss';

interface PageLoaderProps {
    text?: string;
    fullPage?: boolean;
    overlay?: boolean;
}

const PageLoader = ({ text, fullPage = true, overlay = false }: PageLoaderProps) => {
    return (
        <div className={`${styles.container} ${!fullPage ? styles.inline : ''} ${overlay ? styles.overlay : ''}`}>
            <div className={styles.spinner} />
            {text && <p className={styles.text}>{text}</p>}
        </div>
    );
};

export default PageLoader;
