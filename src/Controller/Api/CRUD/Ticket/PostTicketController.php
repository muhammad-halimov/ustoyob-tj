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

        $data = json_decode($request->getContent(), true);

        $titleParam = $data['title'];
        $descriptionParam = $data['description'];
        $noticeParam = $data['notice'];
        $budgetParam = $data['budget'];
        $activeParam = (bool)$data['active'];
        $categoryParam = $data['category'];
        $unitParam = $data['unit'];
        $addressParam = $data['address'] ?? [];

        if (!is_array($addressParam) || count($addressParam) === 0)
            return $this->json(['message' => 'Address not found'], 404);

        /** @var Category $category */
        $category = $this->extractIriService->extract($categoryParam, Category::class, 'categories');
        /** @var Unit $unit */
        $unit = $this->extractIriService->extract($unitParam, Unit::class, 'units');

        $existingAddresses = [];

        foreach ($addressParam as $addressData) {
            if (!isset($addressData['province']))
                return $this->json(['message' => 'Province is required'], 400);

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
                /** @var Suburb|null $suburb */
                $suburb = $suburbParam ?
                    $this->extractIriService->extract($suburbParam, Suburb::class, 'suburbs') : null;

                $addressEntity
                    ->setCity($city)
                    ->setSuburb($suburb);
            }

            if ($districtParam) {
                /** @var District $district */
                $district = $this->extractIriService->extract($districtParam, District::class, 'districts');
                /** @var Settlement|null $settlement */
                $settlement = $settlementParam ?
                    $this->extractIriService->extract($settlementParam, Settlement::class, 'settlements') : null;
                /** @var Community|null $community */
                $community = $communityParam ?
                    $this->extractIriService->extract($communityParam, Community::class, 'communities') : null;
                /** @var Village|null $village */
                $village = $villageParam ?
                    $this->extractIriService->extract($villageParam, Village::class, 'villages') : null;

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
            ->setUnit($unit);

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

        $this->entityManager->persist($ticketEntity);
        $this->entityManager->flush();

        return $this->json(([
            'id' => $ticketEntity->getId(),
            'addresses' => array_map(
                fn(Address $a) => "/api/addresses/{$a->getId()}",
                $ticketEntity->getAddresses()->toArray()
            )
        ] + $message), 201);
    }
}
