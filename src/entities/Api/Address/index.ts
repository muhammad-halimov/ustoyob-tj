// ─── Географические сущности (бэк: Geography\*) ─────────────
/** Province (oblast / viloyat). Top level of the address hierarchy. */
export interface Province {
    id: number;
    title: string;
    slug?: string;
    [key: string]: unknown;
}

/** City. Belongs to a Province; may have Suburbs. */
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

/** Suburb / mikrorayon of a City. */
export interface Suburb {
    id: number;
    title: string;
    slug?: string;
    city?: City;
    cityId?: number;
    [key: string]: unknown;
}

/** District (rayon). Belongs to a Province; contains Settlements and Communities. */
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
    settlement?: Settlement | string | null;
    community?: Community | null;
    village?: Village | null;
    [key: string]: unknown;
}