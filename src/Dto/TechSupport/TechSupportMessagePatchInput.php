<?php

namespace App\Dto\TechSupport;

/**
 * DTO для PATCH /tech-support-messages/{id}.
 *
 * Поле techSupport было удалено: раньше контроллер брал тикет из тела запроса,
 * что позволяло передать чужой techSupportId и обойти проверку доступа.
 * Теперь тикет берётся непосредственно из самого сообщения в БД.
 */
class TechSupportMessagePatchInput
{
    public ?string $description = null;
}
