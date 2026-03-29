<?php

namespace App\Controller\Api\CRUD\GET\Appeal\Appeal;

use App\Controller\Api\CRUD\Abstract\AbstractApiGetCollectionController;
use App\Entity\Appeal\Appeal\Appeal;
use App\Entity\Trait\Readable\G;
use App\Entity\User;
use App\Repository\User\AppealRepository;
use App\Service\Extra\LocalizationService;
use Doctrine\ORM\QueryBuilder;

class ApiGetMyAppealsController extends AbstractApiGetCollectionController
{
    public function __construct(
        private readonly AppealRepository $appealRepository,
        private readonly LocalizationService $localizationService,
    ) {}

    protected function setSerializationGroups(): array
    {
        return G::OPS_APPEALS;
    }

    protected function fetchQuery(User $user): QueryBuilder { return $this->appealRepository->findByAuthor($user); }

    protected function afterFetch(array|object $entity, User $user): void
    {
        $locale = $this->getLocale();

        /** @var Appeal $appeal */
        foreach ($entity as $appeal) {
            $this->localizationService->localizeAppeal($appeal, $locale);
        }
    }
}
