<?php

namespace App\Dto\TechSupport;

use App\Entity\User;

/**
 * DTO для PATCH /tech-supports/{id}/assign.
 * Администратор передаёт ID пользователя, которого назначает ответственным за тикет.
 * Сериалайзер резолвит ID в сущность User автоматически.
 */
class TechSupportAssignInput
{
    public ?User $administrant = null;
}
