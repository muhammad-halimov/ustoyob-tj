import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import MainPage  from '../../pages/main/ui/Main.tsx';
import Layout from "../layouts/Layout.tsx";
import FavoritesPage from "../../pages/favorites/FavoritesPage.tsx";

const router = createBrowserRouter([
    {
        path: '/',
        element: <Layout />,
        children: [
            { index: true, element: <MainPage /> },
    //         { path: 'orders', element: <OrdersPage /> },
            { path: 'favorites', element: <FavoritesPage /> },
    //         { path: 'chats', element: <ChatsPage /> },
    //         { path: 'profile', element: <ProfilePage /> },
    //         { path: 'search', element: <SearchPage /> },
    //         { path: 'create-ad', element: <CreateAdPage /> },
        ],
    },
]);

export const AppRouter = () => {
    return <RouterProvider router={router} />;
};