/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Network } from '@capacitor/network';

/**
 * NetworkContext — tracks real device connectivity via the Capacitor Network plugin.
 *
 * `navigator.onLine`/`window.addEventListener('online'|'offline')` alone is unreliable
 * inside a WebView (it often only reflects whether *some* interface is up, not whether
 * requests can actually reach the internet, and behaves inconsistently across Android
 * WebView versions). The Network plugin talks to the native connectivity APIs on both
 * Android and iOS and falls back to `navigator.onLine` automatically when running in a
 * plain browser (e.g. `npm run dev`), so this works the same way everywhere.
 */
interface NetworkContextType {
    isOnline: boolean;
    /** Forces an immediate re-check instead of waiting for the next OS network event. */
    checkNow: () => Promise<void>;
}

const NetworkContext = createContext<NetworkContextType | undefined>(undefined);

interface NetworkProviderProps {
    children: ReactNode;
}

export function NetworkProvider({ children }: NetworkProviderProps) {
    // Предполагаем, что сеть есть, пока не пришёл первый реальный статус — чтобы
    // при старте приложения на долю секунды не мелькал экран "нет интернета".
    const [isOnline, setIsOnline] = useState(true);

    const checkNow = async () => {
        try {
            const status = await Network.getStatus();
            setIsOnline(status.connected);
        } catch {
            // Plugin unavailable — считаем, что сеть есть, чтобы не блокировать приложение.
            setIsOnline(true);
        }
    };

    useEffect(() => {
        checkNow();

        const listenerPromise = Network.addListener('networkStatusChange', (status) => {
            setIsOnline(status.connected);
        });

        return () => {
            listenerPromise.then((listener) => listener.remove());
        };
    }, []);

    return (
        <NetworkContext.Provider value={{ isOnline, checkNow }}>
            {children}
        </NetworkContext.Provider>
    );
}

/** Returns the network context. Must be used inside <NetworkProvider>. */
export function useNetwork() {
    const context = useContext(NetworkContext);
    if (context === undefined) {
        throw new Error('useNetwork must be used within a NetworkProvider');
    }
    return context;
}
