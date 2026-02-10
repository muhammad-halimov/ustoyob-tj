import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import {MainPage} from '../../pages/main/ui/Main.tsx';
import Layout from "../layouts/Layout.tsx";
import Favorites from "../../pages/favorites/Favorites.tsx";
import Chat from "../../pages/chats/Chat.tsx";
import Profile from "../../pages/profile/Profile.tsx";
import {Ticket} from "../../pages/tickets/ticket/Ticket.tsx";
import Create from "../../pages/tickets/create/Create.tsx";
import MyTickets from "../../pages/tickets/my/MyTickets.tsx";
import Category from "../../pages/tickets/category/Category.tsx";
import Edit from "../../pages/tickets/edit/Edit.tsx";
import OAuthCallbackPage from "../../pages/OAuth/OAuthCallbackPage.tsx";
import GoogleOAuthPage from "../../pages/OAuth/GoogleOAuthPage.tsx";
import OAuthRedirectPage from "../../pages/OAuth/OAuthRedirectPage.tsx";
import TelegramCallbackPage from "../../pages/OAuth/TelegramCallbackPage.tsx";

const router = createBrowserRouter([
    {
        path: '/',
        element: <Layout />,
        children: [
            { index: true, element: <MainPage /> },
            { path: 'my-tickets', element: <MyTickets /> },
            { path: 'favorites', element: <Favorites /> },
            { path: 'chats', element: <Chat /> },
            
            // Универсальный Profile: /profile - приватный ЛК, /profile/:id - публичный профиль (мастер/клиент)
            { path: 'profile', element: <Profile /> },
            { path: 'profile/:id', element: <Profile /> },

            { path: 'ticket/:id', element: <Ticket /> },
            { path: 'create-ticket', element: <Create /> },
            { path: 'edit-ticket', element: <Edit /> },

            { path: 'category-tickets/:id', element: <Category /> },
        ],
    },
    {
        path: '/auth/google',
        element: <GoogleOAuthPage />,
    },
    {
        path: '/auth/google/callback',
        element: <GoogleOAuthPage />,
    },
    {
        path: '/auth/facebook',
        element: <OAuthRedirectPage />,
    },
    {
        path: '/auth/facebook/callback',
        element: <OAuthCallbackPage />,
    },
    {
        path: '/auth/instagram',
        element: <OAuthRedirectPage />,
    },
    {
        path: '/auth/instagram/callback',
        element: <OAuthCallbackPage />,
    },
    {
        path: '/auth/telegram/callback',
        element: <TelegramCallbackPage />,
    },
]);

export const AppRouter = () => {
    return <RouterProvider router={router} />;
};