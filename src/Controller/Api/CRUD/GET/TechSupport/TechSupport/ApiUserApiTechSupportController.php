<?php

namespace App\Controller\Api\CRUD\GET\TechSupport\TechSupport;

use App\Entity\User;
use Doctrine\ORM\QueryBuilder;

class ApiUserApiTechSupportController extends AbstractApiTechSupportController
{
    // Только администратор может просматривать тикеты конкретного пользователя.
    protected function getUserGrade(): string { return 'admin'; }

    protected function fetchTechSupports(User $user): ?QueryBuilder
    {
        // Берём {id} из URL (/tech-supports/user/{id}) — это ID целевого пользователя,
        // тикеты которого хочет посмотреть администратор.
        // Раньше {id} в URL полностью игнорировался, и возвращались тикеты самого администратора.
        $targetId = (int) $this->requestStack->getCurrentRequest()->attributes->get('id');
        $target   = $this->entityManager->find(User::class, $targetId);

        if (!$target) return null;

        return $this->techSupportRepository->findTechSupportsByUser($target);
    }
}
