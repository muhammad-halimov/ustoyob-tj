import { useMemo, useState } from 'react';
import type * as React from 'react';
import type { ResolvedImage } from '../../../../entities';
import { blurhashToDataUrl } from '../../../../utils/blurhashUtils';

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
    onError?: React.ReactEventHandler<HTMLImageElement>;
    onLoad?: React.ReactEventHandler<HTMLImageElement>;
}

/**
 * `<img>` для картинок из API: лениво грузится, показывает BlurHash-фон, пока файл в пути, и при
 * ошибке идёт по цепочке `src → fallbacks[] → placeholder` (вместо пустоты/битой иконки).
 * BlurHash рисуется фоном самого <img>, раскладка не меняется — стили/классы вызывающего работают
 * как у обычного <img>. Если ничего показать нечего (`image` = null и нет `src`/`placeholder`) — null.
 */
export function Img({ image, src, fallbacks, blurhash, placeholder, placeholderClassName, loading = 'lazy', style, className, onError, onLoad, ...rest }: ImgProps) {
    const primary = image?.src ?? src ?? '';
    const chain = useMemo(
        () => [primary, ...(image?.fallbacks ?? fallbacks ?? [])].filter(Boolean),
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
    const placeholderBg = useMemo(() => (exhausted || loaded ? undefined : blurhashToDataUrl(hash)), [hash, exhausted, loaded]);

    if (!current) return null;

    const handleError: React.ReactEventHandler<HTMLImageElement> = (e) => {
        onError?.(e);
        // Уже показываем placeholder — дальше отката нет, иначе бесконечный цикл ошибок.
        if (exhausted) return;
        setAttempt({ forSrc: primary, idx: idx + 1 });
    };

    return (
        <img
            {...rest}
            onLoad={(e) => { setLoadedSrc(current); onLoad?.(e); }}
            src={current}
            className={exhausted && placeholderClassName ? [className, placeholderClassName].filter(Boolean).join(' ') : className}
            loading={loading}
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
