import type { Category } from '../Category';
import type { Occupation } from '../Occupation';
import type { Address } from '../Address';
import type { Image, Timestamps } from '../Misc';
import type { User } from '../User';
export type { Unit } from './Unit';
import type { Unit } from './Unit';

/**
 * Raw Ticket entity as returned by the backend (App\Entity\Ticket).
 * - `service: true`  — the ticket is an offer (master advertising services).
 * - `service: false` — the ticket is a request (client looking for a master).
 * - `budget`/`price` may both be present; UI typically uses `budget`.
 * - `images` and `ticketImages` overlap on some endpoints; prefer `images`.
 */
export type Ticket = {
    id: number;
    title: string;
    description?: string;
    notice?: string;
    budget?: number;
    price?: number;
    negotiableBudget?: boolean;
    unit?: Unit | string;
    service: boolean;
    active: boolean;
    urgent?: boolean;
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
