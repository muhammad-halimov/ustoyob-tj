<?php

namespace App\Controller\Api\CRUD\POST\Ticket;

use App\ApiResource\AppError;
use App\Controller\Api\CRUD\Abstract\AbstractApiController;
use App\Controller\Api\CRUD\Abstract\AddressValidationTrait;
use App\Entity\Ticket\Category;
use App\Entity\Ticket\Ticket;
use App\Entity\Ticket\Unit;
use App\Entity\User\Occupation;
use App\Service\Extra\ExtractIriService;
use App\Service\Extra\LocalizationService;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;

class PostTicketController extends AbstractApiController
{
    use AddressValidationTrait;

    public function __construct(
        private readonly ExtractIriService   $extractIriService,
        private readonly LocalizationService $localizationService,
    ){}

    protected function getExtractIriService(): ExtractIriService { return $this->extractIriService; }
    protected function getEntityManager(): EntityManagerInterface { return $this->entityManager; }

    public function __invoke(Request $request): JsonResponse
    {
        $bearerUser = $this->checkedUser();

        $data = $this->getContent();

        if (!is_array($data))
            return $this->errorJson(AppError::INVALID_JSON);

        if (!isset($data['title'], $data['description'], $data['category']))
            return $this->errorJson(AppError::MISSING_REQUIRED_FIELDS);

        $addressParam = $data['address'] ?? [];

        $normalized = $this->normalizeAddressParam($addressParam);

        if ($normalized instanceof JsonResponse) return $normalized;

        /** @var Category $category */
        $category = $this->extractIriService->extract($data['category'], Category::class, 'categories');

        /** @var Occupation|null $subcategory */
        $subcategory = isset($data['subcategory'])
            ? $this->extractIriService->extract($data['subcategory'], Occupation::class, 'occupations')
            : null;

        /** @var Unit|null $unit */
        $unit = isset($data['unit'])
            ? $this->extractIriService->extract($data['unit'], Unit::class, 'units')
            : null;

        if ($subcategory && $subcategory !== $category->getOccupation())
            return $this->errorJson(AppError::SUBCATEGORY_NOT_IN_CATEGORY);

        $ticket = new Ticket();

        $error = $this->buildAndValidateAddresses($ticket, $normalized);

        if ($error) return $error;

        $ticket
            ->setTitle($data['title'])
            ->setDescription($data['description'])
            ->setNotice($data['notice'] ?? null)
            ->setActive(!isset($data['active']) || $data['active'])
            ->setCategory($category)
            ->setSubcategory($subcategory)
            ->setUnit($unit);

        if (!empty($data['negotiableBudget'])) {
            $ticket->setNegotiableBudget($data['negotiableBudget'])->setBudget(null)->setUnit(null);
        } else {
            $ticket->setBudget($data['budget'] ?? null)->setUnit($unit);
        }

        if (in_array('ROLE_CLIENT', $bearerUser->getRoles())) {
            $ticket->setAuthor($bearerUser)->setMaster(null)->setService(false);
        } elseif (in_array('ROLE_MASTER', $bearerUser->getRoles())) {
            $ticket->setMaster($bearerUser)->setAuthor(null)->setService(true);
        } else {
            return $this->errorJson(AppError::ACCESS_DENIED);
        }

        $this->persist($ticket);

        $locale = $request->query->get('locale', 'tj');
        $this->localizationService->localizeTicket($ticket, $locale);

        return $this->json($ticket, context: ['groups' => ['masterTickets:read', 'clientTickets:read', 'ticketImages:read']]);
    }
}
