export type UISocialNetwork = { id: string; network: string; handle: string };

export interface SocialNetworkConfig {
    label: string;
    icon: string;
    validate: (value: string) => boolean;
    format: (value: string) => string;
    generateUrl: (handle: string) => string;
    placeholder: string;
}
