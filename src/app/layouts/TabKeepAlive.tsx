/**
 * Keep-alive для вкладок нижней навигации — только нативная (Capacitor) сборка, сайт не затронут.
 *
 * Как «сайт» ведёт себя сейчас: уход с вкладки размонтирует страницу, возврат монтирует заново —
 * список чатов/ленты перерисовывается и грузится с нуля. Здесь вкладки (Главная, Избранное, Чаты,
 * Профиль) монтируются при первом заходе и дальше только прячутся:
 *  - React 19.2 `<Activity mode="hidden">` сохраняет состояние и DOM (в т.ч. прокрутку внутренних
 *    блоков), а эффекты скрытой вкладки останавливает (Mercure/SSE, поллинг, таймеры) и запускает
 *    снова при показе — фоновые вкладки не жгут батарею и трафик;
 *  - скрытой вкладке подставляется замороженный router-location (`UNSAFE_LocationContext`):
 *    иначе её `useSearchParams`/`useLocation` начали бы реагировать на чужие маршруты;
 *  - прокрутка window запоминается отдельно для каждой вкладки и восстанавливается при возврате.
 * Остальные маршруты (тикет, категория, создание, legal, чужой профиль) рендерятся через <Outlet/>
 * поверх, как и раньше; сами роуты вкладок в нативной сборке отдают null (см. keepAliveTabs.ts).
 */
import { Activity, useContext, useEffect, useLayoutEffect, useRef, useState, type ComponentType } from 'react';
import { UNSAFE_LocationContext, useLocation } from 'react-router-dom';
import { MainPage } from '../../pages/main/main/Main';
import Favorites from '../../pages/favorites/Favorites';
import Chat from '../../pages/chats/Chat';
import Profile from '../../pages/profile/Profile';
import { ROUTES } from '../routers/routes';
import { KEEP_ALIVE, TAB_PATHS, findTab } from './keepAliveTabs';

const PAGES: Record<string, ComponentType> = {
    [ROUTES.HOME]: MainPage,
    [ROUTES.FAVORITES]: Favorites,
    [ROUTES.CHATS]: Chat,
    [ROUTES.PROFILE]: Profile,
};

const TABS = TAB_PATHS.map(path => ({ path, Page: PAGES[path] }));

export function TabKeepAlive() {
    const { pathname } = useLocation();
    const liveLocation = useContext(UNSAFE_LocationContext);
    const active = KEEP_ALIVE ? findTab(pathname) : null;

    const [visited, setVisited] = useState<string[]>(() => (active ? [active] : []));
    if (active && !visited.includes(active)) setVisited(prev => [...prev, active]);

    // Выход без перезагрузки страницы (handleUnauthorized: 401 и не удалось обновить токен) — скрытые
    // вкладки держали бы чаты/профиль прежнего пользователя. Размонтируем всё и монтируем заново
    // только текущую вкладку (новый key). Обычный выход и вход и так перезагружают страницу.
    const [generation, setGeneration] = useState(0);
    const activeForReset = useRef(active);
    activeForReset.current = active;
    useEffect(() => {
        if (!KEEP_ALIVE) return;
        const onLogout = () => {
            const current = activeForReset.current;
            setVisited(current ? [current] : []);
            setGeneration(g => g + 1);
        };
        window.addEventListener('logout', onLogout);
        return () => window.removeEventListener('logout', onLogout);
    }, []);

    // Последний location, с которым вкладка была активна — его и видит вкладка, пока скрыта.
    const frozen = useRef(new Map<string, typeof liveLocation>());
    if (active) frozen.current.set(active, liveLocation);

    // Прокрутка window по вкладкам. Пишем на каждый scroll активной вкладки; при смене вкладки
    // читаем уже записанное (а не текущий scrollY — его браузер успевает «прижать», когда
    // предыдущая вкладка скрылась и документ стал короче).
    const scrollByTab = useRef(new Map<string, number>());
    const activeRef = useRef<string | null>(active);
    activeRef.current = active;

    useLayoutEffect(() => {
        if (!KEEP_ALIVE) return;
        const onScroll = () => {
            if (activeRef.current) scrollByTab.current.set(activeRef.current, window.scrollY);
        };
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    useLayoutEffect(() => {
        if (!active) return;
        window.scrollTo({ top: scrollByTab.current.get(active) ?? 0, behavior: 'instant' });
    }, [active]);

    // Открытая вкладка — атрибутом на <html> (`data-native-tab="/chats"`): стилям экрана, которым нужна
    // именно видимая вкладка, — скрытые вкладки остаются в DOM (см. native.scss, переписка в чатах).
    useLayoutEffect(() => {
        if (KEEP_ALIVE) document.documentElement.dataset.nativeTab = active ?? '';
    }, [active]);

    // Повторное нажатие на уже открытую вкладку в нижней панели (переход на тот же адрес — новый
    // location.key при том же пути и параметрах) — как в нативных приложениях: плавно наверх. И окно,
    // и собственные прокручиваемые блоки вкладки (например, список чатов со своим скроллом).
    const containerByTab = useRef(new Map<string, HTMLDivElement | null>());
    const prevLocation = useRef(liveLocation.location);
    useEffect(() => {
        const prev = prevLocation.current;
        const cur = liveLocation.location;
        prevLocation.current = cur;
        if (!active || prev.key === cur.key) return;
        if (prev.pathname !== cur.pathname || prev.search !== cur.search) return;
        window.scrollTo({ top: 0, behavior: 'smooth' });
        scrollByTab.current.set(active, 0);
        const root = containerByTab.current.get(active);
        root?.querySelectorAll<HTMLElement>('*').forEach(el => {
            if (el.scrollTop <= 0) return;
            const overflowY = getComputedStyle(el).overflowY;
            if (overflowY === 'auto' || overflowY === 'scroll') el.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }, [liveLocation.location, active]);

    if (!KEEP_ALIVE) return null;

    return (
        <>
            {TABS.filter(t => visited.includes(t.path)).map(({ path, Page }) => {
                const isActive = active === path;
                return (
                    <Activity key={`${path}:${generation}`} mode={isActive ? 'visible' : 'hidden'}>
                        <UNSAFE_LocationContext.Provider value={isActive ? liveLocation : frozen.current.get(path) ?? liveLocation}>
                            <div ref={el => { containerByTab.current.set(path, el); }} style={{ display: 'contents' }}>
                                <Page />
                            </div>
                        </UNSAFE_LocationContext.Provider>
                    </Activity>
                );
            })}
        </>
    );
}
