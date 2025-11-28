import styles from "./Header.module.scss";
import {AdBtn} from "../../shared/ui/button/HeaderButton/AdBtn.tsx";
import {EnterBtn} from "../../shared/ui/button/HeaderButton/EnterBtn.tsx";
import {Link, useLocation, useNavigate} from "react-router-dom";
import {useEffect, useState} from "react";
import { getAuthToken } from "../../utils/auth";

interface City {
    id: number;
    title: string;
    description: string;
    image: string;
    districts: District[];
    province: Province;
}

interface District {
    id: number;
    title: string;
    image: string;
}

interface Province {
    id: number;
    title: string;
}

function Header() {
    const location = useLocation();
    const navigate = useNavigate();
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [cities, setCities] = useState<City[]>([]);
    const [selectedCity, setSelectedCity] = useState<string>(() => {
        const savedCity = localStorage.getItem('selectedCity');
        return savedCity || "Местоположение";
    });
    const [showCityModal, setShowCityModal] = useState(false);
    const API_BASE_URL = 'https://admin.ustoyob.tj';

    useEffect(() => {
        const fetchCities = async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/api/cities`);
                const data = await response.json();
                setCities(data);
            } catch (error) {
                console.error('Error fetching cities:', error);
            }
        };

        fetchCities();
    }, []);

    const handleCitySelect = (cityTitle: string) => {
        setSelectedCity(cityTitle);
        localStorage.setItem('selectedCity', cityTitle);
        setShowCityModal(false);
    };

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
        window.location.reload()
    };

    const handleAdBtnClick = () => {
        navigate('/orders');
    };

    return (
        <header className={styles.header}>
            <div className={styles.header_top}>
                <div className={styles.headerWrap}>
                    <div className={styles.locate} onClick={() => setShowCityModal(true)}>
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
                        <span className={styles.locate_title}>{selectedCity}</span>
                    </div>
                    <div className={styles.rightPart}>
                        <div className={styles.rightPart_lang}>
                            <div className={styles.rightPart_lang__box}>
                                <svg
                                    className={styles.flagIcon}
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
                            <div className={styles.rightPart_buttons}>
                                <AdBtn onClick={() => handleAdBtnClick()} />
                                <EnterBtn
                                    isModalOpen={showAuthModal}
                                    onModalClose={closeAuthModal}
                                    onClick={handleEnterBtnClick}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div className={styles.bottomHeader}>
                <div className={styles.bottomHeader_wrap}>
                    <Link to="/" className={styles.bottomHeader_logo}>
                        <svg className={styles.logo_mobile} width="197" height="65" viewBox="0 0 197 65" fill="none" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink">
                            <rect width="196.438" height="64.8244" fill="url(#pattern0_324_558)"/>
                            <defs>
                                <pattern id="pattern0_324_558" patternContentUnits="objectBoundingBox" width="1" height="1">
                                    <use xlinkHref="#image0_324_558" transform="scale(0.00125 0.00378788)"/>
                                </pattern>
                                <image id="image0_324_558" width="800" height="264" preserveAspectRatio="none" xlinkHref="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAyAAAAEICAYAAACnEJAaAAAAAXNSR0IArs4c6QAAIABJREFUeF7tnYm3F8WVx8uMJiOOOu6oEDFq2BTjgogL7vuuqCju+8zhz/GcSYxxBwUXRMVdEaOO+66AcRcUcR2FGDMzcc6ntccfj997r/vXdW9X9+97z3lHE/tXXfWp6u66dbf1fvjhhx+CRAREQAREQAREQAREQAREQAQcCKwnBcSBsm4hAiIgAiIgAiIgAiIgAiKQEZACooUgAiIgAiIgAiIgAiIgAiLgRkAKiBtq3UgEREAEREAEREAEREAEREAKiNaACIiACIiACIiACIiACIiAGwEpIG6odSMREAEREAEREAEREAEREAEpIFoDIiACIiACIiACIiACIiACbgSkgLih1o1EQAREQAREQAREQAREQASkgGgNiIAIiIAIiIAIiIAIiIAIuBGQAuKGWjcSAREQAREQAREQAREQARGQAqI1IAIiIAIiIAIiIAIiIAIi4EZACogbat1IBERABERABERABERABERACojWgAiIgAiIgAiIgAiIgAiIgBsBKSBuqHUjERABERABERABERABERABKSBaAyIgAiIgAiIgAiIgAiIgAm4EpIC4odaNREAEREAEREAEREAEREAEpIBoDYiACIiACIiACIiACIiACLgRkALihlo3EgEREAEREAEREAEREAERkAKiNSACIiACIiACIiACIiACIuBGQAqIG2rdSAREQAREQAREQAREQAREQAqI1oAIiIAIiIAIiIAIiIAIiIAbASkgbqh1IxEQAREQAREQAREQAREQASkgWgMiIAIiIAIiIAIiIAIiIAJuBKSAuKHWjURABERABERABERABERABKSAaA2IgAiIgAiIgAiIgAiIgAi4EZAC4oZaNxIBERABERABERABERABEZACojUgAiIgAiIgAiIgAiIgAiLgRkAKiBtq3UgEREAEREAEREAEREAEREAKiNaACIiACIiACIiACIiACIiAGwEpIG6odSMREAEREAEREAEREAEREAEpIFoDIiACIiACIiACIiACIiACbgSkgLih1o1EQAREQAREQAREQAREQASkgGgNiIAIiIAIiIAIiIAIiIAIuBGQAuKGWjcSAREQAREQAREQAREQARGQAqI1IAIiIAIiIAIiIAIiIAIi4EZACogbat1IBERABERABERABERABERACojWQPiv//qv8Mwzz2QkNt544+yfo0aNCptssknYdNNNRUgEREAEREAEREAEREAEohGQAhINZfMaQvF46KGHwsqVKwft/MiRI8P2228fJkyYIGWkeVOsHouACIiACIiACIhAcgSkgCQ3JT4dQvmYP39+WL16deEb/su//Evgb8qUKbKOFKamC0VABERABERABERABDoJSAHp0/Vw3XXXlVI+umHCOjJ+/PjMXUuuWn26kDRsERABERABERABEShJQApISWBtuPyjjz4KCxYsiDYUrCKTJ08OEydOjNamGhIBERABERABERABEWgnASkg7ZzXIUd12223DRn30SuSk046KYwePbrXn+t3IiACIiACIiACIiACfUBACkgfTHLnEIn9uPHGG81Gfe6558ody4yuGhYBERABERABERCB5hOQAtL8OSw1gtjuVwNvvtdee4WpU6eW6pMuFgEREAEREAEREAER6B8CUkD6Z66zkf7nf/5neOGFF8xGTWD69OnTzdpXwyIgAiIgAiIgAiIgAs0mIAWk2fNXuvcxsl8NdVMC0i+44ILS/dIPREAEREAEREAEREAE+oOAFJD+mOdslNbxH9xDCkgfLSgNVQREQAREQAREQAR6ICAFpAdoTf2JtfuVFJCmrgz1WwREQAREQAREQAT8CEgB8WNd+508FBAFodc+zeqACIiACIiACIiACCRNQApI0tMTt3NXXnll3Aa7tKZaIOaIdQMREAEREAEREAERaDQBKSCNnr7infeI/6A3s2bNKt4pXSkCIiACIiACIiACItB3BKSA9MmUe7hfKQC9TxaThikCIiACIiACIiACFQhIAakAr0k/ve2228LKlStNu6z4D1O8alwEREAEREAEREAEWkFACkgrpnH4QSj+Y3hGukIEREAEREAEREAERMCegBQQe8a138Ej/kPuV7VPszogAiIgAiIgAiIgAo0g0BgFhE30M888Ez7++OOwevXqrOAdf+PHjw+jRo0Km266aSOA19FJj/iPkSNHhunTp9cxPN1TBERABERABERABESgQQQaoYC88cYbYdGiRYNiZfN7xBFHSAkZhJDiPxr0RKqrIiACIiACIiACItByAskrIA8++GB46623Ck3DueeeKyVkACkP9ytuKfaFlqguEgEREAEREAEREIG+J5C0AlJG+chnUhvhtdf0cNajGE+A4j9iUFQbIiACIiACIiACItAfBJJVQHpRPqSErLtoPeI/lH63P14WGqUIiIAIiIAIiIAIxCCQpAJSRfmQErL2svBIvysFJMajqDZEQAREQAREQAREoD8IJKeAxFA+pIT8SMAr/mPWrFn98bRolCIgAiIgAiIgAiIgApUJJKWAxFQ+pISE4OF+pfiPys+gGhABERABERABERCBviKQjAJioXz0uxKi9Lt99SxrsCIgAiIgAiIgAiLQCAJJKCAeJ/X9mB3LI/7jpJNOCqNHj27EYlcnRUAEREAEREAEREAE6idQuwLy0UcfhQULFriQ6CclRPEfLktKNxEBERABERABERABEShJoFYFxGuT3MmkX5QQD6uS4j9KPm26XAREQAREQAREQAREINSqgHhaP/pNCVH8h55uERABERABERABERCBFAnUqoB4nNIPBr3NlhAvy5LiP1J8pNUnERABERABERABEUibQN8qIExLW5UQD8uS3K/SfrDVOxEQAREQAREQARFIlUCtCsgbb7wRFi1aVCubNiohHpalkSNHhunTp9c6d7q5CIiACIiACIiACIhA8wjUqoB4nNQXmZK2KSHXXXddWL16dZGh93zNXnvtFaZOndrz7/VDERABERABERABERCB/iRQqwICco9g6SJT2xYlxCv+oy28iqwNXSMCIiACIiACIiACIhCPQO0KCBvm+fPnm5/YF0HWhk21h/uV4j+KrCZdIwIiIAIiIAIiIAIi0I1A7QoInWLTvGzZMikhEdaohwIi96sIE2XQxLfffhtQ6P/3f//XoPUQNtlkk7DZZpuZtO3d6Jo1a8LXX38d/ud//sfk1htttFHYcsstTdpWoyIgAs0i8P3334cvvvgi/Pd//3ezOt6y3v7qV78KW2yxRdhggw1aNTK+Z1999ZXJt/+f/umfwsYbbxw23XTT6MySUECkhMSb1yuvvDJeY4O0JAXEHHHpG/CBu//++8Py5cvDDz/8UPr3RX6w/fbbh1NOOaXIpclf88ADD4R33nkn/OMf/zDpK4ramWeeGdZff32T9tWoCIhAcwgsXrw4kHTH6n3THBL19hTvjYMPPjiMGTOm3o5EvvuDDz4Y3nrrrcit/tjceuutF37zm9+EY445Jnr7ySggUkKqz61X/MesWbOqd1YtRCWwYsWKcN99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CEgBiTBdHvEfVMo88sgjI/RWTYiACIiACIiACIiACIhAfQSkgERgf9ttt2WFbCxlr732ClOnTrW8hdoWAREQAREQAREQAREQAXMCUkAiIPZIv6usUBEmSk2IgAiIgAiIgAiIgAjUTkAKSMUp8Ir/mDVrVsWe6uciIAIiIAIiIAIiIAIiUD8BKSAV50DxHxUB6uciIAIiIAIiIAIiIAJ9RUAKSMXp9lBADjnkkDBx4sSKPdXPRUAEREAEREAEREAERKB+AlJAKs6BhwuW0u9WnCT9XAREQAREQAREQAREIBkCUkAqTgUVvG+88caKrQz9c8V/mOJV4yIgAiIgAiIgAiIgAo4EpIBEgG2Zhlf1PyJMkJoQAREQAREQAREQARFIhoAUkAhTgRVk/vz5YfXq1RFaW7sJxX9ER6oGRUAEREAEREAEREAEaiQgBSQSfCslRO5XkSZIzYiACIiACIiACIiACCRBQApIxGlACXnzzTfDsmXLolhDZP2IODlqSgREQAREQAREQAREIAkCUkCMpgFlZPny5WHJkiVh5cqVpe8ycuTIMH369NK/0w9EQAREQAREQAREQAREIGUCUkAcZgdl5JtvvskUkhUrVgyrkEj5cJgU3UIEREAEREAEREAERKAWAlJAasCeW0dQRlBMEALYx44dG0aNGhVGjx5dQ690SxEQAREQAREQAREQARGwJyAFxJ6x7iACIiACIiACIiACIiACIvATASkgWgoiIAIiIAIiIAIiIAIiIAJuBKSAuKHWjURABERABERABERABERABKSAaA2IgAiIgAiIgAiIgAiIgAi4EZAC4oZaNxIBERABERABERABERABEZACojUgAiIgAiIgAiIgAiIgAiLgRkAKiBtq3UgEREAEREAEREAEREAEREAKiNaACIiACIiACIiACIiACIiAGwEpIG6odSMREAEREAEREAEREAEREAEpIFoDIiACIiACIiACIiACIiACbgSkgLih1o1EQAREQAREQAREQAREQASkgGgNiIAIiIAIiIAIiIAIiIAIuBGQAuKGWjcSAREQAREQAREQAREQARGQAqI1IAIiIAIiIAIiIAIiIAIi4EZACogbat1IBERABERABERABERABERACojWgAiIgAiIgAiIgAiIgAiIgBsBKSBuqHUjERABERABERABERABERABKSBaAyIgAiIgAiIgAiIgAiIgAm4EpIC4odaNREAEREAEREAEREAEREAEpIBoDYiACIiACIiACIiACIiACLgRkALihlo3EgEREAEREAEREAEREAERkAKiNSACIiACIiACIiACIiACIuBGQAqIG2rdSAREQAREQAREQAREQAREQAqI1oAIiIAIiIAIiIAIiIAIiIAbASkgbqh1IxEQAREQAREQAREQAREQASkgWgMiIAIiIAIiIAIiIAIiIAJuBKSAuKHWjURABERABERABERABERABKSAaA2IgAiIgAiIgAiIgAiIgAi4EZAC4oZaNxIBERABERABERABERABEZACojUgAiIgAiIgAiIgAiIgAiLgRkAKiBtq3UgEREAEREAEREAEREAEREAKiNaACIiACIiACIiACIiACIiAGwEpIG6odSMREAEREAEREAEREAEREAEpIFoDIiACIiACIiACIiACIiACbgSkgLih1o1EQAREQAREQAREQAREQASkgGgNiIAIiIAIiIAIiIAIiIAIuBGQAuKGWjcSAREQAREQAREQAREQARGQAqI1IAIiIAIiIAIiIAIiIAIi4EZACogbat1IBERABERABERABERABERACojWgAiIgAiIgAiIgAiIgAiIgBsBKSBuqHUjERABERABERABERABERABKSBaAyIgAiIgAiIgAiIgAiIgAm4EpIC4odaNREAEREAEREAEREAEREAEpIBoDYiACIiACIiACIiACIiACLgRkALihlo3EgEREAEREAEREAEREAER+D8tKVR9BJsDlAAAAABJRU5ErkJggg=="/>
                            </defs>
                        </svg>

                    </Link>
                    <div className={styles.rightPart_buttons_mobile}>
                        <AdBtn onClick={() => handleAdBtnClick()} />
                        <EnterBtn
                            isModalOpen={showAuthModal}
                            onModalClose={closeAuthModal}
                            onClick={handleEnterBtnClick}
                        />
                    </div>

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
                                {isAuthenticated ? (
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
                                ) : (
                                    <Link
                                        to="/profile"
                                        className={styles.navLink}
                                        onClick={handleProfileClick}
                                    >
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
                                )}
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
                <div className={styles.mobile_header}>
                    <ul className={styles.bottomHeader_navList}>
                        <li className={`${styles.bottomHeader_item} ${isActivePage == "orders" ? styles.active : ""}`}>
                            <Link to="/" className={styles.navLink}>
                                <p>Заказы</p>
                            </Link>
                        </li>
                        <li className={`${styles.bottomHeader_item} ${isActivePage === "favorites" ? styles.active : ""}`}>
                            <Link to="/favorites" className={styles.navLink}>
                                <p>Избранное</p>
                            </Link>
                        </li>
                        <li className={`${styles.bottomHeader_item} ${isActivePage === "chats" ? styles.active : ""}`}>
                            {isAuthenticated ? (
                                <Link to="/chats" className={styles.navLink}>
                                    <p>Чаты</p>
                                </Link>
                            ) : (
                                <Link
                                    to="/profile"
                                    className={styles.navLink}
                                    onClick={handleProfileClick}
                                >
                                    <p>Чаты</p>
                                </Link>
                            )}
                        </li>
                        <li className={`${styles.bottomHeader_item} ${isActivePage === "profile" ? styles.active : ""}`}>
                            {isAuthenticated ? (
                                <Link to="/profile" className={styles.navLink}>
                                    <p>Профиль</p>
                                </Link>
                            ) : (
                                <Link
                                    to="/profile"
                                    className={styles.navLink}
                                    onClick={handleProfileClick}
                                >
                                    <p>Профиль</p>
                                </Link>
                            )}
                        </li>
                    </ul>
                </div>
            </div>
            {showCityModal && (
                <div className={styles.modalOverlay} onClick={() => setShowCityModal(false)}>
                    <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h2>Выберите город</h2>
                            <button className={styles.closeButton} onClick={() => setShowCityModal(false)}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                </svg>
                            </button>
                        </div>
                        <div className={styles.cityList}>
                            {cities.map(city => (
                                <div
                                    key={city.id}
                                    className={`${styles.cityItem} ${selectedCity === city.title ? styles.selected : ''}`}
                                    onClick={() => handleCitySelect(city.title)}
                                >
                                    {city.title}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </header>

    );
}

export default Header;