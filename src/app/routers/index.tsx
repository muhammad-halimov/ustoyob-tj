import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import {MainPage} from '../../pages/main/main/Main.tsx';
import Layout from "../layouts/Layout.tsx";
import Favorites from "../../pages/favorites/Favorites.tsx";
import Chat from "../../pages/chats/Chat.tsx";
import Profile from "../../pages/profile/Profile.tsx";
import {Ticket} from "../../pages/tickets/ticket/Ticket.tsx";
import CreateEdit from "../../pages/tickets/crud/CreateEdit.tsx";
import MyTickets from "../../pages/tickets/me/MyTickets.tsx";
import Category from "../../pages/tickets/category/Category.tsx";
import OAuthCallbackPage from "../../pages/OAuth/OAuthCallbackPage.tsx";
import GoogleOAuthPage from "../../pages/OAuth/GoogleOAuthPage.tsx";
import OAuthRedirectPage from "../../pages/OAuth/OAuthRedirectPage.tsx";
import TelegramCallbackPage from "../../pages/OAuth/TelegramCallbackPage.tsx";
import { Legal } from "../../pages/legal";
import { ROUTE_PATTERNS } from './routes';

const router = createBrowserRouter([
    {
        path: ROUTE_PATTERNS.HOME,
        element: <Layout />,
        children: [
            // Main pages
            { index: true, element: <MainPage /> },
            { path: ROUTE_PATTERNS.FAVORITES, element: <Favorites /> },
            { path: ROUTE_PATTERNS.CHATS, element: <Chat /> },
            
            // Универсальный Profile: /profile - приватный ЛК, /profile/:id - публичный профиль (мастер/клиент)
            { path: ROUTE_PATTERNS.PROFILE, element: <Profile /> },
            { path: ROUTE_PATTERNS.PROFILE_BY_ID, element: <Profile /> },

            // Ticket pages
            { path: ROUTE_PATTERNS.TICKET_BY_ID, element: <Ticket /> },
            { path: ROUTE_PATTERNS.MY_TICKETS, element: <MyTickets /> },
            { path: ROUTE_PATTERNS.CREATE_TICKET, element: <CreateEdit /> },
            { path: ROUTE_PATTERNS.EDIT_TICKET, element: <CreateEdit /> },
            { path: ROUTE_PATTERNS.CATEGORY_TICKETS, element: <Category /> },

            // Legal pages
            { path: ROUTE_PATTERNS.PRIVACY_POLICY, element: <Legal /> },
            { path: ROUTE_PATTERNS.TERMS_OF_USE, element: <Legal /> },
            { path: ROUTE_PATTERNS.PUBLIC_OFFER, element: <Legal /> },
        ],
    },
    {
        path: ROUTE_PATTERNS.AUTH_GOOGLE,
        element: <GoogleOAuthPage />,
    },
    {
        path: ROUTE_PATTERNS.AUTH_GOOGLE_CALLBACK,
        element: <GoogleOAuthPage />,
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
]);

export const AppRouter = () => {
    return <RouterProvider router={router} />;
};