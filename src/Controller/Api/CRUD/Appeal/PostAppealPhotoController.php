<?php

namespace App\Controller\Api\CRUD\Appeal;

use App\Entity\Appeal\Appeal;
use App\Entity\Appeal\AppealImage;
use App\Entity\Appeal\AppealTypes\AppealChat;
use App\Entity\Appeal\AppealTypes\AppealTicket;
use App\Entity\User;
use App\Repository\User\AppealRepository;
use App\Service\AccessService;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\File\File;

class PostAppealPhotoController extends AbstractController
{
    public function __construct(
        private readonly EntityManagerInterface $entityManager,
        private readonly AppealRepository       $appealRepository,
        private readonly Security               $security,
        private readonly AccessService          $accessService,
    ) {}

    public function __invoke(int $id, Request $request): JsonResponse
    {
        /** @var User $bearerUser */
        $bearerUser = $this->security->getUser();

        $this->accessService->check($bearerUser);

        /** @var Appeal $appeal */
        $appeal = $this->appealRepository->find($id);

        /** @var ?AppealChat $appealChat */
        $appealChat = $appeal->getAppealChat()->first();

        /** @var ?AppealTicket $appealTicket */
        $appealTicket = $appeal->getAppealTicket()->first();

        /** @var File[] $imageFiles */
        $imageFiles = $request->files->get('imageFile');

        if (!$imageFiles)
            return $this->json(['message' => 'No files provided'], 400);

        if ($appealChat->getAuthor() !== $bearerUser &&
            $appealChat->getRespondent() !== $bearerUser ||
            $appealTicket->getAuthor() !== $bearerUser &&
            $appealTicket->getRespondent() !== $bearerUser
        ) return $this->json(['message' => "Ownership doesn't match"], 403);

        $imageFiles = is_array($imageFiles) ? $imageFiles : [$imageFiles];

        if ($appeal->getAppealChat()->first()) {
            foreach ($imageFiles as $imageFile) {
                $appealImage = (new AppealImage())->setImageFile($imageFile);
                $appealChat->addAppealChatImage($appealImage);
                $this->entityManager->persist($appealImage);
            }
        } elseif ($appeal->getAppealTicket()->first()) {
            foreach ($imageFiles as $imageFile) {
                $appealImage = (new AppealImage())->setImageFile($imageFile);
                $appealTicket->addAppealTicketImage($appealImage);
                $this->entityManager->persist($appealImage);
            }
        } else return $this->json(['message' => 'Appeal attachment is empty'], 400);

        $this->entityManager->flush();

        return $this->json([
            'message' => 'Photos uploaded successfully',
            'count' => count($imageFiles)
        ]);
    }
}
