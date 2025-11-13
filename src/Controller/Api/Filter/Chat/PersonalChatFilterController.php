<?php

namespace App\Controller\Api\Filter\Chat;

use App\Entity\User;
use App\Repository\Chat\ChatRepository;
use Exception;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\JsonResponse;

class PersonalChatFilterController extends AbstractController
{
    private readonly Security $security;
    private readonly ChatRepository $chatRepository;

    public function __construct(
        Security       $security,
        ChatRepository $chatRepository
    )
    {
        $this->security = $security;
        $this->chatRepository = $chatRepository;
    }

    public function __invoke(): JsonResponse
    {
        $this->denyAccessUnlessGranted('IS_AUTHENTICATED_FULLY');

        $userRoles = $this->getUser()?->getRoles() ?? [];
        $allowedRoles = ["ROLE_ADMIN", "ROLE_CLIENT", "ROLE_MASTER"];

        if (!array_intersect($allowedRoles, $userRoles))
            return $this->json(['message' => 'Access denied'], 403);

        try {
            /** @var User $user */
            $user = $this->security->getUser();
            $data = $this->chatRepository->findUserChatsById($user);

            return empty($data)
                ? $this->json([], 404)
                : $this->json($data, 200, [],
                    [
                        'groups' => ['chats:read'],
                        'skip_null_values' => false,
                    ]
                );
        } catch (Exception $e) {
            return $this->json([
                'error' => $e->getMessage(),
                'trace' => $e->getTrace()
            ], 500);
        }
    }
}
