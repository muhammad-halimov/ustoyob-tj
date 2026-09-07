import type { TicketView } from '../Ticket';

export type FilterState =
    Pick<TicketView, 'category'> &
    Required<Pick<TicketView, 'subcategory' | 'city'>> & {
        minPrice: string;
        maxPrice: string;
        negotiablePrice: boolean;
        rating: string;
        reviewCount: string;
        sortBy: string;
        province: string;
    };

export interface LocalStorageFavorites {
    tickets: (string | number)[];
    masters?: (string | number)[];
    users?: (string | number)[];
}
