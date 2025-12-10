<?php

namespace App\Dto\OAuth\Google;

use Symfony\Component\Serializer\Annotation\Groups;
use Symfony\Component\Validator\Constraints as Assert;

final class GoogleCallbackInput
{
    #[Groups(['google:write'])]
    #[Assert\NotBlank]
    private string $code;

    #[Groups(['google:write'])]
    #[Assert\NotBlank]
    public string $state;

    #[Groups(['google:write'])]
    public ?string $role = null;

    public function getCode(): string
    {
        // Автоматически декодируем при чтении
        return urldecode($this->code);
    }

    public function setCode(string $code): void
    {
        $this->code = $code;
    }
}
