import styles from "./About.module.scss";

export default function About() {
    const about = [
        {
            id: 1,
            name: 'Раз',
            title: ' Найдите специалиста нужного профиля в пару кликов: стройка, ремонт, сантехника и многое другое. ',
            img: './fonTest3.png',
        },
        {
            id: 2,
            name: 'Два',
            title: ' Найдите специалиста нужного профиля в пару кликов: стройка, ремонт, сантехника и многое другое. ',
            img: './fonTest3.png',
        },
        {
            id: 3,
            name: 'Три',
            title: ' Найдите специалиста нужного профиля в пару кликов: стройка, ремонт, сантехника и многое другое. ',
            img: './fonTest3.png',
        }
    ]


    return (
        <div className={styles.about}>
            <h3>Как работает сервис</h3>
            <div className={styles.about_item}>
                {about.map((item, ) => (
                    <div key={item.id} className={styles.about_item_step}>
                        <h3>{item.name}</h3>
                        <p>{item.title}</p>
                        <img src={item.img} alt="itemImg"/>
                    </div>
                ))}
            </div>
        </div>
    );
};