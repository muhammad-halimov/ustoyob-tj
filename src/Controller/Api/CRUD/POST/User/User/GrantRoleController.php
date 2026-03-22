<?php

namespace App\Controller\Api\CRUD\POST\User\User;

use App\ApiResource\AppError;
use App\Controller\Api\CRUD\Abstract\AbstractApiController;
use App\Entity\User;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;

class GrantRoleController extends AbstractApiController
{

    public function __invoke(Request $request): JsonResponse
    {
        $this->denyAccessUnlessGranted("IS_AUTHENTICATED_FULLY");

        /** @var User $bearerUser */
        $bearerUser = $this->currentUser();

        $data = json_decode($request->getContent(), true);
        $roleParam = $data['role'];

        if (in_array('ROLE_ADMIN', $bearerUser->getRoles()))
            return $this->errorJson(AppError::ROLE_ALREADY_ADMIN);

        if (!in_array("ROLE_CLIENT", $bearerUser->getRoles()) && in_array("ROLE_MASTER", $bearerUser->getRoles()))
            return $this->errorJson(AppError::ROLE_ALREADY_MASTER);

        if (!in_array("ROLE_MASTER", $bearerUser->getRoles()) && in_array("ROLE_CLIENT", $bearerUser->getRoles()))
            return $this->errorJson(AppError::ROLE_ALREADY_CLIENT);

        if ($roleParam == 'master')
            $bearerUser->setRoles(['ROLE_MASTER']);
        elseif ($roleParam == 'client')
            $bearerUser->setRoles(['ROLE_CLIENT']);
        else return $this->errorJson(AppError::WRONG_ROLE);

        $this->flush();

        return $this->json(['message' => "Granted $roleParam role"]);
    }
}
