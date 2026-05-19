// ─── Телефон (бэк: App\Entity\User\Phone) ────────────────────
export interface Phone {
    id: number;
    phone?: string;
    countryCode?: string;
    main?: boolean;
    verified?: boolean;
}