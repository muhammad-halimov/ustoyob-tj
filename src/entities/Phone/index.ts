export interface Phone {
    id: string;
    number: string;
    type: 'tj' | 'international';
    main?: boolean;
}

export type PhoneType = 'tj' | 'international';