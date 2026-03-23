import React from 'react';
import styles from './Tabs.module.scss';
import { Marquee } from '../Text/Marquee/Marquee';

export interface TabItem<T extends string = string> {
    key: T;
    label: React.ReactNode;
    icon?: React.ReactNode;
}

interface TabsProps<T extends string = string> {
    tabs: TabItem<T>[];
    activeTab: T;
    onChange: (key: T) => void;
    variant?: 'underline' | 'pill';
    className?: string;
}

export function Tabs<T extends string = string>({
    tabs,
    activeTab,
    onChange,
    variant = 'underline',
    className,
}: TabsProps<T>) {
    return (
        <div
            className={[
                styles.tabs,
                variant === 'pill' ? styles.tabs_pill : styles.tabs_underline,
                className,
            ]
                .filter(Boolean)
                .join(' ')}
        >
            {tabs.map((tab) => (
                <button
                    key={tab.key}
                    type="button"
                    className={`${styles.tab}${activeTab === tab.key ? ` ${styles.active}` : ''}`}
                    onClick={() => onChange(tab.key)}
                >
                    {(tab.icon || typeof tab.label === 'string') ? (
                        <span className={styles.tab_content}>
                            {tab.icon && tab.icon}
                            {typeof tab.label === 'string'
                                ? <span className={styles.tab_marquee_wrapper}><Marquee text={tab.label} alwaysScroll/></span>
                                : tab.label}
                        </span>
                    ) : tab.label}
                </button>
            ))}
        </div>
    );
}

export default Tabs;
