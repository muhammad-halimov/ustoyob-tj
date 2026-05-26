import type { Category } from '../Category';

/**
 * Occupation / specialty (App\Entity\Occupation).
 * Acts as a sub-category under a Category.
 * `categories` is included only on detail endpoints.
 */
export interface Occupation {
    id: number;
    title: string;
    description?: string;
    slug?: string;
    image?: string | null;
    priority?: number;
    categories?: Category[];
    [key: string]: unknown;
}
