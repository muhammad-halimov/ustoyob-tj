<?php

namespace App\Dto\TechSupport;

use App\Entity\Appeal\Reason\AppealReason;

class TechSupportPostInput
{
    public ?string       $title       = null;
    public ?AppealReason $reason      = null;
    public ?string       $priority    = null;
    public ?string       $description = null;
    // Обязателен только для неавторизованных пользователей (гостей).
    // Авторизованным пользователям email не нужен — контакт идёт через аккаунт.
    public ?string       $guestEmail  = null;
}
