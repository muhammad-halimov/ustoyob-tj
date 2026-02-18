<?php

namespace App\Controller\Api\CRUD\Ticket;

use App\Entity\Geography\Address;
use App\Entity\Geography\City\City;
use App\Entity\Geography\City\Suburb;
use App\Entity\Geography\District\Community;
use App\Entity\Geography\District\District;
use App\Entity\Geography\District\Settlement;
use App\Entity\Geography\District\Village;
use App\Entity\Geography\Province;
use App\Entity\Ticket\Category;
use App\Entity\Ticket\Ticket;
use App\Entity\Ticket\Unit;
use App\Entity\User;
use App\Entity\User\Occupation;
use App\Service\Extra\AccessService;
use App\Service\Extra\ExtractIriService;
use App\Service\Extra\LocalizationService;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;

class PostTicketController extends AbstractController
{
    public function __construct(
        private readonly EntityManagerInterface $entityManager,
        private readonly ExtractIriService      $extractIriService,
        private readonly LocalizationService    $localizationService,
        private readonly AccessService          $accessService,
        private readonly Security               $security,
    ){}

    public function __invoke(Request $request): JsonResponse
    {
        /** @var User $bearerUser */
        $bearerUser = $this->security->getUser();

        $this->accessService->check($bearerUser);

        $ticketEntity = new Ticket();

        $data = json_decode($request->getContent(), true);

        // Проверка валидности JSON
        if (!is_array($data)) {
            return $this->json(['message' => 'Invalid JSON data'], 400);
        }

        // Проверка обязательных полей
        if (!isset($data['title'], $data['description'], $data['category'], $data['unit'])) {
            return $this->json(['message' => 'Missing required fields'], 400);
        }

        $titleParam = $data['title'];
        $descriptionParam = $data['description'];
        $noticeParam = $data['notice'] ?? null;
        $budgetParam = $data['budget'] ?? null;
        $activeParam = !isset($data['active']) || $data['active'];
        $categoryParam = $data['category'];
        $subcategoryParam = $data['subcategory'] ?? null;
        $unitParam = $data['unit'];
        $addressParam = $data['address'] ?? [];

        // Если address передан как объект, преобразуем в массив
        if (!empty($addressParam) && !isset($addressParam[0])) {
            $addressParam = [$addressParam];
        }

        if (!is_array($addressParam) || count($addressParam) === 0) {
            return $this->json(['message' => 'Address not found'], 404);
        }

        /** @var Category $category */
        $category = $this->extractIriService->extract($categoryParam, Category::class, 'categories');

        /** @var Occupation $subcategory */
        $subcategory = $subcategoryParam
            ? $this->extractIriService->extract($subcategoryParam, Occupation::class, 'occupations')
            : null;

        /** @var Unit $unit */
        $unit = $this->extractIriService->extract($unitParam, Unit::class, 'units');

        if ($subcategory && $subcategory !== $category->getOccupation()) {
            return $this->json(['message' => "Subcategory doesn't belong to this category"], 404);
        }

        $existingAddresses = [];

        foreach ($addressParam as $addressData) {
            if (!isset($addressData['province']) || !$addressData['province']) {
                return $this->json(['message' => 'Province is required'], 400);
            }

            $provinceParam = $addressData['province'];
            $cityParam = $addressData['city'] ?? null;
            $suburbParam = $addressData['suburb'] ?? null;
            $districtParam = $addressData['district'] ?? null;
            $communityParam = $addressData['community'] ?? null;
            $settlementParam = $addressData['settlement'] ?? null;
            $villageParam = $addressData['village'] ?? null;

            // Проверка дубликата
            $addressKey = implode(':', [
                $provinceParam,
                $cityParam,
                $suburbParam,
                $districtParam,
                $communityParam,
                $settlementParam,
                $villageParam
            ]);

            if (in_array($addressKey, $existingAddresses, true)) {
                return $this->json(['message' => 'Duplicate address detected'], 400);
            }

            $existingAddresses[] = $addressKey;

            /** @var Province $province */
            $province = $this->extractIriService->extract($provinceParam, Province::class, 'provinces');

            $addressEntity = new Address();
            $addressEntity->setProvince($province);

            if ($cityParam) {
                /** @var City $city */
                $city = $this->extractIriService->extract($cityParam, City::class, 'cities');

                // Проверка принадлежности города к провинции
                if ($city->getProvince()?->getId() !== $province->getId()) {
                    return $this->json([
                        'message' => 'City does not belong to the specified province'
                    ], 400);
                }

                /** @var Suburb|null $suburb */
                $suburb = $suburbParam ?
                    $this->extractIriService->extract($suburbParam, Suburb::class, 'suburbs') : null;

                // Проверка принадлежности suburb к городу
                if ($suburb && $suburb->getCities()?->getId() !== $city->getId()) {
                    return $this->json([
                        'message' => 'Suburb does not belong to the specified city'
                    ], 400);
                }

                $addressEntity
                    ->setCity($city)
                    ->setSuburb($suburb);
            }

            if ($districtParam) {
                /** @var District $district */
                $district = $this->extractIriService->extract($districtParam, District::class, 'districts');

                // Проверка принадлежности района к провинции
                if ($district->getProvince()?->getId() !== $province->getId()) {
                    return $this->json([
                        'message' => 'District does not belong to the specified province'
                    ], 400);
                }

                /** @var Community|null $community */
                $community = $communityParam ?
                    $this->extractIriService->extract($communityParam, Community::class, 'communities') : null;

                // Проверка принадлежности community к району
                if ($community && $community->getDistrict()?->getId() !== $district->getId()) {
                    return $this->json([
                        'message' => 'Community does not belong to the specified district'
                    ], 400);
                }

                /** @var Settlement|null $settlement */
                $settlement = $settlementParam ?
                    $this->extractIriService->extract($settlementParam, Settlement::class, 'settlements') : null;

                // Проверка принадлежности settlement к району
                if ($settlement && $settlement->getDistrict()?->getId() !== $district->getId()) {
                    return $this->json([
                        'message' => 'Settlement does not belong to the specified district'
                    ], 400);
                }

                /** @var Village|null $village */
                $village = $villageParam ?
                    $this->extractIriService->extract($villageParam, Village::class, 'villages') : null;

                // Проверка принадлежности village к settlement
                if ($village && $settlement && $village->getSettlement()?->getId() !== $settlement->getId()) {
                    return $this->json([
                        'message' => 'Village does not belong to the specified settlement'
                    ], 400);
                }

                // Если указана деревня без settlement
                if ($village && !$settlement) {
                    return $this->json([
                        'message' => 'Settlement is required when village is specified'
                    ], 400);
                }

                $addressEntity
                    ->setDistrict($district)
                    ->setVillage($village)
                    ->setCommunity($community)
                    ->setSettlement($settlement);
            }

            $ticketEntity->addAddress($addressEntity);
            $this->entityManager->persist($addressEntity);
        }

        $ticketEntity
            ->setTitle($titleParam)
            ->setDescription($descriptionParam)
            ->setNotice($noticeParam)
            ->setBudget($budgetParam)
            ->setActive($activeParam)
            ->setCategory($category)
            ->setSubcategory($subcategory)
            ->setUnit($unit);

        if (in_array("ROLE_CLIENT", $bearerUser->getRoles())) {
            $ticketEntity
                ->setAuthor($bearerUser)
                ->setMaster(null)
                ->setService(false);

        } elseif (in_array("ROLE_MASTER", $bearerUser->getRoles())) {
            $ticketEntity
                ->setMaster($bearerUser)
                ->setAuthor(null)
                ->setService(true);

        } else {
            return $this->json(['message' => 'Access denied'], 403);
        }

        $this->entityManager->persist($ticketEntity);
        $this->entityManager->flush();

        $locale = $request->query->get('locale', 'tj');
        $this->localizationService->localizeGeography($ticketEntity, $locale);

        if ($ticketEntity->getCategory())
            $this->localizationService->localizeEntity($ticketEntity->getCategory(), $locale);

        if ($ticketEntity->getUnit())
            $this->localizationService->localizeEntity($ticketEntity->getUnit(), $locale);

        if ($ticketEntity->getSubcategory())
            $this->localizationService->localizeEntity($ticketEntity->getSubcategory(), $locale);


        return $this->json($ticketEntity, context: ['groups' => ['masterTickets:read', 'clientTickets:read', 'ticketImages:read']]);
    }
}
