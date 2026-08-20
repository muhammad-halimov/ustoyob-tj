import type { Category } from '../Category';

export interface Occupation {
    id: number;
    title: string;
    description?: string;
    slug?: string;
    image?: string | null;
    priority?: number;
    // API_REFERENCE.md §4: was `categories: Category[]` (many-to-many) — now a real
    // one-to-many, a subcategory belongs to exactly one category. `Category.occupations`
    // (the reverse side) is unaffected, still an array.
    category?: Category | null;
    [key: string]: unknown;
}
