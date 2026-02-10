export interface AddressValue {
    provinceId: number | null;
    cityId: number | null;
    suburbIds: number[];
    districtIds: number[];
    settlementId: number | null;
    communityId: number | null;
    villageId: number | null;
}

export interface AddressData {
    province?: string;
    city?: string;
    suburb?: string;
    district?: string;
    settlement?: string;
    community?: string;
    village?: string;
}

export interface Address {
    id: string;
    displayText: string;
    addressValue: AddressValue;
}

export interface Province {
    id: number;
    title: string;
    slug?: string;
    [key: string]: unknown;
}

export interface City {
    id: number;
    title: string;
    slug?: string;
    province?: Province;
    provinceId?: number;
    [key: string]: unknown;
}

export interface Suburb {
    id: number;
    title: string;
    slug?: string;
    city?: City;
    cityId?: number;
    [key: string]: unknown;
}

export interface District {
    id: number;
    title?: string;
    slug?: string;
    city?: City;
    cityId?: number;
    [key: string]: unknown;
}

export interface Settlement {
    id: number;
    title: string;
    slug?: string;
    [key: string]: unknown;
}

export interface Community {
    id: number;
    title: string;
    slug?: string;
    [key: string]: unknown;
}

export interface Village {
    id: number;
    title: string;
    slug?: string;
    [key: string]: unknown;
}

// API форматы для адресов
export interface UserAddressApiData {
    id: number;
    suburb?: string | { id?: number; title: string };
    district?: string | { id?: number; title: string };
    city?: string | { id?: number; title: string };
    province?: string | { id?: number; title: string };
    settlement?: string | { id?: number; title: string };
    community?: string | { id?: number; title: string };
    village?: string | { id?: number; title: string };
    [key: string]: unknown;
}

export interface DistrictApiData {
    id: number;
    title?: string;
    city?: {
        id: number;
        title?: string;
        [key: string]: unknown;
    };
    [key: string]: unknown;
}