// ─── Географические сущности (бэк: Geography\*) ─────────────
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
    image?: string;
    suburbs?: Suburb[];
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
    province?: Province;
    image?: string;
    settlements?: Settlement[];
    communities?: Community[];
    [key: string]: unknown;
}

export interface Settlement {
    id: number;
    title: string;
    slug?: string;
    village?: Village[];
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

// ─── Адрес (бэк: App\Entity\Geography\Abstract\Address) ────────────────
export interface Address {
    id: number;
    title?: string;
    province?: Province | null;
    city?: City | null;
    suburb?: Suburb | null;
    district?: District | null;
    settlement?: Settlement | null;
    community?: Community | null;
    village?: Village | null;
    [key: string]: unknown;
}