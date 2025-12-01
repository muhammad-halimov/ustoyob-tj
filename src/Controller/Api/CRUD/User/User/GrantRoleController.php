<?php

namespace App\Controller\Api\CRUD\User\User;

use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;

class GrantRoleController extends AbstractController
{
    public function __construct(
        private readonly EntityManagerInterface     $entityManager,
        private readonly Security                   $security,
    ){}

    public function __invoke(Request $request): JsonResponse
    {
        $this->denyAccessUnlessGranted("IS_AUTHENTICATED_FULLY");

        /** @var User $bearerUser */
        $bearerUser = $this->security->getUser();

        $data = json_decode($request->getContent(), true);
        $roleParam = $data['role'];

        if (in_array('ROLE_ADMIN', $bearerUser->getRoles()))
            return $this->json(['message' => "You're admin"], 403);

        if (!in_array("ROLE_CLIENT", $bearerUser->getRoles()) && in_array("ROLE_MASTER", $bearerUser->getRoles()))
            return $this->json(['message' => "You're master"], 403);

        if (!in_array("ROLE_MASTER", $bearerUser->getRoles()) && in_array("ROLE_CLIENT", $bearerUser->getRoles()))
            return $this->json(['message' => "You're client"], 403);

        if ($roleParam == 'master')
            $bearerUser->setRoles(['ROLE_MASTER']);
        elseif ($roleParam == 'client')
            $bearerUser->setRoles(['ROLE_CLIENT']);
        else return $this->json(['message' => "Wrong role provided"], 404);

        $this->entityManager->flush();

        return $this->json(['message' => "Granted $roleParam role"]);
    }
}
