<?php

namespace App\Controller\Api\CRUD\POST\TechSupport\TechSupport;

use App\ApiResource\AppMessages;
use App\Controller\Api\CRUD\Abstract\AbstractApiPostController;
use App\Dto\TechSupport\TechSupportPostInput;
use App\Entity\TechSupport\TechSupport;
use App\Entity\Trait\Readable\G;
use App\Entity\User;
use App\Service\Extra\LocalizationService;

class ApiPostTechSupportController extends AbstractApiPostController
{
    public function __construct(private readonly LocalizationService $localizationService) {}

    protected function getInputClass(): string { return TechSupportPostInput::class; }

    protected function setSerializationGroups(): array { return G::OPS_TECH_SUPPORT_POST; }

    // Разрешаем анонимный доступ: пользователь мог забыть пароль / потерять доступ к аккаунту.
    // Гостю достаточно указать email — администратор свяжется с ним по почте.
    protected function getUserGrade(): string { return 'anonymous'; }

    protected function afterFetch(object|array $entity, ?User $user): void
    {
        /** @var TechSupport $entity */
        if ($entity->getAuthor()) $this->localizationService->localizeUser($entity->getAuthor(), $this->getLocale());
        if ($entity->getReason()) $this->localizationService->localizeEntityFull($entity->getReason(), $this->getLocale());
    }

    protected function handle(?User $bearer, object $dto): object
    {
        /** @var TechSupportPostInput $dto */
        if ($dto->reason !== null && !in_array($dto->reason->getApplicableTo(), ['support', 'overall'], true)) {
            return $this->errorJson(AppMessages::WRONG_SUPPORT_REASON);
        }

        // Если пользователь не авторизован — требуем валидный email для обратной связи.
        if (!$bearer) {
            if (!$dto->guestEmail) return $this->errorJson(AppMessages::MISSING_REQUIRED_FIELDS);
            if (!filter_var($dto->guestEmail, FILTER_VALIDATE_EMAIL)) return $this->errorJson(AppMessages::INVALID_EMAIL);
        }

        return (new TechSupport())
            ->setTitle($dto->title)
            ->setReason($dto->reason)
            ->setStatus('new')
            ->setPriority($dto->priority)
            ->setDescription($dto->description)
            ->setAuthor($bearer)
            ->setGuestEmail($bearer ? null : $dto->guestEmail);
    }
}
