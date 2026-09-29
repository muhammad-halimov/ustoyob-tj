import styles from "./Category.module.scss";
import { ShowMore } from '../../../shared/ui/Button/ShowMore/ShowMore';
import { SelectSearch } from '../../../shared/ui/SelectSearch';
import { EmptyState } from '../../../widgets/EmptyState';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination } from 'swiper/modules';
import type { Swiper as SwiperType } from 'swiper';
import 'swiper/css';
import 'swiper/css/pagination';
import { useNavigate } from "react-router-dom";
import { ROUTES } from '../../../app/routers/routes';
import { useTranslation } from 'react-i18next';
import { useLanguageChange, usePersistedState } from '../../../hooks';
import { PageLoader } from '../../../widgets/PageLoader';
import type { Category } from '../../../entities';
import { useEffect, useRef, useState } from "react";
import { getCategories } from '../../../utils/dataCacheUtils';
import { setSessionJSON } from '../../../utils/storageUtils';
import { Img } from '../../../shared/ui/Photo/Img';
import { resolveImage, pickImageFields } from '../../../utils/imageUtils';
import { preloadImages, peekCachedImage } from '../../../utils/imageCacheUtils';
import { Marquee } from '../../../shared/ui/Text/Marquee';

// Общая для начального состояния (синхронный peek кэша, см. ниже) и самого fetchCategories —
// чтобы при попадании в кэш категории сразу приходили в правильном формате, без отдельного
// прохода после первого рендера.
const formatCategories = (data: Category[]): Category[] => {
    const formatted = Array.isArray(data) ? data.map(item => ({
        id: item.id || 0,
        title: item.title || 'Без названия',
        description: item.description || '',
        image: item.image || '',
        ...pickImageFields(item),
        priority: item.priority ?? undefined
    })) : [];
    formatted.sort((a, b) => {
        const pa = a.priority ?? Infinity;
        const pb = b.priority ?? Infinity;
        return pa - pb;
    });
    return formatted;
};

/**
 * Home page category strip.
 * Fetches all categories from the cache and renders them as a horizontal
 * scrollable grid. Clicking a category navigates to its ticket list page
 * and stores the category session for filter restoration on back-navigation.
 */
export default function Category() {
    // Синхронный peek кэша данных (dataCacheUtils.createCachedFetcher.peek) — если категории уже
    // загружались в этой сессии, отдаём их сразу при монтировании вместо пустого [] + спиннера на
    // кадр-другой, пока переотрабатывает fetchCategories ниже (тот всё равно перезапускается, но
    // на кэше резолвится мгновенно и без видимой разницы).
    const cachedCategories = getCategories.peek();
    const [categories, setCategories] = useState<Category[]>(() => cachedCategories ? formatCategories(cachedCategories) : []);
    const [loading, setLoading] = useState(() => cachedCategories === undefined);
    // Синхронно правильное значение с первого рендера (как у visibleCount ниже), а не false с
    // последующей коррекцией в checkMobile() — та коррекция на мобильных экранах ВСЕГДА меняет
    // isMobile false→true при монтировании (это не "юзер изменил размер окна", а просто узнали
    // реальное значение), и это принималось за настоящую смену шириной — эффект ниже на 137-й
    // строке видел "изменение" isMobile и сбрасывал только что восстановленные из localStorage
    // visibleCount/mobilePageExpand обратно к дефолту, причём именно на мобильных: на десктопе
    // false совпадает с реальным значением, никакого лишнего срабатывания не было, поэтому баг
    // ни разу не поймался при тестах на desktop-ширине.
    const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 768);
    // usePersistedState (sessionStorage), не голый useState — иначе "Показать ещё" сбрасывался
    // при любом переходе туда-сюда по страницам (компонент размонтируется при уходе со страницы
    // и теряет обычный useState, а sessionStorage переживает это в пределах вкладки/сессии).
    const [visibleCount, setVisibleCount] = usePersistedState('category:visibleCount', window.innerWidth <= 768 ? 6 : 8);
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    // Мобилка: две НЕЗАВИСИМЫЕ системы навигации по одному и тому же свайперу (см. рендер ниже).
    // Жест (свайп) всегда даёт доступ ко ВСЕМ категориям — свайпер режет их на страницы по
    // pageSize штук, сколько бы их ни было. Кнопка "Показать ещё/Меньше" не листает страницы —
    // она меняет сам pageSize (сколько категорий помещается на одну страницу разом), т.е. работает
    // ровно как раньше — "разворачивает" блок, добавляя ещё initialCount категорий к каждой
    // странице, просто теперь страниц из-за этого становится меньше, а не блок становится длиннее
    // вниз. mobilePageExpand = во сколько раз initialCount увеличен кнопкой.
    const swiperRef = useRef<SwiperType | null>(null);
    const [mobilePageExpand, setMobilePageExpand] = usePersistedState('category:mobilePageExpand', 1);
    // "Сброс при смене isMobile" ниже не должен срабатывать на самом первом запуске — isMobile
    // стартует как false и почти сразу переустанавливается в checkMobile() реальным значением,
    // что само по себе уже "смена" и без этой защиты стирало бы то, что только что восстановили
    // из sessionStorage выше, ещё до того как пользователь вообще что-то увидел.
    const isFirstMobileCheck = useRef(true);
    const navigate = useNavigate();
    const { t } = useTranslation(['common', 'category']); // Добавьте перевод

    const fetchCategories = async () => {
        try {
            const data: Category[] = await getCategories();
            const formattedData = formatCategories(data);

            // Сначала иконки, потом список: ждём (до 3 с) иконки первой видимой порции — они грузятся
            // через кэш картинок, и `<Img cache>` берёт их из памяти мгновенно, поэтому категории
            // появляются сразу с иконками, а не «вспыхивают» пустыми плашками. Остальные (за «Показать
            // ещё») прогреваем в фоне. На повторном заходе всё уже в кэше — ожидания нет.
            const iconUrl = (c: typeof formattedData[number]) => resolveImage(c, 'full', 'uploads/categories')?.src ?? '';
            const initialCount = window.innerWidth <= 768 ? 6 : 8;
            // 8с, не дефолтные 3 — на реальной мобильной сети (не тестовой wifi-заглушке) 3с иногда
            // не хватало докачать все initialCount иконок; те, что не успели, оставались
            // незакэшированными и мигали BlurHash при каждом следующем монтировании страницы, даже
            // когда сам JS-контекст никуда не девался (подтверждено диагностикой на реальном устройстве).
            await preloadImages(formattedData.slice(0, initialCount).map(iconUrl).filter(Boolean), 8000);
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
            // 768, не 480 — та же граница, что и в Category.module.scss (сетка/шрифты меняются
            // на ней), и что уже используется в Profile.tsx. Раньше здесь было 480 — из-за
            // расхождения с CSS-брейкпоинтом на ширинах 481–768px верстка уже переключалась на
            // мобильную 3-колоночную сетку, а JS всё ещё думал, что это десктоп, и показывал
            // desktop-порцию (8 вместо 6).
            setIsMobile(window.innerWidth <= 768);
        };

        checkMobile();
        window.addEventListener("resize", checkMobile);
        return () => window.removeEventListener("resize", checkMobile);
    }, []);

    const handleCategoryClick = (categoryId: string | number, categoryTitle: string, categoryDescription?: string) => {
        console.log('Category clicked:', categoryId);
        navigate(ROUTES.CATEGORY_TICKETS_BY_ID(categoryId), { state: { categoryName: categoryTitle, categoryDescription } });
    };

    // Reset visibleCount when screen size changes (не на первом запуске — см. isFirstMobileCheck
    // выше, иначе восстановленное из sessionStorage состояние стиралось бы сразу при монтировании)
    useEffect(() => {
        if (isFirstMobileCheck.current) {
            isFirstMobileCheck.current = false;
            return;
        }
        setVisibleCount(isMobile ? 6 : 8);
        setMobilePageExpand(1);
    }, [isMobile, setVisibleCount, setMobilePageExpand]);

    const handleSearch = (query: string) => {
        setSearchQuery(query);
        if (query.trim()) {
            setVisibleCount(isMobile ? 6 : 8); // При поиске сбрасываем
            setMobilePageExpand(1);
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
    // Размер одной страницы свайпера — растёт кнопкой "Показать ещё" (см. mobilePageExpand выше),
    // капается на общем числе категорий, чтобы не создавать одну гигантскую пустую "страницу".
    const mobilePageSize = Math.min(initialCount * mobilePageExpand, filteredCategories.length) || initialCount;

    // «Показать ещё»: как и при первой загрузке — сначала иконки новой порции, потом сами категории (без
    // блюра/пустых плашек). Обычно порция уже прогрета в фоне (см. fetchCategories) и ждать не приходится;
    // если нет — кнопка крутит спиннер до 3 с и порция показывается в любом случае.
    const handleShowMore = async () => {
        if (isLoadingMore) return;
        const next = Math.min(visibleCount + initialCount, filteredCategories.length);
        const iconUrls = filteredCategories.slice(visibleCount, next)
            .map(c => resolveImage(c, 'full', 'uploads/categories')?.src ?? '')
            .filter(Boolean);
        // Обычная "Показать ещё" порция уже прогрета в фоне (см. fetchCategories) — не мелькаем
        // спиннером кнопки, если для неё и так нечего ждать.
        if (iconUrls.every(url => peekCachedImage(url))) {
            setVisibleCount(next);
            return;
        }
        setIsLoadingMore(true);
        try {
            await preloadImages(iconUrls);
        } finally {
            setVisibleCount(next);
            setIsLoadingMore(false);
        }
    };
    const visibleItems = searchQuery.trim()
        ? filteredCategories
        : filteredCategories.slice(0, visibleCount);

    // Общая плитка категории — используется и в обычной сетке (десктоп/поиск), и в свайпере
    // (мобилка): функционально они делают одно и то же ("показать больше" категорий), просто
    // десктоп раскрывает сетку вниз по клику, а мобилка — свайпом вбок, без отдельной кнопки.
    const renderCategoryTile = (item: typeof filteredCategories[number]) => (
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
                // падает 500 (не кэшируется). BlurHash — фон на время загрузки.
                image={resolveImage(item, 'full', 'uploads/categories')}
                placeholder="/img/icons/misc/fonTest4.png"
                alt={item.title}
            />
            <p>
                <Marquee text={item.title} alwaysScroll/>
            </p>
        </div>
    );

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

            {/* Мобилка (и не в поиске): ВСЕ filteredCategories, порезанные на страницы по
                mobilePageSize штук (см. mobilePageExpand выше) — свайп всегда достаёт до всех
                категорий, независимо от того, разворачивали ли блок кнопкой. Каждая страница —
                целый блок в привычной 3-колоночной сетке (styles.category_item, та же вёрстка,
                что и на десктопе), листается свайпом целиком. */}
            {isMobile && !searchQuery.trim() && filteredCategories.length > 0 ? (
                <>
                    <Swiper
                        className={styles.category_swiper}
                        slidesPerView={1}
                        spaceBetween={16}
                        // Без autoHeight контейнер свайпера держит высоту самой полной страницы
                        // даже после перехода на короткую (последнюю, неполную) — под её плитками
                        // оставалась "мёртвая" зона вне реального слайда, свайп там не
                        // подхватывался. autoHeight подгоняет высоту под активный слайд при смене.
                        autoHeight
                        // Точки — во ВНЕШНИЙ контейнер (.category_pagination, отдельный элемент
                        // ПОСЛЕ </Swiper>), а не в дефолтный .swiper-pagination ВНУТРИ самого
                        // свайпера: та полоса (даже с autoHeight) лежит в padding-bottom самого
                        // .category_swiper, т.е. вне границ .swiper-slide, и свайп/клик там не
                        // регистрировался — тот же баг с "мёртвой зоной", просто мельче.
                        pagination={{ el: `.${styles.category_pagination}`, clickable: true }}
                        modules={[Pagination]}
                        onSwiper={(s) => { swiperRef.current = s; }}
                    >
                        {Array.from(
                            { length: Math.ceil(filteredCategories.length / mobilePageSize) },
                            (_, pageIndex) => filteredCategories.slice(pageIndex * mobilePageSize, pageIndex * mobilePageSize + mobilePageSize),
                        ).map((page, pageIndex) => (
                            <SwiperSlide key={pageIndex}>
                                <div className={styles.category_item}>
                                    {page.map((item) => renderCategoryTile(item))}
                                </div>
                            </SwiperSlide>
                        ))}
                    </Swiper>
                    <div className={styles.category_pagination} />
                </>
            ) : (
                <div className={styles.category_item}>
                    {visibleItems.length > 0 ? (
                        visibleItems.map((item) => renderCategoryTile(item))
                    ) : searchQuery.trim() ? (
                        <EmptyState
                            title={t('category:noResults', 'Категории не найдены')}
                            onRefresh={fetchCategories}
                        />
                    ) : null}
                </div>
            )}

            {/* Кнопка "Показать ещё" / "Свернуть". На мобилке она не листает свайпер (это отдельная,
                независимая система навигации — жест) — она укрупняет/уменьшает саму страницу
                (mobilePageExpand), ровно как раньше "разворачивала" список, просто здесь это
                значит "меньше страниц, каждая крупнее", а не "длиннее вниз". После клика возвращаем
                свайпер на первую страницу — иначе activeIndex мог бы указывать в никуда, если
                страниц из-за нового размера стало меньше, чем было. */}
            {!searchQuery.trim() && (
                isMobile ? (
                    filteredCategories.length > initialCount && (
                        <div className={styles.category_btn_center}>
                            <ShowMore
                                expanded={mobilePageExpand > 1}
                                canLoadMore={mobilePageSize < filteredCategories.length}
                                onShowMore={() => { setMobilePageExpand(l => l + 1); swiperRef.current?.slideTo(0); }}
                                onShowLess={() => { setMobilePageExpand(l => Math.max(1, l - 1)); swiperRef.current?.slideTo(0); }}
                                onClear={() => { setMobilePageExpand(1); swiperRef.current?.slideTo(0); }}
                                showMoreText={t('common:app.showMore')}
                                showLessText={t('common:app.showLess')}
                                horizontal
                            />
                        </div>
                    )
                ) : (
                    filteredCategories.length > initialCount && (
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
                    )
                )
            )}
        </div>
    );
}