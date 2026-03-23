import React from 'react';
import styles from './Tabs.module.scss';

export interface TabItem<T extends string = string> {
    key: T;
    label: React.ReactNode;
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
                    {tab.label}
                </button>
            ))}
        </div>
    );
}

export default Tabs;
