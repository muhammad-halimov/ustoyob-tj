<?php

namespace App\Entity\User;

use ApiPlatform\Metadata\ApiProperty;
use App\Entity\Traits\CreatedAtTrait;
use App\Entity\Traits\UpdatedAtTrait;
use App\Entity\User;
use App\Repository\User\PhoneRepository;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Serializer\Attribute\Groups;
use Symfony\Component\Validator\Constraints as Assert;
use App\Validator\Constraints as AppAssert;

#[ORM\Entity(repositoryClass: PhoneRepository::class)]
#[ORM\UniqueConstraint(name: 'UNIQ_PHONE_NUMBER', fields: ['phone'])]
#[ORM\HasLifecycleCallbacks]
class Phone
{
    use CreatedAtTrait, UpdatedAtTrait;

    public function __toString(): string { return $this->phone; }

    public const array CODES = [
        '+992' => '+992', // Таджикистан
        '+998' => '+998', // Узбекистан
        '+996' => '+996', // Кыргызстан
        '+7'   => '+7',   // Россия/Казахстан
        '+1'   => '+1',   // США/Канада
        '+44'  => '+44',  // Великобритания
        '+49'  => '+49',  // Германия
        '+33'  => '+33',  // Франция
        '+86'  => '+86',  // Китай
        '+81'  => '+81',  // Япония
        '+91'  => '+91',  // Индия
        '+971' => '+971', // ОАЭ
        '+380' => '+380', // Украина
        '+375' => '+375', // Беларусь
    ];

    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    #[Groups(['masters:read', 'clients:read', 'users:me:read'])]
    private ?int $id = null;

    #[ORM\ManyToOne(inversedBy: 'phones')]
    #[ORM\JoinColumn(nullable: false)]
    private ?User $owner = null;

    #[ORM\Column(length: 20, unique: true)]
    #[Groups(['masters:read', 'clients:read', 'users:me:read'])]
    #[AppAssert\PhoneConstraint]
    #[Assert\NotBlank(message: 'Phone number is required')]
    #[Assert\Length(max: 20, maxMessage: 'Phone number cannot be longer than {{ limit }} characters')]
    private ?string $phone = null;

    #[ORM\Column(length: 5, nullable: true)]
    #[Groups(['masters:read', 'clients:read', 'users:me:read'])]
    private ?string $countryCode = '+992';

    #[ORM\Column]
    #[Groups(['masters:read', 'clients:read', 'users:me:read'])]
    private bool $main = false;

    #[ORM\Column]
    #[Groups(['masters:read', 'clients:read', 'users:me:read'])]
    #[ApiProperty(writable: false)]
    private bool $verified = false;

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getOwner(): ?User
    {
        return $this->owner;
    }

    public function setOwner(?User $owner): static
    {
        $this->owner = $owner;
        return $this;
    }

    public function getPhone(): ?string
    {
        return $this->phone;
    }

    public function setPhone(?string $phone): static
    {
        if ($phone) {
            // Нормализуем номер: убираем всё кроме цифр и +
            $cleaned = preg_replace('/[^\d+]/', '', $phone);

            // Определяем код страны
            if (str_starts_with($cleaned, '+')) {
                $this->countryCode = $this->extractCountryCode($cleaned);
            } elseif (!str_starts_with($cleaned, '+992')) {
                // Если нет кода, добавляем таджикский по умолчанию
                $cleaned = '+992' . $cleaned;
                $this->countryCode = '+992';
            }

            $this->phone = $cleaned;
        } else {
            $this->phone = null;
        }

        return $this;
    }

    public function getCountryCode(): ?string
    {
        return $this->countryCode;
    }

    public function setCountryCode(?string $countryCode): static
    {
        $this->countryCode = $countryCode;
        return $this;
    }

    public function isMain(): bool
    {
        return $this->main;
    }

    public function setMain(bool $main): static
    {
        $this->main = $main;
        return $this;
    }

    public function isVerified(): bool
    {
        return $this->verified;
    }

    public function setVerified(bool $verified): static
    {
        $this->verified = $verified;
        return $this;
    }

    private function extractCountryCode(string $phone): string
    {
        // Список приоритетных кодов (проверяем от длинных к коротким)
        $priorityCodes = [
            '+992', '+998', '+996', '+995', '+994', '+993', // СНГ
            '+7',   '+1',   '+44',  '+49',  '+33',  '+86',  // Популярные
            '+81',  '+91',  '+971', '+380', '+375',
        ];

        foreach ($priorityCodes as $code) {
            if (str_starts_with($phone, $code)) {
                return $code;
            }
        }

        // Для остальных стран извлекаем код динамически
        // Код страны - это 1-4 цифры после +
        if (preg_match('/^\+([1-9][0-9]{0,3})/', $phone, $matches)) {
            return '+' . $matches[1];
        }

        return '+992'; // По умолчанию Таджикистан
    }
}
