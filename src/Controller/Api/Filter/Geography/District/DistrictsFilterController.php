<?php

namespace App\Controller\Api\Filter\Geography\District;

use App\Entity\Extra\Translation;
use App\Entity\Geography\District\District;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class DistrictsFilterController extends AbstractController
{
    public function __construct(private readonly EntityManagerInterface $em) {}

    public function __invoke(Request $request): JsonResponse
    {
        $locale = $request->query->get('locale', 'tj');

        if (!in_array($locale, array_values(Translation::LOCALES))) {
            throw new NotFoundHttpException("Locale not found");
        }

        $districts = $this->em->getRepository(District::class)->findAll();

        foreach ($districts as $district) {
            // District title
            $translation = $district->getTranslations()->filter(fn($t) => $t->getLocale() === $locale)->first();
            $district->setTitle($translation?->getTitle() ?? $district->getTranslations()->first()?->getTitle() ?? 'Unknown');

            // Province
            $province = $district->getProvince();
            if ($province) {
                $translation = $province->getTranslations()->filter(fn($t) => $t->getLocale() === $locale)->first();
                $province->setTitle($translation?->getTitle() ?? $province->getTranslations()->first()?->getTitle() ?? 'Unknown');
            }

            // Settlements and Villages
            foreach ($district->getSettlements() as $settlement) {
                $translation = $settlement->getTranslations()->filter(fn($t) => $t->getLocale() === $locale)->first();
                $settlement->setTitle($translation?->getTitle() ?? $settlement->getTranslations()->first()?->getTitle() ?? 'Unknown');

                foreach ($settlement->getVillages() as $village) {
                    $translation = $village->getTranslations()->filter(fn($t) => $t->getLocale() === $locale)->first();
                    $village->setTitle($translation?->getTitle() ?? $village->getTranslations()->first()?->getTitle() ?? 'Unknown');
                }
            }

            // Communities
            foreach ($district->getCommunities() as $community) {
                $translation = $community->getTranslations()->filter(fn($t) => $t->getLocale() === $locale)->first();
                $community->setTitle($translation?->getTitle() ?? $community->getTranslations()->first()?->getTitle() ?? 'Unknown');
            }
        }

        return $this->json($districts, context: ['groups' => ['districts:read']]);
    }
}
