<?php

namespace App\Controller\Api\Filter\Chat\Chat;

use App\Entity\Chat\Chat;
use App\Entity\User;
use App\Repository\Chat\ChatRepository;
use App\Repository\UserRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;

class PostChatController extends AbstractController
{
    public function __construct(
        private readonly EntityManagerInterface $entityManager,
        private readonly ChatRepository         $chatRepository,
        private readonly UserRepository         $userRepository,
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

        $replyAuthorParam = json_decode($request->getContent(), true)['replyAuthor'];
        $replyAuthorId = (preg_match('#/api/users/(\d+)#', $replyAuthorParam, $m) ? $m[1] : $replyAuthorParam);

        /** @var User $replyAuthor */
        $replyAuthor = $this->userRepository->find($replyAuthorId);

        if (!$replyAuthor)
            return $this->json(['message' => 'User not found'], 404);

        if ($replyAuthor === $bearerUser)
            return $this->json(['message' => 'You cannot post a chat with yourself'], 403);

        if ($this->chatRepository->findChatsByAuthors($bearerUser, $replyAuthor))
            return $this->json(['message' => 'You cannot post a chat twice with same user'], 403);

        $this->entityManager
            ->persist((new Chat())
            ->setAuthor($bearerUser)
            ->setReplyAuthor($replyAuthor));

        $this->entityManager->flush();

        return $this->json(['message' => 'Resource successfully posted']);
    }
}
