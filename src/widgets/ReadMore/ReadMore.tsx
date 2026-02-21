import { useState } from 'react';
import styles from './ReadMore.module.scss';

interface ReadMoreProps {
    text: string;
    maxLength?: number;
    /** Optional extra class applied to the text container */
    textClassName?: string;
    /** Optional extra class applied to the toggle button */
    buttonClassName?: string;
}

export function ReadMore({ text, maxLength = 150, textClassName, buttonClassName }: ReadMoreProps) {
    const [expanded, setExpanded] = useState(false);

    // Strip HTML tags
    const plain = text.replace(/<[^>]*>/g, '');

    if (plain.length <= maxLength) {
        return <div className={`${styles.text} ${textClassName || ''}`}>{plain}</div>;
    }

    return (
        <div>
            <div className={`${styles.text} ${textClassName || ''}`}>
                {expanded ? plain : `${plain.slice(0, maxLength)}...`}
            </div>
            <button
                className={`${styles.button} ${buttonClassName || ''}`}
                onClick={() => setExpanded(prev => !prev)}
            >
                {expanded ? 'Скрыть' : 'Читать дальше'}
            </button>
        </div>
    );
}
