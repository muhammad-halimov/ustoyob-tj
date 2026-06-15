<?php

namespace App\Controller\Api\CRUD\GET\TechSupport\TechSupport;

use App\Entity\User;
use Doctrine\ORM\QueryBuilder;

class ApiAdminApiTechSupportController extends AbstractApiTechSupportController
{
    // Только администратор может просматривать тикеты, назначенные на другого администратора.
    protected function getUserGrade(): string { return 'admin'; }

    protected function fetchTechSupports(User $user): ?QueryBuilder
    {
        // Берём {id} из URL (/tech-supports/admin/{id}) — это ID администратора,
        // чьи назначенные тикеты нужно посмотреть.
        // Раньше {id} в URL полностью игнорировался.
        $targetId = (int) $this->requestStack->getCurrentRequest()->attributes->get('id');
        $target   = $this->entityManager->find(User::class, $targetId);

        if (!$target) return null;

        return $this->techSupportRepository->findTechSupportsByAdmin($target);
    }
}
