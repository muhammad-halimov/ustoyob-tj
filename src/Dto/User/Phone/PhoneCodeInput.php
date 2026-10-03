<?php

namespace App\Dto\User\Phone;

use Symfony\Component\Validator\Constraints as Assert;

class PhoneCodeInput
{
    #[Assert\NotBlank]
    #[Assert\Length(max: 32)]
    public string $phone;

    #[Assert\NotBlank]
    #[Assert\Length(exactly: 6)]
    public string $code;
}
