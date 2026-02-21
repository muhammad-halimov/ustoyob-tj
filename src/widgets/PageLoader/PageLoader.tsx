import styles from './PageLoader.module.scss';

interface PageLoaderProps {
    text?: string;
    fullPage?: boolean;
}

const PageLoader = ({ text, fullPage = true }: PageLoaderProps) => {
    return (
        <div className={`${styles.container} ${!fullPage ? styles.inline : ''}`}>
            <div className={styles.spinner} />
            {text && <p className={styles.text}>{text}</p>}
        </div>
    );
};

export default PageLoader;
