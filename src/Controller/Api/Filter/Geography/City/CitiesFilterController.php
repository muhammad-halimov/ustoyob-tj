<?php

namespace App\Controller\Api\Filter\Geography\City;

use App\Entity\Extra\Translation;
use App\Entity\Geography\City\City;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class CitiesFilterController extends AbstractController
{
    public function __construct(private readonly EntityManagerInterface $em){}

    public function __invoke(Request $request): JsonResponse
    {
        $locale = $request->query->get('locale', 'tj');

        if (!in_array($locale, array_values(Translation::LOCALES))) {
            throw new NotFoundHttpException("Locale not found");
        }

        $cities = $this->em->getRepository(City::class)->findAll();

        foreach ($cities as $city) {
            // City title
            $translation = $city->getTranslations()->filter(fn($t) => $t->getLocale() === $locale)->first();
            if ($translation && $translation->getTitle()) {
                $city->setTitle($translation->getTitle());
            } elseif (!$translation) {
                // fallback на первый доступный перевод
                $city->setTitle($city->getTranslations()->first()?->getTitle() ?? 'Unknown');
            }

            // Province title
            $province = $city->getProvince();
            if ($province) {
                $translation = $province->getTranslations()->filter(fn($t) => $t->getLocale() === $locale)->first();
                if ($translation && $translation->getTitle()) {
                    $province->setTitle($translation->getTitle());
                } else {
                    $province->setTitle($province->getTranslations()->first()?->getTitle() ?? 'Unknown');
                }
            }

            // Suburbs titles
            foreach ($city->getSuburbs() as $suburb) {
                $translation = $suburb->getTranslations()->filter(fn($t) => $t->getLocale() === $locale)->first();
                if ($translation && $translation->getTitle()) {
                    $suburb->setTitle($translation->getTitle());
                } else {
                    $suburb->setTitle($suburb->getTranslations()->first()?->getTitle() ?? 'Unknown');
                }
            }
        }

        return $this->json($cities, context: ['groups' => ['cities:read']]);
    }
}
