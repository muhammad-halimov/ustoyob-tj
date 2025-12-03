<?php
namespace App\Entity\Geography;

use App\Entity\Geography\District\District;
use App\Entity\Geography\City\City;
use App\Entity\Geography\District\Settlement;
use App\Entity\Geography\District\Community;
use App\Entity\Geography\District\Village;
use App\Entity\Geography\City\Suburb;
use App\Entity\Ticket\Ticket;
use App\Entity\Traits\CreatedAtTrait;
use App\Entity\Traits\UpdatedAtTrait;
use App\Entity\User;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Serializer\Annotation\Groups;
use Symfony\Component\Serializer\Attribute\Ignore;

#[ORM\HasLifecycleCallbacks]
#[ORM\Entity]
class Address
{
    use UpdatedAtTrait, CreatedAtTrait;

    public function __toString(): string
    {
        $parts = [];

        if ($this->province) $parts[] = $this->province->getTitle();
        if ($this->city) $parts[] = $this->city->getTitle();
        if ($this->district) $parts[] = $this->district->getTitle();
        if ($this->suburb) $parts[] = $this->suburb->getTitle();
        if ($this->settlement) $parts[] = $this->settlement->getTitle();
        if ($this->community) $parts[] = $this->community->getTitle();
        if ($this->village) $parts[] = $this->village->getTitle();

        return !empty($parts) ? implode(', ', $parts) : 'Адрес #' . ($this->id ?? 'новый');
    }

    #[ORM\Id, ORM\GeneratedValue, ORM\Column]
    #[Groups([
        'masterTickets:read',
        'clientTickets:read',
        'masters:read',
        'clients:read',
    ])]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: Province::class)]
    #[Groups([
        'masterTickets:read',
        'clientTickets:read',
        'masters:read',
        'clients:read',
    ])]
    private ?Province $province = null;

    #[ORM\ManyToOne(targetEntity: District::class)]
    #[Groups([
        'masterTickets:read',
        'clientTickets:read',
        'masters:read',
        'clients:read',
    ])]
    private ?District $district = null;

    #[ORM\ManyToOne(City::class)]
    #[Groups([
        'masterTickets:read',
        'clientTickets:read',
        'masters:read',
        'clients:read',
    ])]
    private ?City $city = null;

    #[ORM\ManyToOne(Settlement::class)]
    #[Groups([
        'masterTickets:read',
        'clientTickets:read',
        'masters:read',
        'clients:read',
    ])]
    private ?Settlement $settlement = null;

    #[ORM\ManyToOne(Community::class)]
    #[Groups([
        'masterTickets:read',
        'clientTickets:read',
        'masters:read',
        'clients:read',
    ])]
    private ?Community $community = null;

    #[ORM\ManyToOne(Village::class)]
    #[Groups([
        'masterTickets:read',
        'clientTickets:read',
        'masters:read',
        'clients:read',
    ])]
    private ?Village $village = null;

    #[ORM\ManyToOne(targetEntity: Suburb::class)]
    #[Groups([
        'masterTickets:read',
        'clientTickets:read',
        'masters:read',
        'clients:read',
    ])]
    private ?Suburb $suburb = null;

    /**
     * @var Collection<int, User>
     */
    #[ORM\ManyToMany(targetEntity: User::class, inversedBy: 'addresses')]
    #[Ignore]
    private Collection $users;

    /**
     * @var Collection<int, Ticket>
     */
    #[ORM\ManyToMany(targetEntity: Ticket::class, mappedBy: 'addresses')]
    #[Ignore]
    private Collection $tickets;

    public function __construct()
    {
        $this->users = new ArrayCollection();
        $this->tickets = new ArrayCollection();
    }

    public function getId(): ?int { return $this->id; }
    public function getProvince(): ?Province { return $this->province; }
    public function setProvince(?Province $province): self { $this->province = $province; return $this; }
    public function getDistrict(): ?District { return $this->district; }
    public function setDistrict(?District $district): self { $this->district = $district; return $this; }
    public function getCity(): ?City { return $this->city; }
    public function setCity(?City $city): self { $this->city = $city; return $this; }
    public function getSettlement(): ?Settlement { return $this->settlement; }
    public function setSettlement(?Settlement $settlement): self { $this->settlement = $settlement; return $this; }
    public function getCommunity(): ?Community { return $this->community; }
    public function setCommunity(?Community $community): self { $this->community = $community; return $this; }
    public function getVillage(): ?Village { return $this->village; }
    public function setVillage(?Village $village): self { $this->village = $village; return $this; }
    public function getSuburb(): ?Suburb { return $this->suburb; }
    public function setSuburb(?Suburb $suburb): self { $this->suburb = $suburb; return $this; }
    public function __toArray(): array
    {
        return [
            'province' => $this->province?->toArray(),
            'district' => $this->district?->toArray(),
            'city' => $this->city?->toArray(),
            'settlement' => $this->settlement?->toArray(),
            'community' => $this->community?->toArray(),
            'village' => $this->village?->toArray(),
            'suburb' => $this->suburb?->toArray(),
        ];
    }
    /**
     * @return Collection<int, User>
     */
    public function getUsers(): Collection
    {
        return $this->users;
    }
    public function addUser(User $user): static
    {
        if (!$this->users->contains($user)) {
            $this->users->add($user);
        }

        return $this;
    }
    public function removeUser(User $user): static
    {
        $this->users->removeElement($user);

        return $this;
    }

    /**
     * @return Collection<int, Ticket>
     */
    public function getTickets(): Collection
    {
        return $this->tickets;
    }

    public function addTicket(Ticket $ticket): static
    {
        if (!$this->tickets->contains($ticket)) {
            $this->tickets->add($ticket);
            $ticket->addAddress($this);
        }

        return $this;
    }

    public function removeTicket(Ticket $ticket): static
    {
        if ($this->tickets->removeElement($ticket)) {
            $ticket->removeAddress($this);
        }

        return $this;
    }
}
