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
use App\Service\AccessService;
use App\Service\ExtractIriService;
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
        private readonly AccessService          $accessService,
        private readonly Security               $security,
    ){}

    public function __invoke(Request $request): JsonResponse
    {
        /** @var User $bearerUser */
        $bearerUser = $this->security->getUser();

        $this->accessService->check($bearerUser);

        $ticketEntity = new Ticket();
        $addressEntity = new Address();

        $data = json_decode($request->getContent(), true);

        $titleParam = $data['title'];
        $descriptionParam = $data['description'];
        $noticeParam = $data['notice'];
        $budgetParam = $data['budget'];
        $activeParam = (bool)$data['active'];
        $categoryParam = $data['category'];
        $unitParam = $data['unit'];

        if (!$data['address'])
            return $this->json(['message' => 'Address not found'], 404);

        // Область
        $provinceParam = $data['address']['province'];

        // Город
        $cityParam = $data['address']['city'] ?? null;
        $suburbParam = $data['address']['suburb'] ?? null;

        // Районы
        $districtParam = $data['address']['district'] ?? null;
        $communityParam = $data['address']['community'] ?? null;
        $settlementParam = $data['address']['settlement'] ?? null;
        $villageParam = $data['address']['village'] ?? null;

        if ($cityParam && $districtParam || !$cityParam && !$districtParam)
            return $this->json(['message' => 'Not allowed. Either city or district'], 400);

        if ($cityParam && $villageParam || $cityParam && $communityParam || $cityParam && $settlementParam)
            return $this->json(['message' => 'Not allowed. Wrong format, city allowed only with suburb'], 400);

        if ($districtParam && $suburbParam)
            return $this->json(['message' => 'Not allowed. Wrong format, district not allowed with suburb'], 400);

        // Загружаем сущности только если ID переданы
        /** @var Category $category */
        $category = $this->extractIriService->extract($categoryParam, Category::class, 'categories');
        /** @var Unit $unit */
        $unit = $this->extractIriService->extract($unitParam, Unit::class, 'units');

        /** @var Province $province */
        $province = $this->extractIriService->extract($provinceParam, Province::class, 'provinces');

        $addressEntity->setProvince($province);

        if ($cityParam) {
            /** @var City $city */
            $city = $this->extractIriService->extract($cityParam, City::class, 'cities');
            /** @var Suburb $suburb */
            $suburb = $suburbParam ? $this->extractIriService->extract($suburbParam, Suburb::class, 'suburbs') : null;

            if (!$province && !$city && !$suburb)
                return $this->json(['message' => 'Address not found'], 404);

            if (!$province->getCities()->contains($city) && $city)
                return $this->json(['message' => "This city doesn't belong to this province"], 400);

            if (!$city->getSuburbs()->contains($suburb) && $suburb)
                return $this->json(['message' => "This suburb doesn't belong to this city"], 400);

            $addressEntity
                ->setCity($city)
                ->setSuburb($suburb);
        }

        if ($districtParam) {
            /** @var District $district */
            $district = $this->extractIriService->extract($districtParam, District::class, 'districts');

            /** @var Settlement $settlement */
            $settlement = $settlementParam ? $this->extractIriService->extract($settlementParam, Settlement::class, 'settlements') : null;
            /** @var Community $community */
            $community = $communityParam ? $this->extractIriService->extract($communityParam, Community::class, 'communities') : null;
            /** @var Village $village */
            $village = $villageParam ? $this->extractIriService->extract($villageParam, Village::class, 'villages') : null;

            if (!$province && !$district && !$village && !$settlement && !$community)
                return $this->json(['message' => 'Address not found'], 404);

            if (!$province->getDistricts()->contains($district) && $district)
                return $this->json(['message' => "This district doesn't belong to this province"], 400);

            if (!$district->getCommunities()->contains($community) && $community)
                return $this->json(['message' => "This community doesn't belong to this district"], 400);

            if (!$district->getSettlements()->contains($settlement) && $settlement)
                return $this->json(['message' => "This settlement doesn't belong to this district"], 400);

            if (!$settlement->getVillage()->contains($village) && $village)
                return $this->json(['message' => "This village doesn't belong to this settlement"], 400);

            $addressEntity
                ->setDistrict($district)
                ->setVillage($village)
                ->setCommunity($community)
                ->setSettlement($settlement);
        }

        if (!$category)
            return $this->json(['message' => 'Category not found'], 404);

        if (!$unit)
            return $this->json(['message' => 'Unit not found'], 404);

        $ticketEntity
            ->setTitle($titleParam)
            ->setDescription($descriptionParam)
            ->setNotice($noticeParam)
            ->setBudget($budgetParam)
            ->setActive($activeParam)
            ->setCategory($category)
            ->setUnit($unit)
            ->addAddress($addressEntity);

        $message = [
            'title' => $titleParam,
            'description' => $descriptionParam,
            'notice' => $noticeParam,
            'budget' => $budgetParam,
            'active' => $activeParam,
            'category' => "/api/categories/{$category->getId()}",
            'unit' => "/api/units/{$unit->getId()}",
        ];

        if (in_array("ROLE_CLIENT", $bearerUser->getRoles())) {
            $ticketEntity
                ->setAuthor($bearerUser)
                ->setMaster(null)
                ->setService(false);

            $message += [
                'author' => "/api/users/{$bearerUser->getId()}",
                'service' => false,
            ];
        } elseif (in_array("ROLE_MASTER", $bearerUser->getRoles())) {
            $ticketEntity
                ->setMaster($bearerUser)
                ->setAuthor(null)
                ->setService(true);

            $message += [
                'master' => "/api/users/{$bearerUser->getId()}",
                'service' => true,
            ];
        } else return $this->json(['message' => 'Access denied'], 403);

        $this->entityManager->persist($addressEntity);
        $this->entityManager->persist($ticketEntity);
        $this->entityManager->flush();

        return $this->json(([
            'id' => $ticketEntity->getId(),
            'address' => "/api/addresses/{$ticketEntity->getAddresses()->first()->getId()}"
        ] + $message), 201);
    }
}
