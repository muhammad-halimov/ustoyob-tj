<?php

namespace App\Entity\Appeal\Types;

use App\Service\Extra\UuidUtil;

use App\Entity\Appeal\Appeal\Appeal;
use App\Entity\Review\Review;
use App\Repository\Appeal\AppealReviewRepository;
use Doctrine\ORM\Mapping as ORM;

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
        return $title ? "Жалоба на отзыв: $title" : 'Жалоба на отзыв #' . UuidUtil::short($this->getId());
    }

    #[ORM\ManyToOne(inversedBy: 'appealReviews')]
    #[ORM\JoinColumn(nullable: true, onDelete: 'SET NULL')]
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
