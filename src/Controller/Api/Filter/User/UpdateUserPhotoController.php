<?php

namespace App\Controller\Api\Filter\User;

use App\Repository\UserRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Vich\UploaderBundle\Handler\UploadHandler;

class UpdateUserPhotoController extends AbstractController
{
    public function __construct(
        private readonly EntityManagerInterface $entityManager,
        private readonly UploadHandler          $uploadHandler,
        private readonly UserRepository         $userRepository,
    ) {}

    public function __invoke(int $id, Request $request): JsonResponse
    {
        if ($imageFiles = $request->files->all()) {
            $user = $this->userRepository->find($id);
            $user->setImageFile($imageFiles['imageFile']);

            // Manually trigger the upload
            $this->uploadHandler->upload($user, 'imageFile');

            $this->entityManager->flush();

            return new JsonResponse([
                'id' => $user->getId(),
                'image' => $user->getImage(),
                'message' => 'Photo updated successfully'
            ]);
        }

        return new JsonResponse([
            'error' => 'No image file provided',
            'message' => 'Please provide an image file'
        ], 400);
    }
}
