import { Capacitor, registerPlugin } from '@capacitor/core';

interface NativeCachePlugin {
    clearWebViewCache(): Promise<void>;
}

const NativeCache = registerPlugin<NativeCachePlugin>('NativeCache');

/** Clears the platform WebView/URLSession resource cache without touching cookies or app storage. */
export const clearNativeWebViewCache = async (): Promise<void> => {
    if (!Capacitor.isNativePlatform()) return;
    await NativeCache.clearWebViewCache();
};
