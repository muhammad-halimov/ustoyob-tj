import type { UserRole } from '../../../types/common';
import type { TicketView } from '../Ticket';
import type { Ticket } from '../../api';
import type { User } from '../../api';

export interface FavoriteEntry {
    id: number;
    type: 'user' | 'ticket';
    user: User | null;
    ticket: Ticket | null;
}

export type FavoriteTicketView =
    TicketView &
    Required<Pick<TicketView, 'authorId' | 'active' | 'status' | 'type'>> &
    Pick<Ticket, 'service'> & {
        entryId: number;
    };

export type FavoriteUserView =
    Pick<User, 'id' | 'reviewsCount' | 'gender' | 'isOnline' | 'lastSeen'> &
    Required<Pick<User, 'email' | 'name' | 'surname' | 'rating'>> & {
        entryId: number;
        image: string | null;
        role: UserRole;
        specialties: string[];
    };
