<?php

namespace App\Dto\OAuth;

use Symfony\Component\Serializer\Annotation\Groups;
use Symfony\Component\Validator\Constraints as Assert;

final class GeneralCallbackInput
{
    #[Groups([
        'google:write',
        'instagram:write',
        'facebook:write'
    ])]
    #[Assert\NotBlank]
    private string $code;

    #[Groups([
        'google:write',
        'instagram:write',
        'facebook:write'
    ])]
    #[Assert\NotBlank]
    public string $state;

    #[Groups([
        'google:write',
        'instagram:write',
        'facebook:write'
    ])]
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

    public function getState(): string
    {
        return explode('#', $this->state, 2)[0];
    }
}
