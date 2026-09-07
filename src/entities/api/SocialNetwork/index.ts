export interface SocialNetwork {
    id: string | number;
    network: string;
    handle: string;
}

export interface AvailableSocialNetwork {
    id: string | number;
    network: string;
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
