<?php

namespace App\Controller\Api\CRUD\GET\TechSupport\TechSupport;

use App\Entity\TechSupport\TechSupport;
use App\Entity\User;
use Doctrine\ORM\QueryBuilder;

/**
 * GET /tech-supports — список всех тикетов в системе.
 *
 * Доступ: только ROLE_ADMIN.
 * Опциональный фильтр через query-параметр: ?status=new
 * Допустимые значения status: new, renewed, in_progress, resolved, closed.
 * Невалидный статус просто игнорируется — возвращаются все тикеты.
 */
class ApiGetAllTechSupportsController extends AbstractApiTechSupportController
{
    protected function getUserGrade(): string { return 'admin'; }

    protected function fetchTechSupports(User $user): ?QueryBuilder
    {
        // Читаем ?status= из query-строки, валидируем против известных значений.
        // Невалидный статус приравнивается к null — фильтр не применяется.
        $status = $this->requestStack->getCurrentRequest()->query->get('status');

        $validStatus = ($status !== null && in_array($status, array_values(TechSupport::STATUSES), true))
            ? $status
            : null;

        return $this->techSupportRepository->findAllTechSupports($validStatus);
    }
}
