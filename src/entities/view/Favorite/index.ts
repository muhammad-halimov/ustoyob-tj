import type { UserRole } from '../../../types/common';
import type { TicketView } from '../Ticket';
import type { Ticket, ResolvedImage } from '../../api';
import type { User } from '../../api';

export interface FavoriteEntry {
    id: string | number;
    type: 'user' | 'ticket';
    user: User | null;
    ticket: Ticket | null;
}

export type FavoriteTicketView =
    TicketView &
    Required<Pick<TicketView, 'authorId' | 'active' | 'status' | 'type'>> &
    Pick<Ticket, 'service'> & {
        entryId: string | number;
    };

export type FavoriteUserView =
    Pick<User, 'id' | 'reviewsCount' | 'gender' | 'isOnline' | 'lastSeen'> &
    Required<Pick<User, 'email' | 'name' | 'surname' | 'rating'>> & {
        entryId: string | number;
        image: string | null;
        /** Аватар с превью/BlurHash/откатом (resolveAvatar). */
        avatarImage?: ResolvedImage | null;
        role: UserRole;
        specialties: string[];
    };
