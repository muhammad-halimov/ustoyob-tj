import styles from './Toggle.module.scss';

interface ToggleProps {
    checked: boolean;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    label?: string;
    disabled?: boolean;
    className?: string;
}

export function Toggle({ checked, onChange, label, disabled, className }: ToggleProps) {
    return (
        <div className={`${styles.toggle_wrapper} ${className ?? ''}`}>
            <label className={styles.switch}>
                <input
                    type="checkbox"
                    checked={checked}
                    onChange={onChange}
                    disabled={disabled}
                />
                <span className={styles.slider} />
            </label>
            {label && <span className={styles.toggle_label}>{label}</span>}
        </div>
    );
}
