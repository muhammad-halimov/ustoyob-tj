<?php

namespace App\Dto\User;

use Symfony\Component\Validator\Constraints as Assert;

class ChangePasswordInput
{
    #[Assert\NotBlank]
    #[Assert\Email]
    public string $email;

    #[Assert\NotBlank]
    #[Assert\Length(exactly: 6)]
    public string $code;

    #[Assert\NotBlank]
    #[Assert\Length(
        min: 8,
        max: 64,
        minMessage: "Password must be at least {{ limit }} characters long",
        groups: ['registration', 'password_change']
    )]
    #[Assert\Regex(
        pattern: "/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#\$%\^&\*]).+$/",
        message: "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (!@#$%^&*)",
        groups: ['registration', 'password_change']
    )]
    public string $newPassword;
}
