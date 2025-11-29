<?php

namespace App\State\Appeal;

use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\ProcessorInterface;
use App\Dto\Appeal\Photo\AppealPhotoInput;
use App\Dto\Appeal\Photo\AppealPhotoOutput;
use App\Entity\Appeal\Appeal;
use App\Entity\Appeal\AppealImage;
use App\Entity\User;
use App\Repository\User\AppealRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\File\File;
use Symfony\Component\HttpKernel\Exception\BadRequestHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\Security\Core\Authorization\AuthorizationCheckerInterface;
use Symfony\Component\Security\Core\Exception\AccessDeniedException;

readonly class AppealPhotoProcessor implements ProcessorInterface
{
    public function __construct(
        private AuthorizationCheckerInterface $authorizationChecker,
        private EntityManagerInterface        $entityManager,
        private AppealRepository              $appealRepository,
        private Security                      $security,
    ) {}

    public function process(mixed $data, Operation $operation, array $uriVariables = [], array $context = []): AppealPhotoOutput
    {
        /** @var User $bearerUser */
        $bearerUser = $this->security->getUser();

        if (!$bearerUser) {
            throw new AccessDeniedException('Authentication required');
        }

        /** @var Appeal $appeal */
        $appeal = $this->appealRepository->find($uriVariables['id']);

        if (!$appeal) {
            throw new NotFoundHttpException('Appeal not found');
        }

        // Проверка прав доступа
        if (!$this->authorizationChecker->isGranted('create', $appeal)) {
            throw new AccessDeniedException('Access denied');
        }

        /** @var AppealPhotoInput $data */
        if (empty($data->imageFile)) {
            throw new BadRequestHttpException('No files provided');
        }

        $uploadedCount = $this->processAppealPhotos($appeal, $data->imageFile);

        return $this->toOutput($uploadedCount);
    }

    /**
     * @param File[] $imageFiles
     * @return int Количество загруженных файлов
     */
    private function processAppealPhotos(Appeal $appeal, array $imageFiles): int
    {
        $count = 0;

        if ($appeal->getType() === 'ticket') {
            $appealTicket = $appeal->getAppealTicket()->first();

            if (!$appealTicket) {
                throw new BadRequestHttpException('Appeal ticket is empty');
            }

            foreach ($imageFiles as $imageFile) {
                $appealImage = (new AppealImage())->setImageFile($imageFile);
                $appealTicket->addAppealTicketImage($appealImage);
                $this->entityManager->persist($appealImage);
                $count++;
            }
        } elseif ($appeal->getType() === 'chat') {
            $appealChat = $appeal->getAppealChat()->first();

            if (!$appealChat) {
                throw new BadRequestHttpException('Appeal chat is empty');
            }

            foreach ($imageFiles as $imageFile) {
                $appealImage = (new AppealImage())->setImageFile($imageFile);
                $appealChat->addAppealChatImage($appealImage);
                $this->entityManager->persist($appealImage);
                $count++;
            }
        } else {
            throw new BadRequestHttpException('Invalid appeal type');
        }

        $this->entityManager->flush();

        return $count;
    }

    private function toOutput(int $uploadedCount): AppealPhotoOutput
    {
        $output = new AppealPhotoOutput();
        $output->message = 'Photos uploaded successfully';
        $output->count = $uploadedCount;

        return $output;
    }
}
