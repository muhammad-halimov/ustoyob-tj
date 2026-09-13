import type { ReactNode } from 'react';
import styles from './StepsNotice.module.scss';

export interface StepsNoticeStep {
    icon: ReactNode;
    text: string;
}

interface StepsNoticeProps {
    /**
     * Icons shown in the header badge row, each wrapped in a uniform circle. For a small
     * "connector" icon between two bigger ones (e.g. a swap arrow), pass it with
     * `className={styles.badgeConnector}` from this same module — see
     * InstagramProfessionalNotice for an example.
     */
    badgeIcons: ReactNode[];
    title: string;
    text: string;
    steps: StepsNoticeStep[];
    /** Action buttons rendered below the steps — each caller supplies its own (different callers use different button styles). */
    children?: ReactNode;
    className?: string;
}

/**
 * Generic "explain with icons + numbered steps" block: a header badge row, title, blurb,
 * and a step list with a small icon per row. Extracted from the Instagram
 * professional-account notice (see InstagramProfessionalNotice) so any other "here's how
 * this works" explainer (e.g. Main.tsx's "how to post a listing") can reuse the same
 * visual language instead of a bespoke layout each time.
 */
export function StepsNotice({ badgeIcons, title, text, steps, children, className }: StepsNoticeProps) {
    return (
        <div className={`${styles.notice} ${className ?? ''}`}>
            <div className={styles.badge}>
                {badgeIcons.map((icon, index) => <span key={index}>{icon}</span>)}
            </div>

            <h2>{title}</h2>
            <p className={styles.text}>{text}</p>

            <ol className={styles.steps}>
                {steps.map((step, index) => (
                    <li key={index}>
                        <span className={styles.stepIcon}>{step.icon}</span>
                        <span>{step.text}</span>
                    </li>
                ))}
            </ol>

            {children}
        </div>
    );
}

export default StepsNotice;
