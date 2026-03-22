<?php

namespace App\Controller\Api\CRUD\PATCH\Ticket;

use App\ApiResource\AppError;
use App\Controller\Api\CRUD\Abstract\AbstractApiController;
use App\Controller\Api\CRUD\Abstract\AddressValidationTrait;
use App\Entity\Extra\MultipleImage;
use App\Entity\Ticket\Category;
use App\Entity\Ticket\Ticket;
use App\Entity\Ticket\Unit;
use App\Entity\User\Occupation;
use App\Repository\Ticket\TicketRepository;
use App\Service\Extra\ExtractIriService;
use App\Service\Extra\LocalizationService;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;

class PatchTicketController extends AbstractApiController
{
    use AddressValidationTrait;

    public function __construct(
        private readonly ExtractIriService   $extractIriService,
        private readonly TicketRepository    $ticketRepository,
        private readonly LocalizationService $localizationService,
    ) {}

    protected function getExtractIriService(): ExtractIriService { return $this->extractIriService; }
    protected function getEntityManager(): EntityManagerInterface { return $this->entityManager; }

    public function __invoke(int $id, Request $request): JsonResponse
    {
        $bearerUser = $this->checkedUser();

        $ticket = $this->ticketRepository->find($id);

        if (!$ticket)
            return $this->errorJson(AppError::TICKET_NOT_FOUND);

        $data = $this->getContent();

        if (!is_array($data))
            return $this->errorJson(AppError::INVALID_JSON);

        if ($ticket->getAuthor() !== $bearerUser && $ticket->getMaster() !== $bearerUser) {
            return $this->errorJson(AppError::OWNERSHIP_MISMATCH);
        }

        // ── Категория / подкатегория / единица ──

        /** @var Category $category */
        $category = isset($data['category'])
            ? $this->extractIriService->extract($data['category'], Category::class, 'categories')
            : $ticket->getCategory();

        /** @var Unit|null $unit */
        $unit = isset($data['unit'])
            ? $this->extractIriService->extract($data['unit'], Unit::class, 'units')
            : $ticket->getUnit();

        /** @var Occupation|null $subcategory */
        $subcategory = isset($data['subcategory'])
            ? $this->extractIriService->extract($data['subcategory'], Occupation::class, 'occupations')
            : null;

        if ($subcategory && $subcategory !== $category->getOccupation()) {
            return $this->errorJson(AppError::SUBCATEGORY_NOT_IN_CATEGORY);
        }

        // ── Адреса ──

        $addressParam = $data['address'] ?? null;

        if ($addressParam && is_array($addressParam)) {
            $ticket->getAddresses()->clear();

            $normalized = $this->normalizeAddressParam($addressParam);
            if ($normalized instanceof JsonResponse) return $normalized;

            $error = $this->buildAndValidateAddresses($ticket, $normalized);
            if ($error) return $error;
        }

        // ── Изображения ──

        if (isset($data['images']) && is_array($data['images'])) {
            $this->syncTicketImages($ticket, $data['images']);
        }

        // ── Основные поля ──

        $ticket
            ->setTitle($data['title'] ?? $ticket->getTitle())
            ->setDescription($data['description'] ?? $ticket->getDescription())
            ->setNotice($data['notice'] ?? $ticket->getNotice())
            ->setActive(isset($data['active']) ? (bool)$data['active'] : $ticket->getActive())
            ->setCategory($category)
            ->setSubcategory($subcategory)
            ->setUnit($unit);

        if (!empty($data['negotiableBudget'])) {
            $ticket->setNegotiableBudget($data['negotiableBudget'])->setBudget(null)->setUnit(null);
        } else {
            $ticket->setBudget($data['budget'] ?? $ticket->getBudget())->setUnit($unit);
        }

        if (isset($data['position'])) {
            $ticket->setPosition((int)$data['position']);
        }

        $this->flush();

        $this->localizationService->localizeTicket($ticket, $this->getLocale());

        return $this->json($ticket, context: ['groups' => ['masterTickets:read', 'clientTickets:read', 'ticketImages:read']]);
    }

    /**
     * Синхронизация изображений тикета: удаление отсутствующих,
     * обновление позиций существующих, добавление новых.
     */
    private function syncTicketImages(Ticket $ticket, array $imagesParam): ?JsonResponse
    {
        $incomingNames = array_filter(array_column($imagesParam, 'image'));

        foreach ($ticket->getImages()->toArray() as $oldImage) {
            if (!in_array($oldImage->getImage(), $incomingNames, true)) {
                $ticket->removeImage($oldImage);
                $this->entityManager->remove($oldImage);
            }
        }

        $existingByName = [];
        foreach ($ticket->getImages()->toArray() as $img) {
            $existingByName[$img->getImage()] = $img;
        }

        foreach ($imagesParam as $position => $imageData) {
            if (empty($imageData['image'])) {
                return $this->errorJson(AppError::IMAGE_FILENAME_REQUIRED);
            }
            if (isset($existingByName[$imageData['image']])) {
                $existingByName[$imageData['image']]->setPosition($position);
            } else {
                $ticketImage = new MultipleImage();
                $ticketImage->setImage($imageData['image']);
                $ticketImage->setPosition($position);
                $ticket->addImage($ticketImage);
                $this->entityManager->persist($ticketImage);
            }
        }

        return null;
    }
}
