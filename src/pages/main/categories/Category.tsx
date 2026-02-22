import styles from "./Category.module.scss";
import { AdBtn } from "../../../shared/ui/Button/HeaderButton/AdBtn.tsx";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ROUTES } from '../../../app/routers/routes.ts';
import { useTranslation } from 'react-i18next';
import { useLanguageChange } from '../../../hooks/useLanguageChange.ts';
import { PageLoader } from '../../../widgets/PageLoader';

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
    const [showAll, setShowAll] = useState(false);
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

    const handleCategoryClick = (categoryId: number) => {
        console.log('Category clicked:', categoryId);
        navigate(ROUTES.CATEGORY_TICKETS_BY_ID(categoryId));
    };

    const handleViewAll = () => {
        setShowAll(true);
    };

    const handleShowLess = () => {
        setShowAll(false);
    };

    const handleSearch = (query: string) => {
        setSearchQuery(query);
        if (query.trim()) {
            setShowAll(false); // При поиске сбрасываем "показать все"
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
                <h3>{t('category:title', 'Категории')}</h3>
                <PageLoader text={t('category:loading', 'Загрузка категорий...')} fullPage={false} />
            </div>
        );
    }

    // Если нет категорий
    if (!loading && categories.length === 0) {
        return (
            <div className={styles.category}>
                <h3>{t('category:title', 'Категории')}</h3>
                <div className={styles.noCategories}>
                    <p>{t('category:noCategories', 'Нет доступных категорий')}</p>
                </div>
            </div>
        );
    }

    // Определяем какие категории показывать
    const getVisibleCategories = () => {
        const filteredCategories = getFilteredCategories();
        
        // Если есть поиск, показываем все результаты
        if (searchQuery.trim()) {
            return filteredCategories;
        }
        
        if (showAll) {
            return filteredCategories;
        }

        if (isMobile) {
            // На мобильных показываем 4 или 6 категорий (если меньше - все)
            return filteredCategories.slice(0, Math.min(6, filteredCategories.length));
        } else {
            // На десктопе показываем 8 категорий (если меньше - все)
            return filteredCategories.slice(0, Math.min(8, filteredCategories.length));
        }
    };

    const visibleItems = getVisibleCategories();

    // Проверяем нужно ли показывать кнопку "Посмотреть все"
    const shouldShowViewAll = !showAll && !searchQuery.trim() && (
        (isMobile && categories.length > 6) ||
        (!isMobile && categories.length > 8)
    );

    // Проверяем нужно ли показывать кнопку "Свернуть"
    const shouldShowShowLess = showAll && !searchQuery.trim() && categories.length > 0;

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
            <h3>{t('category:title', 'Категории')}</h3>
            
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
                        <button 
                            className={styles.clear_search}
                            onClick={() => handleSearch('')}
                            aria-label="Очистить поиск"
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                        </button>
                    )}
                </div>
            </div>

            <div className={styles.category_item}>
                {visibleItems.length > 0 ? (
                    visibleItems.map((item) => (
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
                    ))
                ) : searchQuery.trim() ? (
                    <div className={styles.no_results}>
                        <p>{t('category:noResults', 'Категории не найдены')}</p>
                    </div>
                ) : null}
            </div>

            {/* Кнопка "Посмотреть все" */}
            {shouldShowViewAll && (
                <div className={styles.category_btn_center}>
                    <AdBtn
                        text={t('category:viewAll', 'Посмотреть все')} // Передаем переведенный текст
                        alwaysVisible={true}
                        onClick={handleViewAll}
                    />
                </div>
            )}

            {/* Кнопка "Свернуть" */}
            {shouldShowShowLess && (
                <div className={styles.category_btn_center}>
                    <AdBtn
                        text={t('category:showLess', 'Свернуть')} // Передаем переведенный текст
                        alwaysVisible={true}
                        onClick={handleShowLess}
                    />
                </div>
            )}
        </div>
    );
}