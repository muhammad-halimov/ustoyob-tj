import styles from "./Category.module.scss";
import {AdBtn} from "../../shared/ui/button/HeaderButton/AdBtn.tsx";


export default function Category() {
    const about = [
        {
            id: 1,
            img: './fonTest4.png',
            title: 'электромонтажник',
        },
        {
            id: 2,
            img: './fonTest4.png',
            title: 'электромонтажник',
        },
        {
            id: 3,
            img: './fonTest4.png',
            title: 'электромонтажник',
        },
        {
            id: 4,
            img: './fonTest4.png',
            title: 'электромонтажник',
        },
        {
            id: 5,
            img: './fonTest4.png',
            title: 'электромонтажник',
        },
        {
            id: 6,
            img: './fonTest4.png',
            title: 'электромонтажник',
        },
        {
            id: 7,
            img: './fonTest4.png',
            title: 'электромонтажник',
        },
        {
            id: 8,
            img: './fonTest4.png',
            title: 'электромонтажник',
        },
        {
            id: 9,
            img: './fonTest4.png',
            title: 'электромонтажник',
        },
        {
            id: 10,
            img: './fonTest4.png',
            title: 'электромонтажник',
        },
        {
            id: 11,
            img: './fonTest4.png',
            title: 'электромонтажник',
        },
        {
            id: 12,
            img: './fonTest4.png',
            title: 'электромонтажник',
        },
    ]


    return (
        <div className={styles.category}>
            <h3>Категории услуг</h3>
            <div className={styles.category_item}>
                {about.map((item, ) => (
                    <div key={item.id} className={styles.category_item_step}>
                        <img src={item.img} alt="itemImg"/>
                        <p>{item.title}</p>
                    </div>
                ))}
                <div className={styles.category_btn}>
                    <AdBtn text="Посмотреть все услуги" alwaysVisible/>
                </div>
            </div>
        </div>
    );
};