import styles from './OrderHistoryPage.module.scss';
import { Link } from 'react-router-dom';


const OrderHistoryPage = () => {


    return (
        <div className={styles.container}>
            <Link to="/create-ad" className={styles.create_order}>
                <span>Создать предложение/заказ</span>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <g clipPath="url(#clip0_115_4364)">
                        <g clipPath="url(#clip1_115_4364)">
                            <g clip-path="url(#clip2_115_4364)">
                                <path d="M12 22.5C17.799 22.5 22.5 17.799 22.5 12C22.5 6.20101 17.799 1.5 12 1.5C6.20101 1.5 1.5 6.20101 1.5 12C1.5 17.799 6.20101 22.5 12 22.5Z" stroke="#101010" strokeWidth="2" strokeMiterlimit="10"/>
                                <path d="M18.7463 11.9997H5.25469" stroke="#101010" strokeWidth="2" strokeMiterlimit="10"/>
                                <path d="M12.0005 5.25391V18.7455" stroke="#101010" strokeWidth="2" strokeMiterlimit="10"/>
                            </g>
                        </g>
                    </g>
                    <defs>
                        <clipPath id="clip0_115_4364">
                            <rect width="24" height="24" fill="white"/>
                        </clipPath>
                        <clipPath id="clip1_115_4364">
                            <rect width="24" height="24" fill="white"/>
                        </clipPath>
                        <clipPath id="clip2_115_4364">
                            <rect width="24" height="24" fill="white"/>
                        </clipPath>
                    </defs>
                </svg>
            </Link>
            <h3>Прошлые заказы</h3>
            <div className={styles.order_history}>
                <div className={styles.order_item}>
                    <div className={styles.order_item_title}>
                        <p>Название заказа</p>
                        <span>дата время</span>
                    </div>

                    <div className={styles.order_item_status}>
                        <span>Статус задачи</span>
                    </div>
                </div>

                <div className={styles.order_item}>
                    <div className={styles.order_item_title}>
                        <p>Название заказа</p>
                        <span>дата время</span>
                    </div>

                    <div className={styles.order_item_status}>
                        <span>Статус задачи</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OrderHistoryPage;