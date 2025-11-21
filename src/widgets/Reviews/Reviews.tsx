import style from './Reviews.module.scss';

function Reviews() {
    const reviews = [
        {
            id: 1,
            name: 'ФИО',
            vacation: 'специалист профессия',
            worker: 'фио того кто отзывался',
            date: 'дата, место',
            comment: 'Текст отзыва',
            raiting: 4.8
        },
        {
            id: 2,
            name: 'ФИО',
            vacation: 'специалист профессия',
            worker: 'фио того кто отзывался',
            date: 'дата, место',
            comment: 'Текст отзыва',
            raiting: 4.8
        },
        {
            id: 3,
            name: 'ФИО',
            vacation: 'специалист профессия',
            worker: 'фио того кто отзывался',
            date: 'дата, место',
            comment: 'Текст отзыва',
            raiting: 4.8
        },
        {
            id: 4,
            name: 'ФИО',
            vacation: 'специалист профессия',
            worker: 'фио того кто отзывался',
            date: 'дата, место',
            comment: 'Текст отзыва',
            raiting: 4.8
        },
        {
            id: 5,
            name: 'ФИО',
            vacation: 'специалист профессия',
            worker: 'фио того кто отзывался',
            date: 'дата, место',
            comment: 'Текст отзыва',
            raiting: 4.8
        },
        {
            id: 6,
            name: 'ФИО',
            vacation: 'специалист профессия',
            worker: 'фио того кто отзывался',
            date: 'дата, место',
            comment: 'Текст отзыва',
            raiting: 4.8
        },
    ]

    return (
        <div className={style.reviews}>
            <h3>Отзывы</h3>
            <div className={style.reviews_wrap}>
                {reviews.map((review) => (
                    <div className={style.reviews_item} key={review.id}>
                        <div className={style.reviews_naming}>
                            <img src="../fonTest5.png" alt="fon Test"/>
                            <div className={style.reviews_naming_title}>
                                <h3>{review.name}</h3>
                                <p>{review.vacation}</p>
                                <div className={style.reviews_naming_raiting}>
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <g clipPath="url(#clip0_324_2272)">
                                            <g clipPath="url(#clip1_324_2272)">
                                                <path d="M12 2.49023L15.51 8.17023L22 9.76023L17.68 14.8502L18.18 21.5102L12 18.9802L5.82 21.5102L6.32 14.8502L2 9.76023L8.49 8.17023L12 2.49023Z" stroke="#3A54DA" strokeWidth="2" strokeMiterlimit="10"/>
                                                <path d="M12 19V18.98" stroke="black" strokeWidth="2" strokeMiterlimit="10"/>
                                            </g>
                                        </g>
                                        <defs>
                                            <clipPath id="clip0_324_2272">
                                                <rect width="24" height="24" fill="white"/>
                                            </clipPath>
                                            <clipPath id="clip1_324_2272">
                                                <rect width="24" height="24" fill="white"/>
                                            </clipPath>
                                        </defs>
                                    </svg>
                                    <span>{review.raiting}</span>
                                </div>
                            </div>
                        </div>
                        <div className={style.reviews_about}>
                            <div className={style.reviews_about_title}>
                                <p>{review.worker}</p>
                                <p>{review.date}</p>
                            </div>
                            <div className={style.reviews_about_rev}>
                                <p>{review.comment}</p>
                            </div>
                            <span className={style.reviews_about_more}>Еще</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default Reviews;