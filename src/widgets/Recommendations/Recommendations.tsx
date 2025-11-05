import styles from './Recommendations.module.scss'

function Recommendations() {
    return (
        <div className={styles.recommendation}>
            <div className={styles.recommendation_wrap}>
                <h3>Может понравится</h3>
                <div className={styles.recommendation_item}>
                    <div className={styles.recommendation_item_title}>
                        <h4>Название работы</h4>
                        <span className={styles.recommendation_item_price}>10 000 руб.</span>
                    </div>
                    <div className={styles.recommendation_item_status}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <g clipPath="url(#clip0_182_2657)">
                                <g clipPath="url(#clip1_182_2657)">
                                    <path d="M12 22.5C17.799 22.5 22.5 17.799 22.5 12C22.5 6.20101 17.799 1.5 12 1.5C6.20101 1.5 1.5 6.20101 1.5 12C1.5 17.799 6.20101 22.5 12 22.5Z" stroke="black" strokeWidth="2" strokeMiterlimit="10"/>
                                    <path d="M11.9998 16.7698V10.0898H10.0898" stroke="black" strokeWidth="2" strokeMiterlimit="10"/>
                                    <path d="M10.0898 16.77H13.9098" stroke="black" strokeWidth="2" strokeMiterlimit="10"/>
                                    <path d="M11.0498 7.22998H12.9498" stroke="black" strokeWidth="2" strokeMiterlimit="10"/>
                                </g>
                            </g>
                            <defs>
                                <clipPath id="clip0_182_2657">
                                    <rect width="24" height="24" fill="white"/>
                                </clipPath>
                                <clipPath id="clip1_182_2657">
                                    <rect width="24" height="24" fill="white"/>
                                </clipPath>
                            </defs>
                        </svg>
                        <p>В работе</p>
                    </div>
                    <div className={styles.recommendation_item_description}>
                        <p>Описание</p>
                        <div className={styles.recommendation_item_inform}>
                            <div className={styles.recommendation_item_locate}>
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
                                <p>Адрес</p>
                            </div>
                            <div className={styles.recommendation_item_locate}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <g clipPath="url(#clip0_324_2851)">
                                        <g clipPath="url(#clip1_324_2851)">
                                            <path d="M22.5205 3.37012H1.48047V8.15012H22.5205V3.37012Z" stroke="#3A54DA" strokeWidth="2" strokeMiterlimit="10"/>
                                            <path d="M22.5205 8.15039H1.48047V22.5004H22.5205V8.15039Z" stroke="#3A54DA" strokeWidth="2" strokeMiterlimit="10"/>
                                            <path d="M5.2998 12.9297H7.2198" stroke="#3A54DA" strokeWidth="2" strokeMiterlimit="10"/>
                                            <path d="M9.12988 12.9297H11.0399" stroke="#3A54DA" strokeWidth="2" strokeMiterlimit="10"/>
                                            <path d="M12.96 12.9297H14.87" stroke="#3A54DA" strokeWidth="2" strokeMiterlimit="10"/>
                                            <path d="M16.7803 12.9297H18.7003" stroke="#3A54DA" strokeWidth="2" strokeMiterlimit="10"/>
                                            <path d="M16.7803 17.7197H18.7003" stroke="#3A54DA" strokeWidth="2" strokeMiterlimit="10"/>
                                            <path d="M5.2998 17.7197H7.2198" stroke="#3A54DA" strokeWidth="2" strokeMiterlimit="10"/>
                                            <path d="M9.12988 17.7197H11.0399" stroke="#3A54DA" strokeWidth="2" strokeMiterlimit="10"/>
                                            <path d="M12.96 17.7197H14.87" stroke="#3A54DA" strokeWidth="2" strokeMiterlimit="10"/>
                                            <path d="M6.25977 0.5V5.28" stroke="#3A54DA" strokeWidth="2" strokeMiterlimit="10"/>
                                            <path d="M12 0.5V5.28" stroke="#3A54DA" strokeWidth="2" strokeMiterlimit="10"/>
                                            <path d="M17.7402 0.5V5.28" stroke="#3A54DA" strokeWidth="2" strokeMiterlimit="10"/>
                                        </g>
                                    </g>
                                    <defs>
                                        <clipPath id="clip0_324_2851">
                                            <rect width="24" height="24" fill="white"/>
                                        </clipPath>
                                        <clipPath id="clip1_324_2851">
                                            <rect width="24" height="24" fill="white"/>
                                        </clipPath>
                                    </defs>
                                </svg>
                                <p>Дата</p>
                            </div>
                        </div>
                        <div className={styles.recommendation_item_who}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <g clipPath="url(#clip0_324_2870)">
                                    <g clipPath="url(#clip1_324_2870)">
                                        <path d="M11.9995 12.9795C15.1641 12.9795 17.7295 10.4141 17.7295 7.24953C17.7295 4.08494 15.1641 1.51953 11.9995 1.51953C8.83494 1.51953 6.26953 4.08494 6.26953 7.24953C6.26953 10.4141 8.83494 12.9795 11.9995 12.9795Z" stroke="#5D5D5D" strokeWidth="2" strokeMiterlimit="10"/>
                                        <path d="M1.5 23.48L1.87 21.43C2.3071 19.0625 3.55974 16.9229 5.41031 15.3828C7.26088 13.8428 9.59246 12.9997 12 13C14.4104 13.0006 16.7443 13.8465 18.5952 15.3905C20.4462 16.9345 21.6971 19.0788 22.13 21.45L22.5 23.5" stroke="#5D5D5D" strokeWidth="2" strokeMiterlimit="10"/>
                                    </g>
                                </g>
                                <defs>
                                    <clipPath id="clip0_324_2870">
                                        <rect width="24" height="24" fill="white"/>
                                    </clipPath>
                                    <clipPath id="clip1_324_2870">
                                        <rect width="24" height="24" fill="white"/>
                                    </clipPath>
                                </defs>
                            </svg>
                            <p>Кто опубликовал</p>
                        </div>
                        <span className={styles.recommendation_item_time}>0 времени назад</span>
                    </div>
                </div>
            </div>


        </div>
    );
}

export default Recommendations;