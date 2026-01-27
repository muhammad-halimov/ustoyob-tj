import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import {MainPage} from '../../pages/main/ui/Main.tsx';
import Layout from "../layouts/Layout.tsx";
import FavoritesPage from "../../pages/favorites/FavoritesPage.tsx";
import Chat from "../../pages/chats/Chat.tsx";
import ProfilePage from "../../pages/profile/ProfilePage.tsx";
import EducationPage from "../../pages/education/EducationPage.tsx";
import ServicesPage from "../../pages/services/ServicesPage.tsx";
import AddressPage from "../../pages/addressPage/AddressPage.tsx";
import {OrderPage} from "../../pages/order/OrderPage.tsx";
import CreateAdPage from "../../pages/create-ad/CreateAdPage";
// import OrderHistoryPage from "../../pages/OrderHistory/OrderHistoryPage";
import SearchServicePage from "../../pages/search/SearchServicePage";
import TicketsPage from "../../pages/tickets/TicketsPage";
import MasterProfileViewPage from "../../entities/MasterProfileViewPage/MasterProfileViewPage";
import ClientProfileViewPage from "../../entities/ClientProfileViewPage/ClientProfileViewPage.tsx";
import MyTickets from "../../pages/myTickets/MyTickets.tsx";
import CategoryTicketsPage from "../../pages/categoryTicketsPage/CategoryTicketsPage.tsx";
import EditServicePage from "../../pages/editServicePage/EditServicePage.tsx";
import OAuthCallbackPage from "../../pages/OAuthPage/OAuthCallbackPage.tsx";
import GoogleOAuthPage from "../../pages/OAuthPage/GoogleOAuthPage.tsx";
import OAuthRedirectPage from "../../pages/OAuthPage/OAuthRedirectPage.tsx";
import TelegramCallbackPage from "../../pages/OAuthPage/TelegramCallbackPage.tsx";

const router = createBrowserRouter([
    {
        path: '/',
        element: <Layout />,
        children: [
            { index: true, element: <MainPage /> },
            // { path: 'orders', element: <OrderHistoryPage /> },
            { path: 'orders', element: <MyTickets /> },
            { path: 'search-service', element: <SearchServicePage /> },
            { path: 'favorites', element: <FavoritesPage /> },
            { path: 'chats', element: <Chat /> },
            { path: 'profile', element: <ProfilePage /> },
            // { path: 'my-tickets', element: <MyTickets /> },
            { path: 'profile/education', element: <EducationPage /> },
            { path: 'profile/services', element: <ServicesPage /> },
            { path: 'profile/address', element: <AddressPage /> },
            { path: 'order/:id', element: <OrderPage /> },
            { path: 'ticket/:id', element: <OrderPage /> },
            { path: 'create-ad', element: <CreateAdPage /> },
            { path: 'tickets', element: <TicketsPage /> },
            { path: 'master/:id', element: <MasterProfileViewPage /> },
            { path: 'client/:id', element: <ClientProfileViewPage /> },
            { path: 'category-tickets/:categoryId', element: <CategoryTicketsPage /> },
            { path: 'profile/services/edit', element: <EditServicePage /> },
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