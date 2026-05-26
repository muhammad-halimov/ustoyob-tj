import type { User } from '../../api';
import type { Occupation } from '../../api';
import type { SocialNetwork } from '../../api';
import type { Phone } from '../../api';
import type { Ticket } from '../../api';
import type { WorkExample } from '../../api';
import type { AddressFormData } from '../Address';
import type { EducationItem } from '../Education';

/**
 * Flattened profile data used by the Profile page.
 * Combines raw User fields with computed values (fullName, avatar URL, etc.)
 * that are resolved during profile fetch in Profile.tsx.
 */
export type ProfileData =
    Pick<User, 'id' | 'email' | 'gender' | 'dateOfBirth' | 'rating' | 'isOnline' | 'lastSeen'> & {
        fullName: string;
        specialties: Occupation[];
        reviews: number;
        avatar: string | null;
        education: EducationItem[];
        workExamples: WorkExample[];
        workArea: string;
        addresses: AddressFormData[];
        canWorkRemotely: boolean;
        services: Ticket[];
        socialNetworks: SocialNetwork[];
        phones: Phone[];
    };
