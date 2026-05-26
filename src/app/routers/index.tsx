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

            // Legal pages
            { path: ROUTE_PATTERNS.PRIVACY_POLICY, element: <Legal /> },
            { path: ROUTE_PATTERNS.TERMS_OF_USE, element: <Legal /> },
            { path: ROUTE_PATTERNS.PUBLIC_OFFER, element: <Legal /> },
        ],
    },
    {
        path: ROUTE_PATTERNS.AUTH_GOOGLE,
        element: <OAuthRedirectPage />,
    },
    {
        path: ROUTE_PATTERNS.AUTH_GOOGLE_CALLBACK,
        element: <OAuthCallbackPage />,
    },
    {
        path: ROUTE_PATTERNS.AUTH_FACEBOOK,
        element: <OAuthRedirectPage />,
    },
    {
        path: ROUTE_PATTERNS.AUTH_FACEBOOK_CALLBACK,
        element: <OAuthCallbackPage />,
    },
    {
        path: ROUTE_PATTERNS.AUTH_INSTAGRAM,
        element: <OAuthRedirectPage />,
    },
    {
        path: ROUTE_PATTERNS.AUTH_INSTAGRAM_CALLBACK,
        element: <OAuthCallbackPage />,
    },
    {
        path: ROUTE_PATTERNS.AUTH_TELEGRAM_CALLBACK,
        element: <TelegramCallbackPage />,
    },
    {
        path: ROUTE_PATTERNS.CONFIRM_ACCOUNT,
        element: <ConfirmAccountPage />,
    },
]);

export const AppRouter = () => {
    return <RouterProvider router={router} />;
};