<?php

namespace App\Controller\Api\CRUD\Ticket;

use App\Entity\Geography\District\District;
use App\Entity\Ticket\Category;
use App\Entity\Ticket\Ticket;
use App\Entity\Ticket\Unit;
use App\Entity\User;
use App\Repository\TicketRepository;
use App\Service\AccessService;
use App\Service\ExtractIriService;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;

class PatchTicketController extends AbstractController
{
    public function __construct(
        private readonly EntityManagerInterface $entityManager,
        private readonly TicketRepository       $ticketRepository,
        private readonly ExtractIriService      $extractIriService,
        private readonly AccessService          $accessService,
        private readonly Security               $security,
    ){}

    public function __invoke(int $id, Request $request): JsonResponse
    {
        /** @var User $bearerUser */
        $bearerUser = $this->security->getUser();

        $this->accessService->check($bearerUser);

        /** @var Ticket $ticketEntity */
        $ticketEntity = $this->ticketRepository->find($id);

        if (!$ticketEntity)
            return $this->json(['message' => 'Ticket not found'], 404);

        // Проверка владельца
        if (in_array("ROLE_CLIENT", $bearerUser->getRoles()) && $ticketEntity->getAuthor() !== $bearerUser)
            return $this->json(['message' => 'Access denied'], 403);

        if (in_array("ROLE_MASTER", $bearerUser->getRoles()) && $ticketEntity->getMaster() !== $bearerUser)
            return $this->json(['message' => 'Access denied'], 403);

        $data = json_decode($request->getContent(), true);

        $titleParam = $data['title'] ?? null;
        $descriptionParam = $data['description'] ?? null;
        $noticeParam = $data['notice'] ?? null;
        $budgetParam = $data['budget'] ?? null;
        $activeParam = isset($data['active']) ? (bool)$data['active'] : null;
        $categoryParam = $data['category'] ?? null;
        $unitParam = $data['unit'] ?? null;
        $districtParam = $data['district'] ?? null;

        // Проверка, что хотя бы одно поле передано
        if (is_null($titleParam) && is_null($descriptionParam) && is_null($noticeParam) &&
            is_null($budgetParam) && is_null($activeParam) && is_null($categoryParam) &&
            is_null($unitParam) && is_null($districtParam))
            return $this->json(['message' => 'At least one field must be provided'], 400);

        // Обновляем title (если передан)
        if (!is_null($titleParam)) {
            $ticketEntity->setTitle($titleParam);
        }

        // Обновляем description (если передан)
        if (!is_null($descriptionParam)) {
            $ticketEntity->setDescription($descriptionParam);
        }

        // Обновляем notice (если передан)
        if (!is_null($noticeParam)) {
            $ticketEntity->setNotice($noticeParam);
        }

        // Обновляем budget (если передан)
        if (!is_null($budgetParam)) {
            $ticketEntity->setBudget($budgetParam);
        }

        // Обновляем active (если передан)
        if (!is_null($activeParam)) {
            $ticketEntity->setActive($activeParam);
        }

        // Обновляем category (если передан)
        if (!is_null($categoryParam)) {
            /** @var Category $category */
            $category = $this->extractIriService->extract($categoryParam, Category::class, 'categories');

            if (!$category)
                return $this->json(['message' => 'Category not found'], 404);

            $ticketEntity->setCategory($category);
        }

        // Обновляем unit (если передан)
        if (!is_null($unitParam)) {
            /** @var Unit $unit */
            $unit = $this->extractIriService->extract($unitParam, Unit::class, 'units');

            if (!$unit)
                return $this->json(['message' => 'Unit not found'], 404);

            $ticketEntity->setUnit($unit);
        }

        // Обновляем district (если передан)
        if (!is_null($districtParam)) {
            /** @var District $district */
            $district = $this->extractIriService->extract($districtParam, District::class, 'districts');

            if (!$district)
                return $this->json(['message' => 'District not found'], 404);

            $ticketEntity->setAddress($district);
        }

        $this->entityManager->flush();

        // Формируем полный ответ
        $message = [
            'id' => $ticketEntity->getId(),
            'title' => $ticketEntity->getTitle(),
            'description' => $ticketEntity->getDescription(),
            'notice' => $ticketEntity->getNotice(),
            'budget' => $ticketEntity->getBudget(),
            'active' => $ticketEntity->getActive(),
            'category' => "/api/categories/{$ticketEntity->getCategory()->getId()}",
            'district' => "/api/districts/{$ticketEntity->getAddress()->getId()}",
            'unit' => "/api/units/{$ticketEntity->getUnit()->getId()}",
        ];

        if (in_array("ROLE_CLIENT", $bearerUser->getRoles())) {
            $message['author'] = "/api/users/{$ticketEntity->getAuthor()->getId()}";
            $message['service'] = false;
        }
        elseif (in_array("ROLE_MASTER", $bearerUser->getRoles())) {
            $message['master'] = "/api/users/{$ticketEntity->getMaster()->getId()}";
            $message['service'] = true;
        }

        return $this->json($message);
    }
}
