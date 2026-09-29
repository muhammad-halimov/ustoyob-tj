import { useEffect, useState } from 'react';
import { getStorageJSON, setStorageJSON } from '../utils/storageUtils';

/**
 * useState, подкреплённый localStorage — переживает переход на другую страницу и обратно, в
 * отличие от обычного useState, который сбрасывается при размонтировании компонента (типичный
 * кейс: раскрыл "Показать ещё", перешёл на страницу тикета, вернулся назад — список должен
 * остаться раскрытым, а не собраться в исходное состояние).
 * Раньше было на sessionStorage (переживало только "туда-сюда по страницам в одной вкладке", не
 * полную перезагрузку) — но в мобильной (Capacitor) сборке переключение вкладок нижней навигации
 * сбрасывает JS-модули так же, как hard reload, и sessionStorage вместе с ними (тот же эффект, что
 * был у getCategories в dataCacheUtils, см. её persistKey). localStorage этому не подвержен — цена
 * в том, что состояние теперь переживает и полную перезагрузку/новый визит, а не только сессию.
 */
export function usePersistedState<T>(key: string, defaultValue: T) {
    const [state, setState] = useState<T>(() => {
        const stored = getStorageJSON<T>(key);
        return stored !== null && stored !== undefined ? stored : defaultValue;
    });

    useEffect(() => {
        setStorageJSON(key, state);
    }, [key, state]);

    return [state, setState] as const;
}
