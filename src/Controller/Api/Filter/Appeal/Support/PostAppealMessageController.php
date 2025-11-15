<?php

namespace App\Controller\Api\Filter\Appeal\Support;

use App\Entity\Appeal\AppealMessage;
use App\Entity\User;
use App\Repository\User\AppealRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;

class PostAppealMessageController extends AbstractController
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
        $userRoles = $user->getRoles() ?? [];

        if (!array_intersect($allowedRoles, $userRoles))
            return $this->json(['message' => 'Access denied'], 403);

        $data = json_decode($request->getContent(), true);
        $text = $data['text'];
        $appealParam = $data['appeal'];

        // Извлекаем ID из строки "/api/chats/1" или просто "1"
        $appealId = (preg_match('#/api/appeals/(\d+)#', $appealParam, $a) ? $a[1] : $appealParam);
        $appeal = $this->appealRepository->find($appealId);

        if(!$text || !$appealParam || !$appeal || $appeal->getType() !== "support")
            return $this->json(['message' =>
                "Empty message text/appeal OR Appeal doesn't exist OR Incorrect appeal type."
            ], 400);

        if ($appeal->getAdministrant() !== $user && $appeal->getAuthor() !== $user)
            return $this->json(['message' => "Ownership doesn't match"], 403);

        $appealMessage = (new AppealMessage())
            ->setText($text)
            ->setAppeal($appeal)
            ->setAuthor($user);

        $appeal->addAppealMessage($appealMessage);

        $this->entityManager->persist($appealMessage);
        $this->entityManager->flush();

        return new JsonResponse([
            'appealId' => $appeal->getId(),
            'appealMessageId' => $appealMessage->getId(),
            'message' => 'Message uploaded successfully'
        ]);
    }
}
