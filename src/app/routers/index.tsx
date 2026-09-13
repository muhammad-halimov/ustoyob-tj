import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import {MainPage} from '../../pages/main/main/Main';
import Layout from "../layouts/Layout";
import Favorites from "../../pages/favorites/Favorites";
import Chat from "../../pages/chats/Chat";
import Profile from "../../pages/profile/Profile";
import {Ticket} from "../../pages/tickets/ticket/Ticket";
import CreateEdit from "../../pages/tickets/crud/CreateEdit";
import MyTickets from "../../pages/tickets/me/MyTickets";
import Category from "../../pages/tickets/category/Category";
import OAuthCallbackPage from "../../pages/OAuth/OAuthCallbackPage";
import OAuthRedirectPage from "../../pages/OAuth/OAuthRedirectPage";
import TelegramCallbackPage from "../../pages/OAuth/TelegramCallbackPage";
import { Legal } from "../../pages/legal";
import ConfirmAccountPage from "../../pages/auth/ConfirmAccountPage";
import NotFound from "../../pages/notFound/NotFound";
import RouteErrorBoundary from "../../pages/errorBoundary/RouteErrorBoundary";
import { ROUTE_PATTERNS } from './routes';

/**
 * Application router.
 * All page routes are nested under the shared `Layout` component.
 * OAuth and auth confirmation routes live outside the layout (full-page redirects).
 * Add new pages by inserting entries into the `children` array
 * and importing the component at the top of this file.
 */
const router = createBrowserRouter([
    {
        path: ROUTE_PATTERNS.HOME,
        element: <Layout />,
        // Только на проде: без errorElement необработанная ошибка рендера в любой
        // дочерней странице падает в дефолтный фолбэк react-router — "💿 Hey developer"
        // с сырым стектрейсом, который в деве как раз и нужен для отладки. На проде это
        // должен увидеть не разработчик, а пользователь — значит человеческий экран.
        errorElement: import.meta.env.PROD ? <RouteErrorBoundary /> : undefined,
        children: [
            // Main pages
            { index: true, element: <MainPage /> },
            { path: ROUTE_PATTERNS.FAVORITES, element: <Favorites /> },
            { path: ROUTE_PATTERNS.CHATS, element: <Chat /> },
            
            // Универсальный Profile: /profile - приватный ЛК, /profile/:id - публичный профиль (специалист/закказчик)
            { path: ROUTE_PATTERNS.PROFILE, element: <Profile /> },
            { path: ROUTE_PATTERNS.PROFILE_BY_ID, element: <Profile /> },

            // Ticket pages
            { path: ROUTE_PATTERNS.TICKET_BY_ID, element: <Ticket /> },
            { path: ROUTE_PATTERNS.MY_TICKETS, element: <MyTickets /> },
            { path: ROUTE_PATTERNS.CREATE_TICKET, element: <CreateEdit /> },
            { path: ROUTE_PATTERNS.EDIT_TICKET, element: <CreateEdit /> },
            { path: ROUTE_PATTERNS.CATEGORY_TICKETS_BY_ID, element: <Category /> },

            // Legal + support pages (shared Tabs layout)
            { path: ROUTE_PATTERNS.PRIVACY_POLICY, element: <Legal /> },
            { path: ROUTE_PATTERNS.TERMS_OF_USE, element: <Legal /> },
            { path: ROUTE_PATTERNS.PUBLIC_OFFER, element: <Legal /> },
            { path: ROUTE_PATTERNS.TECH_SUPPORT, element: <Legal /> },

            // 404 — держим последним, чтобы не перехватывать реальные роуты выше
            { path: ROUTE_PATTERNS.NOT_FOUND, element: <NotFound /> },
        ],
    },
    // Эти роуты — отдельные top-level записи без общего родителя с Layout, так что
    // errorElement там выше не действует — каждой нужен свой (см. комментарий у Layout).
    {
        path: ROUTE_PATTERNS.AUTH_GOOGLE,
        element: <OAuthRedirectPage />,
        errorElement: import.meta.env.PROD ? <RouteErrorBoundary /> : undefined,
    },
    {
        path: ROUTE_PATTERNS.AUTH_GOOGLE_CALLBACK,
        element: <OAuthCallbackPage />,
        errorElement: import.meta.env.PROD ? <RouteErrorBoundary /> : undefined,
    },
    {
        path: ROUTE_PATTERNS.AUTH_FACEBOOK,
        element: <OAuthRedirectPage />,
        errorElement: import.meta.env.PROD ? <RouteErrorBoundary /> : undefined,
    },
    {
        path: ROUTE_PATTERNS.AUTH_FACEBOOK_CALLBACK,
        element: <OAuthCallbackPage />,
        errorElement: import.meta.env.PROD ? <RouteErrorBoundary /> : undefined,
    },
    {
        path: ROUTE_PATTERNS.AUTH_INSTAGRAM,
        element: <OAuthRedirectPage />,
        errorElement: import.meta.env.PROD ? <RouteErrorBoundary /> : undefined,
    },
    {
        path: ROUTE_PATTERNS.AUTH_INSTAGRAM_CALLBACK,
        element: <OAuthCallbackPage />,
        errorElement: import.meta.env.PROD ? <RouteErrorBoundary /> : undefined,
    },
    {
        path: ROUTE_PATTERNS.AUTH_TELEGRAM_CALLBACK,
        element: <TelegramCallbackPage />,
        errorElement: import.meta.env.PROD ? <RouteErrorBoundary /> : undefined,
    },
    {
        path: ROUTE_PATTERNS.CONFIRM_ACCOUNT,
        element: <ConfirmAccountPage />,
        errorElement: import.meta.env.PROD ? <RouteErrorBoundary /> : undefined,
    },
]);

export const AppRouter = () => {
    return <RouterProvider router={router} />;
};