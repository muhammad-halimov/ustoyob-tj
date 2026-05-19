// ─── Формовая модель адреса (модель виджета выбора) ───────────
export interface AddressValueView {
    provinceId: number | null;
    cityId: number | null;
    suburbIds: number[];
    districtIds: number[];
    settlementId: number | null;
    communityId: number | null;
    villageId: number | null;
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
