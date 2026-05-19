import type { User } from '../../api';
import type { Occupation } from '../../api';
import type { SocialNetwork } from '../../api';
import type { Phone } from '../../api';
import type { Ticket } from '../../api';
import type { WorkExample } from '../../api';
import type { AddressFormData } from '../Address';
import type { EducationItem } from '../Education';

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
