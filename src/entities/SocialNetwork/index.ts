export interface SocialNetwork {
    id: string;
    network: string;
    handle: string;
}

export interface AvailableSocialNetwork {
    id: number;
    network: string;
}

export interface SocialNetworkConfig {
    label: string; 
    icon: string; 
    validate: (value: string) => boolean;
    format: (value: string) => string;
    generateUrl: (handle: string) => string;
    placeholder: string;
}

export interface SocialNetworkApiData {
    id?: number;
    network?: string;
    handle?: string;
    [key: string]: unknown;
}

export type SocialNetworkType = 
    | 'instagram'
    | 'telegram'
    | 'whatsapp'
    | 'facebook'
    | 'vk'
    | 'youtube'
    | 'site'
    | 'viber'
    | 'imo'
    | 'twitter'
    | 'linkedin'
    | 'google'
    | 'wechat';