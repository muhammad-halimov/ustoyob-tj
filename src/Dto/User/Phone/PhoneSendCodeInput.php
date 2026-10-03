<?php

namespace App\Dto\User\Phone;

use App\Service\Auth\PhoneCodeService;
use Symfony\Component\Validator\Constraints as Assert;

class PhoneSendCodeInput
{
    #[Assert\NotBlank]
    #[Assert\Length(max: 32)]
    public string $phone;

    /** login — вход по коду (и подтверждение аккаунта), link — привязка номера к своему аккаунту. */
    #[Assert\NotBlank]
    #[Assert\Choice(choices: [PhoneCodeService::LOGIN, PhoneCodeService::LINK])]
    public string $purpose = PhoneCodeService::LOGIN;
}
