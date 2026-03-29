<?php

namespace App\Controller\Api\CRUD\GET\TechSupport\TechSupport;

use App\Controller\Api\CRUD\Abstract\AbstractApiGetCollectionController;
use App\Entity\TechSupport\TechSupport;
use App\Entity\Trait\Readable\G;
use App\Entity\User;
use App\Repository\TechSupport\TechSupportRepository;
use App\Service\Extra\LocalizationService;
use Doctrine\ORM\QueryBuilder;

/**
 * Шаблонный контроллер для GET-запросов техподдержки текущего пользователя.
 *
 * Делегирует fetchData() → fetchTechSupports(), который переопределяется
 * в конкретном подклассе для выборки нужного набора обращений.
 */
abstract class AbstractApiTechSupportController extends AbstractApiGetCollectionController
{
    public function __construct(
        protected readonly TechSupportRepository $techSupportRepository,
        protected readonly LocalizationService $localizationService,
    ) {}

    protected function setSerializationGroups(): array { return G::OPS_TECH_SUPPORT; }

    final protected function fetchQuery(User $user): ?QueryBuilder
    {
        return $this->fetchTechSupports($user);
    }

    abstract protected function fetchTechSupports(User $user): ?QueryBuilder;

    protected function afterFetch(array|object $entity, User $user): void
    {
        /** @var TechSupport $techSupport */
        foreach ($entity as $techSupport) {
            if ($techSupport->getAuthor()) $this->localizationService->localizeUser($techSupport->getAuthor(), $this->getLocale());
            if ($techSupport->getAdministrant()) $this->localizationService->localizeUser($techSupport->getAdministrant(), $this->getLocale());
        }
    }
}
