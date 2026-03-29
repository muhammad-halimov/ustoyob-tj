<?php

namespace App\Entity\Trait\Readable;

use App\Entity\Appeal\Reason\AppealReason;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Serializer\Attribute\Groups;

trait AppealReasonTrait
{
    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: true, onDelete: 'SET NULL')]
    #[Groups([
        G::TECH_SUPPORT,

        G::APPEAL,
        G::APPEAL_CHAT,
        G::APPEAL_TICKET,
        G::APPEAL_REVIEW,
        G::APPEAL_USER,
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
