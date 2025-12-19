<?php

namespace App\Controller\Api\Filter\Geography\City;

use App\Entity\Extra\Translation;
use App\Entity\Geography\City\City;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class CityFilterController extends AbstractController
{
    public function __construct(private readonly EntityManagerInterface $em) {}

    public function __invoke(int $id, Request $request): JsonResponse
    {
        $locale = $request->query->get('locale', 'tj');

        if (!in_array($locale, array_values(Translation::LOCALES))) {
            throw new NotFoundHttpException("Locale not found");
        }

        /** @var City|null $city */
        $city = $this->em->getRepository(City::class)->find($id);
        if (!$city) {
            throw new NotFoundHttpException("City #$id not found");
        }

        // City title
        $translation = $city->getTranslations()->filter(fn($t) => $t->getLocale() === $locale)->first();
        $city->setTitle($translation && $translation->getTitle() ? $translation->getTitle() : $city->getTranslations()->first()?->getTitle() ?? 'Unknown');

        // Province title
        $province = $city->getProvince();
        if ($province) {
            $translation = $province->getTranslations()->filter(fn($t) => $t->getLocale() === $locale)->first();
            $province->setTitle($translation && $translation->getTitle() ? $translation->getTitle() : $province->getTranslations()->first()?->getTitle() ?? 'Unknown');
        }

        // Suburbs titles
        foreach ($city->getSuburbs() as $suburb) {
            $translation = $suburb->getTranslations()->filter(fn($t) => $t->getLocale() === $locale)->first();
            $suburb->setTitle($translation && $translation->getTitle() ? $translation->getTitle() : $suburb->getTranslations()->first()?->getTitle() ?? 'Unknown');
        }

        return $this->json($city, context: ['groups' => ['cities:read']]);
    }
}
