<?php

namespace App\Controller\Api\Filter\Geography\District;

use App\Entity\Extra\Translation;
use App\Entity\Geography\District\District;
use App\Service\Extra\LocalizationService;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class DistrictsFilterController extends AbstractController
{
    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly LocalizationService    $localizationService,
    ) {}

    public function __invoke(Request $request): JsonResponse
    {
        $locale = $request->query->get('locale', 'tj');

        if (!in_array($locale, array_values(Translation::LOCALES))) {
            throw new NotFoundHttpException("Locale not found");
        }

        $districts = $this->em->getRepository(District::class)->findAll();

        foreach ($districts as $district) {
            // District title
            $district->setTitle($this->localizationService->getLocalizedTitle($district, $locale));

            // Province
            $province = $district->getProvince();
            if ($province) {
                $province->setTitle($this->localizationService->getLocalizedTitle($province, $locale));
            }

            // Settlements and Villages
            foreach ($district->getSettlements() as $settlement) {
                $settlement->setTitle($this->localizationService->getLocalizedTitle($settlement, $locale));

                foreach ($settlement->getVillages() as $village) {
                    $village->setTitle($this->localizationService->getLocalizedTitle($village, $locale));
                }
            }

            // Communities
            foreach ($district->getCommunities() as $community) {
                $community->setTitle($this->localizationService->getLocalizedTitle($community, $locale));
            }
        }

        return $this->json($districts, context: ['groups' => ['districts:read']]);
    }
}
