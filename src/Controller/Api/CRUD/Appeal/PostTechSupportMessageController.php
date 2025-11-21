<?php

namespace App\Controller\Api\CRUD\Appeal;

use App\Entity\TechSupport\TechSupport;
use App\Entity\TechSupport\TechSupportMessage;
use App\Entity\User;
use App\Repository\User\AppealRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;

class PostTechSupportMessageController extends AbstractController
{
    public function __construct(
        private readonly EntityManagerInterface $entityManager,
        private readonly AppealRepository       $appealRepository,
        private readonly Security               $security,
    ){}

    public function __invoke(Request $request): JsonResponse
    {
        $this->denyAccessUnlessGranted('IS_AUTHENTICATED_FULLY');
        $allowedRoles = ["ROLE_ADMIN", "ROLE_CLIENT", "ROLE_MASTER"];

        /** @var User $user */
        $user = $this->security->getUser();

        if (!array_intersect($allowedRoles, $user->getRoles()))
            return $this->json(['message' => 'Access denied'], 403);

        $data = json_decode($request->getContent(), true);
        $text = $data['text'];
        $techSupportParam = $data['techSupport'];

        // Извлекаем ID из строки "/api/chats/1" или просто "1"
        $techSupportlId = (preg_match('#/api/tech-suports/(\d+)#', $techSupportParam, $a) ? $a[1] : $techSupportParam);
        /** @var TechSupport $techSupport */
        $techSupport = $this->appealRepository->find($techSupportlId);

        if (!$text)
            return $this->json(['message' => "Empty text"], 404);

        if (!$techSupportParam)
            return $this->json(['message' => "Wrong tech-support format"], 404);

        if (!$techSupport)
            return $this->json(['message' => "Tech-support not found"], 404);

        if ($techSupport->getAdministrant() !== $user && $techSupport->getAuthor() !== $user)
            return $this->json(['message' => "Ownership doesn't match"], 403);

        $appealMessage = (new TechSupportMessage())
            ->setText($text)
            ->setTechSupport($techSupport)
            ->setAuthor($user);

        $techSupport->addTechSupportMessage($appealMessage);

        $this->entityManager->persist($appealMessage);
        $this->entityManager->flush();

        return $this->json([
            'techSupport' => ['id' => $techSupport->getId()],
            'message' => ['id' => $appealMessage->getId()],
        ]);
    }
}
