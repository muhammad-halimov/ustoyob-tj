import type { Image, Timestamps } from '../Misc';
import type { User } from '../User';
import type { Ticket } from '../Ticket';

/**
 * Review entity (App\Entity\Review).
 * - `type` distinguishes who left the review ('client_to_master' | 'master_to_client').
 * - `Timestamps<true>` means the backend returns ISO strings for createdAt/updatedAt.
 */
export type Review = {
    id: number;
    title?: string;
    description: string;
    rating: number;
    type?: string;
    master?: User;
    client?: User;
    services?: { id: number; title: string };
    ticket?: Ticket;
    images: Image[];
    vacation?: string;
    worker?: string;
    date?: string;
} & Timestamps<true>;
