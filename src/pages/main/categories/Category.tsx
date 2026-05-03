import styles from "./Category.module.scss";
import { ShowMore } from '../../../shared/ui/Button/ShowMore/ShowMore.tsx';
import { Clear } from '../../../shared/ui/Button/Clear/Clear.tsx';
import { EmptyState } from '../../../widgets/EmptyState';
import { useNavigate } from "react-router-dom";
import { ROUTES } from '../../../app/routers/routes.ts';
import { useTranslation } from 'react-i18next';
import { useLanguageChange } from '../../../hooks';
import { PageLoader } from '../../../widgets/PageLoader';
import { useEffect, useState } from "react";

interface CategoryItem {
    id: number;
    title: string;
    description?: string;
    image?: string;
    priority?: number;
}

export default function Category() {
    const [categories, setCategories] = useState<CategoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [isMobile, setIsMobile] = useState(false);
    const [visibleCount, setVisibleCount] = useState(() => window.innerWidth <= 480 ? 6 : 8);
    const [searchQuery, setSearchQuery] = useState<string>('');
    const navigate = useNavigate();
    const { t } = useTranslation(['common', 'category']); // Добавьте перевод

    const API_URL = import.meta.env.VITE_API_BASE_URL;

    const fetchCategories = async () => {
        try {
            setLoading(true);
            const locale = localStorage.getItem('i18nextLng') || 'ru';
            const response = await fetch(`${API_URL}/api/categories?locale=${locale}`);
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
                image: item.image || '',
                priority: item.priority ?? undefined
            })) : [];

            // Сортируем по priority (по возрастанию), элементы без priority — в конец
            formattedData.sort((a, b) => {
                const pa = a.priority ?? Infinity;
                const pb = b.priority ?? Infinity;
                return pa - pb;
            });

            setCategories(formattedData);
            // Cache for category tickets page title
            try { sessionStorage.setItem('categories-list', JSON.stringify(formattedData)); } catch { /* empty */ }
        } catch (error) {
            console.error("Ошибка при загрузке категорий:", error);
            setCategories([]); // Устанавливаем пустой массив при ошибке
        } finally {
            setLoading(false);
        }
    };

    useLanguageChange(() => {
        // При смене языка переполучаем данные для обновления локализованного контента
        fetchCategories();
    });

    useEffect(() => {
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

    const handleCategoryClick = (categoryId: number, categoryTitle: string) => {
        console.log('Category clicked:', categoryId);
        navigate(ROUTES.CATEGORY_TICKETS_BY_ID(categoryId), { state: { categoryName: categoryTitle } });
    };

    // Reset visibleCount when screen size changes
    useEffect(() => {
        setVisibleCount(isMobile ? 6 : 8);
    }, [isMobile]);

    const handleSearch = (query: string) => {
        setSearchQuery(query);
        if (query.trim()) {
            setVisibleCount(isMobile ? 6 : 8); // При поиске сбрасываем
        }
    };

    const getFilteredCategories = () => {
        if (!searchQuery.trim()) {
            return categories;
        }

        const searchLower = searchQuery.toLowerCase().trim();
        return categories.filter(category =>
            category.title.toLowerCase().includes(searchLower) ||
            (category.description && category.description.toLowerCase().includes(searchLower))
        );
    };

    // Состояние загрузки
    if (loading) {
        return (
            <div className={styles.category}>
                <h3 className={styles.category_title}>{t('category:title', 'Категории')}</h3>
                <PageLoader text={t('category:loading', 'Загрузка категорий...')} fullPage={false} />
            </div>
        );
    }

    // Если нет категорий
    if (!loading && categories.length === 0) {
        return (
            <div className={styles.category}>
                <h3 className={styles.category_title}>{t('category:title', 'Категории')}</h3>
                <EmptyState
                    title={t('category:noCategories', 'Нет доступных категорий')}
                    onRefresh={fetchCategories}
                />
            </div>
        );
    }

    // Определяем какие категории показывать
    const filteredCategories = getFilteredCategories();
    const initialCount = isMobile ? 6 : 8;
    const visibleItems = searchQuery.trim()
        ? filteredCategories
        : filteredCategories.slice(0, visibleCount);

    // Форматирование URL изображения
    const getImageUrl = (imagePath?: string) => {
        if (!imagePath) {
            return "./fonTest4.png"; // Запасное изображение
        }

        // Проверяем, начинается ли путь с /uploads/ или /images/
        if (imagePath.startsWith('/uploads/') || imagePath.startsWith('/images/')) {
            return `${API_URL}${imagePath}`;
        }

        // Если путь уже содержит http или просто имя файла
        if (imagePath.startsWith('http')) {
            return imagePath;
        }

        // По умолчанию используем путь из API
        return `${API_URL}/uploads/categories/${imagePath}`;
    };

    return (
        <div className={styles.category}>
            <h3 className={styles.category_title}>{t('category:title', 'Категории')}</h3>

            {/* Поле поиска */}
            <div className={styles.category_search}>
                <div className={styles.search_input_wrapper}>
                    <svg className={styles.search_icon} width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <input
                        type="text"
                        className={styles.search_input}
                        placeholder={t('category:searchCategories', 'Поиск категорий...')}
                        value={searchQuery}
                        onChange={(e) => handleSearch(e.target.value)}
                    />
                    {searchQuery && (
                        <Clear onClick={() => handleSearch('')} />
                    )}
                </div>
            </div>

            <div className={styles.category_item}>
                {visibleItems.length > 0 ? (
                    visibleItems.map((item) => (
                        <div
                            key={item.id}
                            className={styles.category_item_step}
                            onClick={() => handleCategoryClick(item.id, item.title)}
                            style={{ cursor: 'pointer' }}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    handleCategoryClick(item.id, item.title);
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
                    ))
                ) : searchQuery.trim() ? (
                    <EmptyState
                        title={t('category:noResults', 'Категории не найдены')}
                        onRefresh={fetchCategories}
                    />
                ) : null}
            </div>

            {/* Кнопка "Показать ещё" / "Свернуть" */}
            {!searchQuery.trim() && filteredCategories.length > initialCount && (
                <div className={styles.category_btn_center}>
                    <ShowMore
                        expanded={visibleCount > initialCount}
                        canLoadMore={visibleCount < filteredCategories.length}
                        onShowMore={() => setVisibleCount(c => Math.min(c + initialCount, filteredCategories.length))}
                        onShowLess={() => setVisibleCount(c => Math.max(c - initialCount, initialCount))}
                        onClear={() => setVisibleCount(initialCount)}
                        showMoreText={t('common:app.showMore')}
                        showLessText={t('common:app.showLess')}
                    />
                </div>
            )}
        </div>
    );
}