<?php

namespace App\Controller\Api\Filter\Geography\Province;

use App\Entity\Geography\Province;
use App\Entity\Geography\Translation;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class ProvincesFilterController extends AbstractController
{
    public function __construct(private readonly EntityManagerInterface $em) {}

    public function __invoke(Request $request): JsonResponse
    {
        $locale = $request->query->get('locale', 'tj');
        if (!in_array($locale, array_values(Translation::LOCALES))) {
            throw new NotFoundHttpException("Locale not found");
        }

        $provinces = $this->em->getRepository(Province::class)->findAll();

        foreach ($provinces as $province) {
            $translation = $province->getTranslations()->filter(fn($t) => $t->getLocale() === $locale)->first();
            $province->setTitle($translation && $translation->getTitle() ? $translation->getTitle() : $province->getTranslations()->first()?->getTitle() ?? 'Unknown');

            // Cities
            foreach ($province->getCities() as $city) {
                $translation = $city->getTranslations()->filter(fn($t) => $t->getLocale() === $locale)->first();
                $city->setTitle($translation && $translation->getTitle() ? $translation->getTitle() : $city->getTranslations()->first()?->getTitle() ?? 'Unknown');

                foreach ($city->getSuburbs() as $suburb) {
                    $translation = $suburb->getTranslations()->filter(fn($t) => $t->getLocale() === $locale)->first();
                    $suburb->setTitle($translation && $translation->getTitle() ? $translation->getTitle() : $suburb->getTranslations()->first()?->getTitle() ?? 'Unknown');
                }
            }

            // Districts
            foreach ($province->getDistricts() as $district) {
                $translation = $district->getTranslations()->filter(fn($t) => $t->getLocale() === $locale)->first();
                $district->setTitle($translation && $translation->getTitle() ? $translation->getTitle() : $district->getTranslations()->first()?->getTitle() ?? 'Unknown');

                foreach ($district->getSettlements() as $settlement) {
                    $translation = $settlement->getTranslations()->filter(fn($t) => $t->getLocale() === $locale)->first();
                    $settlement->setTitle($translation && $translation->getTitle() ? $translation->getTitle() : $settlement->getTranslations()->first()?->getTitle() ?? 'Unknown');

                    foreach ($settlement->getVillages() as $village) {
                        $translation = $village->getTranslations()->filter(fn($t) => $t->getLocale() === $locale)->first();
                        $village->setTitle($translation && $translation->getTitle() ? $translation->getTitle() : $village->getTranslations()->first()?->getTitle() ?? 'Unknown');
                    }
                }

                foreach ($district->getCommunities() as $community) {
                    $translation = $community->getTranslations()->filter(fn($t) => $t->getLocale() === $locale)->first();
                    $community->setTitle($translation && $translation->getTitle() ? $translation->getTitle() : $community->getTranslations()->first()?->getTitle() ?? 'Unknown');
                }
            }
        }

        return $this->json($provinces, context: ['groups' => ['provinces:read']]);
    }
}
