import type { Category } from '../Category';
import type { Occupation } from '../Occupation';
import type { Address } from '../Address';
import type { Image, Timestamps } from '../Misc';
import type { User } from '../User';
export type { Unit } from './Unit';
import type { Unit } from './Unit';

export type Ticket = {
    id: string | number;
    title: string;
    /** Decorative, non-persisted transliteration of `title` (e.g. "Ремонт крана" →
     * "remont-krana") — not an identifier, backend never resolves anything from it.
     * For nicer share/SEO urls: put it in the query string (`?slug=`), never the path. */
    slug?: string;
    description?: string;
    notice?: string;
    budget?: number;
    price?: number;
    negotiableBudget?: boolean;
    unit?: Unit | string;
    service: boolean;
    active: boolean;
    /** Read-only — admin-gated public visibility. See API_REFERENCE.md §4. */
    approved?: boolean;
    /** Read-only, EasyAdmin-only (ROLE_SUPER_ADMIN) — never writable via this API. See API_REFERENCE.md §4. */
    banned?: boolean;
    urgent?: boolean;
    /** Manual sort order for a master's own service listings (drag-reorder on the profile page). */
    priority?: number;
    viewsCount?: number;
    responsesCount?: number;
    reviewsCount?: number;
    author?: User;
    master?: User;
    images?: Image[];
    ticketImages?: Image[];
    category?: Category;
    subcategory?: Occupation;
    address?: string;
    addresses?: Address[];
    isFavorite?: boolean;
} & Timestamps;
