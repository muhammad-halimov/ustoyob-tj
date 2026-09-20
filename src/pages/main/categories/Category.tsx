import styles from "./Category.module.scss";
import { ShowMore } from '../../../shared/ui/Button/ShowMore/ShowMore';
import { SelectSearch } from '../../../shared/ui/SelectSearch';
import { EmptyState } from '../../../widgets/EmptyState';
import { Marquee } from '../../../shared/ui/Text/Marquee';
import { useNavigate } from "react-router-dom";
import { ROUTES } from '../../../app/routers/routes';
import { useTranslation } from 'react-i18next';
import { useLanguageChange } from '../../../hooks';
import { PageLoader } from '../../../widgets/PageLoader';
import type { Category } from '../../../entities';
import { useEffect, useState } from "react";
import { getCategories } from '../../../utils/dataCacheUtils';
import { setSessionJSON } from '../../../utils/storageUtils';
import { Img } from '../../../shared/ui/Photo/Img';
import { resolveImage, pickImageFields } from '../../../utils/imageUtils';
import { preloadImages } from '../../../utils/imageCacheUtils';

/**
 * Home page category strip.
 * Fetches all categories from the cache and renders them as a horizontal
 * scrollable grid. Clicking a category navigates to its ticket list page
 * and stores the category session for filter restoration on back-navigation.
 */
export default function Category() {
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [isMobile, setIsMobile] = useState(false);
    const [visibleCount, setVisibleCount] = useState(() => window.innerWidth <= 480 ? 6 : 8);
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const navigate = useNavigate();
    const { t } = useTranslation(['common', 'category']); // Добавьте перевод

    const fetchCategories = async () => {
        try {
            const data: Category[] = await getCategories();

            // Проверяем и форматируем данные
            const formattedData = Array.isArray(data) ? data.map(item => ({
                id: item.id || 0,
                title: item.title || 'Без названия',
                description: item.description || '',
                image: item.image || '',
                ...pickImageFields(item),
                priority: item.priority ?? undefined
            })) : [];

            // Сортируем по priority (по возрастанию), элементы без priority — в конец
            formattedData.sort((a, b) => {
                const pa = a.priority ?? Infinity;
                const pb = b.priority ?? Infinity;
                return pa - pb;
            });

            // Сначала иконки, потом список: ждём (до 3 с) иконки первой видимой порции — они грузятся
            // через кэш картинок, и `<Img cache>` берёт их из памяти мгновенно, поэтому категории
            // появляются сразу с иконками, а не «вспыхивают» пустыми плашками. Остальные (за «Показать
            // ещё») прогреваем в фоне. На повторном заходе всё уже в кэше — ожидания нет.
            const iconUrl = (c: typeof formattedData[number]) => resolveImage(c, 'full', 'uploads/categories')?.src ?? '';
            const initialCount = window.innerWidth <= 480 ? 6 : 8;
            await preloadImages(formattedData.slice(0, initialCount).map(iconUrl).filter(Boolean));
            void preloadImages(formattedData.slice(initialCount).map(iconUrl).filter(Boolean), 15000);

            setCategories(formattedData);
            // Cache for category tickets page title
            setSessionJSON('categories-list', formattedData);
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

    const handleCategoryClick = (categoryId: string | number, categoryTitle: string, categoryDescription?: string) => {
        console.log('Category clicked:', categoryId);
        navigate(ROUTES.CATEGORY_TICKETS_BY_ID(categoryId), { state: { categoryName: categoryTitle, categoryDescription } });
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

    // «Показать ещё»: как и при первой загрузке — сначала иконки новой порции, потом сами категории (без
    // блюра/пустых плашек). Обычно порция уже прогрета в фоне (см. fetchCategories) и ждать не приходится;
    // если нет — кнопка крутит спиннер до 3 с и порция показывается в любом случае.
    const handleShowMore = async () => {
        if (isLoadingMore) return;
        const next = Math.min(visibleCount + initialCount, filteredCategories.length);
        setIsLoadingMore(true);
        try {
            await preloadImages(
                filteredCategories.slice(visibleCount, next)
                    .map(c => resolveImage(c, 'full', 'uploads/categories')?.src ?? '')
                    .filter(Boolean),
            );
        } finally {
            setVisibleCount(next);
            setIsLoadingMore(false);
        }
    };
    const visibleItems = searchQuery.trim()
        ? filteredCategories
        : filteredCategories.slice(0, visibleCount);

    return (
        <div className={styles.category}>
            <h3 className={styles.category_title}>{t('category:title', 'Категории')}</h3>

            {/* Поле поиска */}
            <div className={styles.category_search}>
                <SelectSearch
                    altMode
                    options={[]}
                    value={searchQuery}
                    onChange={(val) => handleSearch(val)}
                    placeholder={t('category:searchCategories')}
                    className={styles.search_input_wrapper}
                />
            </div>

            <div className={styles.category_item}>
                {visibleItems.length > 0 ? (
                    visibleItems.map((item) => (
                        <div
                            key={item.id}
                            className={styles.category_item_step}
                            onClick={() => handleCategoryClick(item.id, item.title, item.description)}
                            style={{ cursor: 'pointer' }}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    handleCategoryClick(item.id, item.title, item.description);
                                }
                            }}
                        >
                            <Img
                                cache
                                // Иконка категории — PNG ~18 КБ: берём оригинал (иммутабельный, кэшируется браузером и
                                // Cloudflare на год), а не превью — оно для них не нужно, а на бэке 480 px из RGBA-PNG
                                // падает 500 (не кэшируется → каждый заход запрос заново). BlurHash — фон на время загрузки.
                                image={resolveImage(item, 'full', 'uploads/categories')}
                                placeholder="/img/icons/misc/fonTest4.png"
                                alt={item.title}
                            />
                            <p>
                                <Marquee text={item.title} alwaysScroll duration={20}/>
                            </p>
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
                        onShowMore={handleShowMore}
                        loading={isLoadingMore}
                        onShowLess={() => setVisibleCount(c => Math.max(c - initialCount, initialCount))}
                        onClear={() => setVisibleCount(initialCount)}
                        showMoreText={t('common:app.showMore')}
                        showLessText={t('common:app.showLess')}
                        horizontal
                    />
                </div>
            )}
        </div>
    );
}