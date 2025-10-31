import { Outlet } from 'react-router-dom';
import Header from "../../widgets/Header/Header.tsx";
// import Footer from "../../widgets/Footer/Footer.tsx";

export default function Layout() {
    return (
        <div className="app">
            <Header />
            <main>
                <Outlet />
            </main>
            {/*<Footer />*/}
        </div>
    );
};