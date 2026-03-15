<?php

namespace App\Entity\Appeal\AppealTypes;

use App\Entity\Appeal\Appeal;
use App\Entity\Review\Review;
use App\Repository\Appeal\AppealReviewRepository;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Serializer\Attribute\Groups;

#[ORM\Entity(repositoryClass: AppealReviewRepository::class)]
class AppealReview extends Appeal
{
    public function __construct()
    {
        parent::__construct();
        $this->setType('review');
    }

    public function __toString(): string
    {
        $title = $this->getTitle();
        $id    = $this->getId();
        return $title ? "Жалоба на отзыв #$id: $title" : "Жалоба на отзыв #$id";
    }

    #[ORM\ManyToOne(inversedBy: 'appealReviews')]
    #[Groups(['appeal:review:read'])]
    private ?Review $review = null;

    public function getReview(): ?Review
    {
        return $this->review;
    }

    public function setReview(?Review $review): static
    {
        $this->review = $review;
        return $this;
    }
}
