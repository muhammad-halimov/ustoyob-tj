<?php

namespace App\Controller\Api\CRUD\Appeal;

use App\Entity\Appeal\Appeal;
use App\Entity\Appeal\AppealImage;
use App\Entity\Appeal\AppealTypes\AppealChat;
use App\Entity\Appeal\AppealTypes\AppealTicket;
use App\Entity\User;
use App\Repository\User\AppealRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;

class PostAppealPhotoController extends AbstractController
{
    public function __construct(
        private readonly EntityManagerInterface $entityManager,
        private readonly AppealRepository       $appealRepository,
        private readonly Security               $security,
    ) {}

    public function __invoke(int $id, Request $request): JsonResponse
    {
        $this->denyAccessUnlessGranted('IS_AUTHENTICATED_FULLY');
        $allowedRoles = ["ROLE_ADMIN", "ROLE_CLIENT", "ROLE_MASTER"];

        /** @var User $user */
        $user = $this->security->getUser();
        /** @var Appeal $appeal */
        $appeal = $this->appealRepository->find($id);

        /** @var AppealChat $appealChat */
        $appealChat = $appeal->getAppealChat()->first();
        /** @var AppealTicket $appealTicket */
        $appealTicket = $appeal->getAppealTicket()->first();

        $imageFiles = $request->files->get('imageFile');

        if (!array_intersect($allowedRoles, $user->getRoles()))
            return $this->json(['message' => 'Access denied'], 403);

        if (!$imageFiles)
            return $this->json(['message' => 'No files provided'], 400);

        if ($appeal->getAppealChat()->first()->getAuthor() !== $user
            && $appeal->getAppealChat()->first()->getRespondent() !== $user)
            return $this->json(['message' => "Ownership doesn't match"], 403);

        $imageFiles = is_array($imageFiles) ? $imageFiles : [$imageFiles];

        if ($appealChat) {
            foreach ($imageFiles as $imageFile) {
                if ($imageFile->isValid()) {
                    $appealImage = (new AppealImage())->setImageFile($imageFile);
                    $appealChat->addAppealChatImage($appealImage);
                    $this->entityManager->persist($appealImage);
                }
            }
        } elseif ($appealTicket) {
            foreach ($imageFiles as $imageFile) {
                if ($imageFile->isValid()) {
                    $appealImage = (new AppealImage())->setImageFile($imageFile);
                    $appealTicket->addAppealTicketImage($appealImage);
                    $this->entityManager->persist($appealImage);
                }
            }
        } else return $this->json(['message' => 'Appeal attachment is empty'], 500);

        $this->entityManager->flush();

        return new JsonResponse([
            'message' => 'Photos uploaded successfully',
            'count' => count($imageFiles)
        ]);
    }
}
