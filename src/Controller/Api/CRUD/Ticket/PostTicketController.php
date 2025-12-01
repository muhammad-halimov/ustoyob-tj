<?php

namespace App\Controller\Api\CRUD\Ticket;

use App\Entity\Geography\District\District;
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
        $districtParam = $data['district'];

        // Загружаем сущности только если ID переданы
        /** @var Category $category */
        $category = $this->extractIriService->extract($categoryParam, Category::class, 'categories');
        /** @var Unit $unit */
        $unit = $this->extractIriService->extract($unitParam, Unit::class, 'units');
        /** @var District $district */
        $district = $this->extractIriService->extract($districtParam, District::class, 'districts');

        if (!$category)
            return $this->json(['message' => 'Category not found'], 404);

        if (!$unit)
            return $this->json(['message' => 'Unit not found'], 404);

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
