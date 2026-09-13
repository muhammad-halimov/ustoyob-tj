import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import styles from '../CriteriaFilter/SortingFilter.module.scss';
import { Reset } from '../../../shared/ui/Button/Reset/Reset';
import { SelectSearch } from '../../../shared/ui/SelectSearch';
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
                        <label>{t('myTickets.filters.sort')}</label>
                        <SelectSearch
                            noSearch
                            hideClear
                            value={sortOrder}
                            onChange={value => onSortChange(value as TechSupportSortOrder)}
                            options={[
                                { value: 'newest', label: t('myTickets.filters.sortNewest') },
                                { value: 'oldest', label: t('myTickets.filters.sortOldest') },
                            ]}
                        />
                    </div>

                    <div className={styles.sort_filter_item}>
                        <label>{t('myTickets.filters.category')}</label>
                        <SelectSearch
                            hideClear
                            value={filterReason}
                            onChange={value => onReasonChange(value)}
                            options={reasonOptions}
                        />
                    </div>

                    <div className={styles.sort_filter_item}>
                        <label>{t('myTickets.filters.status')}</label>
                        <SelectSearch
                            noSearch
                            hideClear
                            value={filterStatus}
                            onChange={value => onStatusChange(value)}
                            options={statusOptions}
                        />
                    </div>

                    <div className={styles.sort_filter_item}>
                        <label>{t('myTickets.filters.priority')}</label>
                        <SelectSearch
                            noSearch
                            hideClear
                            value={filterPriority}
                            onChange={value => onPriorityChange(value)}
                            options={priorityOptions}
                        />
                    </div>

                    <div className={styles.sort_filter_footer}>
                        <Reset label={t('myTickets.resetFilters')} onClick={handleReset} />
                    </div>
                </div>
            )}
        </div>
    );
};
