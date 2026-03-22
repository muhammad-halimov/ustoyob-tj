<?php

namespace App\Entity\Trait;

use App\Entity\Appeal\AppealReason;
use Symfony\Component\Serializer\Attribute\Groups;
use Doctrine\ORM\Mapping as ORM;

trait AppealReasonTrait
{
    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: true, onDelete: 'SET NULL')]
    #[Groups([
        'appeal:read',

        'appeal:chat:read',
        'appeal:ticket:read',
        'appeal:review:read',
        'appeal:user:read',

        'techSupport:read',
    ])]
    private ?AppealReason $reason = null;

    public function getReason(): ?AppealReason
    {
        return $this->reason;
    }

    public function setReason(?AppealReason $reason): self
    {
        $this->reason = $reason;

        return $this;
    }
}
