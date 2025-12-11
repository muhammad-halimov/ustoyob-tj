<?php

namespace App\Controller\Api\CRUD\TechSupport\Message;

use App\Entity\TechSupport\TechSupport;
use App\Entity\TechSupport\TechSupportMessage;
use App\Entity\User;
use App\Repository\TechSupport\TechSupportMessageRepository;
use App\Service\Extra\AccessService;
use App\Service\Extra\ExtractIriService;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;

class PatchTechSupportMessageController extends AbstractController
{
    public function __construct(
        private readonly EntityManagerInterface       $entityManager,
        private readonly TechSupportMessageRepository $techSupportMessageRepository,
        private readonly ExtractIriService      $extractIriService,
        private readonly AccessService          $accessService,
        private readonly Security               $security,
    ){}

    public function __invoke(int $id, Request $request): JsonResponse
    {
        /** @var User $bearerUser */
        $bearerUser = $this->security->getUser();

        $this->accessService->check($bearerUser);

        $data = json_decode($request->getContent(), true);
        $text = $data['text'];
        $techSupportParam = $data['techSupport'];

        /** @var TechSupport $techSupport */
        $techSupport = $this->extractIriService->extract($techSupportParam, TechSupport::class, 'tech-suports');
        /** @var TechSupportMessage $techSupportMessage */
        $techSupportMessage = $this->techSupportMessageRepository->find($id);

        if (!$text)
            return $this->json(['message' => "Empty text"], 404);

        if (!$techSupportParam)
            return $this->json(['message' => "Wrong tech support format"], 404);

        if (!$techSupport)
            return $this->json(['message' => "Tech support not found"], 404);

        if (!$techSupportMessage)
            return $this->json(['message' => "Tech support message not found"], 404);

        if ($techSupport->getAdministrant() !== $bearerUser && $techSupport->getAuthor() !== $bearerUser)
            return $this->json(['message' => "Ownership doesn't match"], 403);

        $techSupportMessage
            ->setText($text)
            ->setTechSupport($techSupport)
            ->setAuthor($bearerUser);

        $techSupport->addTechSupportMessage($techSupportMessage);

        $this->entityManager->flush();

        return $this->json([
            'techSupport' => ['id' => $techSupport->getId()],
            'message' => ['id' => $techSupportMessage->getId()],
        ]);
    }
}
