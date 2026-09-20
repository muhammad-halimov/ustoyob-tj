<?php

namespace App\Service\Image;

use kornrunner\Blurhash\Blurhash;

/**
 * BlurHash — крошечная строка (~28 символов), из которой клиент мгновенно
 * рисует размытую версию картинки, пока грузится настоящая ("сначала
 * заглушка, потом фото"). Считается ОДИН раз — при загрузке файла
 * (ImageBlurhashListener) или командой app:images:backfill-blurhash для уже
 * загруженных — и хранится в БД (imageBlurhash), а не пересчитывается на
 * каждом ответе.
 *
 * Пиксели берём не из оригинала целиком, а из его уменьшенной до ~32 px копии
 * (GD): BlurHash всё равно размытый, а кодирование идёт за O(w*h*компоненты) —
 * на 32x32 это миллисекунды вместо секунд.
 */
final class BlurhashGenerator
{
    /** Длинная сторона уменьшенной копии, по которой считаем хеш. */
    private const int SAMPLE_SIZE = 32;

    /** Защита от "бомб" — не декодируем картинки крупнее ~64 Мп. */
    private const int MAX_PIXELS = 64_000_000;

    /**
     * @return string|null null — файла нет, формат не поддерживается или картинка повреждена
     */
    public function fromFile(string $path): ?string
    {
        if (!is_file($path)) {
            return null;
        }

        $info = @getimagesize($path);
        if ($info === false || $info[0] < 1 || $info[1] < 1 || $info[0] * $info[1] > self::MAX_PIXELS) {
            return null;
        }

        $source = match ($info[2]) {
            IMAGETYPE_PNG  => @imagecreatefrompng($path),
            IMAGETYPE_JPEG => @imagecreatefromjpeg($path),
            IMAGETYPE_WEBP => @imagecreatefromwebp($path),
            default        => false,
        };
        if ($source === false) {
            return null;
        }

        [$width, $height] = [$info[0], $info[1]];
        $scale = self::SAMPLE_SIZE / max($width, $height);
        $sampleW = max(1, (int) round($width * $scale));
        $sampleH = max(1, (int) round($height * $scale));

        $sample = imagecreatetruecolor($sampleW, $sampleH);
        // Прозрачные PNG/WebP смешиваем с белым фоном — иначе прозрачность
        // превратится в чёрный.
        imagefill($sample, 0, 0, imagecolorallocate($sample, 255, 255, 255));
        imagealphablending($sample, true);
        imagecopyresampled($sample, $source, 0, 0, 0, 0, $sampleW, $sampleH, $width, $height);

        $pixels = [];
        for ($y = 0; $y < $sampleH; $y++) {
            $row = [];
            for ($x = 0; $x < $sampleW; $x++) {
                $rgb = imagecolorat($sample, $x, $y);
                $row[] = [($rgb >> 16) & 0xFF, ($rgb >> 8) & 0xFF, $rgb & 0xFF];
            }
            $pixels[] = $row;
        }

        // Больше компонент по длинной стороне: 4x3 для горизонтальных/квадратных,
        // 3x4 для вертикальных. Итоговая строка ~28 символов.
        [$componentsX, $componentsY] = $height > $width ? [3, 4] : [4, 3];

        return Blurhash::encode($pixels, $componentsX, $componentsY);
    }
}
