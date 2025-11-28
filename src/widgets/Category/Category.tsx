import styles from "./Category.module.scss";
import { AdBtn } from "../../shared/ui/button/HeaderButton/AdBtn.tsx";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

interface CategoryItem {
    id: number;
    title: string;
    description?: string;
    image?: string;
}

export default function Category() {
    const [categories, setCategories] = useState<CategoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [isMobile, setIsMobile] = useState(false);
    const navigate = useNavigate();

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

    // отслеживаем мобильную ширину
    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth <= 480);
        check();
        window.addEventListener("resize", check);
        return () => window.removeEventListener("resize", check);
    }, []);

    const handleCategoryClick = (categoryId: number) => {
        navigate(`/category-tickets/${categoryId}`);
    };

    const handleViewAll = () => {
        navigate('/tickets');
    };

    if (loading) return <p>Загрузка категорий...</p>;

    const visibleItems = isMobile
        ? categories.slice(0, 4) // мобильная версия
        : categories.slice(0, 12); // десктоп как раньше

    return (
        <div className={styles.category}>
            <h3>Категории услуг</h3>

            <div className={styles.category_item}>
                {visibleItems.map((item) => (
                    <div
                        key={item.id}
                        className={styles.category_item_step}
                        onClick={() => handleCategoryClick(item.id)}
                        style={{ cursor: 'pointer' }}
                    >
                        <img
                            src={item.image ? `${API_URL}/images/service_category_photos/${item.image}` : "./fonTest4.png"}
                            alt={item.title}
                        />
                        <p>{item.title}</p>
                    </div>
                ))}

                {/* Мобильная версия — если категорий > 4 → показать кнопку */}
                {isMobile && categories.length > 4 && (
                    <div className={styles.category_btn}>
                        <AdBtn text="Посмотреть все услуги" alwaysVisible onClick={handleViewAll} />
                    </div>
                )}

                {/* Десктоп — если категорий > 12 → старая кнопка */}
                {!isMobile && categories.length > 12 && (
                    <div className={styles.category_btn}>
                        <AdBtn text="Посмотреть все услуги" alwaysVisible onClick={handleViewAll} />
                    </div>
                )}
            </div>
        </div>
    );
}