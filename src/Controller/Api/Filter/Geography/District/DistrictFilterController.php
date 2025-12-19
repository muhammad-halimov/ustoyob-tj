<?php

namespace App\Controller\Api\Filter\Geography\District;

use App\Entity\Extra\Translation;
use App\Entity\Geography\District\District;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class DistrictFilterController extends AbstractController
{
    public function __construct(private readonly EntityManagerInterface $em) {}

    public function __invoke(int $id, Request $request): JsonResponse
    {
        $locale = $request->query->get('locale', 'tj');
        if (!in_array($locale, array_values(Translation::LOCALES))) {
            throw new NotFoundHttpException("Locale not found");
        }

        /** @var District|null $district */
        $district = $this->em->getRepository(District::class)->find($id);
        if (!$district) {
            throw new NotFoundHttpException("District #$id not found");
        }

        // District title
        $translation = $district->getTranslations()->filter(fn($t) => $t->getLocale() === $locale)->first();
        $district->setTitle($translation && $translation->getTitle() ? $translation->getTitle() : $district->getTranslations()->first()?->getTitle() ?? 'Unknown');

        // Province title
        $province = $district->getProvince();
        if ($province) {
            $translation = $province->getTranslations()->filter(fn($t) => $t->getLocale() === $locale)->first();
            $province->setTitle($translation && $translation->getTitle() ? $translation->getTitle() : $province->getTranslations()->first()?->getTitle() ?? 'Unknown');
        }

        // Settlements titles
        foreach ($district->getSettlements() as $settlement) {
            $translation = $settlement->getTranslations()->filter(fn($t) => $t->getLocale() === $locale)->first();
            $settlement->setTitle($translation && $translation->getTitle() ? $translation->getTitle() : $settlement->getTranslations()->first()?->getTitle() ?? 'Unknown');

            // Villages titles
            foreach ($settlement->getVillages() as $village) {
                $translation = $village->getTranslations()->filter(fn($t) => $t->getLocale() === $locale)->first();
                $village->setTitle($translation && $translation->getTitle() ? $translation->getTitle() : $village->getTranslations()->first()?->getTitle() ?? 'Unknown');
            }
        }

        // Communities titles
        foreach ($district->getCommunities() as $community) {
            $translation = $community->getTranslations()->filter(fn($t) => $t->getLocale() === $locale)->first();
            $community->setTitle($translation && $translation->getTitle() ? $translation->getTitle() : $community->getTranslations()->first()?->getTitle() ?? 'Unknown');
        }

        return $this->json($district, context: ['groups' => ['districts:read']]);
    }
}
