// ─── Формовая модель адреса (модель виджета выбора) ───────────
export interface AddressValueView {
    provinceId: string | number | null;
    cityId: string | number | null;
    suburbIds: (string | number)[];
    districtIds: (string | number)[];
    settlementId: string | number | null;
    communityId: string | number | null;
    villageId: string | number | null;
}

export interface AddressDataView {
    province?: string;
    city?: string;
    suburb?: string;
    district?: string;
    settlement?: string;
    community?: string;
    village?: string;
}

/** Формовое состояние виджета выбора адреса */
export interface AddressFormData {
    id: string;
    displayText: string;
    addressValue: AddressValueView;
}
