<?php

namespace App\Controller\Api\CRUD\POST\User\User;

use App\Controller\Api\CRUD\Abstract\AbstractApiPostController;
use App\Entity\User;
use Symfony\Component\Mercure\HubInterface;
use Symfony\Component\Mercure\Update;

class ApiPostMarkOfflineController extends AbstractApiPostController
{
    public function __construct(private readonly HubInterface $hub) {}

    protected function handle(?User $bearer, object $dto): object
    {
        $bearer->setLastSeen(null);
        $this->flush();

        // Публикуем офлайн-статус в Mercure
        $this->hub->publish(new Update(
            topics: "user:{$bearer->getId()}",
            data: json_encode([
                'isOnline' => false,
                'lastSeen' => null,
            ]),
            private: false,
        ));

        return $this->buildResponse(['ok' => true]);
    }
}
