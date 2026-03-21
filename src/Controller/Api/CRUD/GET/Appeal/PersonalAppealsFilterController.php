<?php

namespace App\Controller\Api\CRUD\GET\Appeal;

use App\Entity\User;
use App\Repository\User\AppealRepository;
use App\Service\Extra\AccessService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\JsonResponse;

class PersonalAppealsFilterController extends AbstractController
{
    public function __construct(
        private readonly AppealRepository $appealRepository,
        private readonly AccessService    $accessService,
        private readonly Security         $security,
    ){}

    public function __invoke(): JsonResponse
    {
        /** @var User $bearerUser */
        $bearerUser = $this->security->getUser();

        $this->accessService->check($bearerUser);

        $data = $this->appealRepository->find(['author' => $bearerUser]);

        return empty($data)
            ? $this->json(['message' => 'Resource not found'], 404)
            : $this->json($data, context: ['groups' => [
                'appeal:read',
                'appeal:ticket:read',
                'appeal:chat:read',
                'appeal:review:read',
                'appeal:user:read'
            ]]);
    }
}
