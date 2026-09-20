import { useMemo, useState } from 'react';
import type * as React from 'react';
import type { ResolvedImage } from '../../../../entities';
import { blurhashToDataUrl } from '../../../../utils/blurhashUtils';
import { isImageVariantFailed, markImageVariantFailed } from '../../../../utils/imageFailureCache';
import { peekCachedImage, getCachedImage, evictCachedImage } from '../../../../utils/imageCacheUtils';

type NativeImgProps = Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src' | 'onError'>;

interface ImgProps extends NativeImgProps {
    /** Результат `resolveImage()`/`resolveAvatar()`. Приоритетнее `src`/`fallbacks`/`blurhash`. */
    image?: ResolvedImage | null;
    /** Или готовый src, если резолвить нечего (статичные/локальные картинки). */
    src?: string;
    fallbacks?: string[];
    blurhash?: string | null;
    /** Последний рубеж, когда не загрузилось ничего (например, `/img/icons/icons/default_user.png`). */
    placeholder?: string;
    /** Доп. класс, только пока показывается `placeholder` (например, другой размер у иконки-заглушки). */
    placeholderClassName?: string;
    /**
     * Кэшировать файл в памяти (imageCacheUtils: TTL + дедупликация, как кэш данных в dataCacheUtils):
     * повторный показ той же картинки — мгновенно из `blob:`, без сети и без редиректов Liip. Для небольших
     * повторяющихся картинок (иконки категорий, аватары); для фото и галерей не нужно.
     */
    cache?: boolean;
    onError?: React.ReactEventHandler<HTMLImageElement>;
    onLoad?: React.ReactEventHandler<HTMLImageElement>;
}

/**
 * `<img>` для картинок из API: лениво грузится, показывает BlurHash-фон, пока файл в пути, и при
 * ошибке идёт по цепочке `src → fallbacks[] → placeholder` (вместо пустоты/битой иконки).
 * BlurHash рисуется фоном самого <img>, раскладка не меняется — стили/классы вызывающего работают
 * как у обычного <img>. Если ничего показать нечего (`image` = null и нет `src`/`placeholder`) — null.
 */
export function Img({ image, src, fallbacks, blurhash, placeholder, placeholderClassName, cache = false, loading = 'lazy', style, className, onError, onLoad, ...rest }: ImgProps) {
    const primary = image?.src ?? src ?? '';
    const chain = useMemo(
        () => {
            const all = [primary, ...(image?.fallbacks ?? fallbacks ?? [])].filter(Boolean);
            // Варианты, которые в этой сессии уже падали (5xx у Liip), пропускаем сразу — без лишнего
            // запроса и мигания. Последний источник оставляем всегда, иначе цепочка опустела бы.
            const usable = all.filter((s, i) => i === all.length - 1 || !isImageVariantFailed(s));
            return usable;
        },
        // fallbacks — массив: сравниваем по содержимому, а не по ссылке, иначе сброс на каждый рендер
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [primary, (image?.fallbacks ?? fallbacks ?? []).join('|')],
    );

    // Индекс попытки привязан к primary: при смене картинки отсчёт идёт с начала без эффекта
    // (эффект дал бы кадр со старым индексом и новым src).
    const [attempt, setAttempt] = useState<{ forSrc: string; idx: number }>({ forSrc: primary, idx: 0 });
    const idx = attempt.forSrc === primary ? attempt.idx : 0;

    const exhausted = idx >= chain.length;
    const current = exhausted ? placeholder : chain[idx];
    const hash = image?.blurhash ?? blurhash ?? undefined;

    // BlurHash-фон нужен только пока файл в пути: после загрузки снимаем, иначе он просвечивал бы
    // через прозрачные PNG/WebP и поля object-fit: contain.
    const [loadedSrc, setLoadedSrc] = useState<string | null>(null);
    const loaded = loadedSrc === current;
    // Кэш: если файл уже лежит в памяти — сразу его blob: (синхронно, без мигания), иначе обычный URL, а
    // в кэш файл кладём после первой успешной загрузки (fetch попадёт в HTTP-кэш браузера — второй раз
    // не качаем). Если сам blob: не загрузился — выбрасываем из кэша и идём по сети.
    const [badCached, setBadCached] = useState<string | null>(null);
    const cachedSrc = cache && current && !exhausted && badCached !== current ? peekCachedImage(current) : undefined;

    // Картинка уже в кэше (blob:) — файл локальный, ждать нечего: BlurHash-фон не показываем вообще (иначе он
    // мелькает пару кадров, пока браузер декодирует blob). Фон — только пока реально идёт загрузка по сети.
    const placeholderBg = useMemo(
        () => (exhausted || loaded || cachedSrc ? undefined : blurhashToDataUrl(hash)),
        [hash, exhausted, loaded, cachedSrc],
    );

    if (!current) return null;

    const handleError: React.ReactEventHandler<HTMLImageElement> = (e) => {
        if (cachedSrc && current) {
            evictCachedImage(current);
            setBadCached(current);
            return;
        }
        onError?.(e);
        if (!exhausted && current) markImageVariantFailed(current);
        // Уже показываем placeholder — дальше отката нет, иначе бесконечный цикл ошибок.
        if (exhausted) return;
        setAttempt({ forSrc: primary, idx: idx + 1 });
    };

    return (
        <img
            {...rest}
            onLoad={(e) => {
                setLoadedSrc(current);
                if (cache && !cachedSrc && !exhausted) void getCachedImage(current);
                onLoad?.(e);
            }}
            src={cachedSrc ?? current}
            className={exhausted && placeholderClassName ? [className, placeholderClassName].filter(Boolean).join(' ') : className}
            // Из кэша — сразу, без ленивой отсрочки: lazy держал бы уже готовый blob: до срабатывания observer'а.
            loading={cachedSrc ? 'eager' : loading}
            decoding="async"
            // Внешние аватары (Google/Facebook) иногда режут по Referer — не отправляем его.
            referrerPolicy={image?.external ? 'no-referrer' : rest.referrerPolicy}
            style={placeholderBg
                ? { backgroundImage: `url(${placeholderBg})`, backgroundSize: 'cover', backgroundPosition: 'center', ...style }
                : style}
            onError={handleError}
        />
    );
}
