import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import {MainPage} from '../../pages/main/ui/Main.tsx';
import Layout from "../layouts/Layout.tsx";
import FavoritesPage from "../../pages/favorites/FavoritesPage.tsx";
import Chat from "../../pages/chats/Chat.tsx";
import ProfilePage from "../../pages/profile/ProfilePage.tsx";
import EducationPage from "../../pages/education/EducationPage.tsx";
import ServicesPage from "../../pages/services/ServicesPage.tsx";
import CityPage from "../../pages/сityPage/CityPage.tsx";
import OrderPage from "../../pages/order/OrderPage.tsx";
import CreateAdPage from "../../pages/create-ad/CreateAdPage";
import OrderHistoryPage from "../../pages/OrderHistory/OrderHistoryPage";
import SearchServicePage from "../../pages/search/SearchServicePage";
import TicketsPage from "../../pages/tickets/TicketsPage";
import MasterProfileViewPage from "../../entities/MasterProfileViewPage/MasterProfileViewPage";
import ClientProfileViewPage from "../../entities/ClientProfileViewPage/ClientProfileViewPage.tsx";
import MyTickets from "../../pages/myTickets/MyTickets.tsx";
import CategoryTicketsPage from "../../pages/categoryTicketsPage/CategoryTicketsPage.tsx";
import EditServicePage from "../../pages/EditServicePage/EditServicePage.tsx";

const router = createBrowserRouter([
    {
        path: '/',
        element: <Layout />,
        children: [
            { index: true, element: <MainPage /> },
            { path: 'orders', element: <OrderHistoryPage /> },
            { path: 'search-service', element: <SearchServicePage /> },
            { path: 'favorites', element: <FavoritesPage /> },
            { path: 'chats', element: <Chat /> },
            { path: 'profile', element: <ProfilePage /> },
            { path: '/my-tickets', element: <MyTickets /> },
            { path: 'profile/education', element: <EducationPage /> },
            { path: 'profile/services', element: <ServicesPage /> }, //для Мастера
            { path: 'profile/city', element: <CityPage /> },
            { path: "/order/:id", element: <OrderPage /> },
            { path: 'create-ad', element: <CreateAdPage /> }, //для Клиента
            { path: 'tickets', element: <TicketsPage /> }, //для Мастера
            { path: 'master/:id', element: <MasterProfileViewPage /> },
            { path: 'client/:id', element: <ClientProfileViewPage /> },
            { path: 'category-tickets/:categoryId', element: <CategoryTicketsPage /> },
            { path: '/profile/services/edit', element: <EditServicePage /> },
            // { path: 'profile/work-area', element: <WorkAreaPage /> },
    //         { path: 'search', element: <SearchPage /> },
    //         { path: 'create-ad', element: <CreateAdPage /> },
        ],
    },
]);

export const AppRouter = () => {
    return <RouterProvider router={router} />;
};