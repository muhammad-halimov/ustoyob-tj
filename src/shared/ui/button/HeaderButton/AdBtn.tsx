import styles from './AdBtn.module.scss';

interface AdBtnProps {
    text?: string;
}

export const AdBtn =    ({ text = "Разместить объявление" }: AdBtnProps)=>  {
    return (
        <button className={styles.btn}>
            {text}
        </button>
    );
}
