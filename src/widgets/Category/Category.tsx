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
    const [showAll, setShowAll] = useState(false);
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
        setShowAll(true);
    };

    const handleShowLess = () => {
        setShowAll(false);
    };

    if (loading) return <p>Загрузка категорий...</p>;

    // Определяем какие категории показывать
    let visibleItems;
    if (showAll) {
        // Показываем все категории
        visibleItems = categories;
    } else {
        // Показываем ограниченное количество
        visibleItems = isMobile
            ? categories.slice(0, 6) // мобильная версия - 4 категории
            : categories.slice(0, 8); // десктоп - 8 категорий (2 ряда по 4)
    }

    // Проверяем нужно ли показывать кнопку "Посмотреть все"
    const shouldShowViewAll = !showAll && (
        (isMobile && categories.length > 6) ||
        (!isMobile && categories.length > 8)
    );

    // Проверяем нужно ли показывать кнопку "Свернуть"
    const shouldShowShowLess = showAll;

    return (
        <div className={styles.category}>
            <h3>Категории</h3>

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
            </div>

            {/* Кнопка "Посмотреть все" */}
            {shouldShowViewAll && (
                <div className={styles.category_btn_center}>
                    <AdBtn text="Посмотреть все" alwaysVisible onClick={handleViewAll} />
                </div>
            )}

            {/* Кнопка "Свернуть" */}
            {shouldShowShowLess && (
                <div className={styles.category_btn_center}>
                    <AdBtn text="Свернуть" alwaysVisible onClick={handleShowLess} />
                </div>
            )}
        </div>
    );
}