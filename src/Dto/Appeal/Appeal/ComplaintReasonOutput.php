<?php
// src/Dto/Appeal/ComplaintReasonOutput.php

namespace App\Dto\Appeal\Appeal;

class ComplaintReasonOutput
{
    public int $id;
    public string $complaint_code;
    public string $complaint_human;

    public function __construct(int $id, string $complaintCode, string $complaintHuman)
    {
        $this->id = $id;
        $this->complaint_code = $complaintCode;
        $this->complaint_human = $complaintHuman;
    }
}
