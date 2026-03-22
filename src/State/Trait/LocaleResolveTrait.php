<?php

namespace App\State\Trait;

use App\Entity\Extra\Translation;

/**
 * Трейт для получения и валидации локали из текущего HTTP-запроса.
 *
 * Требует, чтобы в использующем классе была внедрена зависимость:
 *   protected readonly RequestStack $requestStack;
 *
 * Логика:
 *   - Читает ?locale= из query-строки, дефолт — 'tj'
 *   - Если значение не входит в Translation::LOCALES — молча откатывается к 'tj'
 *     (вместо исключения; AppErrorLocaleListener уже нормализует локаль
 *      раньше, поэтому до провайдеров доходит только валидное значение)
 */
trait LocaleResolveTrait
{
    private function resolveLocale(): string
    {
        $locale = $this->requestStack->getCurrentRequest()?->query->get('locale', 'tj') ?? 'tj';

        return in_array($locale, array_values(Translation::LOCALES), true) ? $locale : 'tj';
    }
}
