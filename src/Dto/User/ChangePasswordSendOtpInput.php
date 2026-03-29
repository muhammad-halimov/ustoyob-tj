<?php

namespace App\Dto\User;

use Symfony\Component\Validator\Constraints as Assert;

class ChangePasswordSendOtpInput
{
    #[Assert\NotBlank]
    #[Assert\Email]
    public string $email;
}
