import { useEffect, useState } from 'react';
import { getSessionJSON, setSessionJSON } from '../utils/storageUtils';

/**
 * useState, подкреплённый sessionStorage — переживает переход на другую страницу и обратно (в
 * пределах вкладки/сессии), в отличие от обычного useState, который сбрасывается при
 * размонтировании компонента (типичный кейс: раскрыл "Показать ещё", перешёл на страницу тикета,
 * вернулся назад — список должен остаться раскрытым, а не собраться в исходное состояние).
 * Не переживает полную перезагрузку страницы/новую вкладку — для этого нужен был бы localStorage,
 * а не sessionStorage, но здесь это осознанный выбор: "туда-сюда по страницам" в одной сессии, не
 * бессрочная память на любом устройстве.
 */
export function usePersistedState<T>(key: string, defaultValue: T) {
    const [state, setState] = useState<T>(() => {
        const stored = getSessionJSON<T>(key);
        return stored !== null && stored !== undefined ? stored : defaultValue;
    });

    useEffect(() => {
        setSessionJSON(key, state);
    }, [key, state]);

    return [state, setState] as const;
}
