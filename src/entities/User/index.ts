export interface User {
    id: number;
    email?: string;
    name?: string;
    surname?: string;
    patronymic?: string;
    fullName?: string;
    gender?: string;
    rating?: number;
    image?: string;
    avatar?: string | null;
    atHome?: boolean;
    canWorkRemotely?: boolean;
    roles?: string[];
    [key: string]: unknown;
}

export interface UserApiData extends User {
    occupation?: import('../Occupation').OccupationApiData[];
    education?: import('../Education').EducationApiData[];
    districts?: import('../Address').DistrictApiData[];
    addresses?: import('../Address').UserAddressApiData[];
    socialNetworks?: import('../SocialNetwork').SocialNetworkApiData[];
}

export interface ProfileData {
    id: string;
    fullName: string;
    email?: string;
    gender?: string;
    specialty: string;
    specialties: string[];
    rating: number;
    reviews: number;
    avatar: string | null;
    education: import('../Education').Education[];
    workExamples: import('../WorkExample').WorkExample[];
    workArea: string;
    addresses: import('../Address').Address[];
    canWorkRemotely: boolean;
    services: import('../Service').Service[];
    socialNetworks: import('../SocialNetwork').SocialNetwork[];
    phones: import('../Phone').Phone[];
}

export type UserRole = 'master' | 'client';