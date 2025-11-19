<?php

namespace App\Controller\Api\CRUD\Ticket;

use App\Entity\Geography\District;
use App\Entity\Ticket\Category;
use App\Entity\Ticket\Ticket;
use App\Entity\Ticket\Unit;
use App\Entity\User;
use App\Repository\CategoryRepository;
use App\Repository\DistrictRepository;
use App\Repository\UnitRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;

class PostTicketController extends AbstractController
{
    public function __construct(
        private readonly EntityManagerInterface $entityManager,
        private readonly CategoryRepository     $categoryRepository,
        private readonly DistrictRepository     $districtRepository,
        private readonly UnitRepository         $unitRepository,
        private readonly Security               $security,
    ){}

    public function __invoke(Request $request): JsonResponse
    {
        $this->denyAccessUnlessGranted('IS_AUTHENTICATED_FULLY');
        $allowedRoles = ["ROLE_ADMIN", "ROLE_CLIENT", "ROLE_MASTER"];

        /** @var User $bearerUser */
        $bearerUser = $this->security->getUser();

        if (!array_intersect($allowedRoles, $bearerUser->getRoles()))
            return $this->json(['message' => 'Access denied'], 403);

        $ticketEntity = new Ticket();

        $data = json_decode($request->getContent(), true);

        $titleParam = $data['title'];
        $descriptionParam = $data['description'];
        $noticeParam = $data['notice'];
        $budgetParam = $data['budget'];
        $activeParam = (bool)$data['active'];
        $categoryParam = $data['category'];
        $unitParam = $data['unit'];
        $districtParam = $data['district'];

        // Извлекаем ID только если параметры переданы
        $categoryId = preg_match('#/api/categories/(\d+)#', $categoryParam, $c) ? $c[1] : $categoryParam;
        $districtId = preg_match('#/api/districts/(\d+)#', $districtParam, $d) ? $d[1] : $districtParam;
        $unitId = preg_match('#/api/units/(\d+)#', $unitParam, $u) ? $u[1] : $unitParam;

        // Загружаем сущности только если ID переданы
        /** @var Category $category */
        $category = $this->categoryRepository->find($categoryId);

        if (!$category)
            return $this->json(['message' => 'Category not found'], 404);

        /** @var Unit $unit */
        $unit = $this->unitRepository->find($unitId);

        if (!$unit)
            return $this->json(['message' => 'Unit not found'], 404);

        /** @var District $district */
        $district = $this->districtRepository->find($districtId);

        if (!$district)
            return $this->json(['message' => 'District not found'], 404);

        $ticketEntity
            ->setTitle($titleParam)
            ->setDescription($descriptionParam)
            ->setNotice($noticeParam)
            ->setBudget($budgetParam)
            ->setActive($activeParam)
            ->setCategory($category)
            ->setUnit($unit)
            ->setAddress($district);

        $message = [
            'title' => $titleParam,
            'description' => $descriptionParam,
            'notice' => $noticeParam,
            'budget' => $budgetParam,
            'active' => $activeParam,
            'category' => "/api/categories/{$category->getId()}",
            'district' => "/api/districts/{$district->getId()}",
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

        return $this->json((['id' => $ticketEntity->getId()] + $message), 201);
    }
}
