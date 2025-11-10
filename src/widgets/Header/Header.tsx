import styles from "./Header.module.scss";
import {AdBtn} from "../../shared/ui/button/HeaderButton/AdBtn.tsx";
import {EnterBtn} from "../../shared/ui/button/HeaderButton/EnterBtn.tsx";
import {Link, useLocation} from "react-router-dom";
import { useState } from "react";
import { getAuthToken } from "../../utils/auth";

function Header() {
    const location = useLocation();
    const [showAuthModal, setShowAuthModal] = useState(false);

    const getActivePage = () => {
        switch (location.pathname) {
            case "/":
            case "/orders":
                return "orders";
            case "/favorites":
                return "favorites";
            case "/chats":
                return "chats";
            case "/profile":
                return "profile";
            default:
                return "orders";
        }
    };

    const isActivePage = getActivePage();
    const isAuthenticated = !!getAuthToken();

    const handleProfileClick = (e: React.MouseEvent) => {
        if (!isAuthenticated) {
            e.preventDefault();
            setShowAuthModal(true);
        }
    };

    const handleEnterBtnClick = () => {
        setShowAuthModal(true);
    };

    const closeAuthModal = () => {
        setShowAuthModal(false);
    };

    return (
        <header className={styles.header}>
            <div className={styles.header_top}>
                <div className={styles.headerWrap}>
                    <div className={styles.locate}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <g clipPath="url(#clip0_324_1115)">
                                <g clipPath="url(#clip1_324_1115)">
                                    <path d="M19.6404 9.14C19.6404 15.82 12.0004 22.5 12.0004 22.5C12.0004 22.5 4.36035 15.82 4.36035 9.14C4.36035 7.11375 5.16528 5.17048 6.59806 3.7377C8.03083 2.30493 9.9741 1.5 12.0004 1.5C14.0266 1.5 15.9699 2.30493 17.4026 3.7377C18.8354 5.17048 19.6404 7.11375 19.6404 9.14Z" stroke="#3A54DA" strokeWidth="2" strokeMiterlimit="10"/>
                                    <path d="M12.0006 11.9998C13.5802 11.9998 14.8606 10.7193 14.8606 9.13979C14.8606 7.56025 13.5802 6.27979 12.0006 6.27979C10.4211 6.27979 9.14062 7.56025 9.14062 9.13979C9.14062 10.7193 10.4211 11.9998 12.0006 11.9998Z" stroke="#3A54DA" strokeWidth="2" strokeMiterlimit="10"/>
                                </g>
                            </g>
                            <defs>
                                <clipPath id="clip0_324_1115">
                                    <rect width="24" height="24" fill="white"/>
                                </clipPath>
                                <clipPath id="clip1_324_1115">
                                    <rect width="24" height="24" fill="white"/>
                                </clipPath>
                            </defs>
                        </svg>
                        <span className={styles.locate_title}>Ижевск</span>
                    </div>
                    <div className={styles.rightPart}>
                        <div className={styles.rightPart_lang}>
                            <div className={styles.rightPart_lang__box}>
                                <svg
                                    width="46"
                                    height="32"
                                    viewBox="0 0 46 32"
                                    fill="none"
                                    xmlns="http://www.w3.org/2000/svg"
                                    xmlnsXlink="http://www.w3.org/1999/xlink"
                                >
                                    <rect width="46" height="32" fill="url(#pattern0_324_1123)" />
                                    <defs>
                                        <pattern
                                            id="pattern0_324_1123"
                                            patternContentUnits="objectBoundingBox"
                                            width="1"
                                            height="1"
                                        >
                                            <use
                                                xlinkHref="#image0_324_1123"
                                                transform="matrix(0.00444444 0 0 0.00638889 0 -0.0111111)"
                                            />
                                        </pattern>
                                        <image
                                            id="image0_324_1123"
                                            width="225"
                                            height="160"
                                            preserveAspectRatio="none"
                                            xlinkHref="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAOEAAACgCAIAAAB11ZzkAAAEuUlEQVR4AezXMW4UQRBGYWuQQEIiJOJ2pByB3AfhDhyEcxCTEGC06c7sbo9n2lVd/VnjwD21XVXvf8F6efGDQG4Cy5MfBHIT4GjufEz39MRRFmQnwNHsCZmPoxzITqDV0ex7mK8uAY7WzbbKZhytkmTdPThaN9sqm3G0SpJ19+Bo3WyrbHa2o1W42CMPAY7mycIk2wQ4us3FaR4CHM2ThUm2CXB0m4vTPAQ4micLk2wTiHJ0exqnCKwJcHTNxEkuAhzNlYdp1gQ4umbiJBcBjubKwzRrAhxdM3GSi0B2R3PRMk0EAY5GUNdzDwGO7qGlNoIARyOo67mHAEf30FIbQYCjEdT13EOgiqN7dlY7FgGOjpXXjNNydMbUx9qZo2PlNeO0HJ0x9bF25uhYec047WyOzpjx6DtzdPQE68/P0foZj74hR0dPsP78HK2f8egbcnT0BOvPz9HtjJ3mIcDRPFmYZJsAR7e5OM1DgKN5sjDJNgGObnNxmocAR/NkYZJtAhzd5tJ6qq4/AY72Z6zDMQIcPcbPp/sT4Gh/xjocI8DRY/x8uj+B5fv3Hx4EMhNYnp9/efoTAPn1BJb3Xz54EMhMwPfR/t+ndDhGgKPH+Pl0fwIc7c9Yh2MEOHqMn0/3J8DR/oz3dFC7JsDRNRMnuQhwNFceplkT4OiaiZNcBDiaKw/TrAlwdM3ESS4CHM2VR+s0M9VxdKa0x9yVo2PmNtPUHJ0p7TF35eiYuc00NUdnSnvMXTk6Zm6tU1eo42iFFGvvwNHa+VbYjqMVUqy9A0dr51thO45WSLH2DhytnW/rdpnrOJo5HbNdCHD0QsFvZgIczZyO2S4EOHqh4DczAY5mTsdsFwIcvVDw20ogoo6jEdT13EOAo3toqY0gwNEI6nruIcDRPbTURhDgaAR1PfcQ4OgeWmpbCZxZx9EzabqrBwGO9qDqzjMJcPRMmu7qQYCjPai680wCHD2Tprt6EOBoD6rubCXQUsfRFkpqIglwNJK+3i0EONpCSU0kAY5G0te7hQBHWyipiSTA0Uj6ercQuDjaUqcGgSgCHI0ir28rgeXvyzsPApkJLF8//vYgkJnA8u3zTw8CmQksf/598iCQmcCe/5lav+OqQ+BMAhw9k6a7ehDgaA+q7jyTAEfPpOmuHgQ42oOqO88kwNEzabqrB4EejvaY053zEuDovNmPsjlHR0lq3jk5Om/2o2zO0VGSmndOjs6b/SibRzo6CiNzxhLgaCx/3R8T4OhjRipiCXA0lr/ujwlw9DEjFbEEOBrLX/fHBEZw9PEWKioT4GjldGvsxtEaOVbegqOV062xG0dr5Fh5C45WTrfGbpUcrZGILa4JcPSaiL+zEeBotkTMc02Ao9dE/J2NAEezJWKeawIcvSbi72wEZnQ0WwbmuU+Ao/f5eBtPgKPxGZjgPgGO3ufjbTwBjsZnYIL7BDh6n4+38QQ4ejsDb3IQ4GiOHExxmwBHb7PxJgcBjubIwRS3CXD0NhtvchDgaI4cTHGbAEdvs2l9o64vAY725ev24wQ4epyhG/oS4Ghfvm4/ToCjxxm6oS8Bjvbl6/bjBDh6nGHrDepeR4Cjr+PmU29HgKNvx1qn1xH4DwAA///QOwkCAAAABklEQVQDAN+AjMgr6UTkAAAAAElFTkSuQmCC"
                                        />
                                    </defs>
                                </svg>
                                <span className={styles.rightPart_lang__title}>RU</span>
                                <svg width="17" height="10" viewBox="0 0 17 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M0.707031 0.707031L8.35703 8.35703L16.007 0.707031" stroke="black" strokeWidth="2" strokeMiterlimit="10"/>
                                </svg>
                            </div>
                            <AdBtn/>
                            <EnterBtn
                                isModalOpen={showAuthModal}
                                onModalClose={closeAuthModal}
                                onClick={handleEnterBtnClick}
                            />
                        </div>
                    </div>
                </div>
            </div>
            <div className={styles.bottomHeader}>
                <div className={styles.bottomHeader_wrap}>
                    <Link to="/" className={styles.bottomHeader_logo}>
                        <svg width="197" height="65" viewBox="0 0 197 65" fill="none" xmlns="http://www.w3.org/2000/svg"
                             xlinkHref="http://www.w3.org/1999/xlink">
                            <rect width="196.438" height="64.8244" fill="url(#pattern0_324_558)"/>
                            <defs>
                                <pattern id="pattern0_324_558" patternContentUnits="objectBoundingBox" width="1"
                                         height="1">
                                    <use xlinkHref="#image0_324_558" transform="scale(0.00125 0.00378788)"/>
                                </pattern>
                                <image id="image0_324_558" width="800" height="264" preserveAspectRatio="none"
                                       xlinkHref="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAyAAAAEICAYAAACnEJAaAAAAAXNSR0IArs4c6QAAIABJREFUeF7tnYm3F8WVx8uMJiOOOu6oEDFq2BTjgogL7vuuqCju+8zhz/GcSYxxBwUXRMVdEaOO+66AcRcUcR2FGDMzcc6ntccfj997r/vXdW9X9+97z3lHE/tXXfWp6u66dbf1fvjhhx+CREREQAREQAREQAREQAREQAQcCKwnBcSBsm4hAiIgAiIgAiIgAiIgAiKQEZACooUgAiIgAiIgAiIgAiIgAiLgRkAKiBtq3UgEREAEREAEREAEREAEREAKiNaACIiACIiACIiACIiACIiAGwEpIG6odSMREAEREAEREAEREAEREAEpIFoDIiACIiACIiACIiACIiACbgSkgLih1o1EQAREQAREQAREQAREQASkgGgNiIAIiIAIiIAIiIAIiIAIuBGQAuKGWjcSAREQAREQAREQAREQARGQAqI1IAIiIAIiIAIiIAIiIAIi4EZACogbat1IBERABERABERABERABERACojWgAiIgAiIgAiIgAiIgAiIgBsBKSBuqHUjERABERABERABERABERABKSBaAyIgAiIgAiIgAiIgAiIgAm4EpIC4odaNREAEREAEREAEREAEREAEpIBoDYiACIiACIiACIiACIiACLgRkALihlo3EgEREAEREAEREAEREAERkAKiNSACIiACIiACIiACIiACIuBGQAqIG2rdSAREQAREQAREQAREQAREQAqI1oAIiIAIiIAIiIAIiIAIiIAbASkgbqh1IxEQAREQAREQAREQAREQASkgWgMiIAIiIAIiIAIiIAIiIAJuBKSAuKHWjURABERABERABERABERABKSAaA2IgAiIgAiIgAiIgAiIgAi4EZAC4oZaNxIBERABERABERABERABEZACojUgAiIgAiIgAiIgAiIgAiLgRkAKiBtq3UgEREAEREAEREAEREAEREAKiNaACIiACIiACIiACIiACIiAGwEpIG6odSMREAEREAEREAEREAEREAEpIFoDIiACIiACIiACIiACIiACbgSkgLih1o1EQAREQAREQAREQAREQASkgGgNiIAIiIAIiIAIiIAIiIAIuBGQAuKGWjcSAREQAREQAREQAREQARGQAqI1IAIiIAIiIAIiIAIiIAIi4EZACogbat1IBERABERABERABERABERACojWgAiIgAiIgAiIgAiIgAiIgBsBKSBuqHUjERABERABERABERABERABKSBaAyIgAiIgAiIgAiIgAiIgAm4EpIC4odaNREAEREAEREAEREAEREAEpIBoDYiACIiACIiACIiACIiACLgRkALihlo3EgEREAEREAEREAEREAER+D8tKVR9BJsDlAAAAABJRU5ErkJggg=="/>
                            </defs>
                        </svg>
                    </Link>

                    <nav className={styles.bottomHeader_nav}>
                        <ul className={styles.bottomHeader_navList}>
                            <li className={`${styles.bottomHeader_item} ${isActivePage == "orders" ? styles.active : ""}`}>
                                <Link to="/" className={styles.navLink}>
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <g clipPath="url(#clip0_324_3320)">
                                            <g clipPath="url(#clip1_324_3320)">
                                                <path d="M12 3.41L10.09 1.5H1.50003V20.59C1.4987 20.8412 1.5472 21.0902 1.64272 21.3225C1.73823 21.5548 1.87887 21.7659 2.0565 21.9435C2.23412 22.1212 2.44521 22.2618 2.67754 22.3573C2.90987 22.4528 3.15883 22.5013 3.41003 22.5H20.59C20.8412 22.5013 21.0902 22.4528 21.3225 22.3573C21.5548 22.2618 21.7659 22.1212 21.9436 21.9435C22.1212 21.7659 22.2618 21.5548 22.3573 21.3225C22.4529 21.0902 22.5014 20.8412 22.5 20.59V3.41H12Z" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeMiterlimit="10"/>
                                                <path d="M1.5 7.22998H22.5" stroke="white" strokeWidth="2" strokeMiterlimit="10"/>
                                            </g>
                                        </g>
                                        <defs>
                                            <clipPath id="clip0_324_3320">
                                                <rect width="24" height="24" fill="white"/>
                                            </clipPath>
                                            <clipPath id="clip1_324_3320">
                                                <rect width="24" height="24" fill="white"/>
                                            </clipPath>
                                        </defs>
                                    </svg>
                                    <p>Заказы</p>
                                </Link>
                            </li>
                            <li className={`${styles.bottomHeader_item} ${isActivePage === "favorites" ? styles.active : ""}`}>
                                <Link to="/favorites" className={styles.navLink}>
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <g clipPath="url(#clip0_324_3328)">
                                            <g clipPath="url(#clip1_324_3328)">
                                                <path d="M16.77 2.4502C15.7961 2.47111 14.8444 2.74481 14.0081 3.24444C13.1719 3.74408 12.4799 4.45249 12 5.3002C11.5201 4.45249 10.8281 3.74408 9.99186 3.24444C9.15563 2.74481 8.2039 2.47111 7.23 2.4502C4.06 2.4502 1.5 5.3002 1.5 8.8202C1.5 15.1802 12 21.5502 12 21.5502C12 21.5502 22.5 15.1802 22.5 8.8202C22.5 5.3002 19.94 2.4502 16.77 2.4502Z" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeMiterlimit="10"/>
                                            </g>
                                        </g>
                                        <defs>
                                            <clipPath id="clip0_324_3328">
                                                <rect width="24" height="24" fill="white"/>
                                            </clipPath>
                                            <clipPath id="clip1_324_3328">
                                                <rect width="24" height="24" fill="white"/>
                                            </clipPath>
                                        </defs>
                                    </svg>
                                    <p>Избранное</p>
                                </Link>
                            </li>
                            <li className={`${styles.bottomHeader_item} ${isActivePage === "chats" ? styles.active : ""}`}>
                                <Link to="/chats" className={styles.navLink}>
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <g clipPath="url(#clip0_324_3538)">
                                            <g clipPath="url(#clip1_324_3538)">
                                                <path d="M12 1.47998C6.2 1.47998 1.5 5.74998 1.5 11C1.52866 13.0153 2.23294 14.9626 3.5 16.53L2.5 21.53L9.16 20.2C10.1031 20.4499 11.0744 20.5776 12.05 20.58C17.85 20.58 22.55 16.3 22.55 11.03C22.55 5.75998 17.8 1.47998 12 1.47998Z" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeMiterlimit="10"/>
                                            </g>
                                        </g>
                                        <defs>
                                            <clipPath id="clip0_324_3538">
                                                <rect width="24" height="24" fill="white"/>
                                            </clipPath>
                                            <clipPath id="clip1_324_3538">
                                                <rect width="24" height="24" fill="white"/>
                                            </clipPath>
                                        </defs>
                                    </svg>
                                    <p>Чаты</p>
                                </Link>
                            </li>
                            <li className={`${styles.bottomHeader_item} ${isActivePage === "profile" ? styles.active : ""}`}>
                                {isAuthenticated ? (
                                    <Link to="/profile" className={styles.navLink}>
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
                                             xmlns="http://www.w3.org/2000/svg">
                                            <g clipPath="url(#clip0_324_3342)">
                                                <rect width="24" height="24" fill="white"/>
                                                <g clipPath="url(#clip1_324_3342)">
                                                    <path
                                                        d="M12 12.98C15.1646 12.98 17.73 10.4146 17.73 7.25002C17.73 4.08543 15.1646 1.52002 12 1.52002C8.83543 1.52002 6.27002 4.08543 6.27002 7.25002C6.27002 10.4146 8.83543 12.98 12 12.98Z"
                                                        fill="currentColor"
                                                    />
                                                    <path
                                                        d="M1.5 23.48L1.87 21.43C2.3071 19.0625 3.55974 16.9229 5.41031 15.3828C7.26088 13.8428 9.59246 12.9997 12 13C14.4104 13.0006 16.7443 13.8465 18.5952 15.3905C20.4462 16.9345 21.6971 19.0788 22.13 21.45L22.5 23.5"
                                                        fill="currentColor"
                                                    />
                                                </g>
                                            </g>
                                            <defs>
                                                <clipPath id="clip0_324_3342">
                                                    <rect width="24" height="24" fill="white"/>
                                                </clipPath>
                                                <clipPath id="clip1_324_3342">
                                                    <rect width="24" height="24" fill="white"/>
                                                </clipPath>
                                            </defs>
                                        </svg>
                                        <p>Профиль</p>
                                    </Link>
                                ) : (
                                    <Link
                                        to="/profile"
                                        className={styles.navLink}
                                        onClick={handleProfileClick}
                                    >
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
                                             xmlns="http://www.w3.org/2000/svg">
                                            <g clipPath="url(#clip0_324_3342)">
                                                <rect width="24" height="24" fill="white"/>
                                                <g clipPath="url(#clip1_324_3342)">
                                                    <path
                                                        d="M12 12.98C15.1646 12.98 17.73 10.4146 17.73 7.25002C17.73 4.08543 15.1646 1.52002 12 1.52002C8.83543 1.52002 6.27002 4.08543 6.27002 7.25002C6.27002 10.4146 8.83543 12.98 12 12.98Z"
                                                        fill="currentColor"
                                                    />
                                                    <path
                                                        d="M1.5 23.48L1.87 21.43C2.3071 19.0625 3.55974 16.9229 5.41031 15.3828C7.26088 13.8428 9.59246 12.9997 12 13C14.4104 13.0006 16.7443 13.8465 18.5952 15.3905C20.4462 16.9345 21.6971 19.0788 22.13 21.45L22.5 23.5"
                                                        fill="currentColor"
                                                    />
                                                </g>
                                            </g>
                                            <defs>
                                                <clipPath id="clip0_324_3342">
                                                    <rect width="24" height="24" fill="white"/>
                                                </clipPath>
                                                <clipPath id="clip1_324_3342">
                                                    <rect width="24" height="24" fill="white"/>
                                                </clipPath>
                                            </defs>
                                        </svg>
                                        <p>Профиль</p>
                                    </Link>
                                )}
                            </li>
                        </ul>
                    </nav>
                </div>
            </div>
        </header>
    );
}

export default Header;