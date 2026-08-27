import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import styles from '../CriteriaFilter/SortingFilter.module.scss';
import { Reset } from '../../../shared/ui/Button/Reset/Reset';
import type { TechSupportSortOrder } from '../../../types/common';

export interface TechSupportFilterOption {
    value: string;
    label: string;
}

interface TechSupportSortingFilterProps {
    sortOrder: TechSupportSortOrder;
    filterReason: string;
    filterStatus: string;
    filterPriority: string;
    reasonOptions: TechSupportFilterOption[];
    statusOptions: TechSupportFilterOption[];
    priorityOptions: TechSupportFilterOption[];
    onSortChange: (value: TechSupportSortOrder) => void;
    onReasonChange: (value: string) => void;
    onStatusChange: (value: string) => void;
    onPriorityChange: (value: string) => void;
}

/**
 * Collapsible sort/filter panel for the Tech Support "my tickets" table.
 * Same chrome as widgets/Sorting/CriteriaFilter/SortingFilter (shares its CSS module) —
 * a separate component because the criteria are domain-specific (reason/status/priority
 * instead of price/rating/reviews) and don't fit SortingFilter's fixed field set.
 */
export const TechSupportSortingFilter = ({
    sortOrder,
    filterReason,
    filterStatus,
    filterPriority,
    reasonOptions,
    statusOptions,
    priorityOptions,
    onSortChange,
    onReasonChange,
    onStatusChange,
    onPriorityChange,
}: TechSupportSortingFilterProps) => {
    const { t } = useTranslation('techSupport');
    const [open, setOpen] = useState(false);

    const handleReset = () => {
        onSortChange('newest');
        onReasonChange('');
        onStatusChange('');
        onPriorityChange('');
    };

    return (
        <div className={styles.sort_filter_block}>
            <button className={styles.toggle_btn} onClick={() => setOpen(v => !v)} type="button">
                <span>{t('myTickets.filters.toggle')}</span>
                <span className={styles.toggle_icon}>{open ? '▽' : '▷'}</span>
            </button>
            {open && (
                <div className={styles.sort_filter_items}>
                    <div className={styles.sort_filter_item}>
                        <label htmlFor="ts-sort">{t('myTickets.filters.sort')}</label>
                        <select
                            id="ts-sort"
                            value={sortOrder}
                            onChange={e => onSortChange(e.target.value as TechSupportSortOrder)}
                            className={styles.select}
                        >
                            <option value="newest">{t('myTickets.filters.sortNewest')}</option>
                            <option value="oldest">{t('myTickets.filters.sortOldest')}</option>
                        </select>
                    </div>

                    <div className={styles.sort_filter_item}>
                        <label htmlFor="ts-category">{t('myTickets.filters.category')}</label>
                        <select
                            id="ts-category"
                            value={filterReason}
                            onChange={e => onReasonChange(e.target.value)}
                            className={styles.select}
                        >
                            {reasonOptions.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                    </div>

                    <div className={styles.sort_filter_item}>
                        <label htmlFor="ts-status">{t('myTickets.filters.status')}</label>
                        <select
                            id="ts-status"
                            value={filterStatus}
                            onChange={e => onStatusChange(e.target.value)}
                            className={styles.select}
                        >
                            {statusOptions.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                    </div>

                    <div className={styles.sort_filter_item}>
                        <label htmlFor="ts-priority">{t('myTickets.filters.priority')}</label>
                        <select
                            id="ts-priority"
                            value={filterPriority}
                            onChange={e => onPriorityChange(e.target.value)}
                            className={styles.select}
                        >
                            {priorityOptions.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                    </div>

                    <div className={styles.sort_filter_footer}>
                        <Reset label={t('myTickets.resetFilters')} onClick={handleReset} />
                    </div>
                </div>
            )}
        </div>
    );
};
