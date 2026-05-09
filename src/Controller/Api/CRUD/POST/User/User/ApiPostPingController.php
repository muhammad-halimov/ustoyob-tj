<?php

namespace App\Controller\Api\CRUD\POST\User\User;

use App\Controller\Api\CRUD\Abstract\AbstractApiPostController;
use App\Entity\User;
use DateTimeImmutable;
use Symfony\Component\Mercure\HubInterface;
use Symfony\Component\Mercure\Update;

class ApiPostPingController extends AbstractApiPostController
{
    public function __construct(private readonly HubInterface $hub) {}

    protected function handle(User $bearer, object $dto): object
    {
        $now = new DateTimeImmutable();
        $bearer->setLastSeen($now);
        $this->flush();

        // Публикуем присутствие в Mercure — топик публичный (presence не секретна)
        $this->hub->publish(new Update(
            topics: "user:{$bearer->getId()}",
            data: json_encode([
                'isOnline' => true,
                'lastSeen' => $now->format(\DateTimeInterface::ATOM),
            ]),
            private: false,
        ));

        return $this->buildResponse(['ok' => true]);
    }
}
