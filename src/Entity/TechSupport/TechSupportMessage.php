<?php

namespace App\Entity\TechSupport;

use ApiPlatform\Metadata\ApiProperty;
use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Delete;
use ApiPlatform\Metadata\Patch;
use ApiPlatform\Metadata\Post;
use App\Controller\Api\CRUD\DELETE\TechSupport\Message\DeleteTechSupportMessageController;
use App\Controller\Api\CRUD\PATCH\TechSupport\Message\PatchTechSupportMessageController;
use App\Controller\Api\CRUD\POST\TechSupport\Message\PostTechSupportMessageController;
use App\Entity\Extra\MultipleImage;
use App\Entity\Trait\CreatedAtTrait;
use App\Entity\Trait\DescriptionTrait;
use App\Entity\Trait\UpdatedAtTrait;
use App\Entity\User;
use App\Repository\TechSupport\TechSupportMessageRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Serializer\Attribute\Groups;

#[ORM\Entity(repositoryClass: TechSupportMessageRepository::class)]
#[ORM\HasLifecycleCallbacks]
#[ApiResource(
    operations: [
        new Post(
            uriTemplate: '/tech-support-messages',
            controller: PostTechSupportMessageController::class,
        ),
        new Patch(
            uriTemplate: '/tech-support-messages/{id}',
            requirements: ['id' => '\d+'],
            controller: PatchTechSupportMessageController::class,
        ),
        new Delete(
            uriTemplate: '/tech-support-messages/{id}',
            requirements: ['id' => '\d+'],
            controller: DeleteTechSupportMessageController::class,
        )
    ],
    normalizationContext: [
        'groups' => ['techSupportMessages:read'],
        'skip_null_values' => false,
    ],
    paginationClientItemsPerPage: true,
    paginationEnabled: true,
    paginationItemsPerPage: 25,
    paginationMaximumItemsPerPage: 50,
)]
class TechSupportMessage
{
    use CreatedAtTrait, UpdatedAtTrait, DescriptionTrait;

    public function __toString(): string
    {
        return $this->text ?? "TS message #$this->id";
    }

    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    #[Groups([
        'techSupportMessages:read',
        'techSupport:read',
    ])]
    private ?int $id = null;

    #[ORM\ManyToOne(inversedBy: 'techSupportMessages')]
    #[ORM\JoinColumn(name: 'author_id', referencedColumnName: 'id', nullable: true, onDelete: 'SET NULL')]
    #[Groups([
        'techSupportMessages:read',
        'techSupport:read',
    ])]
    #[ApiProperty(writable: false)]
    private ?User $author = null;

    #[ORM\ManyToOne(inversedBy: 'techSupportMessages')]
    #[ORM\JoinColumn(name: 'tech_support_id', referencedColumnName: 'id', nullable: true, onDelete: 'SET NULL')]
    #[Groups([
        'techSupportMessages:read',
    ])]
    private ?TechSupport $techSupport = null;

    /**
     * @var Collection<int, MultipleImage>
     */
    #[ORM\OneToMany(targetEntity: MultipleImage::class, mappedBy: 'techSupportMessage')]
    #[ORM\OrderBy(['position' => 'ASC'])]
    #[Groups([
        'techSupportMessages:read',
        'techSupport:read',
    ])]
    private Collection $images;

    public function __construct()
    {
        $this->images = new ArrayCollection();
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getAuthor(): ?User
    {
        return $this->author;
    }

    public function setAuthor(?User $author): static
    {
        $this->author = $author;

        return $this;
    }

    public function getTechSupport(): ?TechSupport
    {
        return $this->techSupport;
    }

    public function setTechSupport(?TechSupport $techSupport): static
    {
        $this->techSupport = $techSupport;

        return $this;
    }

    /**
     * @return Collection<int, MultipleImage>
     */
    public function getImages(): Collection
    {
        return $this->images;
    }

    public function addImage(MultipleImage $image): static
    {
        if (!$this->images->contains($image)) {
            $this->images->add($image);
            $image->setTechSupportMessage($this);
        }

        return $this;
    }

    public function removeImage(MultipleImage $image): static
    {
        if ($this->images->removeElement($image)) {
            // set the owning side to null (unless already changed)
            if ($image->getTechSupportMessage() === $this) {
                $image->setTechSupportMessage(null);
            }
        }

        return $this;
    }
}
