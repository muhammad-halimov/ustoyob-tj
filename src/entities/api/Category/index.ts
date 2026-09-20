import type { ImageFields } from '../Misc';

/**
 * Category — основная категория тикета (бэк: App\Entity\Ticket\Category).
 * Не путать с Occupation (специальность/подкатегория).
 */
export interface Category extends ImageFields {
    id: string | number;
    title: string;
    description?: string;
    image?: string;
    priority?: number;
    slug?: string;
}
