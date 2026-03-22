<?php

namespace App\Encoder;

use Symfony\Component\HttpFoundation\RequestStack;
use Symfony\Component\Serializer\Encoder\DecoderInterface;

/**
 * Декодер для формата multipart/form-data в API Platform.
 *
 * Проблема:
 *   API Platform из коробки умеет читать JSON (application/json) и XML.
 *   Для загрузки файлов клиент обязан использовать multipart/form-data,
 *   но стандартный стек сериализации не умеет его разбирать — данные просто
 *   теряются (request->request и request->files остаются без обработки).
 *
 * Решение:
 *   Регистрируем свой DecoderInterface с форматом «multipart».
 *   API Platform вызывает decode() и получает массив полей + файлов,
 *   который затем попадает в денормализатор как обычный JSON-объект.
 *
 * Регистрация формата (api_platform.yaml или services.yaml):
 *   api_platform:
 *       formats:
 *           multipart: ['multipart/form-data']
 *
 * Особенность: текстовые поля формы могут содержать JSON-строки
 *   (например, вложенный объект передан как строка).
 *   decode() автоматически парсит их через json_decode(), чтобы
 *   денормализатор получил готовый массив, а не сырую строку.
 */
final class MultipartDecoder implements DecoderInterface
{
    // Имя формата — должно совпадать с ключом в api_platform.formats
    // и с inputFormats в атрибутах операции (#[Post(inputFormats: ['multipart'])])
    public const string FORMAT = 'multipart';

    public function __construct(private readonly RequestStack $requestStack) {}

    /**
     * Собирает данные из текущего HTTP-запроса.
     *
     * Параметр $data не используется: при multipart тело запроса уже разобрано
     * PHP/Symfony в $_POST и $_FILES, и мы берём данные оттуда, а не из
     * сырого тела запроса.
     *
     * Возвращаемый массив:
     *   - Текстовые поля ($_POST): если значение — валидный JSON, разворачиваем
     *     в массив/объект; иначе оставляем как строку.
     *   - Файлы ($_FILES): добавляются «поверх» текстовых полей через оператор +
     *     (+ не перезаписывает уже существующие ключи, в отличие от array_merge).
     */
    public function decode(string $data, string $format, array $context = []): ?array
    {
        $request = $this->requestStack->getCurrentRequest();

        // Вне HTTP-контекста (CLI, тесты без Request) — возвращаем null
        if (!$request) return null;

        return array_map(static function (string $element) {
            // Попытка распарсить поле как JSON.
            // Пример: поле «address» = '{"city":1,"province":2}' → превращается в массив.
            // Обычные строки (имя, описание) json_decode вернёт как null → оставляем оригинал.
            $decoded = json_decode($element, true);

            return is_array($decoded) ? $decoded : $element;
        }, $request->request->all()) + $request->files->all(); // + добавляет файлы, не затирая поля
    }

    /**
     * API Platform вызывает этот метод, чтобы понять, умеет ли декодер
     * работать с данным форматом. Возвращаем true только для 'multipart'.
     */
    public function supportsDecoding(string $format): bool
    {
        return self::FORMAT === $format;
    }
}
