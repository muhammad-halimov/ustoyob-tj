import type { Category } from '../Category';

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
