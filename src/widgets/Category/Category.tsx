import styles from "./Category.module.scss";
import { AdBtn } from "../../shared/ui/button/HeaderButton/AdBtn.tsx";
import { useEffect, useState } from "react";

interface CategoryItem {
    id: number;
    title: string;
    description?: string;
    image?: string;
}

export default function Category() {
    const [categories, setCategories] = useState<CategoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const API_URL = "https://admin.ustoyob.tj";

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const response = await fetch(`${API_URL}/api/categories`);
                if (!response.ok) throw new Error(`Ошибка: ${response.status}`);
                const data: CategoryItem[] = await response.json();
                setCategories(data);
            } catch (error) {
                console.error("Ошибка при загрузке категорий:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchCategories();
    }, []);

    if (loading) return <p>Загрузка категорий...</p>;

    return (
        <div className={styles.category}>
            <h3>Категории услуг</h3>
            <div className={styles.category_item}>
                {categories.slice(0, 12).map((item) => (
                    <div key={item.id} className={styles.category_item_step}>
                        <img
                            src={item.image ? `${API_URL}/images/service_category_photos/${item.image}` : "./fonTest4.png"}
                            alt={item.title}
                        />
                        <p>{item.title}</p>
                    </div>
                ))}

                {categories.length > 12 && (
                    <div className={styles.category_btn}>
                        <AdBtn text="Посмотреть все услуги" alwaysVisible />
                    </div>
                )}
            </div>
        </div>
    );
}
