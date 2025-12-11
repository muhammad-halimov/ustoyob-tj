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

    const API_URL = import.meta.env.VITE_API_BASE_URL;

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                setLoading(true);
                const response = await fetch(`${API_URL}/api/categories`);
                console.log('Categories response status:', response.status);

                if (!response.ok) {
                    throw new Error(`Ошибка: ${response.status} ${response.statusText}`);
                }

                const data: CategoryItem[] = await response.json();
                console.log('Categories data received:', data);

                // Проверяем и форматируем данные
                const formattedData = Array.isArray(data) ? data.map(item => ({
                    id: item.id || 0,
                    title: item.title || 'Без названия',
                    description: item.description || '',
                    image: item.image || ''
                })) : [];

                setCategories(formattedData);
            } catch (error) {
                console.error("Ошибка при загрузке категорий:", error);
                setCategories([]); // Устанавливаем пустой массив при ошибке
            } finally {
                setLoading(false);
            }
        };

        fetchCategories();
    }, []);

    // Отслеживаем мобильную ширину
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth <= 480);
        };

        checkMobile();
        window.addEventListener("resize", checkMobile);
        return () => window.removeEventListener("resize", checkMobile);
    }, []);

    const handleCategoryClick = (categoryId: number) => {
        console.log('Category clicked:', categoryId);
        navigate(`/category-tickets/${categoryId}`);
    };

    const handleViewAll = () => {
        setShowAll(true);
    };

    const handleShowLess = () => {
        setShowAll(false);
    };

    // Состояние загрузки
    if (loading) {
        return (
            <div className={styles.category}>
                <h3>Категории</h3>
                <div className={styles.loadingContainer}>
                    <p>Загрузка категорий...</p>
                </div>
            </div>
        );
    }

    // Если нет категорий
    if (!loading && categories.length === 0) {
        return (
            <div className={styles.category}>
                <h3>Категории</h3>
                <div className={styles.noCategories}>
                    <p>Нет доступных категорий</p>
                </div>
            </div>
        );
    }

    // Определяем какие категории показывать
    const getVisibleCategories = () => {
        if (showAll) {
            return categories;
        }

        if (isMobile) {
            // На мобильных показываем 4 или 6 категорий (если меньше - все)
            return categories.slice(0, Math.min(6, categories.length));
        } else {
            // На десктопе показываем 8 категорий (если меньше - все)
            return categories.slice(0, Math.min(8, categories.length));
        }
    };

    const visibleItems = getVisibleCategories();

    // Проверяем нужно ли показывать кнопку "Посмотреть все"
    const shouldShowViewAll = !showAll && (
        (isMobile && categories.length > 6) ||
        (!isMobile && categories.length > 8)
    );

    // Проверяем нужно ли показывать кнопку "Свернуть"
    const shouldShowShowLess = showAll && categories.length > 0;

    // Форматирование URL изображения
    const getImageUrl = (imagePath?: string) => {
        if (!imagePath) {
            return "./fonTest4.png"; // Запасное изображение
        }

        // Проверяем, начинается ли путь с /images/
        if (imagePath.startsWith('/images/')) {
            return `${API_URL}${imagePath}`;
        }

        // Если путь уже содержит http или просто имя файла
        if (imagePath.startsWith('http')) {
            return imagePath;
        }

        // По умолчанию используем путь из API
        return `${API_URL}/images/service_category_photos/${imagePath}`;
    };

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
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                handleCategoryClick(item.id);
                            }
                        }}
                    >
                        <img
                            src={getImageUrl(item.image)}
                            alt={item.title}
                            onError={(e) => {
                                // Если изображение не загружается, используем запасное
                                e.currentTarget.src = "./fonTest4.png";
                            }}
                            loading="lazy"
                        />
                        <p>{item.title}</p>
                    </div>
                ))}
            </div>

            {/* Кнопка "Посмотреть все" */}
            {shouldShowViewAll && (
                <div className={styles.category_btn_center}>
                    <AdBtn
                        text="Посмотреть все"
                        alwaysVisible
                        onClick={handleViewAll}
                    />
                </div>
            )}

            {/* Кнопка "Свернуть" */}
            {shouldShowShowLess && (
                <div className={styles.category_btn_center}>
                    <AdBtn
                        text="Свернуть"
                        alwaysVisible
                        onClick={handleShowLess}
                    />
                </div>
            )}
        </div>
    );
}