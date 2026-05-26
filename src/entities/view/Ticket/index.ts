import type { UserRole } from '../../../types/common';
import type { Ticket } from '../../api';

/**
 * UI representation of a ticket used by all list and detail components.
 * Produced by `ticketToTicketView()` in apiHelper.ts.
 * Detail-page-only fields (rating, notice, etc.) are injected by Ticket.tsx
 * via a spread after the base mapping.
 */
export interface TicketView {
    id: number;
    title: string;
    price: number;
    unit: string;
    description: string;
    address: string;
    date: string;
    author: string;
    timeAgo: string;
    category: string;
    fullAddress?: string;
    city?: string;
    subcategory?: string;
    type?: UserRole;
    status?: string;
    master?: string;
    authorId?: number;
    masterId?: number;
    isInSelectedCity?: boolean;
    active?: boolean;
    userRating?: number;
    userReviewCount?: number;
    responsesCount?: number;
    viewsCount?: number;
    photos?: string[];
    authorImage?: string;
    negotiableBudget?: boolean;
    // Detail-page fields (injected in Ticket.tsx)
    rating?: number;
    categoryId?: number;
    notice?: string;
    isService?: boolean;
    additionalComments?: string;
    hasEducation?: boolean;
    displayedUserRole?: UserRole;
}

/** Form state for create/edit ticket — budget is string (input field); id absent when creating */
export type TicketFormData =
    Pick<Ticket, 'title' | 'unit'> &
    Required<Pick<Ticket, 'description' | 'notice'>> & {
        id?: number;
        budget: string; // string input — Ticket.budget is number
    };
