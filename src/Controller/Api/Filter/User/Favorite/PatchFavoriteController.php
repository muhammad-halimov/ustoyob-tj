<?php

namespace App\Controller\Api\Filter\User\Favorite;

use App\Entity\User;
use App\Entity\User\Favorite;
use App\Repository\User\FavoriteRepository;
use App\Repository\UserRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;

class PatchFavoriteController extends AbstractController
{
    public function __construct(
        private readonly EntityManagerInterface $entityManager,
        private readonly FavoriteRepository     $favoriteRepository,
        private readonly UserRepository         $userRepository,
        private readonly Security               $security,
    ){}

    public function __invoke(int $id, Request $request): JsonResponse
    {
        $this->denyAccessUnlessGranted('IS_AUTHENTICATED_FULLY');
        $allowedRoles = ["ROLE_ADMIN", "ROLE_CLIENT", "ROLE_MASTER"];

        /** @var User $bearerUser */
        $bearerUser = $this->security->getUser();
        /** @var Favorite $favorite */
        $favorite = $this->favoriteRepository->find($id);

        if (!array_intersect($allowedRoles, $bearerUser->getRoles()))
            return $this->json(['message' => 'Access denied'], 403);

        if (!$favorite)
            return $this->json(['message' => "Resource not found"], 404);

        if (!$this->favoriteRepository->findUserFavoriteMasters($bearerUser))
            return $this->json(['message' => "Ownership doesn't match"], 400);

        $data = json_decode($request->getContent(), true);

        $clientsParam = $data['clients'];
        $mastersParam = $data['masters'];

        $masters = [];
        $clients = [];

        foreach (array_unique($mastersParam) as $master) {
            // Извлекаем ID из строки "/api/users/1" или просто "1"
            $masterId = (preg_match('#/api/users/(\d+)#', $master, $m) ? $m[1] : $master);
            $user = $this->userRepository->find($masterId);

            if (!$user || !in_array($allowedRoles[2], $user->getRoles()))
                return $this->json(['message' => "Master #$masterId not found"], 404);

            $masters[] = $user;
        }

        foreach (array_unique($clientsParam) as $client) {
            // Извлекаем ID из строки "/api/users/1" или просто "1"
            $clientId = (preg_match('#/api/users/(\d+)#', $client, $c) ? $c[1] : $client);
            $user = $this->userRepository->find($clientId);

            if (!$user || !in_array($allowedRoles[1], $user->getRoles()))
                return $this->json(['message' => "Client #$clientId not found"], 404);

            $clients[] = $user;
        }

        $favorite->getFavoriteMasters()->clear();
        $favorite->getFavoriteClients()->clear();

        foreach ($masters as $master) $favorite->addFavoriteMaster($master);
        foreach ($clients as $client) $favorite->addFavoriteClient($client);

        $this->entityManager->persist($favorite);
        $this->entityManager->flush();

        return $this->json([
            'id' => $favorite->getId(),
            'user' => ['id' => $favorite->getUser()->getId()],
            'masters' => array_map(fn($user) => ['id' => $user->getId()], $favorite->getFavoriteMasters()->toArray()),
            'clients' => array_map(fn($user) => ['id' => $user->getId()], $favorite->getFavoriteClients()->toArray()),
        ]);
    }
}
