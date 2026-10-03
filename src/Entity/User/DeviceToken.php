<?php

namespace App\Entity\User;

use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Post;
use App\Controller\Api\CRUD\POST\User\DeviceToken\ApiPostDeviceTokenController;
use App\Controller\Api\CRUD\POST\User\DeviceToken\ApiPostDeviceTokenUnregisterController;
use App\Entity\User;
use App\Repository\User\DeviceTokenRepository;
use DateTimeImmutable;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\IdGenerator\UuidGenerator;
use Symfony\Component\Uid\Uuid;

/**
 * Устройство, на которое шлются push-уведомления: мобильное приложение
 * (android/ios) или браузер с открывавшимся сайтом (web) — FCM registration
 * token (Firebase Cloud Messaging; на iOS Firebase сам доставляет через APNs,
 * в браузер — через Web Push, см. Service\Notification\Push\FcmClient).
 *
 * Одна строка = один токен: токен уникален глобально, повторная регистрация
 * того же устройства (в т.ч. под другим аккаунтом) не заводит вторую запись,
 * а перепривязывает её — см. ApiPostDeviceTokenController. Мёртвые токены
 * (приложение удалено) PushNotifier удаляет сам по ответу FCM.
 *
 * locale — язык приложения/сайта на устройстве (tj|ru|eng): на нём пишется
 * текст уведомления.
 */
#[ORM\Entity(repositoryClass: DeviceTokenRepository::class)]
#[ORM\Table(name: 'device_token')]
#[ApiResource(
    operations: [
        new Post(
            uriTemplate: '/device-tokens',
            controller: ApiPostDeviceTokenController::class,
            deserialize: false,
        ),
        new Post(
            uriTemplate: '/device-tokens/unregister',
            controller: ApiPostDeviceTokenUnregisterController::class,
            deserialize: false,
        ),
    ],
)]
class DeviceToken
{
    public const array PLATFORMS = ['android', 'ios', 'web'];

    public function __toString(): string
    {
        return 'DeviceToken';
    }

    #[ORM\Id]
    #[ORM\GeneratedValue(strategy: 'CUSTOM')]
    #[ORM\CustomIdGenerator(class: UuidGenerator::class)]
    #[ORM\Column(type: 'uuid', unique: true)]
    private ?Uuid $id = null;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private ?User $user = null;

    #[ORM\Column(length: 512, unique: true)]
    private ?string $token = null;

    #[ORM\Column(length: 16)]
    private ?string $platform = null;

    #[ORM\Column(length: 8, nullable: true)]
    private ?string $locale = null;

    #[ORM\Column]
    private ?DateTimeImmutable $updatedAt = null;

    public function getId(): ?Uuid
    {
        return $this->id;
    }

    public function getUser(): ?User
    {
        return $this->user;
    }

    public function setUser(?User $user): static
    {
        $this->user = $user;

        return $this;
    }

    public function getToken(): ?string
    {
        return $this->token;
    }

    public function setToken(string $token): static
    {
        $this->token = $token;

        return $this;
    }

    public function getPlatform(): ?string
    {
        return $this->platform;
    }

    public function setPlatform(string $platform): static
    {
        $this->platform = $platform;

        return $this;
    }

    public function getLocale(): ?string
    {
        return $this->locale;
    }

    public function setLocale(?string $locale): static
    {
        $this->locale = $locale;

        return $this;
    }

    public function getUpdatedAt(): ?DateTimeImmutable
    {
        return $this->updatedAt;
    }

    public function touch(): static
    {
        $this->updatedAt = new DateTimeImmutable();

        return $this;
    }
}
