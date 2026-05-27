import { useTranslation } from 'react-i18next';
import { formatLocalizedDate, getTimeAgo } from '../utils/timeUtils';
import { useLangTransform } from './useTranslate';

/** Returns a localized "D Month YYYY" string, reactive to language changes. */
export const useFormattedDate = (dateString: string): string => {
    const { t } = useTranslation(['components']);
    return useLangTransform(dateString, (d) => formatLocalizedDate(d, t));
};

/** Returns a localized "time ago" string, reactive to language changes. */
export const useTimeAgo = (dateString: string): string => {
    const { t } = useTranslation(['components']);
    return useLangTransform(dateString, (d) => getTimeAgo(d, t));
};
